namespace Domain.Entities.Sad.Sp;

/// <summary>Detalle canónico devuelto por spRec_Actividad.</summary>
public sealed class SpRecActividadResult
{
    public int Folio { get; set; }
    public string Titulo { get; set; } = string.Empty;
    public string Descripcion { get; set; } = string.Empty;
    public string Cod_Catedra { get; set; } = string.Empty;
    public string Cod_Seccion { get; set; } = string.Empty;
    public string Cod_Modulo { get; set; } = string.Empty;
    public string Periodo { get; set; } = string.Empty;
    public string Tipo { get; set; } = string.Empty;
    public string? Fecha { get; set; }
    public string? Inicio { get; set; }
    public string? Termino { get; set; }
    public string? Ubicacion { get; set; }
    public string? UbicacionDelimitada { get; set; }
    public int Publicar { get; set; }
    public string? Salas { get; set; }
}
