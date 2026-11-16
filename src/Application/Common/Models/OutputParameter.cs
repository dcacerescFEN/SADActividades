namespace Application.Common.Models;

/// <summary>Contenedor opcional para el valor de retorno de un procedimiento.</summary>
/// <typeparam name="T">Tipo del valor retornado.</typeparam>
public sealed class OutputParameter<T>
{
    /// <summary>Valor establecido por el adaptador de persistencia.</summary>
    public T? Value { get; private set; }

    /// <summary>Establece el valor retornado por el procedimiento.</summary>
    /// <param name="value">Valor retornado.</param>
    public void SetValue(object? value) => Value = value is null or DBNull ? default : (T)Convert.ChangeType(value, typeof(T));
}
