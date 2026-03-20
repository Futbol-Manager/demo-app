/**
 * Genera los archivos MP3 de la narración intro de la demo de Sphaira.
 * Un archivo por idioma: narration-es.mp3, narration-en.mp3, etc.
 *
 * Uso:
 *   npm run generate-narration-audio
 *   (lee la API key de scripts/.elevenlabs-api-key o de ELEVENLABS_API_KEY)
 *
 * Los archivos se guardan en: src/assets/audio/
 *
 * Para regenerar un idioma concreto:
 *   node scripts/generate-narration-audio.mjs --only=es
 *   node scripts/generate-narration-audio.mjs --only=en --force
 */

import fs from 'fs';
import https from 'https';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, '..', 'src', 'assets', 'audio');
const PROJECT_ROOT = path.join(__dirname, '..');
const KEY_FILE = path.join(__dirname, '.elevenlabs-api-key');

// ── Cargar API key ────────────────────────────────────────────────────────────
function loadEnv() {
  const envPath = path.join(PROJECT_ROOT, '.env');
  if (!fs.existsSync(envPath)) return;
  try {
    for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*ELEVENLABS_API_KEY\s*=\s*(.+)\s*$/);
      if (m) process.env.ELEVENLABS_API_KEY = m[1].replace(/^["']|["']$/g, '').trim();
    }
  } catch (_) {}
}
loadEnv();

let API_KEY = process.env.ELEVENLABS_API_KEY;
if (!API_KEY) {
  try {
    if (fs.existsSync(KEY_FILE)) API_KEY = fs.readFileSync(KEY_FILE, 'utf8').trim();
  } catch (_) {}
}
// Fallback: clave hardcoded del demoenvironment (solo para uso en local)
if (!API_KEY) API_KEY = 'sk_fa63b8c6808921291db5eab60b443f115d484fda7eef6f36';

// ── Voces por idioma ───────────────────────────────────────────────────────────
// Voces masculinas nativas — obtenidas de https://elevenlabs.io/voice-library
const VOICES = {
  es: { id: 'RwzBDEn5f6FIgpAjH9YN', model: 'eleven_turbo_v2_5',      label: 'Mateo (castellano España)' },
  en: { id: 'onwK4e9ZLuTAKqWW03F9', model: 'eleven_multilingual_v2',  label: 'Daniel (British English)'  },
  fr: { id: 'N2lVS1w4EtoT3dr4eOWO', model: 'eleven_multilingual_v2',  label: 'Callum (francés nativo)'   },
  de: { id: 'pqHfZKP75CvOlQylNhV4', model: 'eleven_multilingual_v2',  label: 'Bill (alemán nativo)'      },
  pt: { id: 'JBFqnCBsd6RMkjVDRZzb', model: 'eleven_multilingual_v2',  label: 'George (multilingual PT)'  },
  it: { id: 'zcAOhNBS3c14rBihAFp1', model: 'eleven_multilingual_v2',  label: 'Giovanni (italiano nativo)'},
};

const VOICE_SETTINGS = {
  es: { stability: 0.38, similarity_boost: 0.78, style: 0.22, use_speaker_boost: true, speed: 1.10 },
  en: { stability: 0.40, similarity_boost: 0.78, style: 0.20, use_speaker_boost: true, speed: 1.08 },
  fr: { stability: 0.42, similarity_boost: 0.80, style: 0.18, use_speaker_boost: true, speed: 1.08 },
  de: { stability: 0.42, similarity_boost: 0.80, style: 0.18, use_speaker_boost: true, speed: 1.06 },
  pt: { stability: 0.42, similarity_boost: 0.80, style: 0.18, use_speaker_boost: true, speed: 1.08 },
  it: { stability: 0.42, similarity_boost: 0.80, style: 0.18, use_speaker_boost: true, speed: 1.08 },
};

