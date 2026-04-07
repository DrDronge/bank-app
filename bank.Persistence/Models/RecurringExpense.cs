namespace bank.Persistence.Models;

public class RecurringExpense
{
    public int Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public int FrequencyMonths { get; set; } = 1; // 1=monthly, 3=quarterly, 6=6-monthly, 12=annual
    public string? Category { get; set; }
    public string? Notes { get; set; }
    public string? MatchText { get; set; }
    public DateOnly? EndDate { get; set; }  // final payment date — expense is active until this month inclusive
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
