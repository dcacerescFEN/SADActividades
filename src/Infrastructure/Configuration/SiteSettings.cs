using System.Collections.ObjectModel;

namespace Infrastructure.Configuration;

/// <summary>
/// Instantánea única de la configuración operativa del sitio. Se toma una sola vez durante el
/// arranque; si no fue inicializada, solicitar el menú falla y el endpoint responde 503.
/// </summary>
public sealed class SiteSettings
{
    private sealed record Settings(
        string ApplicationName,
        string EnvironmentName,
        IReadOnlyDictionary<string, string?> Menu);

    private Settings? _settings;

    private Settings Current => Volatile.Read(ref _settings)
        ?? throw new InvalidOperationException("La configuración operativa del sitio no fue inicializada.");

    /// <summary>Aplicación usada para filtrar AppConfig.</summary>
    public string ApplicationName => Current.ApplicationName;

    /// <summary>Ambiente usado para filtrar AppConfig.</summary>
    public string EnvironmentName => Current.EnvironmentName;

    /// <summary>Pares de configuración del menú, con nombres en camelCase.</summary>
    public IReadOnlyDictionary<string, string?> Menu => Current.Menu;

    /// <summary>Toma la instantánea del sitio una única vez.</summary>
    /// <param name="applicationName">Aplicación leída de ConfigureSite:ApplicationName.</param>
    /// <param name="environmentName">Ambiente leído de ConfigureSite:EnvironmentName.</param>
    /// <param name="menu">Menú ya normalizado por el inicializador.</param>
    /// <exception cref="InvalidOperationException">La configuración ya fue inicializada.</exception>
    public void Initialize(string applicationName, string environmentName,
        IReadOnlyDictionary<string, string?> menu)
    {
        var copy = new ReadOnlyDictionary<string, string?>(
            menu.ToDictionary(pair => pair.Key, pair => pair.Value));
        var candidate = new Settings(applicationName, environmentName, copy);
        if (Interlocked.CompareExchange(ref _settings, candidate, null) is not null)
            throw new InvalidOperationException("La configuración operativa del sitio ya ha sido inicializada.");
    }
}
