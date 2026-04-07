using bank.Persistence.Models;

namespace bank.Persistence.Repository;

public interface IBankAccountRepository
{
    Task<List<BankAccount>> GetAllAsync(string userId);
    Task<BankAccount?> GetByIdAsync(int id, string userId);
    Task<BankAccount> CreateAsync(string userId, string name, string type, string color);
    Task DeleteAsync(int id, string userId);
}
