using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using bank.Persistence.Repository;

namespace bank.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TransactionsController(ITransactionRepository repository) : AuthControllerBase
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
        pageSize = Math.Clamp(pageSize, 1, 500);

        DateOnly? fromDate = null;
        DateOnly? toDate = null;
        if (!string.IsNullOrEmpty(from))
        {
            if (!DateOnly.TryParse(from, out var fd)) return BadRequest(new { error = "Invalid 'from' date." });
            fromDate = fd;
        }
        if (!string.IsNullOrEmpty(to))
        {
            if (!DateOnly.TryParse(to, out var td)) return BadRequest(new { error = "Invalid 'to' date." });
            toDate = td;
        }

        var (items, total) = await repository.GetPagedAsync(
            UserId, page, pageSize, search, category, fromDate, toDate, type, accountId, sortBy, sortDesc);

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
        var categories = await repository.GetCategoriesAsync(UserId);
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
        DateOnly? fromDate = null;
        DateOnly? toDate = null;
        if (!string.IsNullOrEmpty(from))
        {
            if (!DateOnly.TryParse(from, out var fd)) return BadRequest(new { error = "Invalid 'from' date." });
            fromDate = fd;
        }
        if (!string.IsNullOrEmpty(to))
        {
            if (!DateOnly.TryParse(to, out var td)) return BadRequest(new { error = "Invalid 'to' date." });
            toDate = td;
        }

        var (items, _) = await repository.GetPagedAsync(UserId, 1, int.MaxValue, search, category, fromDate, toDate, type, accountId);

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
        var fromDate = DateOnly.FromDateTime(DateTime.UtcNow.AddYears(-2));
        var toDate = today;
        if (!string.IsNullOrEmpty(from) && !DateOnly.TryParse(from, out fromDate)) return BadRequest(new { error = "Invalid 'from' date." });
        if (!string.IsNullOrEmpty(to) && !DateOnly.TryParse(to, out toDate)) return BadRequest(new { error = "Invalid 'to' date." });

        var candidates = await repository.GetRecurringCandidatesAsync(UserId, fromDate, toDate, accountId);
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

        if (!DateOnly.TryParse(from, out var fromDate)) return BadRequest(new { error = "Invalid 'from' date." });
        if (!DateOnly.TryParse(to, out var toDate)) return BadRequest(new { error = "Invalid 'to' date." });

        var total = await repository.GetMatchedTotalAsync(UserId, matchText, fromDate, toDate, accountId);
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

        if (!DateOnly.TryParse(from, out var fromDate)) return BadRequest(new { error = "Invalid 'from' date." });
        if (!DateOnly.TryParse(to, out var toDate)) return BadRequest(new { error = "Invalid 'to' date." });

        var result = await repository.GetMonthlyByTextAsync(UserId, matchText, fromDate, toDate, accountId);
        return Ok(result.Select(r => new { year = r.Year, month = r.Month, amount = r.Amount }));
    }

    [HttpDelete]
    public async Task<IActionResult> DeleteAll()
    {
        await repository.DeleteAllAsync(UserId);
        return Ok(new { message = "All transactions deleted." });
    }

    private static string CsvEscape(string value)
    {
        if (value.Contains(',') || value.Contains('"') || value.Contains('\n'))
            return $"\"{value.Replace("\"", "\"\"")}\"";
        return value;
    }
}
