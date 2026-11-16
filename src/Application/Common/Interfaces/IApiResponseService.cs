using Application.Common.Models;

namespace Application.Common.Interfaces;

/// <summary>Crea respuestas uniformes para los casos de uso.</summary>
public interface IApiResponseService
{
    /// <summary>Crea una respuesta exitosa.</summary>
    ApiResponse<T> Success<T>(T data, string message = "Operación exitosa.");
}
