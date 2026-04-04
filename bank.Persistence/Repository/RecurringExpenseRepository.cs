using Microsoft.EntityFrameworkCore;
using bank.Persistence.Models;

namespace bank.Persistence.Repository;

public class RecurringExpenseRepository(ApplicationDbContext db) : IRecurringExpenseRepository
{
    public Task<List<RecurringExpense>> GetAllAsync() =>
        db.RecurringExpenses.OrderBy(r => r.FrequencyMonths).ThenBy(r => r.Name).ToListAsync();

    public async Task<RecurringExpense> CreateAsync(string name, decimal amount, int frequencyMonths, string? category, string? notes, string? matchText, DateOnly? endDate)
    {
        var expense = new RecurringExpense
        {
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

    public async Task<RecurringExpense?> UpdateAsync(int id, string name, decimal amount, int frequencyMonths, string? category, string? notes, string? matchText, DateOnly? endDate)
    {
        var expense = await db.RecurringExpenses.FindAsync(id);
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

    public async Task DeleteAsync(int id)
    {
        var expense = await db.RecurringExpenses.FindAsync(id);
        if (expense is not null)
        {
            db.RecurringExpenses.Remove(expense);
            await db.SaveChangesAsync();
        }
    }
}
