namespace bank.Persistence.Models;

public class Transaction
{
    public int Id { get; set; }
    public DateOnly Date { get; set; }
    public string Category { get; set; } = string.Empty;
    public string Subcategory { get; set; } = string.Empty;
    public string Text { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public decimal Balance { get; set; }
    public string Status { get; set; } = string.Empty;
    public bool Reconciled { get; set; }
    public DateTime ImportedAt { get; set; } = DateTime.UtcNow;

    public int? BankAccountId { get; set; }
    public BankAccount? BankAccount { get; set; }
}