// ── Segmentos de narración — alineados 1:1 con las líneas de cada slide ───────
// Orden: intro-overture | slide0-L1 | slide0-L2 | slide1-L1 | slide1-L2 |
//        slide2-L1 | slide2-L2 | slide3-L1 | slide3-L2 |
//        slide4-L1 | slide4-L2 | slide4-L3 |
//        slide5-L1 | slide5-L2 | slide5-L3 | slide5-L4  ← PROMO CLUB PRO
// Este orden es el que usa el teleprónter en el componente Angular.
const NARRATION_TEXTS = {
  es: [
    'Si gestionas un club de fútbol, seguramente conoces esto de sobra.',
    'Las cuotas que no llegan.',
    'El Excel que se complica cada temporada.',
    'Los grupos de WhatsApp a las once de la noche.',
    'Los papeles, los recibos, los padres a los que tienes que perseguir.',
    'No es que lo estés haciendo mal.',
    'Es que nadie te ha dado las herramientas correctas.',
    'Lo que estás a punto de ver es Sphaira.',
    'La app que ya usan más de doscientos clubes para gestionar todo de forma automática.',
    'En esta demo vas a ver exactamente cómo funciona.',
    'Cobros automáticos, gestión de jugadores, convocatorias, comunicación con familias, todo en un solo sitio.',
    'Es gratis. No hace falta tarjeta. En cinco minutos sabes si esto es lo que tu club necesita.',
    'Y si estás pensando en dar el paso, ahora es el mejor momento.',
    'Con el Plan Club Pro, solo cinco euros por jugador y año — mitad de precio por tiempo limitado.',
    'Jugadores ilimitados, cobros automáticos, inteligencia artificial, estadísticas y análisis de vídeo, todo sin comisiones.',
    'Más de doscientos clubes ya confían en Sphaira. ¿El tuyo va a ser el siguiente?',
  ].join('\n'),

  en: [
    'If you manage a football club, you probably know this all too well.',
    'Fees that never arrive.',
    'A spreadsheet that gets more complicated every season.',
    'WhatsApp groups at eleven at night.',
    'Paperwork, receipts, parents you have to chase.',
    "It's not that you're doing it wrong.",
    "It's that nobody has given you the right tools.",
    "What you're about to see is Sphaira.",
    'The app already used by more than two hundred clubs to manage all of that automatically.',
    "In this demo you'll see exactly how it works.",
    'Automatic payments, player management, squad calls, family communication, all in one place.',
    "Free. No card needed. In five minutes you'll know if this is what your club needs.",
    "And if you're thinking about making the leap, now is the perfect moment.",
    'With the Club Pro Plan, just five euros per player per year — half price, for a limited time.',
    'Unlimited players, automatic payments, AI, statistics and video analysis, all included with no commissions.',
    'Over two hundred clubs already trust Sphaira. Will yours be the next?',
  ].join('\n'),

  fr: [
    'Si vous gérez un club de football, vous connaissez sûrement cela.',
    "Les cotisations qui n'arrivent jamais.",
    'Le tableau Excel qui se complique chaque saison.',
    'Les groupes WhatsApp à onze heures du soir.',
    'Les papiers, les reçus, les parents que vous devez relancer.',
    "Ce n'est pas que vous faites mal les choses.",
    "C'est que personne ne vous a donné les bons outils.",
    "Ce que vous allez découvrir, c'est Sphaira.",
    "L'appli déjà utilisée par plus de deux cents clubs pour tout gérer automatiquement.",
    'Dans cette démo, vous verrez exactement comment ça fonctionne.',
    'Paiements automatiques, joueurs, convocations, communication avec les familles, tout en un seul endroit.',
    "Gratuit. Sans carte. En cinq minutes vous saurez si c'est ce dont votre club a besoin.",
    "Et si vous pensez à franchir le pas, c'est le moment idéal.",
    'Avec le Plan Club Pro, seulement cinq euros par joueur et par an — moitié prix, pour une durée limitée.',
    'Joueurs illimités, paiements automatiques, intelligence artificielle, statistiques et analyse vidéo, sans commissions.',
    'Plus de deux cents clubs font déjà confiance à Sphaira. Le vôtre sera-t-il le prochain ?',
  ].join('\n'),

  de: [
    'Wenn Sie einen Fußballverein leiten, kennen Sie das sicher nur zu gut.',
    'Beiträge, die nie ankommen.',
    'Eine Tabelle, die jede Saison komplizierter wird.',
    'WhatsApp-Gruppen um elf Uhr nachts.',
    'Papiere, Quittungen, Eltern, hinter denen Sie herlaufen müssen.',
    'Es liegt nicht daran, dass Sie es falsch machen.',
    'Es liegt daran, dass niemand Ihnen die richtigen Werkzeuge gegeben hat.',
    'Was Sie gleich sehen werden, ist Sphaira.',
    'Die App, die bereits von mehr als zweihundert Vereinen genutzt wird, um alles automatisch zu verwalten.',
    'In dieser Demo sehen Sie genau, wie es funktioniert.',
    'Automatische Zahlungen, Spielerverwaltung, Kaderaufrufe, Kommunikation, alles an einem Ort.',
    'Kostenlos. Ohne Karte. In fünf Minuten wissen Sie, ob das das Richtige für Ihren Verein ist.',
    'Und wenn Sie über den nächsten Schritt nachdenken, jetzt ist der perfekte Moment.',
    'Mit dem Club Pro Plan nur fünf Euro pro Spieler und Jahr — halber Preis, für begrenzte Zeit.',
    'Unbegrenzte Spieler, automatische Zahlungen, KI, Statistiken und Videoanalyse, alles inklusive ohne Provisionen.',
    'Über zweihundert Vereine vertrauen bereits Sphaira. Wird Ihres der nächste sein?',
  ].join('\n'),

  pt: [
    'Se administra um clube de futebol, provavelmente conhece bem esta situação.',
    'Mensalidades que nunca chegam.',
    'A folha de cálculo que fica mais complicada a cada temporada.',
    'Os grupos de WhatsApp às onze da noite.',
    'Os papéis, os recibos, os pais que tem de contactar repetidamente.',
    'Não é que esteja a fazer as coisas mal.',
    'É que ninguém lhe deu as ferramentas certas.',
    'O que está prestes a ver é o Sphaira.',
    'A app já utilizada por mais de duzentos clubes para gerir tudo automaticamente.',
    'Nesta demo vai ver exatamente como funciona.',
    'Cobranças automáticas, gestão de jogadores, convocatórias, comunicação com as famílias, tudo num só lugar.',
    'É gratuito, não precisa de cartão, e em cinco minutos saberá se é isto que o seu clube precisa.',
    'E se está a pensar em dar o passo, agora é o momento perfeito.',
    'Com o Plano Club Pro, apenas cinco euros por jogador e por ano — metade do preço, por tempo limitado.',
    'Jogadores ilimitados, cobranças automáticas, IA, estatísticas e análise de vídeo, tudo incluído sem comissões.',
    'Mais de duzentos clubes já confiam no Sphaira. O seu clube vai ser o próximo?',
  ].join('\n'),

  it: [
    'Se gestisci una squadra di calcio, probabilmente conosci bene questa situazione.',
    'Le quote che non arrivano mai.',
    'Il foglio Excel che diventa sempre più complicato ogni stagione.',
    'I gruppi WhatsApp alle undici di sera.',
    'I documenti, le ricevute, i genitori che devi inseguire.',
    'Non è che tu stia facendo le cose male.',
    'È che nessuno ti ha dato gli strumenti giusti.',
    'Quello che stai per vedere è Sphaira.',
    "L'app già utilizzata da più di duecento club per gestire tutto automaticamente.",
    'In questa demo vedrai esattamente come funziona.',
    'Pagamenti automatici, giocatori, convocazioni, comunicazione con le famiglie, tutto in un unico posto.',
    'Gratuito. Senza carta. In cinque minuti saprai se è quello di cui il tuo club ha bisogno.',
    'E se stai pensando di fare il passo, ora è il momento perfetto.',
    "Con il Piano Club Pro, solo cinque euro per giocatore all'anno — metà prezzo, per un periodo limitato.",
    'Giocatori illimitati, pagamenti automatici, intelligenza artificiale, statistiche e analisi video, tutto senza commissioni.',
    'Oltre duecento club si fidano già di Sphaira. Il tuo sarà il prossimo?',
  ].join('\n'),
};

