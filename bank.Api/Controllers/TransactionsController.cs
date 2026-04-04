using System.Text;
using Microsoft.AspNetCore.Mvc;
using bank.Persistence.Repository;

namespace bank.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TransactionsController(ITransactionRepository repository) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? search = null,
        [FromQuery] string? category = null,
        [FromQuery] string? from = null,
        [FromQuery] string? to = null,
        [FromQuery] string? type = null,
        [FromQuery] int? accountId = null,
        [FromQuery] string? sortBy = null,
        [FromQuery] bool sortDesc = true)
    {
        var fromDate = string.IsNullOrEmpty(from) ? (DateOnly?)null : DateOnly.Parse(from);
        var toDate = string.IsNullOrEmpty(to) ? (DateOnly?)null : DateOnly.Parse(to);

        var (items, total) = await repository.GetPagedAsync(
            page, pageSize, search, category, fromDate, toDate, type, accountId, sortBy, sortDesc);

        return Ok(new
        {
            items,
            total,
            page,
            pageSize,
            totalPages = (int)Math.Ceiling(total / (double)pageSize)
        });
    }

    [HttpGet("categories")]
    public async Task<IActionResult> GetCategories()
    {
        var categories = await repository.GetCategoriesAsync();
        return Ok(categories);
    }

    [HttpGet("export")]
    public async Task<IActionResult> Export(
        [FromQuery] string? search = null,
        [FromQuery] string? category = null,
        [FromQuery] string? from = null,
        [FromQuery] string? to = null,
        [FromQuery] string? type = null,
        [FromQuery] int? accountId = null)
    {
        var fromDate = string.IsNullOrEmpty(from) ? (DateOnly?)null : DateOnly.Parse(from);
        var toDate = string.IsNullOrEmpty(to) ? (DateOnly?)null : DateOnly.Parse(to);

        var (items, _) = await repository.GetPagedAsync(1, int.MaxValue, search, category, fromDate, toDate, type, accountId);

        var sb = new StringBuilder();
        sb.AppendLine("Date,Description,Category,Subcategory,Amount,Balance,Status");

        foreach (var tx in items)
        {
            sb.AppendLine(string.Join(",",
                tx.Date,
                CsvEscape(tx.Text),
                CsvEscape(tx.Category),
                CsvEscape(tx.Subcategory),
                tx.Amount,
                tx.Balance,
                CsvEscape(tx.Status)));
        }

        var bytes = Encoding.UTF8.GetPreamble().Concat(Encoding.UTF8.GetBytes(sb.ToString())).ToArray();
        return File(bytes, "text/csv; charset=utf-8", $"transactions-{DateTime.UtcNow:yyyy-MM-dd}.csv");
    }

    [HttpGet("recurring-candidates")]
    public async Task<IActionResult> GetRecurringCandidates(
        [FromQuery] string? from = null,
        [FromQuery] string? to = null,
        [FromQuery] int? accountId = null)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var fromDate = string.IsNullOrEmpty(from) ? DateOnly.FromDateTime(DateTime.UtcNow.AddYears(-2)) : DateOnly.Parse(from);
        var toDate = string.IsNullOrEmpty(to) ? today : DateOnly.Parse(to);
        var candidates = await repository.GetRecurringCandidatesAsync(fromDate, toDate, accountId);
        return Ok(candidates.Select(c => new
        {
            c.Text,
            c.MonthCount,
            c.AverageAmount,
            c.SuggestedFrequencyMonths,
            lastSeen = c.LastSeen.ToString("yyyy-MM-dd"),
        }));
    }

    [HttpGet("matched-total")]
    public async Task<IActionResult> GetMatchedTotal(
        [FromQuery] string matchText,
        [FromQuery] string from,
        [FromQuery] string to,
        [FromQuery] int? accountId)
    {
        if (string.IsNullOrWhiteSpace(matchText))
            return BadRequest(new { error = "matchText is required." });

        var fromDate = DateOnly.Parse(from);
        var toDate = DateOnly.Parse(to);
        var total = await repository.GetMatchedTotalAsync(matchText, fromDate, toDate, accountId);
        return Ok(new { total });
    }

    [HttpGet("monthly-by-text")]
    public async Task<IActionResult> GetMonthlyByText(
        [FromQuery] string matchText,
        [FromQuery] string from,
        [FromQuery] string to,
        [FromQuery] int? accountId = null)
    {
        if (string.IsNullOrWhiteSpace(matchText))
            return BadRequest(new { error = "matchText is required." });

        var fromDate = DateOnly.Parse(from);
        var toDate = DateOnly.Parse(to);
        var result = await repository.GetMonthlyByTextAsync(matchText, fromDate, toDate, accountId);
        return Ok(result.Select(r => new { year = r.Year, month = r.Month, amount = r.Amount }));
    }

    [HttpDelete]
    public async Task<IActionResult> DeleteAll()
    {
        await repository.DeleteAllAsync();
        return Ok(new { message = "All transactions deleted." });
    }

    private static string CsvEscape(string value)
    {
        if (value.Contains(',') || value.Contains('"') || value.Contains('\n'))
            return $"\"{value.Replace("\"", "\"\"")}\"";
        return value;
    }
}
