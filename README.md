# SADActividades

Independent migration of the SAD Activities tab, following the layered backend and standalone Angular conventions of SADInformes. Repository-specific contribution rules are documented in `AGENTS.md`.

## Current status

Calendar read only. The API exposes public health and validated public Keycloak configuration, a protected `/api/auth/me`, and protected read endpoints for the daily activity calendar, one activity detail and its filter catalogs. No activity write command, room assignment or external notification is enabled yet. This is not ready for production.

See `docs/activity-calendar.md` for endpoints, legacy filter semantics and pending parity checks. The activity reads require `PERMISSION_ACTIVITY_ACCESS_MODULE` and `PERMISSION_ACTIVITY_VIEW_CALENDAR`.

Room capacity (aforos) and Crystal reports are excluded. Room availability and assignment remain planned.

## Development

Prerequisites: .NET SDK 10.0.404, compatible Node (26 tested), pnpm 12.16.1. Configure `Keycloak:Url` (HTTPS), `Keycloak:Realm` and `Keycloak:ClientId` externally; do not store client secrets because the SPA is a public PKCE client. Activity reads use the externally supplied `ConnectionStrings:Sad`. Without valid configuration, health remains available while authentication and data access fail closed with sanitized responses.

```sh
dotnet build SADActividades.slnx
node --test tests/*.test.mjs
dotnet run --project src/Web/WebApi --urls http://127.0.0.1:5187
```

In a second terminal:

```sh
cd src/Web/WebUI
pnpm install --frozen-lockfile
pnpm test
pnpm build
pnpm start
```

Dependency build scripts are approved locally only for `@parcel/watcher@2.6.0`, `esbuild@0.27.7`, `esbuild@0.28.1`, `lmdb@3.5.4` and `msgpackr-extract@3.0.7` in `pnpm-workspace.yaml`. Other packages/versions remain unapproved. Review dependency changes before granting additional build permissions.

The frontend uses http://127.0.0.1:4201 and proxies `/api` to loopback port 5187. These HTTP settings are local development only; authenticated deployment will require HTTPS.

## Structure

- `src/Domain`: domain types (to be migrated).
- `src/Application`: use cases/contracts; references Domain.
- `src/Infrastructure`: persistence and integration adapters; references Application.
- `src/Web/WebApi`: composition root, JWT validation and fail-closed permission policies; references Application and Infrastructure.
- `src/Web/WebUI`: Angular 22 standalone application with lazy activity route.

## Publish the scaffold

```sh
cd src/Web/WebUI
pnpm build
cd ../../..
node scripts/stage-spa.mjs
dotnet publish src/Web/WebApi -c Release -o .artifacts/publish
SMOKE_PUBLISHED=1 SMOKE_SPA=1 node --test tests/smoke.test.mjs
```

The staging script validates the built SPA, then replaces the generated contents of `WebApi/wwwroot` so obsolete assets are not published. Rebuild and stage the SPA before each publish. No production deployment or external service configuration is included.

## Migration plan

The authoritative workspace plan is `../odd/tasks/sad-actividades-migration.md`. Delivery strategy: feature-branch-chain; no push or PR creation is implied. See `docs/authentication.md` for trusted token scope and authorization rules, and `docs/permission-equivalences.md` for the twelve standardized legacy mappings. Keycloak assignment is not automatic. Next: protect future calendar and action endpoints with their specific standardized permissions, then continue editing/recurrence, rooms and operations, audit/integrations, and parity acceptance.
