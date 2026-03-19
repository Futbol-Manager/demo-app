import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { LoginService } from 'src/app/core/services/login/login.service';
import { DemoService, DemoRole } from 'src/app/core/services/demo/demo.service';
import { TutorialService } from 'src/app/core/services/tutorial/tutorial.service';
import { gsap } from 'gsap';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface IntroSlide {
  id: string;
  photo?: string;
  lines: string[];
  lineInterval: number;
  duration: number;
}

export interface RoleCard {
  role: DemoRole;
  titleKey: string;
  descKey: string;
  ctaKey: string;
  icon: string;
  image: string;
  colorImage: string;
  cardClass: string;
  featureKeys: string[];
}

// ─── Cues de narración — fuente de verdad para el teleprónter ────────────────
// Cada entrada: texto hablado (para proporción de tiempo) → destino en la UI.
// Orden: intro-overture | slide0-L1 | slide0-L2 | slide1-L1 | slide1-L2 |
//        slide2-L1 | slide2-L2 | slide3-L1 | slide3-L2 |
//        slide4-L1 | slide4-L2 | slide4-L3

interface NarrationCue {
  text: string;
  slideIdx: number;
  lineCount: number; // 0 = slide visible, sin líneas (intro overture)
}

const NARRATION_CUES: Record<string, NarrationCue[]> = {
  es: [
    { text: 'Si gestionas un club de fútbol, seguramente conoces esto de sobra.',                                          slideIdx: 0, lineCount: 0 },
    { text: 'Las cuotas que no llegan.',                                                                                   slideIdx: 0, lineCount: 1 },
    { text: 'El Excel que se complica cada temporada.',                                                                    slideIdx: 0, lineCount: 2 },
    { text: 'Los grupos de WhatsApp a las once de la noche.',                                                              slideIdx: 1, lineCount: 1 },
    { text: 'Los papeles, los recibos, los padres a los que tienes que perseguir.',                                        slideIdx: 1, lineCount: 2 },
    { text: 'No es que lo estés haciendo mal.',                                                                            slideIdx: 2, lineCount: 1 },
    { text: 'Es que nadie te ha dado las herramientas correctas.',                                                         slideIdx: 2, lineCount: 2 },
    { text: 'Lo que estás a punto de ver es Sphaira.',                                                                    slideIdx: 3, lineCount: 1 },
    { text: 'La app que ya usan más de doscientos clubes para gestionar todo de forma automática.',                        slideIdx: 3, lineCount: 2 },
    { text: 'En esta demo vas a ver exactamente cómo funciona.',                                                           slideIdx: 4, lineCount: 1 },
    { text: 'Cobros automáticos, gestión de jugadores, convocatorias, comunicación con familias, todo en un solo sitio.', slideIdx: 4, lineCount: 2 },
    { text: 'Es gratis. No hace falta tarjeta. En cinco minutos sabes si esto es lo que tu club necesita.',               slideIdx: 4, lineCount: 3 },
  ],
  en: [
    { text: 'If you manage a football club, you probably know this all too well.',                                         slideIdx: 0, lineCount: 0 },
    { text: 'Fees that never arrive.',                                                                                     slideIdx: 0, lineCount: 1 },
    { text: 'A spreadsheet that gets more complicated every season.',                                                      slideIdx: 0, lineCount: 2 },
    { text: 'WhatsApp groups at eleven at night.',                                                                         slideIdx: 1, lineCount: 1 },
    { text: 'Paperwork, receipts, parents you have to chase.',                                                             slideIdx: 1, lineCount: 2 },
    { text: "It's not that you're doing it wrong.",                                                                        slideIdx: 2, lineCount: 1 },
    { text: "It's that nobody has given you the right tools.",                                                             slideIdx: 2, lineCount: 2 },
    { text: "What you're about to see is Sphaira.",                                                                       slideIdx: 3, lineCount: 1 },
    { text: 'The app already used by more than two hundred clubs to manage all of that automatically.',                    slideIdx: 3, lineCount: 2 },
    { text: "In this demo you'll see exactly how it works.",                                                               slideIdx: 4, lineCount: 1 },
    { text: 'Automatic payments, player management, squad calls, family communication, all in one place.',                 slideIdx: 4, lineCount: 2 },
    { text: "Free. No card needed. In five minutes you'll know if this is what your club needs.",                          slideIdx: 4, lineCount: 3 },
  ],
  fr: [
    { text: 'Si vous gérez un club de football, vous connaissez sûrement cela.',                                          slideIdx: 0, lineCount: 0 },
    { text: "Les cotisations qui n'arrivent jamais.",                                                                      slideIdx: 0, lineCount: 1 },
    { text: 'Le tableau Excel qui se complique chaque saison.',                                                            slideIdx: 0, lineCount: 2 },
    { text: 'Les groupes WhatsApp à onze heures du soir.',                                                                 slideIdx: 1, lineCount: 1 },
    { text: 'Les papiers, les reçus, les parents que vous devez relancer.',                                                slideIdx: 1, lineCount: 2 },
    { text: "Ce n'est pas que vous faites mal les choses.",                                                                slideIdx: 2, lineCount: 1 },
    { text: "C'est que personne ne vous a donné les bons outils.",                                                         slideIdx: 2, lineCount: 2 },
    { text: "Ce que vous allez découvrir, c'est Sphaira.",                                                                 slideIdx: 3, lineCount: 1 },
    { text: "L'appli déjà utilisée par plus de deux cents clubs pour tout gérer automatiquement.",                         slideIdx: 3, lineCount: 2 },
    { text: 'Dans cette démo, vous verrez exactement comment ça fonctionne.',                                              slideIdx: 4, lineCount: 1 },
    { text: 'Paiements automatiques, joueurs, convocations, communication avec les familles, tout en un seul endroit.',   slideIdx: 4, lineCount: 2 },
    { text: "Gratuit. Sans carte. En cinq minutes vous saurez si c'est ce dont votre club a besoin.",                     slideIdx: 4, lineCount: 3 },
  ],
  de: [
    { text: 'Wenn Sie einen Fußballverein leiten, kennen Sie das sicher nur zu gut.',                                      slideIdx: 0, lineCount: 0 },
    { text: 'Beiträge, die nie ankommen.',                                                                                 slideIdx: 0, lineCount: 1 },
    { text: 'Eine Tabelle, die jede Saison komplizierter wird.',                                                           slideIdx: 0, lineCount: 2 },
    { text: 'WhatsApp-Gruppen um elf Uhr nachts.',                                                                         slideIdx: 1, lineCount: 1 },
    { text: 'Papiere, Quittungen, Eltern, hinter denen Sie herlaufen müssen.',                                             slideIdx: 1, lineCount: 2 },
    { text: 'Es liegt nicht daran, dass Sie es falsch machen.',                                                            slideIdx: 2, lineCount: 1 },
    { text: 'Es liegt daran, dass niemand Ihnen die richtigen Werkzeuge gegeben hat.',                                     slideIdx: 2, lineCount: 2 },
    { text: 'Was Sie gleich sehen werden, ist Sphaira.',                                                                   slideIdx: 3, lineCount: 1 },
    { text: 'Die App, die bereits von mehr als zweihundert Vereinen genutzt wird, um alles automatisch zu verwalten.',    slideIdx: 3, lineCount: 2 },
    { text: 'In dieser Demo sehen Sie genau, wie es funktioniert.',                                                        slideIdx: 4, lineCount: 1 },
    { text: 'Automatische Zahlungen, Spielerverwaltung, Kaderaufrufe, Kommunikation, alles an einem Ort.',                slideIdx: 4, lineCount: 2 },
    { text: 'Kostenlos. Ohne Karte. In fünf Minuten wissen Sie, ob das das Richtige für Ihren Verein ist.',               slideIdx: 4, lineCount: 3 },
  ],
  pt: [
    { text: 'Se administra um clube de futebol, provavelmente conhece bem esta situação.',                                 slideIdx: 0, lineCount: 0 },
    { text: 'Mensalidades que nunca chegam.',                                                                              slideIdx: 0, lineCount: 1 },
    { text: 'A folha de cálculo que fica mais complicada a cada temporada.',                                               slideIdx: 0, lineCount: 2 },
    { text: 'Os grupos de WhatsApp às onze da noite.',                                                                     slideIdx: 1, lineCount: 1 },
    { text: 'Os papéis, os recibos, os pais que tem de contactar repetidamente.',                                          slideIdx: 1, lineCount: 2 },
    { text: 'Não é que esteja a fazer as coisas mal.',                                                                     slideIdx: 2, lineCount: 1 },
    { text: 'É que ninguém lhe deu as ferramentas certas.',                                                                slideIdx: 2, lineCount: 2 },
    { text: 'O que está prestes a ver é o Sphaira.',                                                                      slideIdx: 3, lineCount: 1 },
    { text: 'A app já utilizada por mais de duzentos clubes para gerir tudo automaticamente.',                             slideIdx: 3, lineCount: 2 },
    { text: 'Nesta demo vai ver exatamente como funciona.',                                                                slideIdx: 4, lineCount: 1 },
    { text: 'Cobranças automáticas, gestão de jogadores, convocatórias, comunicação com as famílias, tudo num só lugar.', slideIdx: 4, lineCount: 2 },
    { text: 'É gratuito, não precisa de cartão, e em cinco minutos saberá se é isto que o seu clube precisa.',            slideIdx: 4, lineCount: 3 },
  ],
  it: [
    { text: 'Se gestisci una squadra di calcio, probabilmente conosci bene questa situazione.',                            slideIdx: 0, lineCount: 0 },
    { text: 'Le quote che non arrivano mai.',                                                                              slideIdx: 0, lineCount: 1 },
    { text: 'Il foglio Excel che diventa sempre più complicato ogni stagione.',                                            slideIdx: 0, lineCount: 2 },
    { text: 'I gruppi WhatsApp alle undici di sera.',                                                                      slideIdx: 1, lineCount: 1 },
    { text: 'I documenti, le ricevute, i genitori che devi inseguire.',                                                    slideIdx: 1, lineCount: 2 },
    { text: 'Non è che tu stia facendo le cose male.',                                                                     slideIdx: 2, lineCount: 1 },
    { text: 'È che nessuno ti ha dato gli strumenti giusti.',                                                              slideIdx: 2, lineCount: 2 },
    { text: 'Quello che stai per vedere è Sphaira.',                                                                      slideIdx: 3, lineCount: 1 },
    { text: "L'app già utilizzata da più di duecento club per gestire tutto automaticamente.",                             slideIdx: 3, lineCount: 2 },
    { text: 'In questa demo vedrai esattamente come funziona.',                                                            slideIdx: 4, lineCount: 1 },
    { text: 'Pagamenti automatici, giocatori, convocazioni, comunicazione con le famiglie, tutto in un unico posto.',     slideIdx: 4, lineCount: 2 },
    { text: 'Gratuito. Senza carta. In cinque minuti saprai se è quello di cui il tuo club ha bisogno.',                  slideIdx: 4, lineCount: 3 },
  ],
};

