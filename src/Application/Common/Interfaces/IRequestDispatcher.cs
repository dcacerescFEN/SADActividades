namespace Application.Common.Interfaces;

/// <summary>Despacha solicitudes a su manejador registrado.</summary>
public interface IRequestDispatcher
{
    /// <summary>Envía una solicitud tipada.</summary>
    Task<TResponse> Send<TResponse>(IRequest<TResponse> request, CancellationToken cancellationToken = default);
}
