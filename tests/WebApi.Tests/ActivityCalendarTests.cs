using System.Net;
using System.Text.Json;
using Domain.Constants;
using Domain.Entities.Sad.Sp;
using Xunit;

namespace WebApi.Tests;

public sealed class ActivityCalendarTests
{
    [Fact]
    public async Task Calendar_passes_exact_legacy_filters_and_preserves_null_fields()
    {
        using var factory = new ActivityTestFactory();
        factory.Procedures.Activities.Add(new SpRecActividadesResult { Folio = 7, Titulo = "Clase", Tipo = "EXAMEN",
            Categoria = "DOCENCIA", Descripcion = "", Cod_Catedra = "", Cod_Seccion = "", Profesor = null,
            Dia = "01/05/2020", Inicio = "09:00", Termino = "10:00", Publicar = 1, Suspendida = null });
        using var client = factory.CreateAuthorizedClient(Permission.AccessModule, Permission.ViewCalendar);

        var response = await client.GetAsync("/api/activities?date=2020-05-01&category=1&sector=CENTRAL&location=TODAS");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(("20200501 0:00", "DIA", "TODOS", 1, -100, -100, "TODAS", "CENTRAL"), factory.Procedures.LastFilters);
        var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement;
        Assert.Equal("Clase", json.GetProperty("data")[0].GetProperty("title").GetString());
        Assert.Equal(JsonValueKind.Null, json.GetProperty("data")[0].GetProperty("professor").ValueKind);
    }

    [Theory]
    [InlineData("date=not-date&category=1&sector=CENTRAL&location=TODAS")]
    [InlineData("date=2024-02-30&category=1&sector=CENTRAL&location=TODAS")]
    [InlineData("date=2020-01-01&category=2&sector=CENTRAL&location=TODAS")]
    [InlineData("date=2020-01-01&category=1&sector=&location=TODAS")]
    public async Task Invalid_calendar_input_is_rejected_before_any_read(string query)
    {
        using var factory = new ActivityTestFactory();
        using var client = factory.CreateAuthorizedClient(Permission.AccessModule, Permission.ViewCalendar);
        Assert.Equal(HttpStatusCode.BadRequest, (await client.GetAsync("/api/activities?" + query)).StatusCode);
        Assert.Equal(0, factory.Procedures.Calls);
    }

    [Fact]
    public async Task Past_dates_are_valid_for_read_only_consultation()
    {
        using var factory = new ActivityTestFactory();
        using var client = factory.CreateAuthorizedClient(Permission.AccessModule, Permission.ViewCalendar);
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/activities?date=2000-01-01&category=-100&sector=TODOS&location=TODAS")).StatusCode);
    }

    [Theory]
    [InlineData("PERMISSION_ACTIVITY_ACCESS_MODULE", HttpStatusCode.Forbidden)]
    [InlineData("PERMISSION_ACTIVITY_VIEW_CALENDAR", HttpStatusCode.Forbidden)]
    [InlineData("ROLE_REPORT_ADMIN", HttpStatusCode.Forbidden)]
    [InlineData(Role.ActivityAdmin, HttpStatusCode.OK)]
    [InlineData(Role.ActivitySuperAdmin, HttpStatusCode.OK)]
    public async Task Read_requires_access_and_view_unless_exact_module_admin(string role, HttpStatusCode expected)
    {
        using var factory = new ActivityTestFactory(); using var client = factory.CreateAuthorizedClient(role);
        Assert.Equal(expected, (await client.GetAsync("/api/activities?date=2024-01-01&category=-100&sector=TODOS&location=TODAS")).StatusCode);
    }

    [Fact]
    public async Task Wrong_client_and_anonymous_requests_are_denied()
    {
        using var factory = new ActivityTestFactory();
        using var wrong = factory.CreateAuthorizedClient(Permission.AccessModule, Permission.ViewCalendar);
        wrong.DefaultRequestHeaders.Add("X-Test-Client", "OtherClient");
        Assert.Equal(HttpStatusCode.Forbidden, (await wrong.GetAsync("/api/activities?date=2024-01-01&category=-100&sector=TODOS&location=TODAS")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await factory.CreateClient().GetAsync("/api/activities?date=2024-01-01&category=-100&sector=TODOS&location=TODAS")).StatusCode);
    }

    [Fact]
    public async Task Detail_and_catalogs_return_source_named_values()
    {
        using var factory = new ActivityTestFactory();
        factory.Procedures.Details.Add(new SpRecActividadResult { Folio = 9, Titulo = "Seminario", Descripcion = "Detalle",
            Tipo = "SEMINARIO", Cod_Catedra = "", Cod_Seccion = "", Cod_Modulo = "", Periodo = "", Salas = null });
        factory.Procedures.Types.Add(new SpRecActividadesTiposResult { Tipo = "SEMINARIO" });
        factory.Procedures.Locations.Add(new SpRecActividadesSalasResult { Codigo = "A1", Nombre = null, Sector = "CENTRAL" });
        using var client = factory.CreateAuthorizedClient(Permission.AccessModule, Permission.ViewCalendar);
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/activities/9")).StatusCode);
        var catalogs = JsonDocument.Parse(await (await client.GetAsync("/api/activities/catalogs?category=DOCENCIA&sector=TODOS")).Content.ReadAsStringAsync()).RootElement;
        Assert.Contains(catalogs.GetProperty("data").GetProperty("types").EnumerateArray(), item => item.GetProperty("value").GetString() == "SEMINARIO");
    }

    [Fact]
    public async Task Invalid_id_does_not_read_and_missing_detail_is_404()
    {
        using var factory = new ActivityTestFactory(); using var client = factory.CreateAuthorizedClient(Permission.AccessModule, Permission.ViewCalendar);
        Assert.Equal(HttpStatusCode.BadRequest, (await client.GetAsync("/api/activities/0")).StatusCode);
        Assert.Equal(0, factory.Procedures.Calls);
        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync("/api/activities/123")).StatusCode);
    }

    [Fact]
    public async Task Storage_failure_is_sanitized_as_503()
    {
        using var factory = new ActivityTestFactory(); factory.Procedures.Fail = true;
        using var client = factory.CreateAuthorizedClient(Permission.AccessModule, Permission.ViewCalendar);
        var response = await client.GetAsync("/api/activities?date=2024-01-01&category=-100&sector=TODOS&location=TODAS");
        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        Assert.DoesNotContain("sql private detail", await response.Content.ReadAsStringAsync());
    }
}
