using Application.Activities.Queries.GetActivityCatalogs;

namespace Application.Common.Interfaces;

/// <summary>Lee los sectores activos desde el contexto SAD.</summary>
public interface IActivitySectorReader
{
    Task<IReadOnlyList<CatalogOptionDTO>> GetActiveAsync(CancellationToken cancellationToken);
}
