using System.Globalization;
using Application.Activities.Queries.GetActivities;
using Application.Activities.Queries.GetActivity;
using Application.Activities.Queries.GetActivityCatalogs;
using Application.Common.Interfaces;
using Domain.Constants;

namespace WebApi.Endpoints.Activities;

/// <summary>Endpoints de solo lectura del calendario de Actividades.</summary>
public static class ActivityEndpoints
{
    public static IEndpointRouteBuilder MapActivityEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/activities")
            .RequireAuthorization(Permission.AccessModule, Permission.ViewCalendar);

        group.MapGet("", GetActivities);
        group.MapGet("/catalogs", GetCatalogs);
        group.MapGet("/{id:int}", GetActivity);
        return endpoints;
    }

    private static async Task<IResult> GetActivities(string? date, int category, string? sector, string? location,
        IRequestDispatcher dispatcher, CancellationToken cancellationToken)
    {
        if (!DateOnly.TryParseExact(date, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsedDate)
            || category is not (-100 or 0 or 1) || !ValidFilter(sector) || !ValidFilter(location))
            return Results.BadRequest(new { title = "Los filtros de actividades no son válidos." });
        try
        {
            return Results.Ok(await dispatcher.Send(new GetActivities(parsedDate, category, sector!, location!), cancellationToken));
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested) { throw; }
        catch { return Unavailable(); }
    }

    private static async Task<IResult> GetActivity(int id, IRequestDispatcher dispatcher, CancellationToken cancellationToken)
    {
        if (id <= 0) return Results.BadRequest(new { title = "El folio de actividad no es válido." });
        try
        {
            var response = await dispatcher.Send(new GetActivity(id), cancellationToken);
            return response.Data is null ? Results.NotFound() : Results.Ok(response);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested) { throw; }
        catch { return Unavailable(); }
    }

    private static async Task<IResult> GetCatalogs(string? category, string? sector,
        IRequestDispatcher dispatcher, CancellationToken cancellationToken)
    {
        if (category is not ("DOCENCIA" or "OTRO" or "TODAS") || !ValidFilter(sector))
            return Results.BadRequest(new { title = "Los filtros de catálogo no son válidos." });
        try { return Results.Ok(await dispatcher.Send(new GetActivityCatalogs(category, sector!), cancellationToken)); }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested) { throw; }
        catch { return Unavailable(); }
    }

    private static bool ValidFilter(string? value) => !string.IsNullOrWhiteSpace(value)
        && value.Length <= 20 && value.All(character => !char.IsControl(character));

    private static IResult Unavailable() => Results.Problem(statusCode: StatusCodes.Status503ServiceUnavailable,
        title: "La consulta de actividades no está disponible.");
}
