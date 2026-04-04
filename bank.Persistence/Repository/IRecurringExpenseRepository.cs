using bank.Persistence.Models;

namespace bank.Persistence.Repository;

public interface IRecurringExpenseRepository
{
    Task<List<RecurringExpense>> GetAllAsync();
    Task<RecurringExpense> CreateAsync(string name, decimal amount, int frequencyMonths, string? category, string? notes, string? matchText, DateOnly? endDate);
    Task<RecurringExpense?> UpdateAsync(int id, string name, decimal amount, int frequencyMonths, string? category, string? notes, string? matchText, DateOnly? endDate);
    Task DeleteAsync(int id);
}
