# Authentication and activity permissions

SADActividades validates Keycloak access tokens on the server and uses `keycloak-js` as an OAuth public client in the SPA. No client secret belongs in this repository or browser configuration.

## Public configuration

Configure these values externally:

- `Keycloak__Url`: absolute HTTPS Keycloak base URL.
- `Keycloak__Realm`: realm name.
- `Keycloak__ClientId`: physical client identifier whose audience and `resource_access` entry are accepted.

`GET /api/config/keycloak` returns only `url`, `realm`, and `clientId`. The URL must use HTTPS, may preserve a legitimate base path such as `/auth`, and must not contain user information, query parameters or fragments. The realm is validated as a single safe authority path segment and cannot contain encoded or literal path, query, fragment or backslash separators. Missing or invalid values return a sanitized `503` without echoing configuration. Public health remains available while protected endpoints fail closed.

The SPA initializes `check-sso` with Authorization Code + PKCE S256, keeps tokens only in Keycloak's in-memory adapter, and attaches a renewed bearer token only to relative same-origin `/api/` requests. The complete public-configuration load, including response body parsing, and the identity-provider initialization are bounded. Timeouts cancel the configuration request when possible, release timers and produce a visible unavailable-authentication state rather than an indefinite loading state.

## Server validation and trusted claim scope

JWT validation requires HTTPS metadata, the exact configured issuer (`{url}/realms/{realm}`), the configured audience, a trusted signature, and valid token lifetime. Authorization reads roles only from the `resource_access` entry whose key exactly matches `Keycloak__ClientId`; roles from another client are ignored. `/api/auth/me` is protected and returns only `preferred_username` derived from the validated token.

## Standardized permission foundation

Activity policies accept only identifiers catalogued in `docs/permission-equivalences.md`, using the format `PERMISSION_ACTIVITY_<DESCRIPTIVE_ACTION>`. The twelve raw legacy permission and service names are documentation mappings only and are never accepted as fallback claims.

The exact roles `ROLE_ACTIVITY_ADMIN` and `ROLE_ACTIVITY_SUPERADMIN`, when present under the configured client, satisfy all ACTIVITY-module policies without individual permissions. Similar suffixes, arbitrary role names, roles from another module, and roles from another client do not grant access. These role overrides do not bypass business validation. No impersonation capability is implemented in this unit.

No generic `ACTIVITY_ACCESS` permission is inferred or created. `ACCESS` would not imply `VIEW`, creation, editing, deletion, or room assignment. No Keycloak role or permission is provisioned automatically; identity administrators must assign the standardized identifiers explicitly.
