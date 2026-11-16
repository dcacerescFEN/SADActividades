namespace Application.Activities.Queries.GetActivityCatalogs;

public sealed record CatalogOptionDTO(string Value, string Text);
public sealed record ActivityCatalogsDTO(IReadOnlyList<CatalogOptionDTO> Categories,
    IReadOnlyList<CatalogOptionDTO> Types, IReadOnlyList<CatalogOptionDTO> Sectors,
    IReadOnlyList<CatalogOptionDTO> Locations);
