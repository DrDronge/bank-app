using Microsoft.AspNetCore.Mvc;
using bank.Persistence.Repository;

namespace bank.Api.Controllers;

[ApiController]
[Route("api/accounts")]
public class BankAccountsController(IBankAccountRepository repository) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var accounts = await repository.GetAllAsync();
        return Ok(accounts);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateAccountRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest(new { error = "Name is required." });

        var account = await repository.CreateAsync(
            request.Name,
            request.Type ?? "Checking",
            request.Color ?? "#6366f1");

        return Ok(account);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        await repository.DeleteAsync(id);
        return Ok(new { message = "Account deleted." });
    }
}

public record CreateAccountRequest(string Name, string? Type, string? Color);
