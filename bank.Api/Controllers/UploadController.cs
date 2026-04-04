using Microsoft.AspNetCore.Mvc;
using bank.Api.Services;

namespace bank.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class UploadController(CsvImportService importService) : ControllerBase
{
    [HttpPost]
    [RequestSizeLimit(10 * 1024 * 1024)] // 10 MB max
    public async Task<IActionResult> Upload(IFormFile file, [FromQuery] int? accountId = null)
    {
        if (file is null || file.Length == 0)
            return BadRequest(new { error = "No file uploaded." });

        if (!file.FileName.EndsWith(".csv", StringComparison.OrdinalIgnoreCase))
            return BadRequest(new { error = "Only CSV files are supported." });

        using var stream = file.OpenReadStream();
        var result = await importService.ImportAsync(stream, accountId);

        return Ok(new
        {
            message = $"Import complete: {result.Imported} new transactions added, {result.Skipped} skipped (duplicates or errors).",
            result.Imported,
            result.Skipped,
            detectedFormat = result.DetectedFormat
        });
    }
}
