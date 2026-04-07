using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using bank.Persistence.Repository;

namespace bank.Api.Controllers;

[ApiController]
[Route("api/recurring")]
[Authorize]
public class RecurringExpensesController(IRecurringExpenseRepository repository) : AuthControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var expenses = await repository.GetAllAsync(UserId);
        return Ok(expenses.Select(e => ToDto(e)));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] RecurringExpenseRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest(new { error = "Name is required." });

        DateOnly? endDate = null;
        if (!string.IsNullOrEmpty(request.EndDate))
        {
            if (!DateOnly.TryParse(request.EndDate, out var ed)) return BadRequest(new { error = "Invalid 'endDate' value." });
            endDate = ed;
        }

        var expense = await repository.CreateAsync(
            UserId, request.Name, request.Amount, request.FrequencyMonths,
            request.Category, request.Notes, request.MatchText, endDate);

        return Ok(ToDto(expense));
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] RecurringExpenseRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest(new { error = "Name is required." });

        DateOnly? endDate = null;
        if (!string.IsNullOrEmpty(request.EndDate))
        {
            if (!DateOnly.TryParse(request.EndDate, out var ed)) return BadRequest(new { error = "Invalid 'endDate' value." });
            endDate = ed;
        }

        var expense = await repository.UpdateAsync(
            UserId, id, request.Name, request.Amount, request.FrequencyMonths,
            request.Category, request.Notes, request.MatchText, endDate);

        if (expense is null)
            return NotFound(new { error = "Recurring expense not found." });

        return Ok(ToDto(expense));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        await repository.DeleteAsync(UserId, id);
        return Ok(new { message = "Recurring expense deleted." });
    }

    private static object ToDto(bank.Persistence.Models.RecurringExpense e)
    {
        var monthlyEquivalent = e.Amount / e.FrequencyMonths;
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        int? remainingMonths = e.EndDate.HasValue
            ? Math.Max(0, (e.EndDate.Value.Year - today.Year) * 12 + e.EndDate.Value.Month - today.Month)
            : null;
        return new
        {
            e.Id, e.Name, e.Amount, e.FrequencyMonths,
            e.Category, e.Notes, e.MatchText, e.CreatedAt,
            endDate = e.EndDate?.ToString("yyyy-MM-dd"),
            remainingMonths,
            monthlyEquivalent,
            annualEquivalent = monthlyEquivalent * 12
        };
    }
}

public record RecurringExpenseRequest(
    string Name,
    decimal Amount,
    int FrequencyMonths,
    string? Category,
    string? Notes,
    string? MatchText,
    string? EndDate);
