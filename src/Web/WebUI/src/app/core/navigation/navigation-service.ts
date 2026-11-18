import { Injectable, computed } from '@angular/core';

/** Destino de navegación que el encabezado muestra como enlace del módulo. */
export interface NavigationLink {
  key: string;
  label: string;
  icon: string;
  url: string;
  active: boolean;
}

type Destination = Omit<NavigationLink, 'active'>;

/** Pantalla que este shell representa; solo ella se marca como actual. */
const ACTIVE_DESTINATION = 'calendar';

// Destinos del módulo Actividades. Cada entrada futura se agrega aquí junto con
// la verificación del permiso PERMISSION_ACTIVITY_* que la habilite.
const ACTIVITY_DESTINATIONS: readonly Destination[] = [
  {
    key: 'calendar',
    label: 'Calendario de Actividades',
    icon: 'bi-calendar-event',
    url: '/actividades',
  },
];

/**
 * Enlaces del módulo para la barra de navegación. Sin catálogo de sitios ni
 * informes: solo las pantallas que pertenecen a Actividades.
 */
@Injectable({ providedIn: 'root' })
export class NavigationService {
  readonly links = computed<NavigationLink[]>(() => ACTIVITY_DESTINATIONS.map(destination => ({
    ...destination,
    active: destination.key === ACTIVE_DESTINATION,
  })));
}
