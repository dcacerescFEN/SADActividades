using System.Data.Common;
using Application.Navigation;
using Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace Infrastructure.Configuration;

/// <summary>Extensión de arranque que publica la configuración del sitio antes de autenticar.</summary>
public static class ConfigurationInitialiserExtensions
{
    /// <summary>
    /// Toma la instantánea de AppConfig. Un fallo de la base no impide servir la API: el menú queda
    /// no disponible y responde 503, mientras health y sesión siguen funcionando.
    /// </summary>
    /// <param name="services">Proveedor de servicios de la aplicación.</param>
    /// <param name="configuration">Configuración con los selectores de AppConfig.</param>
    /// <param name="cancellationToken">Token del ciclo de vida de la aplicación.</param>
    public static async Task InitialiseConfigurationAsync(this IServiceProvider services,
        IConfiguration configuration, CancellationToken cancellationToken = default)
    {
        using var scope = services.CreateScope();
        try
        {
            await scope.ServiceProvider.GetRequiredService<ConfigurationInitialiser>()
                .InitialiseAsync(configuration, cancellationToken);
        }
        catch (Exception error)
            when (error is DbException or InvalidOperationException or ArgumentException)
        {
            // Sin publicación parcial: el menú devuelve 503, pero health y sesión siguen disponibles.
        }
    }
}

/// <summary>Fila de AppConfig utilizada para componer la configuración del sitio.</summary>
/// <param name="ConfigurationName">Nombre del campo configurado.</param>
/// <param name="ConfigurationValue">Valor configurado para el campo.</param>
public sealed record ConfigurationEntry(string ConfigurationName, string? ConfigurationValue);