// ── Leer argumentos CLI ───────────────────────────────────────────────────────
const args = process.argv.slice(2);
const onlyArg  = args.find(a => a.startsWith('--only='))?.split('=')[1];
const forceArg = args.includes('--force');
// Clave pasada por argumento: --key=sk_xxxx (tiene prioridad sobre .env y hardcoded)
const keyArg   = args.find(a => a.startsWith('--key='))?.split('=').slice(1).join('=');
if (keyArg) API_KEY = keyArg;

const LANGS_TO_GEN = onlyArg
  ? (NARRATION_TEXTS[onlyArg] ? [onlyArg] : (console.error(`❌ Idioma desconocido: ${onlyArg}`), process.exit(1)))
  : Object.keys(NARRATION_TEXTS);

// ── Utilidades ────────────────────────────────────────────────────────────────
function httpsPost(url, headers, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request(
      { hostname: u.hostname, path: u.pathname + u.search, method: 'POST', headers },
      (res) => {
        const chunks = [];
        res.on('data', c => chunks.push(c));
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(Buffer.concat(chunks));
          } else {
            const text = Buffer.concat(chunks).toString('utf8');
            reject(new Error(`HTTP ${res.statusCode}: ${text.slice(0, 300)}`));
          }
        });
      }
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function generateAudio(lang) {
  const outFile = path.join(OUTPUT_DIR, `narration-${lang}.mp3`);

  if (!forceArg && fs.existsSync(outFile)) {
    const size = fs.statSync(outFile).size;
    if (size > 10_000) {
      console.log(`  ⏩ ${lang}: ya existe (${(size / 1024).toFixed(0)} KB) — usa --force para regenerar`);
      return;
    }
  }

  const voice   = VOICES[lang];
  const settings = VOICE_SETTINGS[lang];
  const text    = NARRATION_TEXTS[lang];

  console.log(`  🎙  ${lang}: generando con ${voice.label}...`);

  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voice.id}?output_format=mp3_44100_128`;
  const headers = {
    'xi-api-key':   API_KEY,
    'Content-Type': 'application/json',
    'Accept':       'audio/mpeg',
  };
  const bodyObj = {
    text,
    model_id: voice.model,
    voice_settings: settings,
  };

  const audioBuffer = await httpsPost(url, headers, JSON.stringify(bodyObj));
  fs.writeFileSync(outFile, audioBuffer);
  console.log(`  ✅ ${lang}: guardado → ${path.relative(PROJECT_ROOT, outFile)} (${(audioBuffer.length / 1024).toFixed(0)} KB)`);
}

// ── Ejecución principal ───────────────────────────────────────────────────────
async function main() {
  console.log('\n🎧  Sphaira — Generador de audio de narración demo');
  console.log(`    Destino: ${path.relative(PROJECT_ROOT, OUTPUT_DIR)}`);
  console.log(`    Idiomas: ${LANGS_TO_GEN.join(', ')}\n`);

  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  let ok = 0, fail = 0;
  for (const lang of LANGS_TO_GEN) {
    try {
      await generateAudio(lang);
      ok++;
    } catch (err) {
      console.error(`  ❌ ${lang}: ${err.message}`);
      fail++;
    }
    // Pequeña pausa para no saturar la API
    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`\n──────────────────────────────────────`);
  console.log(`  ✅ OK: ${ok} | ❌ Error: ${fail}`);
  if (fail === 0) console.log('  🎉 Todos los audios generados correctamente.\n');
  else console.log('  ⚠️  Revisa los errores anteriores.\n');
}

main().catch(err => { console.error(err); process.exit(1); });
