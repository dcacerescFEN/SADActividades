namespace Domain.Entities.AppConfig;

/// <summary>Aplicación registrada en la base AppConfig.</summary>
public sealed class Application
{
    /// <summary>Identificador de la aplicación.</summary>
    public int ApplicationId { get; set; }

    /// <summary>Nombre de la aplicación, por ejemplo SADActividades.</summary>
    public string ApplicationName { get; set; } = string.Empty;

    /// <summary>Indica si la aplicación está vigente.</summary>
    public bool IsActive { get; set; }

    /// <summary>Configuraciones registradas para la aplicación.</summary>
    public ICollection<Configuration> Configurations { get; set; } = [];
}
