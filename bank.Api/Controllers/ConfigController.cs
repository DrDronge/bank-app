using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace bank.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[AllowAnonymous]
public class ConfigController(IConfiguration configuration) : ControllerBase
{
    /// <summary>
    /// Returns public Keycloak configuration so the frontend can initialise
    /// keycloak-js at runtime without baking URLs into the JS bundle.
    /// </summary>
    [HttpGet]
    public IActionResult Get() => Ok(new
    {
        keycloakUrl = configuration["Keycloak:PublicUrl"] ?? "http://localhost:8180",
        realm       = configuration["Keycloak:Realm"]    ?? "bank",
        clientId    = configuration["Keycloak:ClientId"] ?? "bank-web",
    });
}