/// <summary>Toma la instantánea del menú de navegación desde la base AppConfig.</summary>
public sealed class ConfigurationInitialiser(
    AppConfigContext configContext,
    SiteSettings settings,
    ILogger<ConfigurationInitialiser> logger)
{
    /// <summary>
    /// Valores por defecto de DEV de la referencia, usados solo cuando AppConfig no tiene la fila
    /// correspondiente para esta aplicación. No incluyen credenciales.
    /// </summary>
    private static readonly IReadOnlyDictionary<string, string> Defaults =
        new Dictionary<string, string>(StringComparer.Ordinal)
        {
            ["StudentsMenuUrl"] = "https://sadalumnos-dev.fen.uchile.cl",
            ["TeachersMenuUrl"] = "https://sadprofesores-dev.fen.uchile.cl",
            ["CoursesMenuUrl"] = "https://sadcursos-dev.fen.uchile.cl",
            ["ExamsMenuUrl"] = "https://sadexamenes-dev.fen.uchile.cl",
            ["ActivitiesMenuUrl"] = "https://sadactividades-dev.fen.uchile.cl",
            ["AssistantsMenuUrl"] = "https://sadayudantes-dev.fen.uchile.cl",
            ["ProcessesMenuUrl"] = "https://sadprocesos-dev.fen.uchile.cl",
            ["ReportsMenuUrl"] = "https://sadinformes-dev.fen.uchile.cl",
            ["AdministrationMenuUrl"] = "https://sadadministracion-dev.fen.uchile.cl",
            ["StudentsMenuClientId"] = "SADAlumnos",
            ["TeachersMenuClientId"] = "SADProfesores",
            ["CoursesMenuClientId"] = "SADCursos",
            ["ExamsMenuClientId"] = "SADExamenes",
            ["ActivitiesMenuClientId"] = "SADActividades",
            ["AssistantsMenuClientId"] = "SADAyudantes",
            ["ProcessesMenuClientId"] = "SADProcesos",
            ["ReportsMenuClientId"] = "SADInformes",
            ["AdministrationMenuClientId"] = "SADAdministracion",
        };

    /// <summary>Lee AppConfig y publica la instantánea del menú del sitio.</summary>
    /// <param name="configuration">Configuración con ConfigureSite:ApplicationName y EnvironmentName.</param>
    /// <param name="cancellationToken">Token de cancelación del arranque.</param>
    /// <exception cref="InvalidOperationException">Faltan los selectores o un valor obligatorio.</exception>
    public async Task InitialiseAsync(IConfiguration configuration,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var application = configuration["ConfigureSite:ApplicationName"];
            var environment = configuration["ConfigureSite:EnvironmentName"];
            if (string.IsNullOrWhiteSpace(application) || string.IsNullOrWhiteSpace(environment))
                throw new InvalidOperationException("Los selectores de AppConfig son obligatorios.");

            var entries = await BuildQuery(configContext.Configurations.AsNoTracking(), application, environment)
                .ToListAsync(cancellationToken);
            var values = new Dictionary<string, string?>(StringComparer.OrdinalIgnoreCase);
            foreach (var entry in entries)
                values[entry.ConfigurationName] = entry.ConfigurationValue;

            var menu = BuildMenu(values);
            cancellationToken.ThrowIfCancellationRequested();
            settings.Initialize(application, environment, menu);
        }
        catch (Exception error)
            when (error is DbException or InvalidOperationException or ArgumentException)
        {
            logger.LogWarning("No se pudo inicializar la configuración de navegación desde AppConfig.");
            throw;
        }
    }

    /// <summary>
    /// Compone la consulta de filas vigentes de AppConfig para la aplicación y el ambiente
    /// indicados. Se expone para verificar el filtrado sin abrir la base AppConfig.
    /// </summary>
    /// <param name="source">Configuraciones disponibles.</param>
    /// <param name="applicationName">Aplicación seleccionada.</param>
    /// <param name="environmentName">Ambiente seleccionado.</param>
    /// <returns>Consulta que proyecta solo los campos del menú.</returns>
    public static IQueryable<ConfigurationEntry> BuildQuery(
        IQueryable<Domain.Entities.AppConfig.Configuration> source,
        string applicationName,
        string environmentName)
    {
        var keys = SiteMenuFields.Names.Concat(SiteMenuFields.LegacyAliases.Values)
            .Select(name => name.ToLowerInvariant())
            .ToArray();
        return source
            .Where(row => row.IsActive
                && row.Application.IsActive
                && row.Environment.IsActive
                && row.Application.ApplicationName == applicationName
                && row.Environment.EnvironmentName == environmentName
                && keys.Contains(row.ConfigurationName.ToLower()))
            .Select(row => new ConfigurationEntry(row.ConfigurationName, row.ConfigurationValue));
    }

    /// <summary>
    /// Normaliza los valores leídos a los nueve pares en camelCase que consume la barra de
    /// navegación, aplicando los alias legados y los valores por defecto de DEV.
    /// </summary>
    /// <param name="values">Valores leídos de AppConfig, indexados por nombre de campo.</param>
    /// <returns>Menú normalizado.</returns>
    /// <exception cref="InvalidOperationException">Una URL configurada está vacía.</exception>
    public static IReadOnlyDictionary<string, string?> BuildMenu(
        IReadOnlyDictionary<string, string?> values)
    {
        var menu = new Dictionary<string, string?>(StringComparer.Ordinal);
        foreach (var name in SiteMenuFields.Names)
            menu[CamelCase(name)] = name.EndsWith("Url", StringComparison.Ordinal)
                ? RequiredUrl(values, name)
                : ConfiguredValue(values, name) ?? Defaults[name];
        return menu;
    }

    /// <summary>Convierte el nombre canónico del campo en la clave camelCase del menú.</summary>
    private static string CamelCase(string name) => char.ToLowerInvariant(name[0]) + name[1..];

    /// <summary>Lee el valor configurado y recurre al nombre legado solo si el canónico no existe.</summary>
    private static string? ConfiguredValue(IReadOnlyDictionary<string, string?> values, string key)
    {
        if (values.TryGetValue(key, out var value))
            return value;
        return SiteMenuFields.LegacyAliases.TryGetValue(key, out var legacy)
            ? values.GetValueOrDefault(legacy)
            : null;
    }

    /// <summary>Una URL sin configuración usa el valor por defecto, pero nunca se publica vacía.</summary>
    private static string RequiredUrl(IReadOnlyDictionary<string, string?> values, string key)
    {
        var value = ConfiguredValue(values, key) ?? Defaults[key];
        if (string.IsNullOrWhiteSpace(value))
            throw new InvalidOperationException($"La configuración '{key}' no es válida.");
        return value.Trim();
    }
}
