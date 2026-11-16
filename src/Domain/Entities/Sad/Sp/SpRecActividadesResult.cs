namespace Domain.Entities.Sad.Sp;

/// <summary>Fila canónica devuelta por spRec_Actividades.</summary>
public sealed class SpRecActividadesResult
{
    public int Folio { get; set; }
    public string Tipo { get; set; } = string.Empty;
    public string Titulo { get; set; } = string.Empty;
    public string Descripcion { get; set; } = string.Empty;
    public string CodCatedra { get; set; } = string.Empty;
    public string CodSeccion { get; set; } = string.Empty;
    public string? Dia { get; set; }
    public string? Inicio { get; set; }
    public string? Termino { get; set; }
    public string? Ubicacion { get; set; }
    public string? UbicacionDelimitada { get; set; }
    public int? Suspendida { get; set; }
    public string? Profesor { get; set; }
    public string? Curso { get; set; }
    public string Categoria { get; set; } = string.Empty;
    public int Publicar { get; set; }
    public string? TipoAlumnoPostgrado { get; set; }
    public string? ModalidadPostgrado { get; set; }
    public string? Promocion { get; set; }
    public string? Salas { get; set; }
}
