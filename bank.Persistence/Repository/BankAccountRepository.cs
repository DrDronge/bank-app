using Microsoft.EntityFrameworkCore;
using bank.Persistence.Models;

namespace bank.Persistence.Repository;

public class BankAccountRepository(ApplicationDbContext db) : IBankAccountRepository
{
    public Task<List<BankAccount>> GetAllAsync() =>
        db.BankAccounts.OrderBy(a => a.CreatedAt).ToListAsync();

    public async Task<BankAccount> CreateAsync(string name, string type, string color)
    {
        var account = new BankAccount
        {
            Name = name,
            Type = type,
            Color = color,
            CreatedAt = DateTime.UtcNow
        };
        db.BankAccounts.Add(account);
        await db.SaveChangesAsync();
        return account;
    }

    public async Task DeleteAsync(int id)
    {
        var account = await db.BankAccounts.FindAsync(id);
        if (account is not null)
        {
            db.BankAccounts.Remove(account);
            await db.SaveChangesAsync();
        }
    }
}
