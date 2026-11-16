using Application.Common.Models;
using Domain.Entities.Sad.Sp;

namespace Application.Common.Interfaces;

/// <summary>Procedimientos tipados de solo lectura utilizados por Actividades.</summary>
public interface ISadContextProcedures
{
    Task<List<SpRecActividadesResult>?> SpRecActividadesAsync(string? fecha, string? periodo, string? estado,
        int? soloDocentes, int? soloFen, int? soloPublicas, string? ubicacion, string? sector,
        OutputParameter<int>? returnValue = null, CancellationToken? cancellationToken = default);
    Task<List<SpRecActividadResult>?> SpRecActividadAsync(int? actividad,
        OutputParameter<int>? returnValue = null, CancellationToken? cancellationToken = default);
    Task<List<SpRecActividadesTiposResult>?> SpRecActividadesTiposAsync(string? categoria,
        OutputParameter<int>? returnValue = null, CancellationToken? cancellationToken = default);
    Task<List<SpRecActividadesSalasResult>?> SpRecActividadesSalasAsync(string? sector,
        OutputParameter<int>? returnValue = null, CancellationToken? cancellationToken = default);
}
