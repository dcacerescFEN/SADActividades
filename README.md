# SADActividades

Independent migration of the SAD Activities tab, following the layered backend and standalone Angular conventions of SADInformes. Repository-specific contribution rules are documented in `AGENTS.md`.

## Current status

Calendar read only. The API exposes public health and validated public Keycloak configuration, a protected `/api/auth/me`, and protected read endpoints for the daily activity calendar, one activity detail and its filter catalogs. No activity write command, room assignment or external notification is enabled yet. This is not ready for production.

See `docs/activity-calendar.md` for endpoints, legacy filter semantics and pending parity checks. The activity reads require `PERMISSION_ACTIVITY_ACCESS_MODULE` and `PERMISSION_ACTIVITY_VIEW_CALENDAR`.

Room capacity (aforos) and Crystal reports are excluded. Room availability and assignment remain planned.

## Development

Prerequisites: .NET SDK 10.0.404, compatible Node (26 tested), pnpm 12.16.1. Configure `Keycloak:Url` (HTTPS), `Keycloak:Realm` and `Keycloak:ClientId` externally; do not store client secrets because the SPA is a public PKCE client. Activity reads use the externally supplied `ConnectionStrings:Sad`. Without valid configuration, health remains available while authentication and data access fail closed with sanitized responses.

### Sitio completo con `dotnet run`

`dotnet run` arranca la API y el SPA en un solo comando. El paquete `Microsoft.AspNetCore.SpaProxy` ejecuta `pnpm start` dentro de `src/Web/WebUI` y reenvía al servidor de desarrollo todo lo que la API no atiende (`src/Web/WebApi/WebApi.csproj`: `SpaProxyLaunchCommand` y `SpaProxyServerUrl`).

```sh
dotnet run --project src/Web/WebApi
```

| Elemento | Valor |
|----------|-------|
| API | `https://localhost:7070` y `http://localhost:5187` (perfiles `https` y `http` de `Properties/launchSettings.json`) |
| SPA en desarrollo | `https://localhost:4200`, iniciado por el proxy |
| Entrada recomendada | `https://localhost:4200`; `https://localhost:7070` también reenvía al SPA |
| Llamadas a `/api` | Mismo origen; en desarrollo el proxy de Angular las envía a `https://localhost:7070` |

HTTPS local: `pnpm start` ejecuta antes `prestart` (`node aspnetcore-https.js`), que exporta el certificado de desarrollo con `dotnet dev-certs` a `src/Web/WebUI/.certs` (`localhost.pem` y `localhost.key`) solo si aún no existe; `start-dev.js` levanta `ng serve --ssl` con ese par. `.certs` no se versiona. Si el certificado no es de confianza, ejecutar `dotnet dev-certs https --trust`.

Para probar el SPA por separado, en una segunda terminal:

```sh
cd src/Web/WebUI
pnpm install --frozen-lockfile
pnpm test
pnpm build
```

Dependency build scripts are approved locally only for `@parcel/watcher@2.6.0`, `esbuild@0.27.7`, `esbuild@0.28.1`, `lmdb@3.5.4` and `msgpackr-extract@3.0.7` in `pnpm-workspace.yaml`. Other packages/versions remain unapproved. Review dependency changes before granting additional build permissions.

The frontend uses https://localhost:4200 and proxies `/api` to https://localhost:7070. These settings are local development only; authenticated deployment requires HTTPS.

### `.NET` sin Node ni pnpm

`src/Web/WebUI/WebUI.esproj` declara `ShouldRunNpmInstall` y `ShouldRunBuildScript` en `false`, y la referencia desde `WebApi` usa `ReferenceOutputAssembly=false`. Por eso `dotnet build` y `dotnet test` solo resuelven el SDK de JavaScript desde NuGet: no instalan ni compilan el SPA y funcionan sin `node` ni `pnpm` en el PATH, como requiere la verificación automatizada.

## Structure

- `src/Domain`: domain types (to be migrated).
- `src/Application`: use cases/contracts; references Domain.
- `src/Infrastructure`: persistence and integration adapters; references Application.
- `src/Web/WebApi`: composition root, JWT validation and fail-closed permission policies; references Application and Infrastructure.
- `src/Web/WebUI`: Angular 22 standalone application with lazy activity route; `WebUI.esproj` aporta la integración con `dotnet`.

## Publicar

Publicar compila el SPA por defecto. El target `PublishAngular` de `WebApi.csproj` ejecuta `pnpm install --frozen-lockfile` y `pnpm build` en `SpaRoot` y copia `dist/webui/browser` a `wwwroot` antes de calcular los archivos a publicar.

```sh
dotnet publish src/Web/WebApi -c Release -o .artifacts/publish
```

Si el SPA ya está compilado y no se quiere invocar pnpm, usar el indicador explícito: con `-p:SpaBuildOnPublish=false` no se ejecuta pnpm y la referencia al `esproj` se omite, de modo que se publica el contenido actual de `WebApi/wwwroot`. Ese es el modo que usan los chequeos automatizados y cualquier entorno sin Node.

Alternativa manual equivalente, sin proxy de publicación:

```sh
cd src/Web/WebUI
pnpm build
cd ../../..
node scripts/stage-spa.mjs
dotnet publish src/Web/WebApi -c Release -o .artifacts/publish -p:SpaBuildOnPublish=false
SMOKE_PUBLISHED=1 SMOKE_SPA=1 node --test tests/smoke.test.mjs
```

El script de staging valida el SPA compilado y reemplaza el contenido generado de `WebApi/wwwroot` para no publicar assets obsoletos. `scripts/stage-spa.mjs` sigue siendo la alternativa manual que usan las pruebas automatizadas. No se incluye despliegue a producción ni configuración de servicios externos.

## Migration plan

The authoritative workspace plan is `../odd/tasks/sad-actividades-migration.md`. Delivery strategy: feature-branch-chain; no push or PR creation is implied. See `docs/authentication.md` for trusted token scope and authorization rules, and `docs/permission-equivalences.md` for the twelve standardized legacy mappings. Keycloak assignment is not automatic. Next: protect future calendar and action endpoints with their specific standardized permissions, then continue editing/recurrence, rooms and operations, audit/integrations, and parity acceptance.
