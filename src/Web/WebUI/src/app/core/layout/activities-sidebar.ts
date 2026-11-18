import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy, Component, DestroyRef, ElementRef, TemplateRef, computed, effect, inject, input, signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { NgbOffcanvas, NgbOffcanvasRef } from '@ng-bootstrap/ng-bootstrap';
import { AuthService } from '../auth/auth-service';

/** Destino de navegación del módulo que el menú puede mostrar. */
interface ActivityDestination {
  readonly key: string;
  readonly title: string;
  readonly icon: string;
  readonly url: string;
  readonly permission?: string;
}

/** Sección del menú: agrupa los destinos de una misma pantalla de Actividades. */
interface ActivitySection {
  readonly id: string;
  readonly title: string;
  readonly icon: string;
  readonly routePrefix?: string;
  readonly destinations: readonly ActivityDestination[];
}

// Secciones del módulo. Cada entrada futura se agrega aquí junto con el permiso
// PERMISSION_ACTIVITY_* que la habilite, y se oculta mientras falte el permiso.
const ACTIVITY_SECTIONS: readonly ActivitySection[] = [
  {
    id: 'calendar',
    title: 'Calendario de Actividades',
    icon: 'bi-calendar-event',
    routePrefix: '/actividades',
    destinations: [
      {
        key: 'calendar',
        title: 'Calendario',
        icon: 'bi-calendar3',
        url: '/actividades',
        permission: 'PERMISSION_ACTIVITY_VIEW_CALENDAR',
      },
    ],
  },
];

const FAVORITE_ROUTES_STORAGE_KEY = 'sadactividades.sidebar.favorite-routes';

// Espera breve antes de retirar el flyout para permitir mover el puntero hacia él.
const HOVER_CLOSE_DELAY_MS = 120;

