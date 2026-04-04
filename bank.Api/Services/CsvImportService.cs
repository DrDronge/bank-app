using System.Globalization;
using System.Text;
using CsvHelper;
using CsvHelper.Configuration;
using bank.Persistence.Models;
using bank.Persistence.Repository;

namespace bank.Api.Services;

public class CsvImportService(ITransactionRepository repository)
{
    public async Task<ImportResult> ImportAsync(Stream stream, int? accountId = null)
    {
        var bytes = await ReadAllBytesAsync(stream);
        var csvText = DecodeBytes(bytes);

        var separator = DetectSeparator(csvText);
        var config = new CsvConfiguration(CultureInfo.InvariantCulture)
        {
            HasHeaderRecord = true,
            Delimiter = separator.ToString(),
            BadDataFound = null,
            MissingFieldFound = null,
        };

        using var reader = new StringReader(csvText);
        using var csv = new CsvReader(reader, config);

        await csv.ReadAsync();
        csv.ReadHeader();

        var headers = csv.HeaderRecord ?? [];
        var format = DetectFormat(headers);

        var transactions = new List<Transaction>();
        var skipped = 0;

        while (await csv.ReadAsync())
        {
            try
            {
                var tx = format switch
                {
                    BankFormat.DanskeBank => ParseDanskeBank(csv),
                    BankFormat.Nordea => ParseNordea(csv),
                    BankFormat.Lunar => ParseLunar(csv),
                    _ => ParseGeneric(csv, headers)
                };

                if (tx is null) { skipped++; continue; }

                if (await repository.ExistsAsync(tx.Date, tx.Text, tx.Amount))
                {
                    skipped++;
                    continue;
                }

                tx.BankAccountId = accountId;
                transactions.Add(tx);
            }
            catch
            {
                skipped++;
            }
        }

        if (transactions.Count > 0)
            await repository.AddRangeAsync(transactions);

        return new ImportResult(transactions.Count, skipped, format.ToString());
    }

    // ── Format detection ──────────────────────────────────────────────────────

    private enum BankFormat { DanskeBank, Nordea, Lunar, Generic }

    private static BankFormat DetectFormat(string[] headers)
    {
        var joined = string.Join(" ", headers).ToLowerInvariant();

        if (joined.Contains("kategori") && joined.Contains("underkategori"))
            return BankFormat.DanskeBank;

        if (joined.Contains("transaktionstekst") || joined.Contains("bogfoeringsdag") || joined.Contains("bogf"))
            return BankFormat.Nordea;

        // Lunar / English headers
        if (headers.Any(h => h.Trim('"').Equals("description", StringComparison.OrdinalIgnoreCase)) &&
            headers.Any(h => h.Trim('"').Equals("amount", StringComparison.OrdinalIgnoreCase)))
            return BankFormat.Lunar;

        return BankFormat.Generic;
    }

    private static char DetectSeparator(string text)
    {
        var firstLine = text.Split('\n', 2)[0];
        return firstLine.Count(c => c == ';') > firstLine.Count(c => c == ',') ? ';' : ',';
    }

    // ── Bank-specific parsers ─────────────────────────────────────────────────

    private static Transaction? ParseDanskeBank(CsvReader csv)
    {
        // "Dato","Kategori","Underkategori","Tekst","Beløb","Saldo","Status","Afstemt"
        var dateStr     = csv.GetField(0)?.Trim() ?? "";
        var category    = csv.GetField(1)?.Trim() ?? "";
        var subcategory = csv.GetField(2)?.Trim() ?? "";
        var text        = csv.GetField(3)?.Trim() ?? "";
        var amountStr   = csv.GetField(4)?.Trim() ?? "0";
        var balanceStr  = csv.GetField(5)?.Trim() ?? "0";
        var status      = csv.GetField(6)?.Trim() ?? "";
        var reconciled  = csv.GetField(7)?.Trim().Equals("Ja", StringComparison.OrdinalIgnoreCase) ?? false;

        if (string.IsNullOrWhiteSpace(dateStr)) return null;

        return new Transaction
        {
            Date        = ParseDanishDate(dateStr),
            Category    = category,
            Subcategory = subcategory,
            Text        = text,
            Amount      = ParseDanishDecimal(amountStr),
            Balance     = ParseDanishDecimal(balanceStr),
            Status      = status,
            Reconciled  = reconciled,
            ImportedAt  = DateTime.UtcNow
        };
    }

    private static Transaction? ParseNordea(CsvReader csv)
    {
        // Nordea DK: "Dato";"Transaktionstekst";"Beløb";"Saldo"
        // or: "Bogf. dato";"Tekst";"Beløb";"Saldo"
        var dateStr   = csv.GetField(0)?.Trim() ?? "";
        var text      = csv.GetField(1)?.Trim() ?? "";
        var amountStr = csv.GetField(2)?.Trim() ?? "0";
        var balStr    = csv.GetField(3)?.Trim() ?? "0";

        if (string.IsNullOrWhiteSpace(dateStr)) return null;

        return new Transaction
        {
            Date       = ParseFlexibleDate(dateStr),
            Category   = "Uncategorized",
            Text       = text,
            Amount     = ParseDanishDecimal(amountStr),
            Balance    = ParseDanishDecimal(balStr),
            Status     = "Completed",
            ImportedAt = DateTime.UtcNow
        };
    }

