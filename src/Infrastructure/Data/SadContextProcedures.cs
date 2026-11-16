using System.Data;
using Application.Common.Interfaces;
using Application.Common.Models;
using Domain.Entities.Sad.Sp;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Data;

/// <summary>Wrappers tipados de los procedimientos de lectura del calendario.</summary>
public sealed class SadContextProcedures(SadContext context) : ISadContextProcedures
{
    public Task<List<SpRecActividadesResult>?> SpRecActividadesAsync(string? fecha, string? periodo, string? estado,
        int? soloDocentes, int? soloFen, int? soloPublicas, string? ubicacion, string? sector,
        OutputParameter<int>? returnValue = null, CancellationToken? cancellationToken = default) => ExecuteAsync<SpRecActividadesResult>(
        "EXEC @returnValue = [dbo].[spRec_Actividades] @Fecha, @Periodo, @Estado, @SoloDocentes, @SoloFEN, @SoloPublicas, @Ubicacion, @Sector",
        returnValue, cancellationToken,
        Text("Fecha", 20, fecha), Text("Periodo", 20, periodo), Text("Estado", 5, estado), Int("SoloDocentes", soloDocentes),
        Int("SoloFEN", soloFen), Int("SoloPublicas", soloPublicas), Text("Ubicacion", 20, ubicacion), Text("Sector", 20, sector));

    public Task<List<SpRecActividadResult>?> SpRecActividadAsync(int? actividad, OutputParameter<int>? returnValue = null,
        CancellationToken? cancellationToken = default) => ExecuteAsync<SpRecActividadResult>(
        "EXEC @returnValue = [dbo].[spRec_Actividad] @Actividad", returnValue, cancellationToken, Int("Actividad", actividad));

    public Task<List<SpRecActividadesTiposResult>?> SpRecActividadesTiposAsync(string? categoria,
        OutputParameter<int>? returnValue = null, CancellationToken? cancellationToken = default) => ExecuteAsync<SpRecActividadesTiposResult>(
        "EXEC @returnValue = [dbo].[spRec_ActividadesTipos] @Categoria", returnValue, cancellationToken, Text("Categoria", 10, categoria));

    public Task<List<SpRecActividadesSalasResult>?> SpRecActividadesSalasAsync(string? sector,
        OutputParameter<int>? returnValue = null, CancellationToken? cancellationToken = default) => ExecuteAsync<SpRecActividadesSalasResult>(
        "EXEC @returnValue = [dbo].[spRec_ActividadesSalas] @Sector", returnValue, cancellationToken, Text("Sector", 10, sector));

    private async Task<List<T>?> ExecuteAsync<T>(string sql, OutputParameter<int>? returnValue,
        CancellationToken? cancellationToken, params SqlParameter[] parameters)
    {
        var output = new SqlParameter("returnValue", SqlDbType.Int) { Direction = ParameterDirection.Output };
        var all = parameters.Append(output).Cast<object>().ToArray();
        var rows = await context.Database.SqlQueryRaw<T>(sql, all).ToListAsync(cancellationToken ?? CancellationToken.None);
        returnValue?.SetValue(output.Value);
        return rows;
    }

    private static SqlParameter Text(string name, int size, string? value) => new(name, SqlDbType.VarChar, size)
        { Value = value ?? (object)DBNull.Value };
    private static SqlParameter Int(string name, int? value) => new(name, SqlDbType.Int)
        { Value = value ?? (object)DBNull.Value };
}
