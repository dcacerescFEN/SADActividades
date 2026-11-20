import { describe, expect, it } from 'vitest';
import { hasClientAccess, hasClientPermission } from './site-access';

describe('Acceso a los sitios institucionales', () => {
  /** Construye el claim `resource_access` con los roles del cliente indicado. */
  function access(clientId: string, roles: readonly unknown[]): Record<string, unknown> {
    return { [clientId]: { roles } };
  }

  it('concede acceso con el permiso corto del cliente exacto', () => {
    const token = access('SADActividades', ['PERMISSION_ACTIVITY_ACCESS_MODULE']);

    expect(hasClientAccess(token, 'SADActividades')).toBe(true);
  });

  it('concede acceso a los roles administrativos del módulo', () => {
    expect(hasClientAccess(access('SADActividades', ['ROLE_ACTIVITY_ADMIN']), 'SADActividades')).toBe(true);
    expect(hasClientAccess(access('SADActividades', ['ROLE_ACTIVITY_SUPERADMIN']), 'SADActividades')).toBe(true);
  });

  it('rechaza el nombre corto sin prefijo y el identificador completo como rol', () => {
    expect(hasClientAccess(access('SADActividades', ['ACTIVITY_ACCESS_MODULE']), 'SADActividades')).toBe(false);
    expect(hasClientAccess(access('SADActividades', ['PERMISSION_PERMISSION_ACTIVITY_ACCESS_MODULE']), 'SADActividades')).toBe(false);
  });

  it('exige que los roles estén declarados para la clave exacta del cliente', () => {
    const token = access('SADInformes', ['PERMISSION_REPORT_ACCESS_REPORT_MODULE', 'ROLE_ACTIVITY_ADMIN']);

    expect(hasClientAccess(token, 'SADActividades')).toBe(false);
    expect(hasClientAccess(token, 'SADInformes')).toBe(true);
  });

  it('resuelve el sufijo -iis solo para la política y lee los roles de la clave exacta', () => {
    const publicada = access('SADActividades-iis', ['PERMISSION_ACTIVITY_ACCESS_MODULE']);

    expect(hasClientAccess(publicada, 'SADActividades-iis')).toBe(true);
    expect(hasClientAccess(publicada, 'SADActividades')).toBe(false);
    expect(hasClientAccess(access('SADActividades-iis', ['ROLE_ACTIVITY_ADMIN']), 'SADActividades-iis')).toBe(true);
  });

  it('rechaza clientes sin política aunque declaren roles administrativos', () => {
    expect(hasClientAccess(access('SADDesconocido', ['ROLE_ACTIVITY_ADMIN']), 'SADDesconocido')).toBe(false);
  });

  it('aplica la política de cada sitio con su permiso corto', () => {
    expect(hasClientAccess(
      access('SADInformes-iis', ['PERMISSION_REPORT_ACCESS_REPORT_MODULE']), 'SADInformes-iis',
    )).toBe(true);
    expect(hasClientAccess(access('SADAlumnos', ['ROLE_STUDENT_ADMIN']), 'SADAlumnos')).toBe(true);
    expect(hasClientAccess(access('SADActividades', ['ROLE_REPORT_ADMIN']), 'SADActividades')).toBe(false);
  });

  it('rechaza un resource_access ausente o malformado', () => {
    for (const token of [
      undefined, null, [], 'texto', {}, { SADActividades: null }, { SADActividades: [] },
      { SADActividades: { roles: 'PERMISSION_ACTIVITY_ACCESS_MODULE' } }, { SADActividades: { roles: [null, 7] } },
    ]) {
      expect(hasClientAccess(token, 'SADActividades')).toBe(false);
    }
    expect(hasClientAccess(access('SADActividades', ['ROLE_ACTIVITY_ADMIN']), '')).toBe(false);
  });

  describe('permiso explícito del cliente configurado', () => {
    it('concede solo el permiso solicitado', () => {
      const token = access('SADActividades', ['PERMISSION_ACTIVITY_VIEW_CALENDAR']);

      expect(hasClientPermission(token, 'SADActividades', 'ACTIVITY_VIEW_CALENDAR')).toBe(true);
      expect(hasClientPermission(token, 'SADActividades', 'ACTIVITY_CREATE_TEACHING_ACTIVITY')).toBe(false);
    });

    it('concede cualquier permiso del módulo a los roles administrativos', () => {
      expect(hasClientPermission(access('SADActividades', ['ROLE_ACTIVITY_ADMIN']),
        'SADActividades', 'ACTIVITY_DELETE_NON_TEACHING_ACTIVITY')).toBe(true);
    });

    it('rechaza el identificador completo, los nombres legados y otros clientes', () => {
      const token = access('SADActividades', ['PERMISSION_ACTIVITY_VIEW_CALENDAR', 'Viñeta Actividades']);

      expect(hasClientPermission(token, 'SADActividades', 'PERMISSION_ACTIVITY_VIEW_CALENDAR')).toBe(false);
      expect(hasClientPermission(token, 'SADActividades', 'Viñeta Actividades')).toBe(false);
      expect(hasClientPermission(token, 'SADInformes', 'ACTIVITY_VIEW_CALENDAR')).toBe(false);
      expect(hasClientPermission(access('SADActividades', ['PERMISSION_REPORT_ACCESS_MODULE']),
        'SADActividades', 'ACTIVITY_VIEW_CALENDAR')).toBe(false);
    });

    it('rechaza un permiso vacío o de tipo distinto de texto', () => {
      const token = access('SADActividades', ['PERMISSION_ACTIVITY_VIEW_CALENDAR']);

      expect(hasClientPermission(token, 'SADActividades', '')).toBe(false);
      expect(hasClientPermission(token, 'SADActividades', undefined as unknown as string)).toBe(false);
    });
  });
});
