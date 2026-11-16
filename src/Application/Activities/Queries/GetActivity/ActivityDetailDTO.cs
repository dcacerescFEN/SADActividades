namespace Application.Activities.Queries.GetActivity;

/// <summary>Detalle de solo lectura de una actividad.</summary>
public sealed record ActivityDetailDTO(int Id, string Title, string Description, string CourseCode,
    string Section, string Module, string Period, string Type, string? Date, string? Start, string? End,
    string? Rooms, bool Published);
