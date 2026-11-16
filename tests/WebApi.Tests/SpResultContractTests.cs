using Domain.Entities.Sad.Sp;
using Xunit;

namespace WebApi.Tests;

/// <summary>
/// El mapeo de resultados de procedimientos se resuelve por nombre de columna, así que las
/// propiedades deben conservar exactamente los nombres canónicos de MappingDB/Models.
/// </summary>
public sealed class SpResultContractTests
{
    [Fact]
    public void Detail_result_uses_the_canonical_database_column_names()
    {
        var properties = typeof(SpRecActividadResult).GetProperties();
        // Columnas reales de dbo.spRec_Actividad según MappingDB/Models.
        Assert.Contains("Cod_Catedra", properties.Select(item => item.Name));
        Assert.Contains("Cod_Seccion", properties.Select(item => item.Name));
        Assert.Contains("Cod_Modulo", properties.Select(item => item.Name));
        Assert.DoesNotContain(properties, item => item.Name is "CodCatedra" or "CodSeccion" or "CodModulo");
        Assert.Contains("Salas", properties.Select(item => item.Name));
    }

    [Fact]
    public void Calendar_result_keeps_the_columns_used_by_the_read_queries()
    {
        var properties = typeof(SpRecActividadesResult).GetProperties().Select(item => item.Name).ToArray();
        Assert.Contains("Folio", properties);
        Assert.Contains("Titulo", properties);
        Assert.Contains("Curso", properties);
        Assert.Contains("Profesor", properties);
        Assert.Contains("Salas", properties);
        Assert.Contains("Publicar", properties);
        Assert.Contains("Suspendida", properties);
    }
}
