using Microsoft.EntityFrameworkCore;
using bank.Persistence.Models;

namespace bank.Persistence.Repository;

public class TransactionRepository(ApplicationDbContext db) : ITransactionRepository
{
    public async Task<(List<Transaction> Items, int Total)> GetPagedAsync(
        string userId,
        int page, int pageSize,
        string? search = null,
        string? category = null,
        DateOnly? from = null,
        DateOnly? to = null,
        string? type = null,
        int? accountId = null,
        string? sortBy = null,
        bool sortDesc = true)
    {
        var query = db.Transactions.Where(t => t.UserId == userId);

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(t => t.Text.Contains(search) || t.Category.Contains(search));

        if (!string.IsNullOrWhiteSpace(category))
            query = query.Where(t => t.Category == category);

        if (from.HasValue)
            query = query.Where(t => t.Date >= from.Value);

        if (to.HasValue)
            query = query.Where(t => t.Date <= to.Value);

        if (type == "income")
            query = query.Where(t => t.Amount > 0);
        else if (type == "expense")
            query = query.Where(t => t.Amount < 0);

        if (accountId.HasValue)
            query = query.Where(t => t.BankAccountId == accountId.Value);

        var total = await query.CountAsync();

        IOrderedQueryable<Transaction> ordered = sortBy switch
        {
            "amount"      => sortDesc ? query.OrderByDescending(t => t.Amount)   : query.OrderBy(t => t.Amount),
            "balance"     => sortDesc ? query.OrderByDescending(t => t.Balance)  : query.OrderBy(t => t.Balance),
            "description" => sortDesc ? query.OrderByDescending(t => t.Text)     : query.OrderBy(t => t.Text),
            "category"    => sortDesc ? query.OrderByDescending(t => t.Category) : query.OrderBy(t => t.Category),
            _             => sortDesc ? query.OrderByDescending(t => t.Date).ThenByDescending(t => t.Id)
                                      : query.OrderBy(t => t.Date).ThenBy(t => t.Id),
        };

        var items = await ordered
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return (items, total);
    }

    public Task<List<Transaction>> GetAllAsync(string userId) =>
        db.Transactions
            .Where(t => t.UserId == userId)
            .OrderByDescending(t => t.Date)
            .ToListAsync();

    public async Task AddRangeAsync(IEnumerable<Transaction> transactions)
    {
        db.Transactions.AddRange(transactions);
        await db.SaveChangesAsync();
    }

    public Task<bool> ExistsAsync(DateOnly date, string text, decimal amount, string userId) =>
        db.Transactions.AnyAsync(t =>
            t.UserId == userId &&
            t.Date == date &&
            t.Text == text &&
            t.Amount == amount);

    public Task<List<string>> GetCategoriesAsync(string userId) =>
        db.Transactions
            .Where(t => t.UserId == userId)
            .Select(t => t.Category)
            .Distinct()
            .OrderBy(c => c)
            .ToListAsync();

    public async Task<Dictionary<string, decimal>> GetSpendingByCategoryAsync(string userId, DateOnly from, DateOnly to, int? accountId = null)
    {
        var query = db.Transactions
            .Where(t => t.UserId == userId && t.Date >= from && t.Date <= to && t.Amount < 0);

        if (accountId.HasValue)
            query = query.Where(t => t.BankAccountId == accountId.Value);

        var rows = await query
            .Select(t => new { t.Category, t.Amount })
            .ToListAsync();

        return rows
            .GroupBy(t => t.Category)
            .ToDictionary(g => g.Key, g => g.Sum(t => Math.Abs(t.Amount)));
    }

    public async Task<List<MonthlyTotal>> GetMonthlyTotalsAsync(string userId, DateOnly from, DateOnly to, int? accountId = null)
    {
        var query = db.Transactions
            .Where(t => t.UserId == userId && t.Date >= from && t.Date <= to);

        if (accountId.HasValue)
            query = query.Where(t => t.BankAccountId == accountId.Value);

        var rows = await query
            .Select(t => new { t.Date.Year, t.Date.Month, t.Amount })
            .ToListAsync();

        return rows
            .GroupBy(t => new { t.Year, t.Month })
            .Select(g => new MonthlyTotal(
                g.Key.Year,
                g.Key.Month,
                g.Where(t => t.Amount > 0).Sum(t => t.Amount),
                g.Where(t => t.Amount < 0).Sum(t => Math.Abs(t.Amount))))
            .OrderBy(m => m.Year).ThenBy(m => m.Month)
            .ToList();
    }

