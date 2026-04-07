using bank.Persistence.Models;

namespace bank.Persistence.Repository;

public interface ITransactionRepository
{
    Task<(List<Transaction> Items, int Total)> GetPagedAsync(
        string userId,
        int page, int pageSize,
        string? search = null,
        string? category = null,
        DateOnly? from = null,
        DateOnly? to = null,
        string? type = null,
        int? accountId = null,
        string? sortBy = null,
        bool sortDesc = true);

    Task<List<Transaction>> GetAllAsync(string userId);
    Task AddRangeAsync(IEnumerable<Transaction> transactions);
    Task<bool> ExistsAsync(DateOnly date, string text, decimal amount, string userId);
    Task<List<string>> GetCategoriesAsync(string userId);
    Task<Dictionary<string, decimal>> GetSpendingByCategoryAsync(string userId, DateOnly from, DateOnly to, int? accountId = null);
    Task<List<MonthlyTotal>> GetMonthlyTotalsAsync(string userId, DateOnly from, DateOnly to, int? accountId = null);
    Task<List<DailyBalance>> GetBalanceHistoryAsync(string userId, DateOnly from, DateOnly to, int? accountId = null);
    Task<(DateOnly? First, DateOnly? Last)> GetDateRangeAsync(string userId, int? accountId = null);
    Task<decimal> GetMatchedTotalAsync(string userId, string matchText, DateOnly from, DateOnly to, int? accountId);
    Task<List<MonthlyMatchedAmount>> GetMonthlyByTextAsync(string userId, string matchText, DateOnly from, DateOnly to, int? accountId);
    Task<List<RecurringCandidate>> GetRecurringCandidatesAsync(string userId, DateOnly from, DateOnly to, int? accountId);
    Task DeleteAllAsync(string userId);
}

public record MonthlyTotal(int Year, int Month, decimal Income, decimal Expenses);
public record DailyBalance(DateOnly Date, decimal Balance);
public record MonthlyMatchedAmount(int Year, int Month, decimal Amount);
public record RecurringCandidate(string Text, int MonthCount, decimal AverageAmount, DateOnly LastSeen, int SuggestedFrequencyMonths);
