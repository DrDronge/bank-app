using Microsoft.EntityFrameworkCore;
using bank.Persistence.Models;

namespace bank.Persistence.Repository;

public class RecurringExpenseRepository(ApplicationDbContext db) : IRecurringExpenseRepository
{
    public Task<List<RecurringExpense>> GetAllAsync(string userId) =>
        db.RecurringExpenses
            .Where(r => r.UserId == userId)
            .OrderBy(r => r.FrequencyMonths).ThenBy(r => r.Name)
            .ToListAsync();

    public async Task<RecurringExpense> CreateAsync(string userId, string name, decimal amount, int frequencyMonths, string? category, string? notes, string? matchText, DateOnly? endDate)
    {
        var expense = new RecurringExpense
        {
            UserId = userId,
            Name = name,
            Amount = amount,
            FrequencyMonths = frequencyMonths,
            Category = category,
            Notes = notes,
            MatchText = matchText,
            EndDate = endDate,
            CreatedAt = DateTime.UtcNow
        };
        db.RecurringExpenses.Add(expense);
        await db.SaveChangesAsync();
        return expense;
    }

    public async Task<RecurringExpense?> UpdateAsync(string userId, int id, string name, decimal amount, int frequencyMonths, string? category, string? notes, string? matchText, DateOnly? endDate)
    {
        var expense = await db.RecurringExpenses.FirstOrDefaultAsync(r => r.Id == id && r.UserId == userId);
        if (expense is null) return null;

        expense.Name = name;
        expense.Amount = amount;
        expense.FrequencyMonths = frequencyMonths;
        expense.Category = category;
        expense.Notes = notes;
        expense.MatchText = matchText;
        expense.EndDate = endDate;

        await db.SaveChangesAsync();
        return expense;
    }

    public async Task DeleteAsync(string userId, int id)
    {
        var expense = await db.RecurringExpenses.FirstOrDefaultAsync(r => r.Id == id && r.UserId == userId);
        if (expense is not null)
        {
            db.RecurringExpenses.Remove(expense);
            await db.SaveChangesAsync();
        }
    }
}
