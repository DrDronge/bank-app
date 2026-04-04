using bank.Persistence.Models;

namespace bank.Persistence.Repository;

public interface IBankAccountRepository
{
    Task<List<BankAccount>> GetAllAsync();
    Task<BankAccount> CreateAsync(string name, string type, string color);
    Task DeleteAsync(int id);
}
