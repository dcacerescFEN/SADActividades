using Domain.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.Options;
using WebApi.Authentication;

namespace WebApi.Authorization;

public sealed class PermissionPolicyProvider(
    IOptions<AuthorizationOptions> options,
    KeycloakConfigurationState configuration)
    : DefaultAuthorizationPolicyProvider(options)
{
    public override async Task<AuthorizationPolicy?> GetPolicyAsync(string policyName)
    {
        var policy = await base.GetPolicyAsync(policyName);
        if (policy is not null || !Permission.All.Contains(policyName)) return policy;

        var clientId = configuration.PublicConfiguration?.ClientId;
        return new AuthorizationPolicyBuilder()
            .RequireAuthenticatedUser()
            .RequireAssertion(context => clientId is not null
                && KeycloakClaimsMapper.HasPermission(context.User, policyName, clientId))
            .Build();
    }
}
