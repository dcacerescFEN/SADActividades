namespace Domain.Entities.AppConfig;

/// <summary>Registro de configuración de una aplicación y ambiente en la base AppConfig.</summary>
public sealed class Configuration
{
    /// <summary>Identificador del registro de configuración.</summary>
    public int ConfigurationId { get; set; }

    /// <summary>Nombre del campo configurado, por ejemplo StudentsMenuUrl.</summary>
    public string ConfigurationName { get; set; } = string.Empty;

    /// <summary>Valor configurado para el campo.</summary>
    public string ConfigurationValue { get; set; } = string.Empty;

    /// <summary>Identificador de la aplicación propietaria.</summary>
    public int ApplicationId { get; set; }

    /// <summary>Aplicación propietaria del registro.</summary>
    public Application Application { get; set; } = null!;

    /// <summary>Identificador del ambiente del registro.</summary>
    public int EnvironmentId { get; set; }

    /// <summary>Ambiente del registro.</summary>
    public Environment Environment { get; set; } = null!;

    /// <summary>Indica si el registro está vigente.</summary>
    public bool IsActive { get; set; }
}