    private static Transaction? ParseLunar(CsvReader csv)
    {
        // Lunar: Date, Description, Amount, Balance (English, dot decimal)
        var dateStr   = csv.GetField(0)?.Trim() ?? "";
        var text      = csv.GetField(1)?.Trim() ?? "";
        var amountStr = csv.GetField(2)?.Trim() ?? "0";
        var balStr    = csv.GetField(3)?.Trim() ?? "0";

        if (string.IsNullOrWhiteSpace(dateStr)) return null;

        return new Transaction
        {
            Date       = ParseFlexibleDate(dateStr),
            Category   = "Uncategorized",
            Text       = text,
            Amount     = decimal.Parse(amountStr, CultureInfo.InvariantCulture),
            Balance    = decimal.Parse(balStr, CultureInfo.InvariantCulture),
            Status     = "Completed",
            ImportedAt = DateTime.UtcNow
        };
    }

    private static Transaction? ParseGeneric(CsvReader csv, string[] headers)
    {
        // Best-effort: find columns by header name
        int Find(params string[] names) =>
            Array.FindIndex(headers, h => names.Any(n => Strip(h).Equals(n, StringComparison.OrdinalIgnoreCase)));

        static string Strip(string s) => s.Trim('"', ' ', '\r');

        var dateIdx    = Find("dato", "date", "bogfoeringsdag", "bogf. dato", "bogføringsdato");
        var textIdx    = Find("tekst", "text", "description", "transaktionstekst", "bogfoeringstekst");
        var amountIdx  = Find("beløb", "beloeb", "amount", "bel\\u00f8b");
        var balanceIdx = Find("saldo", "balance");
        var catIdx     = Find("kategori", "category");

        if (dateIdx < 0 || amountIdx < 0) return null;

        var dateStr   = csv.GetField(dateIdx)?.Trim() ?? "";
        var text      = textIdx >= 0 ? csv.GetField(textIdx)?.Trim() ?? "" : "";
        var amountStr = csv.GetField(amountIdx)?.Trim() ?? "0";
        var balStr    = balanceIdx >= 0 ? csv.GetField(balanceIdx)?.Trim() ?? "0" : "0";
        var category  = catIdx >= 0 ? csv.GetField(catIdx)?.Trim() ?? "Uncategorized" : "Uncategorized";

        if (string.IsNullOrWhiteSpace(dateStr)) return null;

        return new Transaction
        {
            Date       = ParseFlexibleDate(dateStr),
            Category   = category,
            Text       = text,
            Amount     = ParseDanishDecimal(amountStr),
            Balance    = ParseDanishDecimal(balStr),
            Status     = "Completed",
            ImportedAt = DateTime.UtcNow
        };
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static async Task<byte[]> ReadAllBytesAsync(Stream stream)
    {
        using var ms = new MemoryStream();
        await stream.CopyToAsync(ms);
        return ms.ToArray();
    }

    private static string DecodeBytes(byte[] bytes)
    {
        // UTF-8 with BOM (Excel/modern exports often include this)
        if (bytes.Length >= 3 && bytes[0] == 0xEF && bytes[1] == 0xBB && bytes[2] == 0xBF)
            return Encoding.UTF8.GetString(bytes, 3, bytes.Length - 3);

        // UTF-8 without BOM — try strict parse first
        try { return new UTF8Encoding(false, throwOnInvalidBytes: true).GetString(bytes); }
        catch { }

        // Fallback: Latin-1 (ISO-8859-1)
        // Danish chars æ (0xE6), ø (0xF8), å (0xE5) sit in the 0xA0–0xFF range
        // where Latin-1 and Windows-1252 are byte-for-byte identical, so this
        // correctly handles both encodings without needing CodePagesEncodingProvider.
        return Encoding.Latin1.GetString(bytes);
    }

    private static DateOnly ParseDanishDate(string value)
    {
        // "01.12.2025"
        if (DateOnly.TryParseExact(value, "dd.MM.yyyy", CultureInfo.InvariantCulture, DateTimeStyles.None, out var d))
            return d;
        return ParseFlexibleDate(value);
    }

    private static DateOnly ParseFlexibleDate(string value)
    {
        string[] formats = ["yyyy-MM-dd", "dd-MM-yyyy", "dd.MM.yyyy", "MM/dd/yyyy", "dd/MM/yyyy"];
        foreach (var fmt in formats)
            if (DateOnly.TryParseExact(value, fmt, CultureInfo.InvariantCulture, DateTimeStyles.None, out var d))
                return d;

        return DateOnly.Parse(value, CultureInfo.InvariantCulture);
    }

    private static decimal ParseDanishDecimal(string value)
    {
        // "3.966,85" → remove dot (thousands), replace comma with dot
        // Also handles plain "-245.10" (dot decimal)
        var v = value.Trim();

        if (v.Contains(',') && v.Contains('.'))
        {
            // Ambiguous — figure out which is decimal separator
            var lastComma = v.LastIndexOf(',');
            var lastDot   = v.LastIndexOf('.');
            if (lastComma > lastDot)
                // comma is decimal: "3.966,85"
                v = v.Replace(".", "").Replace(",", ".");
            else
                // dot is decimal: "3,966.85"
                v = v.Replace(",", "");
        }
        else if (v.Contains(','))
        {
            v = v.Replace(",", ".");
        }

        return decimal.Parse(v, CultureInfo.InvariantCulture);
    }
}

public record ImportResult(int Imported, int Skipped, string DetectedFormat);
