using Application.Common.Interfaces;
using Application.Common.Models;

namespace Application.Activities.Queries.GetActivities;

/// <summary>Consulta el calendario de un día con la semántica de filtros legada.</summary>
public sealed record GetActivities(DateOnly Date, int Category, string Sector, string Location)
    : IRequest<ApiResponse<IReadOnlyList<ActivityRowDTO>>>;

/// <summary>Manejador de la consulta diaria de actividades.</summary>
public sealed class GetActivitiesHandler(ISadContextProcedures procedures, IApiResponseService responses)
    : IRequestHandler<GetActivities, ApiResponse<IReadOnlyList<ActivityRowDTO>>>
{
    public async Task<ApiResponse<IReadOnlyList<ActivityRowDTO>>> Handle(GetActivities request, CancellationToken cancellationToken)
    {
        var rows = await procedures.SpRecActividadesAsync(
            request.Date.ToString("yyyyMMdd") + " 0:00", "DIA", "TODOS", request.Category, -100, -100,
            request.Location, request.Sector, cancellationToken: cancellationToken) ?? [];
        return responses.Success<IReadOnlyList<ActivityRowDTO>>(rows.Select(row => new ActivityRowDTO(
            row.Folio, row.Titulo, row.Curso, row.Profesor, row.Categoria, row.Tipo, row.Dia, row.Inicio,
            row.Termino, row.TipoAlumnoPostgrado, row.ModalidadPostgrado, row.Promocion, row.Salas,
            row.Publicar != 0, row.Suspendida != 0)).ToArray());
    }
}
