using Application.Navigation;
using Infrastructure.Configuration;

namespace Infrastructure.Services;

/// <summary>Publica la instantánea del menú tomada al arrancar desde AppConfig.</summary>
public sealed class SiteMenuProvider(SiteSettings settings) : ISiteMenuProvider
{
    /// <inheritdoc />
    public Task<IReadOnlyDictionary<string, string?>> GetMenuAsync(CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        return Task.FromResult(settings.Menu);
    }
}
