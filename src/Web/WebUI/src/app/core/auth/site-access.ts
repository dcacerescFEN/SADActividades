/** Módulo institucional y permiso corto que habilitan el acceso a un sitio. */
interface SitePolicy {
  module: string;
  permission: string;
}

/** Prefijo con el que Keycloak publica cada permiso del módulo. */
const PERMISSION_ROLE_PREFIX = 'PERMISSION_';

/** Prefijo de los roles administrativos de un módulo. */
const MODULE_ROLE_PREFIX = 'ROLE_';

/** Sufijo del cliente publicado que comparte la política de desarrollo. */
const IIS_SUFFIX = '-iis';

/**
 * Política de acceso de cada cliente institucional que alimenta la barra del sitio.
 * El permiso se declara con el nombre corto: Keycloak publica el rol como
 * PERMISSION_ + nombre corto y nunca el identificador completo.
 */
const POLICIES = new Map<string, SitePolicy>([
  ['NewSAD', { module: 'SAD', permission: 'SAD_ACCESS' }],
  ['SADAlumnos', { module: 'STUDENT', permission: 'STUDENT_ACCESS_STUDENT_MODULE' }],
  ['SADInformes', { module: 'REPORT', permission: 'REPORT_ACCESS_REPORT_MODULE' }],
  ['SADAdministracion', { module: 'ADMINISTRATION', permission: 'ADMINISTRATION_ACCESS_ADMINISTRATION_MODULE' }],
  ['SADProfesores', { module: 'TEACHER', permission: 'TEACHER_ACCESS_TEACHER_MODULE' }],
  ['SADCursos', { module: 'COURSE', permission: 'COURSE_ACCESS_COURSE_MODULE' }],
  ['SADExamenes', { module: 'EXAM', permission: 'EXAM_ACCESS_EXAM_MODULE' }],
  ['SADActividades', { module: 'ACTIVITY', permission: 'ACTIVITY_ACCESS_MODULE' }],
  ['SADAyudantes', { module: 'ASSISTANT', permission: 'ASSISTANT_ACCESS_ASSISTANT_MODULE' }],
  ['SADProcesos', { module: 'PROCESS', permission: 'PROCESS_ACCESS_PROCESS_MODULE' }],
]);

/**
 * Roles que el token declara para el cliente exacto, o `null` si el claim no los publica.
 * Solo se lee `resource_access`: los roles de realm y de otros clientes no habilitan el sitio.
 */
function clientRoles(access: unknown, clientId: string): readonly unknown[] | null {
  if (typeof access !== 'object' || access === null || Array.isArray(access)) return null;
  if (!Object.prototype.hasOwnProperty.call(access, clientId)) return null;
  const entry: unknown = Reflect.get(access, clientId);
  if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) return null;
  const roles: unknown = Reflect.get(entry, 'roles');
  return Array.isArray(roles) ? roles : null;
}

/** Roles administrativos que satisfacen cualquier permiso del módulo. */
function adminRoles(module: string): string[] {
  return [MODULE_ROLE_PREFIX + module + '_ADMIN', MODULE_ROLE_PREFIX + module + '_SUPERADMIN'];
}

/**
 * Indica si el token concede acceso al sitio del cliente indicado. El sufijo `-iis` se
 * recorta solo para buscar la política; los roles siempre se leen de la clave exacta.
 */
export function hasClientAccess(access: unknown, clientId: string): boolean {
  if (typeof clientId !== 'string') return false;
  const policy = POLICIES.get(clientId.endsWith(IIS_SUFFIX) ? clientId.slice(0, -IIS_SUFFIX.length) : clientId);
  if (!policy) return false;
  const roles = clientRoles(access, clientId);
  if (roles === null) return false;
  return roles.includes(PERMISSION_ROLE_PREFIX + policy.permission)
    || adminRoles(policy.module).some(role => roles.includes(role));
}

/**
 * Indica si el token concede un permiso explícito del cliente indicado. El permiso se
 * recibe con el nombre corto y el rol publicado es PERMISSION_ + nombre corto.
 */
export function hasClientPermission(access: unknown, clientId: string, permission: string): boolean {
  if (typeof clientId !== 'string' || typeof permission !== 'string' || !permission) return false;
  const roles = clientRoles(access, clientId);
  if (roles === null) return false;
  const module = permission.split('_')[0];
  return roles.includes(PERMISSION_ROLE_PREFIX + permission)
    || adminRoles(module).some(role => roles.includes(role));
}
