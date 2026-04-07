using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using bank.Api.Services;
using bank.Persistence.Repository;

namespace bank.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UploadController(CsvImportService importService, IBankAccountRepository accountRepository) : AuthControllerBase
{
    [HttpPost]
    [RequestSizeLimit(10 * 1024 * 1024)] // 10 MB max
    public async Task<IActionResult> Upload(IFormFile file, [FromQuery] int? accountId = null)
    {
        if (file is null || file.Length == 0)
            return BadRequest(new { error = "No file uploaded." });

        if (!file.FileName.EndsWith(".csv", StringComparison.OrdinalIgnoreCase))
            return BadRequest(new { error = "Only CSV files are supported." });

        // Verify the target account belongs to this user
        if (accountId.HasValue)
        {
            var account = await accountRepository.GetByIdAsync(accountId.Value, UserId);
            if (account is null)
                return NotFound(new { error = "Account not found." });
        }

        using var stream = file.OpenReadStream();
        var result = await importService.ImportAsync(stream, UserId, accountId);

        return Ok(new
        {
            message = $"Import complete: {result.Imported} new transactions added, {result.Skipped} skipped (duplicates or errors).",
            result.Imported,
            result.Skipped,
            detectedFormat = result.DetectedFormat
        });
    }
}
