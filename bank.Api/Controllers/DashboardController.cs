using Microsoft.AspNetCore.Mvc;
using bank.Persistence.Repository;

namespace bank.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DashboardController(ITransactionRepository repository) : ControllerBase
{
    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary(
        [FromQuery] string? from = null,
        [FromQuery] string? to = null,
        [FromQuery] int? accountId = null)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var fromDate = string.IsNullOrEmpty(from)
            ? new DateOnly(today.Year, today.Month, 1)
            : DateOnly.Parse(from);
        var toDate = string.IsNullOrEmpty(to)
            ? today
            : DateOnly.Parse(to);

        var (items, _) = await repository.GetPagedAsync(
            1, int.MaxValue, from: fromDate, to: toDate, accountId: accountId);

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
        var fromDate = string.IsNullOrEmpty(from)
            ? new DateOnly(today.Year, today.Month, 1)
            : DateOnly.Parse(from);
        var toDate = string.IsNullOrEmpty(to)
            ? today
            : DateOnly.Parse(to);

        var spending = await repository.GetSpendingByCategoryAsync(fromDate, toDate, accountId);
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
        var toDate = string.IsNullOrEmpty(to)
            ? today
            : DateOnly.Parse(to);
        var fromDate = string.IsNullOrEmpty(from)
            ? toDate.AddMonths(-11) // 12 months range including current
            : DateOnly.Parse(from);
        fromDate = new DateOnly(fromDate.Year, fromDate.Month, 1);

        var trends = await repository.GetMonthlyTotalsAsync(fromDate, toDate, accountId);
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
        var (first, last) = await repository.GetDateRangeAsync(accountId);
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
        var toDate = string.IsNullOrEmpty(to)
            ? today
            : DateOnly.Parse(to);
        var fromDate = string.IsNullOrEmpty(from)
            ? toDate.AddMonths(-11)
            : DateOnly.Parse(from);
        fromDate = new DateOnly(fromDate.Year, fromDate.Month, 1);

        var history = await repository.GetBalanceHistoryAsync(fromDate, toDate, accountId);
        return Ok(history.Select(d => new
        {
            date = d.Date.ToString("yyyy-MM-dd"),
            balance = d.Balance
        }));
    }
}