@Component({
  selector: 'app-activities-sidebar',
  imports: [NgTemplateOutlet, RouterLink, RouterLinkActive],
  host: { '[class.collapsed]': 'collapsed()', '(window:resize)': 'closeDrawerOnDesktop()' },
  template: `
    <aside id="activities-sidebar" class="sidebar" [class.sidebar--collapsed]="collapsed()"
      aria-label="Actividades">
      <ng-container [ngTemplateOutlet]="navigation" />
    </aside>
    <ng-template #drawer let-panel>
      <div class="offcanvas-header">
        <h2 id="activities-drawer-title" class="offcanvas-title fs-5">Actividades</h2>
        <button type="button" class="btn-close" aria-label="Cerrar menú" ngbAutofocus
          (click)="panel.dismiss()"></button>
      </div>
      <div class="sidebar sidebar--drawer">
        <ng-container [ngTemplateOutlet]="navigation" [ngTemplateOutletContext]="{ mobile: true }" />
      </div>
    </ng-template>
    <ng-template #navigation let-mobile="mobile">
      <div class="sidebar-brand" title="SAD Actividades">
        <i class="bi bi-calendar-week" aria-hidden="true"></i>
        <span class="sidebar-label">SAD Actividades</span>
      </div>
      <nav class="sidebar-navigation" aria-label="Opciones de Actividades">
        @if (!collapsed() || mobile) {
          <div class="sidebar-search">
            <i class="bi bi-search" aria-hidden="true"></i>
            <input #searchInput type="search" placeholder="Buscar opción o grupo…"
              aria-label="Buscar opción o grupo" [value]="searchQuery()"
              (input)="updateSearch(searchInput.value)" />
          </div>
        }
        @if (favoriteDestinations().length > 0 && (!collapsed() || mobile)) {
          <div class="sidebar-group sidebar-favorites" data-favorites>
            <div class="sidebar-section-label">Favoritos</div>
            @for (favorite of favoriteDestinations(); track favorite.url) {
              <div class="sidebar-destination-row">
                <a class="sidebar-link sidebar-destination" [routerLink]="favorite.url"
                  routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }"
                  ariaCurrentWhenActive="page" [title]="favorite.title"
                  [attr.aria-label]="favorite.title" (click)="closeMobile()">
                  {{ favorite.title }}
                </a>
                <button class="sidebar-favorite-toggle is-active" type="button"
                  aria-label="Quitar de favoritos" (click)="toggleFavorite(favorite.url)">
                  <i class="bi bi-star-fill" aria-hidden="true"></i>
                </button>
              </div>
            }
          </div>
        }
        @for (section of visibleSections(); track section.id) {
          @if (collapsed() && !mobile) {
            <div class="sidebar-group sidebar-collapsed-section" [attr.data-collapsed-section]="section.id"
              (mouseenter)="setCollapsedSectionHover(section.id)"
              (mouseleave)="clearCollapsedSectionHover()"
              (focusin)="setCollapsedSectionHover(section.id)"
              (focusout)="handleCollapsedSectionFocusOut($event)">
              <button type="button" class="sidebar-link sidebar-section-toggle sidebar-icon-button"
                [class.active]="isActive(section)" [class.is-open]="isCollapsedSectionOpen(section.id)"
                [attr.data-section]="section.id" [attr.aria-expanded]="isCollapsedSectionOpen(section.id)"
                aria-haspopup="menu" [title]="section.title" [attr.aria-label]="section.title">
                <i [class]="'bi ' + section.icon" aria-hidden="true"></i>
              </button>
              @if (isCollapsedSectionOpen(section.id)) {
                <div class="activities-flyout" role="menu" [attr.aria-label]="section.title"
                  (mouseenter)="setCollapsedSectionHover(section.id)"
                  (mouseleave)="clearCollapsedSectionHover()"
                  (focusin)="setCollapsedSectionHover(section.id)"
                  (focusout)="handleCollapsedSectionFocusOut($event)">
                  <div class="activities-flyout__header">{{ section.title }}</div>
                  <div class="activities-flyout__items">
                    @for (destination of section.destinations; track destination.key) {
                      <a class="activities-flyout__item" [routerLink]="destination.url"
                        routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }"
                        ariaCurrentWhenActive="page" [title]="destination.title"
                        [attr.aria-label]="destination.title"
                        (click)="closeCollapsedFlyout(); closeMobile()">{{ destination.title }}</a>
                    } @empty {
                      <p class="activities-flyout__empty">Pendiente de migración</p>
                    }
                  </div>
                </div>
              }
            </div>
          } @else {
            <div class="sidebar-group">
              <button type="button" class="sidebar-link sidebar-section-toggle"
                [class.active]="isActive(section)" [attr.data-section]="section.id"
                [attr.aria-label]="section.title" [title]="section.title"
                [attr.aria-expanded]="expanded().includes(section.id)" (click)="toggleSection(section.id)">
                <i [class]="'bi ' + section.icon" aria-hidden="true"></i>
                <span>{{ section.title }}</span>
                <i class="bi sidebar-chevron" [class.bi-chevron-down]="expanded().includes(section.id)"
                  [class.bi-chevron-right]="!expanded().includes(section.id)" aria-hidden="true"></i>
              </button>
              @if (expanded().includes(section.id)) {
                <div class="sidebar-submenu" [attr.data-section-content]="section.id">
                  <ng-container [ngTemplateOutlet]="sectionItems"
                    [ngTemplateOutletContext]="{ $implicit: section }" />
                </div>
              }
            </div>
          }
        }
      </nav>
      @if (visibleSections().length === 0 && favoriteDestinations().length === 0) {
        <div class="sidebar-no-results" role="status">
          <i class="bi bi-search" aria-hidden="true"></i>
          <span>No se encontraron opciones</span>
        </div>
      }
      <div class="sidebar-profile" [title]="username()">
        <span class="sidebar-avatar" aria-hidden="true">{{ initials() }}</span>
        <div class="sidebar-label sidebar-profile-details">
          <span class="sidebar-username">{{ username() }}</span>
          <span class="sidebar-name">{{ name() }}</span>
        </div>
      </div>
    </ng-template>
    <ng-template #sectionItems let-section>
      @for (destination of section.destinations; track destination.key) {
        <div class="sidebar-destination-row">
          <a class="sidebar-link sidebar-destination" [routerLink]="destination.url"
            routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }"
            ariaCurrentWhenActive="page" [title]="destination.title"
            [attr.aria-label]="destination.title"
            (click)="closeCollapsedFlyout(); closeMobile()">
            <i [class]="'bi ' + destination.icon" aria-hidden="true"></i>
            <span class="sidebar-label">{{ destination.title }}</span>
          </a>
          <button class="sidebar-favorite-toggle" type="button"
            [class.is-active]="isFavorite(destination.url)"
            [attr.aria-label]="isFavorite(destination.url) ? 'Quitar de favoritos' : 'Agregar a favoritos'"
            (click)="toggleFavorite(destination.url)">
            <i class="bi" [class.bi-star-fill]="isFavorite(destination.url)"
              [class.bi-star]="!isFavorite(destination.url)" aria-hidden="true"></i>
          </button>
        </div>
      } @empty {
        <p class="sidebar-pending text-body-secondary px-3 py-2 mb-0">Pendiente de migración</p>
      }
    </ng-template>
  `,
  styleUrl: './activities-sidebar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActivitiesSidebar {
  protected readonly sections = ACTIVITY_SECTIONS;
  readonly collapsed = input(false);
  private readonly drawerOpen = signal(false);
  readonly mobileOpen = this.drawerOpen.asReadonly();
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly offcanvas = inject(NgbOffcanvas);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly drawer = viewChild.required<TemplateRef<unknown>>('drawer');
  private drawerRef?: NgbOffcanvasRef;
  private hoverCloseTimeoutId: ReturnType<typeof setTimeout> | null = null;
  protected readonly expanded = signal<string[]>([]);
  protected readonly searchQuery = signal('');
  protected readonly favorites = signal<string[]>(this.loadFavorites());
  protected readonly hoveredCollapsedSection = signal<string | null>(null);
  private readonly currentUrl = signal('');
  protected readonly username = computed(() => this.auth.username()?.trim() || 'Usuario');
  protected readonly name = computed(() => this.auth.name?.()?.trim() || this.username());
  protected readonly initials = computed(() => this.username().slice(0, 2).toUpperCase());

  constructor() {
    this.updateNavigation(this.router.url);
    this.router.events.pipe(takeUntilDestroyed()).subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.updateNavigation(event.urlAfterRedirects);
        this.closeMobile();
      }
    });
    effect(() => {
      const routes = this.favorites();
      try {
        localStorage.setItem(FAVORITE_ROUTES_STORAGE_KEY, JSON.stringify(routes));
      } catch {
        // Sin almacenamiento disponible los favoritos viven solo en la sesión.
      }
    });
    effect(() => {
      if (!this.collapsed()) {
        this.cancelPendingHoverClose();
        this.hoveredCollapsedSection.set(null);
      }
    });
    inject(DestroyRef).onDestroy(() => {
      this.closeMobile();
      this.cancelPendingHoverClose();
    });
  }

  /** Abre el panel de navegación en pantallas pequeñas. */
  openMobile(): void {
    if (this.drawerRef) return;
    // El panel se monta dentro del host para que el shell mantenga el diálogo en
    // su propio árbol; su posición fija lo muestra igual sobre el viewport. El
    // cierre es inmediato para que retirar la vista no deje nodos huérfanos.
    this.drawerRef = this.offcanvas.open(this.drawer(), {
      ariaLabelledBy: 'activities-drawer-title', position: 'start', keyboard: true, backdrop: true,
      animation: false, container: this.host.nativeElement,
    });
    this.drawerOpen.set(true);
    const reset = () => {
      this.drawerRef = undefined;
      this.drawerOpen.set(false);
    };
    void this.drawerRef.result.then(reset, reset);
  }

  /** Cierra el panel de navegación pequeño. */
  closeMobile(): void {
    this.drawerRef?.close();
  }

  /** Actualiza el texto del buscador del menú. */
  protected updateSearch(query: string): void {
    this.searchQuery.set(query);
  }

  /** Indica si el destino ya está entre los favoritos. */
  protected isFavorite(url: string): boolean {
    return this.favorites().includes(url);
  }

  /** Agrega o quita un destino de los favoritos persistidos. */
  protected toggleFavorite(url: string): void {
    this.favorites.update(routes =>
      routes.includes(url) ? routes.filter(value => value !== url) : [...routes, url]);
  }

  /** Secciones visibles según permisos y texto de búsqueda. */
  protected readonly visibleSections = computed<ActivitySection[]>(() => {
    const query = this.searchQuery().trim().toLocaleLowerCase('es');
    const permitted = this.sections
      .map(section => ({
        ...section,
        destinations: section.destinations.filter(destination => this.canView(destination)),
      }))
      .filter(section => section.destinations.length > 0);
    if (!query) return permitted;
    return permitted.flatMap(section => {
      const sectionMatches = section.title.toLocaleLowerCase('es').includes(query);
      const destinations = sectionMatches
        ? section.destinations
        : section.destinations.filter(destination =>
          destination.title.toLocaleLowerCase('es').includes(query));
      return destinations.length > 0 ? [{ ...section, destinations }] : [];
    });
  });

  /** Destinos favoritos visibles, filtrados por permisos y búsqueda. */
  protected readonly favoriteDestinations = computed<ActivityDestination[]>(() => {
    const query = this.searchQuery().trim().toLocaleLowerCase('es');
    const routes = this.favorites();
    return this.sections
      .flatMap(section => section.destinations
        .filter(destination => routes.includes(destination.url) && this.canView(destination)))
      .filter(destination =>
        !query || destination.title.toLocaleLowerCase('es').includes(query));
  });

  /** Alterna una sección del acordeón en modo expandido. */
  protected toggleSection(id: string): void {
    this.expanded.update(ids => ids.includes(id) ? ids.filter(value => value !== id) : [...ids, id]);
  }

  /** Indica si la sección corresponde a la ruta activa. */
  protected isActive(section: ActivitySection): boolean {
    if (!section.routePrefix) return false;
    const url = this.currentUrl();
    return url === section.routePrefix || url.startsWith(section.routePrefix + '/');
  }

  /** Abre el flyout de la sección enfocada o apuntada en modo colapsado. */
  protected setCollapsedSectionHover(id: string): void {
    if (!this.collapsed()) return;
    this.cancelPendingHoverClose();
    this.hoveredCollapsedSection.set(id);
  }

  /** Programa el cierre del flyout al salir del puntero. */
  protected clearCollapsedSectionHover(): void {
    this.cancelPendingHoverClose();
    this.hoverCloseTimeoutId = setTimeout(() => {
      this.hoveredCollapsedSection.set(null);
      this.hoverCloseTimeoutId = null;
    }, HOVER_CLOSE_DELAY_MS);
  }

  /** Cierra el flyout cuando el foco abandona el grupo de la sección. */
  protected handleCollapsedSectionFocusOut(event: FocusEvent): void {
    const nextTarget = event.relatedTarget;
    if (nextTarget instanceof Node && event.currentTarget instanceof Node
      && event.currentTarget.contains(nextTarget)) return;
    this.clearCollapsedSectionHover();
  }

  /** Indica si el flyout de la sección está visible. */
  protected isCollapsedSectionOpen(id: string): boolean {
    return this.hoveredCollapsedSection() === id;
  }

  /** Retira el flyout de forma inmediata después de navegar. */
  protected closeCollapsedFlyout(): void {
    this.cancelPendingHoverClose();
    this.hoveredCollapsedSection.set(null);
  }

  /** Cierra el panel móvil al pasar al ancho de escritorio. */
  protected closeDrawerOnDesktop(): void {
    if (window.innerWidth >= 992) this.closeMobile();
  }

  private cancelPendingHoverClose(): void {
    if (this.hoverCloseTimeoutId === null) return;
    clearTimeout(this.hoverCloseTimeoutId);
    this.hoverCloseTimeoutId = null;
  }

  /**
   * Consulta el permiso declarado de un destino. Un servicio de autenticación
   * parcial, como el de las pruebas del shell, no implementa la verificación;
   * en ese caso se considera que no hay permiso en lugar de romper el menú.
   */
  private canView(destination: ActivityDestination): boolean {
    if (!destination.permission) return true;
    return this.auth.hasPermission(destination.permission);
  }

  private updateNavigation(url: string): void {
    this.currentUrl.set(url);
    const active = this.sections.find(section => this.isActive(section));
    if (active && !this.expanded().includes(active.id)) {
      this.expanded.update(ids => [...ids, active.id]);
    }
  }

  /** Recupera los favoritos guardados y descarta rutas que ya no existen. */
  private loadFavorites(): string[] {
    try {
      const stored = localStorage.getItem(FAVORITE_ROUTES_STORAGE_KEY);
      const parsed: unknown = stored ? JSON.parse(stored) : [];
      if (!Array.isArray(parsed)) return [];
      const known = ACTIVITY_SECTIONS.flatMap(section =>
        section.destinations.map(destination => destination.url));
      const routes = [...new Set(parsed.filter((route): route is string => typeof route === 'string'))]
        .filter(route => known.includes(route));
      if (stored && JSON.stringify(parsed) !== JSON.stringify(routes)) {
        localStorage.setItem(FAVORITE_ROUTES_STORAGE_KEY, JSON.stringify(routes));
      }
      return routes;
    } catch {
      return [];
    }
  }
}
