using Application.Common.Interfaces;
using Application.Common.Models;
namespace Application.Activities.Queries.GetActivityCatalogs;

/// <summary>Consulta los catálogos necesarios para los filtros del calendario.</summary>
public sealed record GetActivityCatalogs(string Category, string Sector) : IRequest<ApiResponse<ActivityCatalogsDTO>>;

/// <summary>Manejador de catálogos de actividad, sector y ubicación.</summary>
public sealed class GetActivityCatalogsHandler(IActivitySectorReader sectorReader, ISadContextProcedures procedures, IApiResponseService responses)
    : IRequestHandler<GetActivityCatalogs, ApiResponse<ActivityCatalogsDTO>>
{
    public async Task<ApiResponse<ActivityCatalogsDTO>> Handle(GetActivityCatalogs request, CancellationToken cancellationToken)
    {
        var types = await procedures.SpRecActividadesTiposAsync(request.Category, cancellationToken: cancellationToken) ?? [];
        var locations = await procedures.SpRecActividadesSalasAsync(request.Sector, cancellationToken: cancellationToken) ?? [];
        var sectors = await sectorReader.GetActiveAsync(cancellationToken);
        return responses.Success(new ActivityCatalogsDTO(
            [new("1", "Docentes"), new("0", "No docentes"), new("-100", "Todas")],
            types.Select(item => new CatalogOptionDTO(item.Tipo, item.Tipo)).ToArray(),
            [new("TODOS", "Todos"), .. sectors],
            [new("TODAS", "Todas"), .. locations.Select(item => new CatalogOptionDTO(item.Codigo, item.Nombre ?? item.Codigo))]));
    }
}