// ─── Slides multiidioma — líneas alineadas 1:1 con los cues ──────────────────

const INTRO_SLIDES: Record<string, IntroSlide[]> = {
  es: [
    {
      id: 'whatsapp', photo: 'assets/images/entrenadores/entrenador-hombre-1.jpg',
      lines: ['Las cuotas que no llegan.', 'El Excel que se complica cada temporada.'],
      lineInterval: 0, duration: 0,
    },
    {
      id: 'papers', photo: 'assets/images/entrenadores/entrenador-hombre-2.jpg',
      lines: ['Los grupos de WhatsApp a las once de la noche.', 'Los papeles, los recibos, los padres a los que tienes que perseguir.'],
      lineInterval: 0, duration: 0,
    },
    {
      id: 'empathy', photo: 'assets/images/entrenadores/entrenador-hombre-3.jpg',
      lines: ['No es que lo estés haciendo mal.', 'Es que nadie te ha dado las herramientas correctas.'],
      lineInterval: 0, duration: 0,
    },
    {
      id: 'reveal',
      lines: ['Lo que estás a punto de ver es Sphaira.', 'La app que ya usan más de doscientos clubes para gestionar todo de forma automática.'],
      lineInterval: 0, duration: 0,
    },
    {
      id: 'cta',
      lines: ['En esta demo vas a ver exactamente cómo funciona.', 'Cobros automáticos, gestión de jugadores, convocatorias, comunicación con familias, todo en un solo sitio.', 'Es gratis. No hace falta tarjeta. En cinco minutos sabes si esto es lo que tu club necesita.'],
      lineInterval: 0, duration: 0,
    },
  ],
  en: [
    {
      id: 'whatsapp', photo: 'assets/images/entrenadores/entrenador-hombre-1.jpg',
      lines: ['Fees that never arrive.', 'A spreadsheet that gets more complicated every season.'],
      lineInterval: 0, duration: 0,
    },
    {
      id: 'papers', photo: 'assets/images/entrenadores/entrenador-hombre-2.jpg',
      lines: ['WhatsApp groups at eleven at night.', 'Paperwork, receipts, parents you have to chase.'],
      lineInterval: 0, duration: 0,
    },
    {
      id: 'empathy', photo: 'assets/images/entrenadores/entrenador-hombre-3.jpg',
      lines: ["It's not that you're doing it wrong.", "It's that nobody has given you the right tools."],
      lineInterval: 0, duration: 0,
    },
    {
      id: 'reveal',
      lines: ["What you're about to see is Sphaira.", 'The app already used by more than two hundred clubs to manage all of that automatically.'],
      lineInterval: 0, duration: 0,
    },
    {
      id: 'cta',
      lines: ["In this demo you'll see exactly how it works.", 'Automatic payments, player management, squad calls, family communication, all in one place.', "Free. No card needed. In five minutes you'll know if this is what your club needs."],
      lineInterval: 0, duration: 0,
    },
  ],
  fr: [
    {
      id: 'whatsapp', photo: 'assets/images/entrenadores/entrenador-hombre-1.jpg',
      lines: ["Les cotisations qui n'arrivent jamais.", 'Le tableau Excel qui se complique chaque saison.'],
      lineInterval: 0, duration: 0,
    },
    {
      id: 'papers', photo: 'assets/images/entrenadores/entrenador-hombre-2.jpg',
      lines: ['Les groupes WhatsApp à onze heures du soir.', 'Les papiers, les reçus, les parents que vous devez relancer.'],
      lineInterval: 0, duration: 0,
    },
    {
      id: 'empathy', photo: 'assets/images/entrenadores/entrenador-hombre-3.jpg',
      lines: ["Ce n'est pas que vous faites mal les choses.", "C'est que personne ne vous a donné les bons outils."],
      lineInterval: 0, duration: 0,
    },
    {
      id: 'reveal',
      lines: ["Ce que vous allez découvrir, c'est Sphaira.", "L'appli déjà utilisée par plus de deux cents clubs pour tout gérer automatiquement."],
      lineInterval: 0, duration: 0,
    },
    {
      id: 'cta',
      lines: ['Dans cette démo, vous verrez exactement comment ça fonctionne.', 'Paiements automatiques, joueurs, convocations, communication avec les familles, tout en un seul endroit.', "Gratuit. Sans carte. En cinq minutes vous saurez si c'est ce dont votre club a besoin."],
      lineInterval: 0, duration: 0,
    },
  ],
  de: [
    {
      id: 'whatsapp', photo: 'assets/images/entrenadores/entrenador-hombre-1.jpg',
      lines: ['Beiträge, die nie ankommen.', 'Eine Tabelle, die jede Saison komplizierter wird.'],
      lineInterval: 0, duration: 0,
    },
    {
      id: 'papers', photo: 'assets/images/entrenadores/entrenador-hombre-2.jpg',
      lines: ['WhatsApp-Gruppen um elf Uhr nachts.', 'Papiere, Quittungen, Eltern, hinter denen Sie herlaufen müssen.'],
      lineInterval: 0, duration: 0,
    },
    {
      id: 'empathy', photo: 'assets/images/entrenadores/entrenador-hombre-3.jpg',
      lines: ['Es liegt nicht daran, dass Sie es falsch machen.', 'Es liegt daran, dass niemand Ihnen die richtigen Werkzeuge gegeben hat.'],
      lineInterval: 0, duration: 0,
    },
    {
      id: 'reveal',
      lines: ['Was Sie gleich sehen werden, ist Sphaira.', 'Die App, die bereits von mehr als zweihundert Vereinen genutzt wird, um alles automatisch zu verwalten.'],
      lineInterval: 0, duration: 0,
    },
    {
      id: 'cta',
      lines: ['In dieser Demo sehen Sie genau, wie es funktioniert.', 'Automatische Zahlungen, Spielerverwaltung, Kaderaufrufe, Kommunikation, alles an einem Ort.', 'Kostenlos. Ohne Karte. In fünf Minuten wissen Sie, ob das das Richtige für Ihren Verein ist.'],
      lineInterval: 0, duration: 0,
    },
  ],
  pt: [
    {
      id: 'whatsapp', photo: 'assets/images/entrenadores/entrenador-hombre-1.jpg',
      lines: ['Mensalidades que nunca chegam.', 'A folha de cálculo que fica mais complicada a cada temporada.'],
      lineInterval: 0, duration: 0,
    },
    {
      id: 'papers', photo: 'assets/images/entrenadores/entrenador-hombre-2.jpg',
      lines: ['Os grupos de WhatsApp às onze da noite.', 'Os papéis, os recibos, os pais que tem de contactar repetidamente.'],
      lineInterval: 0, duration: 0,
    },
    {
      id: 'empathy', photo: 'assets/images/entrenadores/entrenador-hombre-3.jpg',
      lines: ['Não é que esteja a fazer as coisas mal.', 'É que ninguém lhe deu as ferramentas certas.'],
      lineInterval: 0, duration: 0,
    },
    {
      id: 'reveal',
      lines: ['O que está prestes a ver é o Sphaira.', 'A app já utilizada por mais de duzentos clubes para gerir tudo automaticamente.'],
      lineInterval: 0, duration: 0,
    },
    {
      id: 'cta',
      lines: ['Nesta demo vai ver exatamente como funciona.', 'Cobranças automáticas, gestão de jogadores, convocatórias, comunicação com as famílias, tudo num só lugar.', 'É gratuito, não precisa de cartão, e em cinco minutos saberá se é isto que o seu clube precisa.'],
      lineInterval: 0, duration: 0,
    },
  ],
  it: [
    {
      id: 'whatsapp', photo: 'assets/images/entrenadores/entrenador-hombre-1.jpg',
      lines: ['Le quote che non arrivano mai.', 'Il foglio Excel che diventa sempre più complicato ogni stagione.'],
      lineInterval: 0, duration: 0,
    },
    {
      id: 'papers', photo: 'assets/images/entrenadores/entrenador-hombre-2.jpg',
      lines: ['I gruppi WhatsApp alle undici di sera.', 'I documenti, le ricevute, i genitori che devi inseguire.'],
      lineInterval: 0, duration: 0,
    },
    {
      id: 'empathy', photo: 'assets/images/entrenadores/entrenador-hombre-3.jpg',
      lines: ['Non è che tu stia facendo le cose male.', 'È che nessuno ti ha dato gli strumenti giusti.'],
      lineInterval: 0, duration: 0,
    },
    {
      id: 'reveal',
      lines: ['Quello che stai per vedere è Sphaira.', "L'app già utilizzata da più di duecento club per gestire tutto automaticamente."],
      lineInterval: 0, duration: 0,
    },
    {
      id: 'cta',
      lines: ['In questa demo vedrai esattamente come funziona.', 'Pagamenti automatici, giocatori, convocazioni, comunicazione con le famiglie, tutto in un unico posto.', 'Gratuito. Senza carta. In cinque minuti saprai se è quello di cui il tuo club ha bisogno.'],
      lineInterval: 0, duration: 0,
    },
  ],
};

