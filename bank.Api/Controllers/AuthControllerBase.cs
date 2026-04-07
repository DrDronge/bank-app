using Microsoft.AspNetCore.Mvc;

namespace bank.Api.Controllers;

public abstract class AuthControllerBase : ControllerBase
{
    /// <summary>
    /// The authenticated user's Keycloak subject ID (the "sub" claim).
    /// </summary>
    protected string UserId =>
        User.FindFirst("sub")?.Value
        ?? throw new InvalidOperationException("sub claim missing from token.");
}
