import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { Subscription } from 'rxjs';
import { take } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { LoginService } from 'src/app/core/services/login/login.service';

@Component({

  selector: 'app-planes',
  templateUrl: './planes.component.html',
  styleUrls: ['./planes.component.scss']
})
export class PlanesComponent implements OnInit, OnDestroy {

  activeTab: 'clubs' | 'coach' = 'clubs';
  /** Incrementar para forzar re-render (reset de animaciones de entrada) */
  sectionKey = 0;
  private userSub?: Subscription;

  readonly stats = [
    { value: '200+',    label: 'Clubes'                },
    { value: '5.000+',  label: 'Jugadores gestionados' },
    { value: '15.000+', label: 'Partidos registrados'  },
    { value: '3+',      label: 'Países'                }
  ];

  readonly clubPlans = [
    {
      id: 'gratuito',
      icon: 'bi-gift',
      name: 'Gratuito',
      tagline: 'Empieza sin riesgo',
      description: 'Empieza sin coste. La plataforma crece contigo a medida que crece tu club.',
      pricingMain: 'Gratis',
      pricingFree: true,
      pricingPeriod: null as string | null,
      pricingOld: null as string | null,
      pricingDiscount: null as string | null,
      pricingTag: null as string | null,
      pricingAlt: null as string | null,
      pricingNote: 'Basado en comisión por cuota cobrada',
      features: [
        'Gestión de jugadores',
        'Cobro de cuotas digital',
        'Asistente IA básico',
        'App para familias',
        'Informes básicos'
      ],
      cta: 'Empezar gratis',
      comingSoon: false,
      recommended: false
    },
    {
      id: 'club',
      icon: 'bi-building',
      name: 'Club Pro',
      tagline: 'El más elegido',
      description: 'Todo lo que necesitas para gestionar tu club con estándares profesionales.',
      pricingMain: '5€',
      pricingFree: false,
      pricingPeriod: '/jugador/año',
      pricingOld: '10€',
      pricingDiscount: '-50%',
      pricingTag: 'Por tiempo limitado',
      pricingAlt: null as string | null,
      pricingNote: 'Mínimo 50 jugadores · Sin comisiones sobre cuotas',
      features: [
        'Jugadores ilimitados',
        'Estadísticas avanzadas',
        'Asistente IA completo',
        'Scouting de jugadores',
        'Análisis de vídeo',
        'ERP financiero'
      ],
      cta: 'Elegir Club Pro',
      comingSoon: false,
      recommended: true
    },
    {
      id: 'familia',
      icon: 'bi-people-fill',
      name: 'Familia',
      tagline: 'Próximamente',
      description: 'Gestión personalizada para academias y familias con portal exclusivo.',
      pricingMain: '2,99€',
      pricingFree: false,
      pricingPeriod: '/mes',
      pricingOld: null as string | null,
      pricingDiscount: null as string | null,
      pricingTag: null as string | null,
      pricingAlt: 'o 29,99€/año',
      pricingNote: 'Por familia registrada',
      features: [
        'Todo lo del plan Club Pro',
        'Portal de familias premium',
        'Notificaciones push',
        'Documentación digital',
        'Gestión de accesos'
      ],
      cta: 'Próximamente',
      comingSoon: true,
      recommended: false
    }
  ];

  readonly coachPlans = [
    {
      type: 'monthly' as const,
      icon: 'bi-calendar-month',
      name: 'Mensual',
      tagline: 'Flexibilidad total',
      price: '12,99',
      pricePeriod: '/ mes',
      priceNote: 'Facturado mensualmente',
      savings: null as string | null,
      popular: false,
      darkCard: false,
      trialBadge: null as string | null,
      features: [
        'Gestión completa del equipo',
        'Asistente IA incluido',
        'Estadísticas y análisis',
        'Planificación de entrenamientos',
        'Control de lesiones',
        'Informes PDF exportables'
      ]
    },
    {
      type: 'annual' as const,
      icon: 'bi-calendar-check',
      name: 'Anual',
      tagline: 'Mejor valor',
      price: '119,99',
      pricePeriod: '/ año',
      priceNote: '≈ 10,00 € / mes — ahorras un 23%',
      savings: 'Ahorra 35,89 €',
      popular: true,
      darkCard: true,
      trialBadge: '3 días gratis',
      features: [
        'Gestión completa del equipo',
        'Asistente IA incluido',
        'Estadísticas y análisis',
        'Planificación de entrenamientos',
        'Control de lesiones',
        'Informes PDF exportables'
      ]
    }
  ];

  constructor(
    private loginService: LoginService,
    private router: Router,
    private location: Location
  ) {}

  ngOnInit(): void {
    // Sin redirección automática: /planes es una página pública accesible
    // para usuarios autenticados y no autenticados (ej. al volver desde el wizard)
  }

  ngOnDestroy(): void {
    this.userSub?.unsubscribe();
  }

  goBack(): void {
    this.location.back();
  }

  setTab(tab: 'clubs' | 'coach'): void {
    if (tab === this.activeTab) return;
    this.activeTab = tab;
    this.sectionKey++;
  }

  getCardDelay(index: number): string {
    return `${index * 90}ms`;
  }

  get tabIndicatorOffset(): string {
    return this.activeTab === 'clubs' ? '0%' : '50%';
  }

  /**
   * Club plans: navega al wizard público de suscripción-club.
   * - gratuito → /suscripcion-club/wizard/gratuito
   * - club     → /suscripcion-club/wizard/gratuito?planType=club
   * - familia  → deshabilitado (coming soon)
   */
  goToClubPlan(planId: string): void {
    if (planId === 'familia') return;
    if (planId === 'club') {
      this.router.navigate(['/suscripcion-club', 'wizard', 'gratuito'], {
        queryParams: { planType: 'club' }
      });
    } else {
      // gratuito
      this.router.navigate(['/suscripcion-club', 'wizard', 'gratuito']);
    }
  }

  /**
   * Coach plans: navega a suscripcion-coach pasando el planType como query param.
   * El componente destino lee el param y lanza el checkout de Stripe automáticamente.
   */
  goToCoachPlan(planType: 'monthly' | 'annual'): void {
    this.loginService.usuarioActual.pipe(take(1)).subscribe(user => {
      if (user) {
        // Entrenador ya logueado → ir directamente a suscripción
        this.router.navigate(['/dashboard/suscripcion-coach'], { queryParams: { planType } });
      } else {
        // No logueado → registro con formulario de entrenador pre-seleccionado
        this.router.navigate(['/registro'], { queryParams: { perfil: 'entrenador', planType } });
      }
    });
  }
}
