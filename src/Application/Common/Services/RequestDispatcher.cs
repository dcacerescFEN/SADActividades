using Application.Common.Interfaces;

namespace Application.Common.Services;

/// <summary>Despachador liviano basado en el contenedor de dependencias.</summary>
public sealed class RequestDispatcher(IServiceProvider services) : IRequestDispatcher
{
    /// <inheritdoc />
    public Task<TResponse> Send<TResponse>(IRequest<TResponse> request, CancellationToken cancellationToken = default)
    {
        var handlerType = typeof(IRequestHandler<,>).MakeGenericType(request.GetType(), typeof(TResponse));
        dynamic handler = services.GetService(handlerType)
            ?? throw new InvalidOperationException("No se registró el manejador de la consulta.");
        return handler.Handle((dynamic)request, cancellationToken);
    }
}
