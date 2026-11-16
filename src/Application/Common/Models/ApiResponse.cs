namespace Application.Common.Models;

/// <summary>Respuesta uniforme para las API de la aplicación.</summary>
/// <typeparam name="T">Tipo de datos devuelto.</typeparam>
public sealed record ApiResponse<T>(bool Success, string Message, T? Data);
