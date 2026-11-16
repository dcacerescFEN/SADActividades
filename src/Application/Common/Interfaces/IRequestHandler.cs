namespace Application.Common.Interfaces;

/// <summary>Manejador de una solicitud tipada.</summary>
public interface IRequestHandler<in TRequest, TResponse> where TRequest : IRequest<TResponse>
{
    /// <summary>Procesa la solicitud.</summary>
    Task<TResponse> Handle(TRequest request, CancellationToken cancellationToken);
}
