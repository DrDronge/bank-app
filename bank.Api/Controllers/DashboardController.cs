using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using bank.Persistence.Repository;

namespace bank.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DashboardController(ITransactionRepository repository) : AuthControllerBase
{
    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary(
        [FromQuery] string? from = null,
        [FromQuery] string? to = null,
        [FromQuery] int? accountId = null)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var fromDate = new DateOnly(today.Year, today.Month, 1);
        var toDate = today;
        if (!string.IsNullOrEmpty(from) && !DateOnly.TryParse(from, out fromDate)) return BadRequest(new { error = "Invalid 'from' date." });
        if (!string.IsNullOrEmpty(to) && !DateOnly.TryParse(to, out toDate)) return BadRequest(new { error = "Invalid 'to' date." });

        var (items, _) = await repository.GetPagedAsync(
            UserId, 1, int.MaxValue, from: fromDate, to: toDate, accountId: accountId);

        var totalIncome = items.Where(t => t.Amount > 0).Sum(t => t.Amount);
        var totalExpenses = items.Where(t => t.Amount < 0).Sum(t => Math.Abs(t.Amount));
        var netAmount = totalIncome - totalExpenses;
        var currentBalance = items.Count > 0 ? items.OrderByDescending(t => t.Date).First().Balance : 0;

        return Ok(new
        {
            from = fromDate.ToString("yyyy-MM-dd"),
            to = toDate.ToString("yyyy-MM-dd"),
            totalIncome,
            totalExpenses,
            netAmount,
            currentBalance,
            transactionCount = items.Count
        });
    }

    [HttpGet("categories")]
    public async Task<IActionResult> GetCategories(
        [FromQuery] string? from = null,
        [FromQuery] string? to = null,
        [FromQuery] int? accountId = null)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var fromDate = new DateOnly(today.Year, today.Month, 1);
        var toDate = today;
        if (!string.IsNullOrEmpty(from) && !DateOnly.TryParse(from, out fromDate)) return BadRequest(new { error = "Invalid 'from' date." });
        if (!string.IsNullOrEmpty(to) && !DateOnly.TryParse(to, out toDate)) return BadRequest(new { error = "Invalid 'to' date." });

        var spending = await repository.GetSpendingByCategoryAsync(UserId, fromDate, toDate, accountId);
        var total = spending.Values.Sum();

        var result = spending
            .OrderByDescending(kvp => kvp.Value)
            .Select(kvp => new
            {
                category = kvp.Key,
                amount = kvp.Value,
                percentage = total > 0 ? Math.Round(kvp.Value / total * 100, 1) : 0
            });

        return Ok(result);
    }

    [HttpGet("monthly-trends")]
    public async Task<IActionResult> GetMonthlyTrends(
        [FromQuery] string? from = null,
        [FromQuery] string? to = null,
        [FromQuery] int? accountId = null)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var toDate = today;
        if (!string.IsNullOrEmpty(to) && !DateOnly.TryParse(to, out toDate)) return BadRequest(new { error = "Invalid 'to' date." });
        var fromDate = toDate.AddMonths(-11);
        if (!string.IsNullOrEmpty(from) && !DateOnly.TryParse(from, out fromDate)) return BadRequest(new { error = "Invalid 'from' date." });
        fromDate = new DateOnly(fromDate.Year, fromDate.Month, 1);

        var trends = await repository.GetMonthlyTotalsAsync(UserId, fromDate, toDate, accountId);
        return Ok(trends.Select(t => new
        {
            year = t.Year,
            month = t.Month,
            label = new DateOnly(t.Year, t.Month, 1).ToString("MMM yyyy"),
            income = t.Income,
            expenses = t.Expenses,
            net = t.Income - t.Expenses
        }));
    }

    [HttpGet("data-range")]
    public async Task<IActionResult> GetDataRange([FromQuery] int? accountId = null)
    {
        var (first, last) = await repository.GetDateRangeAsync(UserId, accountId);
        return Ok(new
        {
            hasData = first.HasValue,
            first = first?.ToString("yyyy-MM-dd"),
            last  = last?.ToString("yyyy-MM-dd"),
        });
    }

    [HttpGet("balance-history")]
    public async Task<IActionResult> GetBalanceHistory(
        [FromQuery] string? from = null,
        [FromQuery] string? to = null,
        [FromQuery] int? accountId = null)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var toDate = today;
        if (!string.IsNullOrEmpty(to) && !DateOnly.TryParse(to, out toDate)) return BadRequest(new { error = "Invalid 'to' date." });
        var fromDate = toDate.AddMonths(-11);
        if (!string.IsNullOrEmpty(from) && !DateOnly.TryParse(from, out fromDate)) return BadRequest(new { error = "Invalid 'from' date." });
        fromDate = new DateOnly(fromDate.Year, fromDate.Month, 1);

        var history = await repository.GetBalanceHistoryAsync(UserId, fromDate, toDate, accountId);
        return Ok(history.Select(d => new
        {
            date = d.Date.ToString("yyyy-MM-dd"),
            balance = d.Balance
        }));
    }
}
