using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using bank.Persistence.Repository;

namespace bank.Api.Controllers;

[ApiController]
[Route("api/accounts")]
[Authorize]
public class BankAccountsController(IBankAccountRepository repository) : AuthControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var accounts = await repository.GetAllAsync(UserId);
        return Ok(accounts);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateAccountRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest(new { error = "Name is required." });

        var account = await repository.CreateAsync(
            UserId,
            request.Name,
            request.Type ?? "Checking",
            request.Color ?? "#6366f1");

        return Ok(account);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var account = await repository.GetByIdAsync(id, UserId);
        if (account is null)
            return NotFound(new { error = "Account not found." });

        await repository.DeleteAsync(id, UserId);
        return Ok(new { message = "Account deleted." });
    }
}

public record CreateAccountRequest(string Name, string? Type, string? Color);
