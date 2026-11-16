using Application.Common.Interfaces;
using Application.Common.Models;

namespace Application.Activities.Queries.GetActivity;

/// <summary>Consulta una actividad por folio.</summary>
public sealed record GetActivity(int Id) : IRequest<ApiResponse<ActivityDetailDTO?>>;

/// <summary>Manejador del detalle de actividad.</summary>
public sealed class GetActivityHandler(ISadContextProcedures procedures, IApiResponseService responses)
    : IRequestHandler<GetActivity, ApiResponse<ActivityDetailDTO?>>
{
    public async Task<ApiResponse<ActivityDetailDTO?>> Handle(GetActivity request, CancellationToken cancellationToken)
    {
        var row = (await procedures.SpRecActividadAsync(request.Id, cancellationToken: cancellationToken))?.FirstOrDefault();
        var detail = row is null ? null : new ActivityDetailDTO(row.Folio, row.Titulo, row.Descripcion,
            row.CodCatedra, row.CodSeccion, row.CodModulo, row.Periodo, row.Tipo, row.Fecha, row.Inicio,
            row.Termino, row.Salas ?? row.Ubicacion, row.Publicar != 0);
        return responses.Success(detail);
    }
}
