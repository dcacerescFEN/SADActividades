namespace Domain.Entities.AppConfig;

/// <summary>Ambiente registrado en la base AppConfig.</summary>
public sealed class Environment
{
    /// <summary>Identificador del ambiente.</summary>
    public int EnvironmentId { get; set; }

    /// <summary>Nombre del ambiente, por ejemplo DEV.</summary>
    public string EnvironmentName { get; set; } = string.Empty;

    /// <summary>Indica si el ambiente está vigente.</summary>
    public bool IsActive { get; set; }

    /// <summary>Configuraciones registradas para el ambiente.</summary>
    public ICollection<Configuration> Configurations { get; set; } = [];
}
