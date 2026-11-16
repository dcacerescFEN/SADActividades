using Application.Common.Interfaces;
using Application.Common.Models;

namespace Application.Common.Services;

/// <summary>Implementa el envelope compartido de las API.</summary>
public sealed class ApiResponseService : IApiResponseService
{
    /// <inheritdoc />
    public ApiResponse<T> Success<T>(T data, string message = "Operación exitosa.") => new(true, message, data);
}
