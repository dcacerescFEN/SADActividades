using System.Net;
using System.Text.Json;
using Application.Navigation;
using Domain.Constants;
using Infrastructure.Configuration;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Xunit;
using ApplicationRow = Domain.Entities.AppConfig.Application;
using ConfigurationRow = Domain.Entities.AppConfig.Configuration;
using EnvironmentRow = Domain.Entities.AppConfig.Environment;

namespace WebApi.Tests;

/// <summary>
/// La barra de navegación obtiene sus URLs desde AppConfig: el endpoint debe publicar los nueve
/// pares compartidos y cerrarse con 503 cuando la configuración del sitio no está disponible.
/// </summary>
public sealed class SiteConfigTests
{
    private static readonly IReadOnlyDictionary<string, string?> NinePairs =
        new Dictionary<string, string?>(StringComparer.Ordinal)
        {
            ["studentsMenuUrl"] = "https://alumnos.personalizado.test",
            ["teachersMenuUrl"] = "https://profesores.personalizado.test",
            ["coursesMenuUrl"] = "https://cursos.personalizado.test",
            ["examsMenuUrl"] = "https://examenes.personalizado.test",
            ["activitiesMenuUrl"] = "https://actividades.personalizado.test",
            ["assistantsMenuUrl"] = "https://ayudantes.personalizado.test",
            ["processesMenuUrl"] = "https://procesos.personalizado.test",
            ["reportsMenuUrl"] = "https://informes.personalizado.test",
            ["administrationMenuUrl"] = "https://administracion.personalizado.test",
            ["studentsMenuClientId"] = "AlumnosPersonalizado",
            ["teachersMenuClientId"] = "ProfesoresPersonalizado",
            ["coursesMenuClientId"] = "CursosPersonalizado",
            ["examsMenuClientId"] = "ExamenesPersonalizado",
            ["activitiesMenuClientId"] = "ActividadesPersonalizado",
            ["assistantsMenuClientId"] = "AyudantesPersonalizado",
            ["processesMenuClientId"] = "ProcesosPersonalizado",
            ["reportsMenuClientId"] = "InformesPersonalizado",
            ["administrationMenuClientId"] = "AdministracionPersonalizado",
        };

