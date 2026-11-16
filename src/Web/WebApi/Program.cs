var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

app.Use(async (context, next) =>
{
    var decodedPath = Uri.UnescapeDataString(context.Request.Path.Value ?? string.Empty);
    var isEncodedApiPath = !context.Request.Path.StartsWithSegments("/api")
        && (decodedPath.Equals("/api", StringComparison.OrdinalIgnoreCase)
            || decodedPath.StartsWith("/api/", StringComparison.OrdinalIgnoreCase));

    if (isEncodedApiPath)
    {
        context.Response.StatusCode = StatusCodes.Status404NotFound;
        return;
    }

    await next();
});
app.UseDefaultFiles();
app.UseStaticFiles();
app.MapGet("/api/health", () => Results.Ok(new { application = "SADActividades", status = "ok" }));
// Unimplemented API routes must not fall through to the SPA or expose legacy data.
app.Map("/api/{**path}", () => Results.NotFound());
app.MapFallbackToFile("index.html");
app.Run();
