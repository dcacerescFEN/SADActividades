namespace Application.Activities.Queries.GetActivities;

/// <summary>Fila visible del calendario diario de actividades.</summary>
public sealed record ActivityRowDTO(int Id, string Title, string? Course, string? Professor, string Category,
    string Type, string? Date, string? Start, string? End, string? StudentType, string? Modality,
    string? Promotion, string? Rooms, bool Published, bool Suspended);
