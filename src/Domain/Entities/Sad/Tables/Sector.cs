namespace Domain.Entities.Sad.Tables;

/// <summary>Sector físico utilizado por las salas del SAD.</summary>
public sealed class Sector
{
    public int IdSector { get; set; }
    public string CodSector { get; set; } = string.Empty;
    public string NombreSector { get; set; } = string.Empty;
    public bool Estado { get; set; }
}