    [Fact]
    public async Task Unavailable_menu_returns_a_sanitized_503_and_health_keeps_serving()
    {
        // El proveedor reproduce el fallo real del arranque: una instantánea del sitio sin inicializar.
        using var factory = CreateFactory(() => new SiteSettings().Menu);
        using var client = CreateClient(factory, Permission.ACTIVITY_ACCESS);

        var response = await client.GetAsync("/api/config/site");

        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        var json = JsonDocument.Parse(body).RootElement;
        Assert.Equal("La navegación no está disponible.", json.GetProperty("title").GetString());
        Assert.DoesNotContain("inicializada", body, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("AppConfig", body, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("Exception", body, StringComparison.OrdinalIgnoreCase);

        // El arranque absorbió el fallo de la base: la salud del servicio sigue disponible.
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/health")).StatusCode);
    }

    [Fact]
    public async Task Configured_menu_is_published_with_the_shared_envelope_and_the_nine_pairs()
    {
        using var factory = CreateFactory(() => NinePairs);
        using var client = CreateClient(factory, Permission.ACTIVITY_ACCESS);

        var response = await client.GetAsync("/api/config/site");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement;
        Assert.True(json.GetProperty("success").GetBoolean());
        Assert.Equal("Operación exitosa.", json.GetProperty("message").GetString());
        var data = json.GetProperty("data");
        Assert.Equal(18, data.EnumerateObject().Count());
        foreach (var pair in NinePairs)
            Assert.Equal(pair.Value, data.GetProperty(pair.Key).GetString());
    }

    [Theory]
    [InlineData(null, HttpStatusCode.Unauthorized)]
    [InlineData(Permission.VIEW_CALENDAR, HttpStatusCode.Forbidden)]
    [InlineData(Roles.Administrator, HttpStatusCode.OK)]
    [InlineData(Permission.ACTIVITY_ACCESS, HttpStatusCode.OK)]
    public async Task Site_configuration_requires_the_module_access_permission(
        string? role, HttpStatusCode expected)
    {
        using var factory = CreateFactory(() => NinePairs);
        using var client = role is null ? factory.CreateClient() : CreateClient(factory, role);

        Assert.Equal(expected, (await client.GetAsync("/api/config/site")).StatusCode);
    }

    [Fact]
    public async Task Menu_missing_a_url_fails_closed_instead_of_publishing_an_empty_link()
    {
        var incomplete = NinePairs.ToDictionary(pair => pair.Key, pair => pair.Value, StringComparer.Ordinal);
        incomplete["studentsMenuUrl"] = "   ";
        using var factory = CreateFactory(() => incomplete);
        using var client = CreateClient(factory, Permission.ACTIVITY_ACCESS);

        Assert.Equal(HttpStatusCode.ServiceUnavailable, (await client.GetAsync("/api/config/site")).StatusCode);
    }

    [Fact]
    public void Only_active_rows_of_the_configured_application_and_environment_are_read()
    {
        var application = new ApplicationRow { ApplicationId = 1, ApplicationName = "SADActividades", IsActive = true };
        var inactiveApplication = new ApplicationRow { ApplicationId = 2, ApplicationName = "SADActividades", IsActive = false };
        var otherApplication = new ApplicationRow { ApplicationId = 3, ApplicationName = "SADInformes", IsActive = true };
        var environment = new EnvironmentRow { EnvironmentId = 1, EnvironmentName = "DEV", IsActive = true };
        var inactiveEnvironment = new EnvironmentRow { EnvironmentId = 2, EnvironmentName = "DEV", IsActive = false };
        var otherEnvironment = new EnvironmentRow { EnvironmentId = 3, EnvironmentName = "PROD", IsActive = true };

        var rows = new List<ConfigurationRow>
        {
            Row(1, "StudentsMenuUrl", "https://vigente.test", application, environment),
            Row(2, "TeachersMenuUrl", "https://configuracion-inactiva.test", application, environment, isActive: false),
            Row(3, "CoursesMenuUrl", "https://aplicacion-inactiva.test", inactiveApplication, environment),
            Row(4, "ExamsMenuUrl", "https://ambiente-inactivo.test", application, inactiveEnvironment),
            Row(5, "ActivitiesMenuUrl", "https://otro-ambiente.test", application, otherEnvironment),
            Row(6, "AssistantsMenuUrl", "https://otra-aplicacion.test", otherApplication, environment),
            Row(7, "StudentUrl", "https://alias-legado.test", application, environment),
            Row(8, "SendEmail", "1", application, environment),
        };

        var entries = ConfigurationInitialiser
            .BuildQuery(rows.AsQueryable(), "SADActividades", "DEV")
            .ToList();

        Assert.Equal(
            ["StudentUrl", "StudentsMenuUrl"],
            entries.Select(entry => entry.ConfigurationName).OrderBy(name => name, StringComparer.Ordinal));
        var menu = ConfigurationInitialiser.BuildMenu(
            entries.ToDictionary(entry => entry.ConfigurationName, entry => entry.ConfigurationValue, StringComparer.OrdinalIgnoreCase));
        Assert.Equal("https://vigente.test", menu["studentsMenuUrl"]);
    }

    [Fact]
    public void Missing_configuration_falls_back_to_the_dev_defaults_of_the_reference()
    {
        var menu = ConfigurationInitialiser.BuildMenu(
            new Dictionary<string, string?>(StringComparer.OrdinalIgnoreCase));

        Assert.Equal(18, menu.Count);
        Assert.Equal("https://sadalumnos-dev.fen.uchile.cl", menu["studentsMenuUrl"]);
        Assert.Equal("https://sadprofesores-dev.fen.uchile.cl", menu["teachersMenuUrl"]);
        Assert.Equal("https://sadcursos-dev.fen.uchile.cl", menu["coursesMenuUrl"]);
        Assert.Equal("https://sadexamenes-dev.fen.uchile.cl", menu["examsMenuUrl"]);
        Assert.Equal("https://sadactividades-dev.fen.uchile.cl", menu["activitiesMenuUrl"]);
        Assert.Equal("https://sadayudantes-dev.fen.uchile.cl", menu["assistantsMenuUrl"]);
        Assert.Equal("https://sadprocesos-dev.fen.uchile.cl", menu["processesMenuUrl"]);
        Assert.Equal("https://sadinformes-dev.fen.uchile.cl", menu["reportsMenuUrl"]);
        Assert.Equal("https://sadadministracion-dev.fen.uchile.cl", menu["administrationMenuUrl"]);
        Assert.Equal("SADAlumnos", menu["studentsMenuClientId"]);
        Assert.Equal("SADProfesores", menu["teachersMenuClientId"]);
        Assert.Equal("SADCursos", menu["coursesMenuClientId"]);
        Assert.Equal("SADExamenes", menu["examsMenuClientId"]);
        Assert.Equal("SADActividades", menu["activitiesMenuClientId"]);
        Assert.Equal("SADAyudantes", menu["assistantsMenuClientId"]);
        Assert.Equal("SADProcesos", menu["processesMenuClientId"]);
        Assert.Equal("SADInformes", menu["reportsMenuClientId"]);
        Assert.Equal("SADAdministracion", menu["administrationMenuClientId"]);
    }

    [Fact]
    public void Legacy_alias_names_are_accepted_only_for_students_and_teachers()
    {
        var aliases = ConfigurationInitialiser.BuildMenu(
            new Dictionary<string, string?>(StringComparer.OrdinalIgnoreCase)
            {
                ["StudentUrl"] = "https://alias-alumnos.test",
                ["TeacherClientId"] = "ProfesoresLegado",
            });

        Assert.Equal("https://alias-alumnos.test", aliases["studentsMenuUrl"]);
        Assert.Equal("ProfesoresLegado", aliases["teachersMenuClientId"]);
        Assert.Equal("https://sadcursos-dev.fen.uchile.cl", aliases["coursesMenuUrl"]);

        var both = ConfigurationInitialiser.BuildMenu(
            new Dictionary<string, string?>(StringComparer.OrdinalIgnoreCase)
            {
                ["StudentsMenuUrl"] = "https://nombre-vigente.test",
                ["StudentUrl"] = "https://nombre-legado.test",
            });

        Assert.Equal("https://nombre-vigente.test", both["studentsMenuUrl"]);
    }

    [Fact]
    public void Site_snapshot_is_taken_once_and_is_unavailable_before_initialising()
    {
        var settings = new SiteSettings();
        Assert.Throws<InvalidOperationException>(() => { _ = settings.Menu; });

        settings.Initialize("SADActividades", "DEV", NinePairs);

        Assert.Equal("SADActividades", settings.ApplicationName);
        Assert.Equal("DEV", settings.EnvironmentName);
        Assert.Equal(NinePairs.Count, settings.Menu.Count);
        Assert.Throws<InvalidOperationException>(() => settings.Initialize("SADActividades", "DEV", NinePairs));
    }

    private static ConfigurationRow Row(int id, string name, string value, ApplicationRow application,
        EnvironmentRow environment, bool isActive = true) =>
        new()
        {
            ConfigurationId = id,
            ConfigurationName = name,
            ConfigurationValue = value,
            IsActive = isActive,
            ApplicationId = application.ApplicationId,
            Application = application,
            EnvironmentId = environment.EnvironmentId,
            Environment = environment,
        };

    /// <summary>
    /// Sustituye el proveedor real por uno controlado por la prueba, sobre la misma canalización
    /// autenticada del proyecto; las pruebas nunca abren la base AppConfig.
    /// </summary>
    private static WebApplicationFactory<Program> CreateFactory(Func<IReadOnlyDictionary<string, string?>> menu) =>
        new ActivityTestFactory().WithWebHostBuilder(builder => builder.ConfigureServices(services =>
        {
            services.Remove(services.Single(item => item.ServiceType == typeof(ISiteMenuProvider)));
            services.AddSingleton<ISiteMenuProvider>(new FakeSiteMenuProvider(menu));
        }));

    private static HttpClient CreateClient(WebApplicationFactory<Program> factory, string role)
    {
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Test-Roles", role);
        return client;
    }

    private sealed class FakeSiteMenuProvider(Func<IReadOnlyDictionary<string, string?>> menu) : ISiteMenuProvider
    {
        public Task<IReadOnlyDictionary<string, string?>> GetMenuAsync(CancellationToken cancellationToken)
        {
            cancellationToken.ThrowIfCancellationRequested();
            return Task.FromResult(menu());
        }
    }
}