// ─── Componente ───────────────────────────────────────────────────────────────

@Component({
  selector: 'app-demo-role',
  templateUrl: './demo-role.component.html',
  styleUrls: ['./demo-role.component.scss'],
})
export class DemoRoleSelectionComponent implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('emailInput') emailInputRef?: ElementRef<HTMLInputElement>;

  /** 1 = storytelling intro | 2 = selección de rol */
  step = 1;

  // ── Intro storytelling ────────────────────────────────────────────────────
  currentSlide = 0;
  visibleLineCount = 0;
  isAudioLoading = false;
  audioMuted = false;
  /** true cuando el audio está listo pero el autoplay está bloqueado */
  audioPending = false;
  introSlides: IntroSlide[] = [];
  private currentLang = 'es';
  private audioPlayer?: HTMLAudioElement;
  private timeupdateHandler?: () => void;

  /** Cues con timestamps calculados una vez conocida la duración del audio. */
  private activeCues: Array<{ time: number; slideIdx: number; lineCount: number }> = [];
  /** Tiempo de inicio de cada slide (para seek en navegación manual). */
  private slideStartTimes: number[] = [];

  // ── Selección de rol ──────────────────────────────────────────────────────
  selectedRole: DemoRole | null = null;
  showEmailModal = false;
  emailValue = '';
  isLoading = false;
  emailError = '';

  // ── Logo ──────────────────────────────────────────────────────────────────
  get logoSrc(): string { return 'assets/images/logosphairaw.png'; }

  // ── Roles ──────────────────────────────────────────────────────────────────
  readonly roleCards: RoleCard[] = [
    {
      role: 'club',
      titleKey:   'DEMO_ROLE.CLUB_TITLE',
      descKey:    'DEMO_ROLE.CLUB_DESC',
      ctaKey:     'DEMO_ROLE.CLUB_CTA',
      icon:       'bi bi-building',
      image:      'assets/images/club.svg',
      colorImage: 'assets/images/club-verde.png',
      cardClass:  'demo-role-card-1',
      featureKeys: ['DEMO_ROLE.CLUB_F1', 'DEMO_ROLE.CLUB_F2', 'DEMO_ROLE.CLUB_F3', 'DEMO_ROLE.CLUB_F4'],
    },
    {
      role: 'coach',
      titleKey:   'DEMO_ROLE.COACH_TITLE',
      descKey:    'DEMO_ROLE.COACH_DESC',
      ctaKey:     'DEMO_ROLE.COACH_CTA',
      icon:       'bi bi-person-badge',
      image:      'assets/images/coach.svg',
      colorImage: 'assets/images/coach-verde.png',
      cardClass:  'demo-role-card-2',
      featureKeys: ['DEMO_ROLE.COACH_F1', 'DEMO_ROLE.COACH_F2', 'DEMO_ROLE.COACH_F3', 'DEMO_ROLE.COACH_F4'],
    },
    {
      role: 'player',
      titleKey:   'DEMO_ROLE.PLAYER_TITLE',
      descKey:    'DEMO_ROLE.PLAYER_DESC',
      ctaKey:     'DEMO_ROLE.PLAYER_CTA',
      icon:       'bi bi-person',
      image:      'assets/images/player.svg',
      colorImage: 'assets/images/player.svg',
      cardClass:  'demo-role-card-3',
      featureKeys: ['DEMO_ROLE.PLAYER_F1', 'DEMO_ROLE.PLAYER_F2', 'DEMO_ROLE.PLAYER_F3', 'DEMO_ROLE.PLAYER_F4'],
    },
  ];

  // ── Getters ────────────────────────────────────────────────────────────────
  get isLastSlide(): boolean { return this.currentSlide === this.introSlides.length - 1; }
  get currentSlideData(): IntroSlide { return this.introSlides[this.currentSlide] ?? this.introSlides[0]; }
  get selectedRoleCard(): RoleCard | undefined { return this.roleCards.find(r => r.role === this.selectedRole); }
  get isValidEmail(): boolean { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.emailValue.trim()); }
  get slideProgress(): number { return (this.currentSlide / Math.max(this.introSlides.length - 1, 1)) * 100; }

  constructor(
    private router: Router,
    private loginService: LoginService,
    private demoService: DemoService,
    private tutorialService: TutorialService,
    private translate: TranslateService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    if (!this.demoService.isDemoMode()) {
      this.router.navigate(['/dashboard/inicio']);
      return;
    }
    const existingRole = this.demoService.getDemoRole();
    if (existingRole) {
      this.router.navigate(['/dashboard/inicio']);
      return;
    }
    const full = this.translate.currentLang ?? this.translate.defaultLang ?? 'es';
    this.currentLang = full.split('-')[0].toLowerCase();
    this.introSlides = INTRO_SLIDES[this.currentLang] ?? INTRO_SLIDES['es'];
  }

  ngAfterViewInit(): void {
    this.loadNarrationAudio();
  }

  ngOnDestroy(): void {
    this.stopAudio();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  AUDIO + TELEPRÓNTER
  // ═══════════════════════════════════════════════════════════════════════════

  private loadNarrationAudio(): void {
    const localPath = `assets/audio/narration-${this.currentLang}.mp3`;
    this.audioPlayer         = new Audio(localPath);
    this.audioPlayer.volume  = this.audioMuted ? 0 : 1;
    this.audioPlayer.preload = 'auto';

    // Cue-timestamps para el teleprónter
    this.audioPlayer.addEventListener('loadedmetadata', () => {
      this.buildCueTimestamps(this.audioPlayer!.duration);
    }, { once: true });

    // Teleprónter: actualizar slide/líneas según posición del audio
    this.timeupdateHandler = () => this.onTimeUpdate();
    this.audioPlayer.addEventListener('timeupdate', this.timeupdateHandler);

    this.audioPlayer.addEventListener('error', () => {
      this.isAudioLoading = false;
      this.cdr.markForCheck();
    }, { once: true });

    // ── Reproducción INMEDIATA ─────────────────────────────────────────────
    // Llamar play() sin esperar canplaythrough maximiza la posibilidad de éxito
    // dentro del token de activación del usuario que generó la navegación a /demo-role.
    // El navegador bufferiza y arranca en cuanto tiene datos suficientes.
    this.audioPlayer.play()
      .then(() => {
        this.isAudioLoading = false;
        this.audioPending   = false;
        this.cdr.markForCheck();
      })
      .catch((err: unknown) => {
        const name = err instanceof DOMException ? err.name : '';
        if (name === 'AbortError') return; // play() interrumpido por load() — ignorar

        // NotAllowedError: autoplay bloqueado. Fallback: reproducir silenciado para
        // que el audio esté en curso cuando el usuario pulse el botón de activación.
        if (this.audioPlayer) {
          this.audioPlayer.muted = true;
          this.audioPlayer.play()
            .then(() => {
              // Está corriendo en mute → marcar pending para que el usuario lo active
              this.audioPending   = true;
              this.isAudioLoading = false;
              this.cdr.markForCheck();
            })
            .catch(() => {
              this.audioPending   = true;
              this.isAudioLoading = false;
              this.cdr.markForCheck();
            });
        }
      });
  }

  /**
   * Calcula el timestamp (s) de cada cue usando proporción de caracteres ponderados.
   * La puntuación (., , : ; ? !) añade peso para simular pausas naturales del TTS.
   */
  private buildCueTimestamps(duration: number): void {
    const rawCues = NARRATION_CUES[this.currentLang] ?? NARRATION_CUES['es'];
    const weights  = rawCues.map(c => this.weightedLen(c.text));
    const total    = weights.reduce((s, w) => s + w, 0);

    let cum = 0;
    this.activeCues = rawCues.map((cue, i) => {
      const time = (cum / total) * duration;
      cum += weights[i];
      return { time, slideIdx: cue.slideIdx, lineCount: cue.lineCount };
    });

    // Tiempo de inicio de cada slide = primer cue con lineCount > 0 para ese slide
    this.slideStartTimes = this.introSlides.map((_, sIdx) => {
      const first = this.activeCues.find(c => c.slideIdx === sIdx && c.lineCount > 0);
      return first?.time ?? 0;
    });
  }

  /** Longitud ponderada: añade peso a pausas semánticas. */
  private weightedLen(text: string): number {
    let w = text.length;
    w += (text.match(/\./g)  ?? []).length * 10;
    w += (text.match(/,/g)   ?? []).length * 4;
    w += (text.match(/:/g)   ?? []).length * 5;
    w += (text.match(/;/g)   ?? []).length * 6;
    w += (text.match(/\?/g)  ?? []).length * 10;
    w += (text.match(/!/g)   ?? []).length * 10;
    return w;
  }

  /** Teleprónter: actualiza currentSlide y visibleLineCount según audio.currentTime. */
  private onTimeUpdate(): void {
    if (!this.audioPlayer || !this.activeCues.length) return;
    const t = this.audioPlayer.currentTime;
    let newSlide = 0, newLines = 0;
    for (const cue of this.activeCues) {
      if (t >= cue.time) { newSlide = cue.slideIdx; newLines = cue.lineCount; }
      else break;
    }
    if (newSlide !== this.currentSlide || newLines !== this.visibleLineCount) {
      this.currentSlide    = newSlide;
      this.visibleLineCount = newLines;
      this.cdr.markForCheck();
    }
  }

  /** Click/touch activa el audio si estaba en pending o en mute forzado. */
  @HostListener('click')
  @HostListener('touchstart')
  onUserInteraction(): void {
    if (!this.audioPending || !this.audioPlayer) return;
    this.audioPending        = false;
    this.audioPlayer.muted   = false;
    this.audioPlayer.volume  = this.audioMuted ? 0 : 1;
    // Si el audio no está corriendo aún, arrancarlo
    if (this.audioPlayer.paused) {
      this.audioPlayer.play().catch(() => {});
    }
    this.cdr.markForCheck();
  }

  toggleAudio(): void {
    this.audioMuted = !this.audioMuted;
    if (this.audioPlayer) {
      if (this.audioPending && !this.audioMuted) {
        // El usuario activó el sonido: aprovechar la interacción para desbloquear
        this.audioPending      = false;
        this.audioPlayer.muted = false;
        this.audioPlayer.volume = 1;
        if (this.audioPlayer.paused) this.audioPlayer.play().catch(() => {});
      } else {
        this.audioPlayer.muted  = false;
        this.audioPlayer.volume = this.audioMuted ? 0 : 1;
      }
    }
  }

  private stopAudio(): void {
    if (this.audioPlayer) {
      if (this.timeupdateHandler) {
        this.audioPlayer.removeEventListener('timeupdate', this.timeupdateHandler);
      }
      this.audioPlayer.pause();
      this.audioPlayer = undefined;
    }
    this.audioPending = false;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  NAVEGACIÓN — dots y flechas buscan el audio al inicio del slide
  // ═══════════════════════════════════════════════════════════════════════════

  /** Salta el audio al inicio del slide indicado y actualiza la UI inmediatamente. */
  seekToSlide(slideIdx: number): void {
    if (slideIdx < 0 || slideIdx >= this.introSlides.length) return;
    const targetTime = this.slideStartTimes[slideIdx] ?? 0;
    if (this.audioPlayer) {
      this.audioPlayer.currentTime = targetTime;
      if (this.audioPlayer.paused && !this.audioPending) {
        this.audioPlayer.play().catch(() => {});
      }
    }
    this.currentSlide     = slideIdx;
    this.visibleLineCount = 1;
    this.cdr.markForCheck();
  }

  /** Mantenido por compatibilidad — llama a seekToSlide. */
  public startSlideSequence(): void {
    this.seekToSlide(this.currentSlide);
  }

  nextSlide(): void { if (!this.isLastSlide) this.seekToSlide(this.currentSlide + 1); }
  prevSlide(): void { if (this.currentSlide > 0) this.seekToSlide(this.currentSlide - 1); }

  skipIntro(): void {
    this.stopAudio();
    this.goToStep2();
  }

  goToStep2(): void {
    this.step = 2;
    this.cdr.markForCheck();
    setTimeout(() => {
      gsap.from('.demo-role-header', { opacity: 0, y: -20, duration: 0.6, ease: 'power3.out' });
      gsap.from('.demo-role-card',   { opacity: 0, y: 24,  duration: 0.55, stagger: 0.1, ease: 'power3.out', delay: 0.15 });
    }, 50);
    setTimeout(() => this.tutorialService.start('demo-role', true), 700);
  }

  openTutorial(): void { this.tutorialService.start('demo-role', true); }

  // ═══════════════════════════════════════════════════════════════════════════
  //  STEP 2 — Selección de rol + email
  // ═══════════════════════════════════════════════════════════════════════════

  onRoleCardClick(role: DemoRole): void {
    this.selectedRole = role;
    this.emailValue   = '';
    this.emailError   = '';
    this.showEmailModal = true;
    setTimeout(() => this.emailInputRef?.nativeElement.focus(), 80);
  }

  closeEmailModal(event?: MouseEvent): void {
    if (event && (event.target as HTMLElement).closest('.email-modal__card')) return;
    this.showEmailModal = false;
    this.selectedRole   = null;
  }

  confirmDemoAccess(): void {
    if (!this.isValidEmail) {
      this.emailError = this.translate.instant('DEMO_INTRO.EMAIL_ERROR');
      return;
    }
    if (!this.selectedRole) return;
    this.isLoading  = true;
    this.emailError = '';
    this.cdr.markForCheck();
    setTimeout(() => {
      this.loginService.loginDemoAndSetRole(this.emailValue.trim(), this.selectedRole!);
    }, 400);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Utils
  // ═══════════════════════════════════════════════════════════════════════════
  trackByIndex(index: number): number { return index; }
}
