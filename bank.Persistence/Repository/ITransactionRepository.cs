using bank.Persistence.Models;

namespace bank.Persistence.Repository;

public interface ITransactionRepository
{
    Task<(List<Transaction> Items, int Total)> GetPagedAsync(
        int page, int pageSize,
        string? search = null,
        string? category = null,
        DateOnly? from = null,
        DateOnly? to = null,
        string? type = null,
        int? accountId = null,
        string? sortBy = null,
        bool sortDesc = true);

    Task<List<Transaction>> GetAllAsync();
    Task AddRangeAsync(IEnumerable<Transaction> transactions);
    Task<bool> ExistsAsync(DateOnly date, string text, decimal amount);
    Task<List<string>> GetCategoriesAsync();
    Task<Dictionary<string, decimal>> GetSpendingByCategoryAsync(DateOnly from, DateOnly to, int? accountId = null);
    Task<List<MonthlyTotal>> GetMonthlyTotalsAsync(DateOnly from, DateOnly to, int? accountId = null);
    Task<List<DailyBalance>> GetBalanceHistoryAsync(DateOnly from, DateOnly to, int? accountId = null);
    Task<(DateOnly? First, DateOnly? Last)> GetDateRangeAsync(int? accountId = null);
    Task<decimal> GetMatchedTotalAsync(string matchText, DateOnly from, DateOnly to, int? accountId);
    Task<List<MonthlyMatchedAmount>> GetMonthlyByTextAsync(string matchText, DateOnly from, DateOnly to, int? accountId);
    Task<List<RecurringCandidate>> GetRecurringCandidatesAsync(DateOnly from, DateOnly to, int? accountId);
    Task DeleteAllAsync();
}

public record MonthlyTotal(int Year, int Month, decimal Income, decimal Expenses);
public record DailyBalance(DateOnly Date, decimal Balance);
public record MonthlyMatchedAmount(int Year, int Month, decimal Amount);
public record RecurringCandidate(string Text, int MonthCount, decimal AverageAmount, DateOnly LastSeen, int SuggestedFrequencyMonths);
