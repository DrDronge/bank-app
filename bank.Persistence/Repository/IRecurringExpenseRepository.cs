using bank.Persistence.Models;

namespace bank.Persistence.Repository;

public interface IRecurringExpenseRepository
{
    Task<List<RecurringExpense>> GetAllAsync(string userId);
    Task<RecurringExpense> CreateAsync(string userId, string name, decimal amount, int frequencyMonths, string? category, string? notes, string? matchText, DateOnly? endDate);
    Task<RecurringExpense?> UpdateAsync(string userId, int id, string name, decimal amount, int frequencyMonths, string? category, string? notes, string? matchText, DateOnly? endDate);
    Task DeleteAsync(string userId, int id);
}
