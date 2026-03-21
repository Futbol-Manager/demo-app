import {
  AfterViewInit,
  ChangeDetectionStrategy,
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
    { text: 'Y si estás pensando en dar el paso, ahora es el mejor momento.',                                             slideIdx: 5, lineCount: 1 },
    { text: 'Con el Plan Club Pro, solo cinco euros por jugador y año — mitad de precio por tiempo limitado.',            slideIdx: 5, lineCount: 2 },
    { text: 'Jugadores ilimitados, cobros automáticos, inteligencia artificial, estadísticas y análisis de vídeo, todo sin comisiones.', slideIdx: 5, lineCount: 3 },
    { text: 'Más de doscientos clubes ya confían en Sphaira. ¿El tuyo va a ser el siguiente?',                           slideIdx: 5, lineCount: 4 },
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
    { text: "And if you're thinking about making the leap, now is the perfect moment.",                                    slideIdx: 5, lineCount: 1 },
    { text: 'With the Club Pro Plan, just five euros per player per year — half price, for a limited time.',               slideIdx: 5, lineCount: 2 },
    { text: 'Unlimited players, automatic payments, AI, statistics and video analysis, all included with no commissions.', slideIdx: 5, lineCount: 3 },
    { text: 'Over two hundred clubs already trust Sphaira. Will yours be the next?',                                      slideIdx: 5, lineCount: 4 },
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
    { text: "Et si vous pensez à franchir le pas, c'est le moment idéal.",                                                slideIdx: 5, lineCount: 1 },
    { text: 'Avec le Plan Club Pro, seulement cinq euros par joueur et par an — moitié prix, pour une durée limitée.',   slideIdx: 5, lineCount: 2 },
    { text: 'Joueurs illimités, paiements automatiques, intelligence artificielle, statistiques et analyse vidéo, sans commissions.', slideIdx: 5, lineCount: 3 },
    { text: 'Plus de deux cents clubs font déjà confiance à Sphaira. Le vôtre sera-t-il le prochain ?',                  slideIdx: 5, lineCount: 4 },
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
    { text: 'Und wenn Sie über den nächsten Schritt nachdenken, jetzt ist der perfekte Moment.',                          slideIdx: 5, lineCount: 1 },
    { text: 'Mit dem Club Pro Plan nur fünf Euro pro Spieler und Jahr — halber Preis, für begrenzte Zeit.',               slideIdx: 5, lineCount: 2 },
    { text: 'Unbegrenzte Spieler, automatische Zahlungen, KI, Statistiken und Videoanalyse, alles inklusive ohne Provisionen.', slideIdx: 5, lineCount: 3 },
    { text: 'Über zweihundert Vereine vertrauen bereits Sphaira. Wird Ihres der nächste sein?',                          slideIdx: 5, lineCount: 4 },
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
    { text: 'E se está a pensar em dar o passo, agora é o momento perfeito.',                                             slideIdx: 5, lineCount: 1 },
    { text: 'Com o Plano Club Pro, apenas cinco euros por jogador e por ano — metade do preço, por tempo limitado.',      slideIdx: 5, lineCount: 2 },
    { text: 'Jogadores ilimitados, cobranças automáticas, IA, estatísticas e análise de vídeo, tudo incluído sem comissões.', slideIdx: 5, lineCount: 3 },
    { text: 'Mais de duzentos clubes já confiam no Sphaira. O seu clube vai ser o próximo?',                              slideIdx: 5, lineCount: 4 },
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
    { text: 'E se stai pensando di fare il passo, ora è il momento perfetto.',                                            slideIdx: 5, lineCount: 1 },
    { text: "Con il Piano Club Pro, solo cinque euro per giocatore all'anno — metà prezzo, per un periodo limitato.",     slideIdx: 5, lineCount: 2 },
    { text: 'Giocatori illimitati, pagamenti automatici, intelligenza artificiale, statistiche e analisi video, tutto senza commissioni.', slideIdx: 5, lineCount: 3 },
    { text: 'Oltre duecento club si fidano già di Sphaira. Il tuo sarà il prossimo?',                                    slideIdx: 5, lineCount: 4 },
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
    {
      id: 'promo-club',
      lines: ['Y si estás pensando en dar el paso, ahora es el mejor momento.', 'Plan Club Pro — 5 € / jugador / año · Mitad de precio por tiempo limitado.', 'Ilimitado · Automático · Inteligente · Sin comisiones.', '¿Tu club será el siguiente? Deja tu email y compruébalo.'],
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
    {
      id: 'promo-club',
      lines: ["Ready to make the leap? Now is the perfect moment.", "Club Pro Plan — 5€ / player / year · Half price, limited time.", "Unlimited · Automatic · Intelligent · Zero commissions.", "Will your club be next? Leave your email and find out."],
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
    {
      id: 'promo-club',
      lines: ["Prêt à franchir le pas ? C'est le moment idéal.", "Plan Club Pro — 5€ / joueur / an · Moitié prix, durée limitée.", "Illimité · Automatique · Intelligent · Sans commissions.", "Votre club sera-t-il le prochain ? Laissez votre email."],
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
    {
      id: 'promo-club',
      lines: ['Bereit für den nächsten Schritt? Jetzt ist der perfekte Moment.', 'Club Pro Plan — 5€ / Spieler / Jahr · Halber Preis, begrenzte Zeit.', 'Unbegrenzt · Automatisch · Intelligent · Ohne Provisionen.', 'Wird Ihr Verein der nächste sein? Hinterlassen Sie Ihre E-Mail.'],
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
    {
      id: 'promo-club',
      lines: ['Pronto para dar o passo? Agora é o momento perfeito.', 'Plano Club Pro — 5€ / jogador / ano · Metade do preço, tempo limitado.', 'Ilimitado · Automático · Inteligente · Sem comissões.', 'O seu clube será o próximo? Deixe o seu email e comprove.'],
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
    {
      id: 'promo-club',
      lines: ['Pronto a fare il passo? Ora è il momento perfetto.', "Piano Club Pro — 5€ / giocatore / anno · Metà prezzo, tempo limitato.", 'Illimitato · Automatico · Intelligente · Senza commissioni.', 'Il tuo club sarà il prossimo? Lascia la tua email e scoprilo.'],
      lineInterval: 0, duration: 0,
    },
  ],
};

// ─── Idiomas disponibles ──────────────────────────────────────────────────────

interface LangOption {
  code: string;
  flag: string;
  label: string;
}

const LANG_OPTIONS: LangOption[] = [
  { code: 'es', flag: '🇪🇸', label: 'Español'    },
  { code: 'en', flag: '🇺🇸', label: 'English'    },
  { code: 'fr', flag: '🇫🇷', label: 'Français'   },
  { code: 'de', flag: '🇩🇪', label: 'Deutsch'    },
  { code: 'pt', flag: '🇵🇹', label: 'Português'  },
  { code: 'it', flag: '🇮🇹', label: 'Italiano'   },
];

// ─── Componente ───────────────────────────────────────────────────────────────

@Component({
  selector: 'app-demo-role',
  templateUrl: './demo-role.component.html',
  styleUrls: ['./demo-role.component.scss'],
})
export class DemoRoleSelectionComponent implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('emailInput') emailInputRef?: ElementRef<HTMLInputElement>;

  // ── Selector de idioma ────────────────────────────────────────────────────
  readonly langOptions: LangOption[] = LANG_OPTIONS;
  showLangMenu = false;
  activeLang   = 'es';

  /** 1 = storytelling intro | 2 = selección de rol */
  step = 1;

  // ── Intro storytelling ────────────────────────────────────────────────────
  currentSlide = 0;
  visibleLineCount = 0;
  isAudioLoading = false;
  audioMuted = false;
  /**
   * true  → mostrar splash "Toca para iniciar" (móvil/tablet).
   * false → desktop: autoplay directo sin splash.
   * Se inicializa en ngOnInit una vez disponible el DOM.
   */
  audioPending = false;
  /** true cuando el usuario ha pausado manualmente la narración */
  audioPausedByUser = false;

  /** El audio está reproduciéndose activamente (no pausado, no pendiente, no loading). */
  get isAudioPlaying(): boolean {
    return !!this.audioPlayer && !this.audioPlayer.paused && !this.audioPending;
  }
  introSlides: IntroSlide[] = [];
  private currentLang = 'es';
  private audioPlayer?: HTMLAudioElement;
  private timeupdateHandler?: () => void;
  /** Evita actualizaciones de estado después de que el componente se destruya (post-navegación). */
  private destroyed = false;

  /** Cues con timestamps calculados una vez conocida la duración del audio. */
  private activeCues: Array<{ time: number; slideIdx: number; lineCount: number }> = [];
  /** Tiempo de inicio de cada slide (para seek en navegación manual). */
  private slideStartTimes: number[] = [];

  // ── Selección de rol ──────────────────────────────────────────────────────
  selectedRole: DemoRole | null = null;
  showEmailModal = false;
  emailValue  = '';
  isLoading   = false;
  emailError  = '';
  /** true en cuanto el usuario ha modificado el campo (activa validación en tiempo real) */
  emailTouched = false;

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
  get activeLangOption(): LangOption {
    return LANG_OPTIONS.find(l => l.code === this.activeLang) ?? LANG_OPTIONS[0];
  }
  /**
   * Validación robusta: formato RFC-5321 simplificado.
   * Comprueba: usuario@dominio.tld con dominio de al menos 2 caracteres,
   * sin espacios, sin puntos dobles y tld de al menos 2 letras.
   */
  get isValidEmail(): boolean {
    const v = this.emailValue.trim();
    if (!v) return false;
    // Regex robusta: usuario no vacío, @, dominio, punto, tld ≥ 2 chars
    const RFC_EMAIL = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
    if (!RFC_EMAIL.test(v)) return false;
    // No puede haber puntos consecutivos
    if (v.includes('..')) return false;
    // El usuario no puede empezar ni terminar con punto
    const [user] = v.split('@');
    if (user.startsWith('.') || user.endsWith('.')) return false;
    return true;
  }

  /** Mensaje de error descriptivo según el estado del campo */
  get emailValidationMessage(): string {
    const v = this.emailValue.trim();
    if (!v) return this.translate.instant('DEMO_INTRO.EMAIL_REQUIRED');
    if (!v.includes('@')) return this.translate.instant('DEMO_INTRO.EMAIL_MISSING_AT');
    const parts = v.split('@');
    if (parts.length !== 2 || !parts[1]) return this.translate.instant('DEMO_INTRO.EMAIL_MISSING_DOMAIN');
    if (!parts[1].includes('.')) return this.translate.instant('DEMO_INTRO.EMAIL_MISSING_TLD');
    if (v.includes('..')) return this.translate.instant('DEMO_INTRO.EMAIL_DOUBLE_DOT');
    return this.translate.instant('DEMO_INTRO.EMAIL_INVALID');
  }

  /** Llamado en cada keystroke para activar validación en tiempo real */
  onEmailInput(): void {
    this.emailTouched = true;
    // Limpiar error de servidor si el usuario corrige
    if (this.emailError && this.isValidEmail) this.emailError = '';
  }
  get slideProgress(): number { return (this.currentSlide / Math.max(this.introSlides.length - 1, 1)) * 100; }

  constructor(
    private router: Router,
    private loginService: LoginService,
    private demoService: DemoService,
    private tutorialService: TutorialService,
    private translate: TranslateService,
    private cdr: ChangeDetectorRef,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════════
  //  LANG PICKER
  // ═══════════════════════════════════════════════════════════════════════════

  toggleLangMenu(event: Event): void {
    event.stopPropagation();
    this.showLangMenu = !this.showLangMenu;
    this.cdr.markForCheck();
  }

  changeLang(code: string): void {
    if (code === this.activeLang) { this.showLangMenu = false; return; }
    this.activeLang  = code;
    this.currentLang = code;
    this.showLangMenu = false;
    localStorage.setItem('lang', code);
    this.translate.use(code);

    // Recargar slides en el nuevo idioma
    this.introSlides = INTRO_SLIDES[code] ?? INTRO_SLIDES['es'];

    // Reiniciar audio en el nuevo idioma sin resetear el flujo del usuario
    this.stopAudio();
    this.audioPending     = true;
    this.audioPausedByUser = false;
    this.currentSlide     = 0;
    this.visibleLineCount = 0;
    this.loadNarrationAudio();
    this.cdr.markForCheck();
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    if (this.showLangMenu) {
      this.showLangMenu = false;
      this.cdr.markForCheck();
    }
  }

  /**
   * Devuelve true si el dispositivo es táctil (móvil/tablet) → mostrar splash.
   * Devuelve false si hay un puntero preciso (ratón) → autoplay desktop directo.
   *
   * Nota: navigator.maxTouchPoints NO se usa porque Chrome en Windows reporta
   * maxTouchPoints=5 aunque no haya pantalla táctil, dando falsos positivos.
   * El CSS media query '(hover:hover) and (pointer:fine)' es la señal más fiable
   * de un dispositivo con ratón real.
   */
  private isTouchDevice(): boolean {
    if (typeof window === 'undefined') return false;
    // Si el dispositivo tiene un puntero preciso con hover → desktop con ratón
    const hasMousePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (hasMousePointer) return false;
    // En caso contrario (coarse/touch o dual-input) → tratar como móvil
    return true;
  }

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
    this.activeLang  = this.currentLang;
    this.introSlides = INTRO_SLIDES[this.currentLang] ?? INTRO_SLIDES['es'];

    // Splash universal: el audio siempre requiere interacción explícita del usuario,
    // tanto en móvil como en desktop. Evita políticas de autoplay y es más intuitivo.
    this.audioPending = true;

    // Iniciamos el audio en ngOnInit para estar lo más cerca posible del
    // gesture de navegación del usuario y maximizar la probabilidad de autoplay.
    this.loadNarrationAudio();
  }

  ngAfterViewInit(): void {
    // En móvil el audio no arranca hasta que el usuario toca el splash.
    // En desktop se intentó autoplay en ngOnInit; aquí no hacemos nada extra
    // para no arrancar el audio sin gesto explícito del usuario.
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.stopAudio();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  AUDIO + TELEPRÓNTER
  // ═══════════════════════════════════════════════════════════════════════════

  private loadNarrationAudio(): void {
    const localPath = `assets/audio/narration-${this.currentLang}.mp3`;
    this.audioPlayer         = new Audio(localPath);
    this.audioPlayer.volume  = 1;
    this.audioPlayer.preload = 'auto';   // precarga el archivo, no lo reproduce

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

    if (this.audioPending) {
      // ── MÓVIL: splash visible → NO llamar play() en absoluto.
      // El audio solo arrancará cuando el usuario toque el splash (onUserInteraction).
      // Así garantizamos que Chrome iOS / Safari nunca arranquen el audio
      // antes del gesto explícito del usuario.
      this.isAudioLoading = false;
      return;
    }

    // ── DESKTOP: intentar autoplay con sonido ─────────────────────────────
    // El splash no está visible en desktop; si el autoplay falla simplemente
    // el usuario puede usar el botón play del topbar.
    this.audioPlayer.play()
      .then(() => {
        this.isAudioLoading = false;
        this.audioPending   = false;
        this.cdr.markForCheck();
      })
      .catch((err: unknown) => {
        const name = err instanceof DOMException ? err.name : '';
        if (name === 'AbortError') return;
        // En desktop bloqueado: el botón play del topbar activará el audio.
        this.isAudioLoading = false;
        this.cdr.markForCheck();
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

  /**
   * Llamado SOLO desde el splash screen (click/touchstart en el overlay).
   * No está conectado al HostListener para evitar que cualquier clic en la intro
   * active el audio involuntariamente.
   */
  onUserInteraction(): void {
    if (!this.audioPending || !this.audioPlayer) return;

    this.audioPending      = false;
    this.audioPausedByUser = false;
    this.audioMuted        = false;

    // Siempre desmutear primero
    this.audioPlayer.muted  = false;
    this.audioPlayer.volume = 1;

    // Si el audio ya corría en silencio (muted autoplay funcionó) → solo desmutear.
    // Si estaba parado (muted también bloqueado) → arrancar desde el inicio.
    // play() llamado DIRECTAMENTE desde el event handler → el navegador lo permite siempre.
    if (this.audioPlayer.paused) {
      this.audioPlayer.currentTime = 0;
      this.audioPlayer.play().catch(() => {});
    }

    this.cdr.markForCheck();
  }

  /** Alterna Play/Pause. Si el audio estaba bloqueado, lo desbloquea primero. */
  togglePlayPause(): void {
    if (!this.audioPlayer) return;

    // Caso 1: el autoplay fue bloqueado → primer toque del usuario, desbloquear
    if (this.audioPending) {
      this.audioPending      = false;
      this.audioPausedByUser = false;
      this.audioMuted        = false;
      this.audioPlayer.muted  = false;
      this.audioPlayer.volume = 1;
      if (this.audioPlayer.paused) {
        this.audioPlayer.currentTime = 0;
        this.audioPlayer.play().catch(() => {});
      }
      this.cdr.markForCheck();
      return;
    }

    // Caso 2: está reproduciendo → pausar
    if (!this.audioPlayer.paused) {
      this.audioPlayer.pause();
      this.audioPausedByUser = true;
      this.cdr.markForCheck();
      return;
    }

    // Caso 3: está pausado → reanudar
    this.audioPausedByUser = false;
    this.audioPlayer.play().catch(() => {});
    this.cdr.markForCheck();
  }

  /** Mantiene compatibilidad con llamadas existentes a toggleAudio() */
  toggleAudio(): void {
    this.togglePlayPause();
  }

  private stopAudio(): void {
    if (this.audioPlayer) {
      if (this.timeupdateHandler) {
        this.audioPlayer.removeEventListener('timeupdate', this.timeupdateHandler);
      }
      this.audioPlayer.pause();
      this.audioPlayer = undefined;
    }
    this.audioPending      = false;
    this.audioPausedByUser = false;
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
      // Al navegar por dots/flechas, reanudar siempre (el usuario interactuó)
      if (this.audioPlayer.paused && !this.audioPending) {
        this.audioPausedByUser = false;
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
    this.stopAudio();   // detener narración al entrar a la selección de rol
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
    this.selectedRole   = role;
    this.emailValue     = '';
    this.emailError     = '';
    this.emailTouched   = false;
    this.isLoading      = false;
    this.showEmailModal = true;
    setTimeout(() => this.emailInputRef?.nativeElement.focus(), 80);
  }

  closeEmailModal(event?: MouseEvent): void {
    if (event && (event.target as HTMLElement).closest('.email-modal__card')) return;
    this.showEmailModal = false;
    this.selectedRole   = null;
    this.isLoading      = false;
    this.emailError     = '';
    this.emailTouched   = false;
    this.cdr.markForCheck();
  }

  confirmDemoAccess(): void {
    if (!this.isValidEmail) {
      this.emailError = this.translate.instant('DEMO_INTRO.EMAIL_ERROR');
      return;
    }
    if (!this.selectedRole || this.isLoading) return;

    const role  = this.selectedRole;
    const email = this.emailValue.trim();

    this.isLoading  = true;
    this.emailError = '';
    this.cdr.markForCheck();

    // Llamar directamente (sin setTimeout largo) y manejar el resultado de la navegación.
    // Si router.navigate devuelve false o lanza, el componente no se destruye → resetear estado.
    this.loginService.loginDemoAndSetRole(email, role)
      .then((navigated) => {
        if (this.destroyed) return; // navegación OK → componente destruido
        if (!navigated) {
          // La navegación fue bloqueada (guard devolvió false)
          this.isLoading  = false;
          this.emailError = this.translate.instant('DEMO_INTRO.EMAIL_ERROR');
          this.cdr.markForCheck();
        }
      })
      .catch(() => {
        if (this.destroyed) return;
        this.isLoading  = false;
        this.emailError = this.translate.instant('DEMO_INTRO.EMAIL_ERROR');
        this.cdr.markForCheck();
      });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Utils
  // ═══════════════════════════════════════════════════════════════════════════
  trackByIndex(index: number): number { return index; }
}
