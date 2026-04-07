using Microsoft.EntityFrameworkCore;
using bank.Persistence.Models;

namespace bank.Persistence.Repository;

public class BankAccountRepository(ApplicationDbContext db) : IBankAccountRepository
{
    public Task<List<BankAccount>> GetAllAsync(string userId) =>
        db.BankAccounts
            .Where(a => a.UserId == userId)
            .OrderBy(a => a.CreatedAt)
            .ToListAsync();

    public Task<BankAccount?> GetByIdAsync(int id, string userId) =>
        db.BankAccounts.FirstOrDefaultAsync(a => a.Id == id && a.UserId == userId);

    public async Task<BankAccount> CreateAsync(string userId, string name, string type, string color)
    {
        var account = new BankAccount
        {
            UserId = userId,
            Name = name,
            Type = type,
            Color = color,
            CreatedAt = DateTime.UtcNow
        };
        db.BankAccounts.Add(account);
        await db.SaveChangesAsync();
        return account;
    }

    public async Task DeleteAsync(int id, string userId)
    {
        var account = await db.BankAccounts.FirstOrDefaultAsync(a => a.Id == id && a.UserId == userId);
        if (account is not null)
        {
            db.BankAccounts.Remove(account);
            await db.SaveChangesAsync();
        }
    }
}
