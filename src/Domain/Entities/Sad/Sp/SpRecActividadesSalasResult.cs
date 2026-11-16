namespace Domain.Entities.Sad.Sp;

/// <summary>Ubicación devuelta por spRec_ActividadesSalas.</summary>
public sealed class SpRecActividadesSalasResult
{
    public string Codigo { get; set; } = string.Empty;
    public string? Nombre { get; set; }
    public string Sector { get; set; } = string.Empty;
}