    public async Task<List<DailyBalance>> GetBalanceHistoryAsync(string userId, DateOnly from, DateOnly to, int? accountId = null)
    {
        var query = db.Transactions
            .Where(t => t.UserId == userId && t.Date >= from && t.Date <= to);

        if (accountId.HasValue)
            query = query.Where(t => t.BankAccountId == accountId.Value);

        var rows = await query
            .OrderBy(t => t.Date).ThenBy(t => t.Id)
            .Select(t => new { t.Date, t.Balance })
            .ToListAsync();

        return rows
            .GroupBy(t => t.Date)
            .Select(g => new DailyBalance(g.Key, g.Last().Balance))
            .OrderBy(d => d.Date)
            .ToList();
    }

    public async Task<List<RecurringCandidate>> GetRecurringCandidatesAsync(string userId, DateOnly from, DateOnly to, int? accountId)
    {
        var query = db.Transactions
            .Where(t => t.UserId == userId && t.Date >= from && t.Date <= to && t.Amount < 0);

        if (accountId.HasValue)
            query = query.Where(t => t.BankAccountId == accountId.Value);

        var rows = await query
            .Select(t => new { t.Text, t.Date.Year, t.Date.Month, t.Amount })
            .ToListAsync();

        return rows
            .GroupBy(t => t.Text)
            .Select(g => new
            {
                Text = g.Key,
                Months = g.Select(t => new { t.Year, t.Month }).Distinct().ToList(),
                AverageAmount = Math.Abs(g.Average(t => t.Amount)),
                LastSeen = g.Max(t => new DateOnly(t.Year, t.Month, 1)),
            })
            .Where(g => g.Months.Count >= 2)
            .Select(g =>
            {
                var totalMonths = (to.Year - from.Year) * 12 + to.Month - from.Month + 1;
                var yearsOfData = Math.Max(totalMonths / 12.0, 1.0);
                var perYear = g.Months.Count / yearsOfData;
                var freq = perYear >= 8 ? 1 : perYear >= 5 ? 2 : perYear >= 3 ? 3 : perYear >= 1.5 ? 6 : 12;
                return new RecurringCandidate(g.Text, g.Months.Count, g.AverageAmount, g.LastSeen, freq);
            })
            .OrderByDescending(c => c.MonthCount)
            .ThenByDescending(c => c.AverageAmount)
            .ToList();
    }

    public async Task<decimal> GetMatchedTotalAsync(string userId, string matchText, DateOnly from, DateOnly to, int? accountId)
    {
        var query = db.Transactions
            .Where(t => t.UserId == userId && t.Date >= from && t.Date <= to && t.Amount < 0)
            .Where(t => t.Text.Contains(matchText));

        if (accountId.HasValue)
            query = query.Where(t => t.BankAccountId == accountId.Value);

        var total = await query.SumAsync(t => (decimal?)t.Amount) ?? 0m;
        return Math.Abs(total);
    }

    public async Task<List<MonthlyMatchedAmount>> GetMonthlyByTextAsync(string userId, string matchText, DateOnly from, DateOnly to, int? accountId)
    {
        var query = db.Transactions
            .Where(t => t.UserId == userId && t.Date >= from && t.Date <= to && t.Amount < 0)
            .Where(t => t.Text.Contains(matchText));

        if (accountId.HasValue)
            query = query.Where(t => t.BankAccountId == accountId.Value);

        var items = await query.ToListAsync();
        return items
            .GroupBy(t => (t.Date.Year, t.Date.Month))
            .Select(g => new MonthlyMatchedAmount(g.Key.Year, g.Key.Month, Math.Abs(g.Sum(t => t.Amount))))
            .OrderBy(x => x.Year).ThenBy(x => x.Month)
            .ToList();
    }

    public async Task<(DateOnly? First, DateOnly? Last)> GetDateRangeAsync(string userId, int? accountId = null)
    {
        var query = db.Transactions.Where(t => t.UserId == userId);
        if (accountId.HasValue) query = query.Where(t => t.BankAccountId == accountId);

        if (!await query.AnyAsync())
            return (null, null);

        var first = await query.MinAsync(t => t.Date);
        var last  = await query.MaxAsync(t => t.Date);
        return (first, last);
    }

    public async Task DeleteAllAsync(string userId)
    {
        await db.Transactions.Where(t => t.UserId == userId).ExecuteDeleteAsync();
    }
}
