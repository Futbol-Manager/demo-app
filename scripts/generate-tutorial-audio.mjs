/**
 * Genera los archivos MP3 del tutorial de Sphaira usando la API de ElevenLabs.
 *
 * Uso:
 *   ELEVENLABS_API_KEY=<tu_clave> node scripts/generate-tutorial-audio.mjs
 *
 * Los archivos se guardan en: src/assets/audio/tutorial/
 *
 * Voces recomendadas (español de España, ElevenLabs):
 *   - Antoni     → cálida y cercana
 *   - Sergi      → clara y profesional
 *   - Rachel     → voz femenina natural
 *
 * Para ver tus voces disponibles con tu clave:
 *   https://api.elevenlabs.io/v1/voices  (GET con xi-api-key header)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, '..', 'src', 'assets', 'audio', 'tutorial');

const API_KEY = process.env.ELEVENLABS_API_KEY;
if (!API_KEY) {
  console.error('❌  Falta la variable de entorno ELEVENLABS_API_KEY');
  console.error('   Ejecútalo así:  ELEVENLABS_API_KEY=<tu_clave> node scripts/generate-tutorial-audio.mjs');
  process.exit(1);
}

// ── Configuración de voz ──────────────────────────────────────────────────────
// Cambia VOICE_ID por el ID de la voz que prefieras de tu cuenta.
// Para obtener IDs: GET https://api.elevenlabs.io/v1/voices
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || 'ErXwobaYiN019PkySvjV'; // Antoni (multilingüe)
const MODEL_ID = 'eleven_multilingual_v2';
const VOICE_SETTINGS = {
  stability: 0.55,
  similarity_boost: 0.80,
  style: 0.15,
  use_speaker_boost: true
};

// ── Textos de todos los pasos ──────────────────────────────────────────────────
const STEPS = [
  // ── Dashboard inicio ──────────────────────────────────────────────────────
  {
    file: 'inicio_01.mp3',
    text: 'Bienvenido a tu panel de gestión. Desde aquí tienes acceso a todos los módulos del club: equipos, documentos, pagos, equipación y mucho más. En los próximos pasos te explicamos qué hace cada sección.'
  },
  {
    file: 'inicio_02.mp3',
    text: 'Tu centro de control del club. Aquí encuentras el resumen de equipos, jugadores y entrenadores, los próximos partidos y entrenamientos, y alertas sobre pagos pendientes, lesiones o documentos sin entregar. Pulsa en cualquier elemento para ver su detalle.'
  },
  {
    file: 'inicio_03.mp3',
    text: 'Gestiona toda la estructura deportiva del club. Crea equipos por categoría, asigna jugadores y entrenadores, y accede al detalle completo de cada uno: estadísticas, calendario y plantilla.'
  },
  {
    file: 'inicio_04.mp3',
    text: 'Centraliza toda la documentación del club: autorizaciones, contratos, fichas médicas y formularios personalizados. Publica documentos para que los jugadores los firmen y haz seguimiento de quién ha entregado cada uno.'
  },
  {
    file: 'inicio_05.mp3',
    text: 'Gestiona todas las cuotas del club desde un único lugar. Consulta qué jugadores están al día y cuáles tienen pagos pendientes, configura los importes y acepta pagos online de forma sencilla.'
  },
  {
    file: 'inicio_06.mp3',
    text: 'Controla la equipación de todos los jugadores del club. Consulta o edita las tallas de camiseta, pantalón y medias de cada jugador, y lleva un seguimiento de los pedidos realizados a proveedores.'
  },
  {
    file: 'inicio_07.mp3',
    text: 'Lleva un control profesional de los patrocinios del club. Registra patrocinadores con nombre, importe, logotipo y fechas de contrato, y recibe alertas automáticas antes de que expire cada acuerdo.'
  },
  {
    file: 'inicio_08.mp3',
    text: 'Comunícate de forma directa con todos o con un equipo concreto. Redacta mensajes, adjunta archivos como documentos o imágenes, y programa el momento exacto en que quieres que se entreguen.'
  },
  {
    file: 'inicio_09.mp3',
    text: 'Define quién tiene acceso a cada parte del panel del club. Añade miembros del staff, asígnales permisos concretos por módulo —pagos, documentos, estadísticas, calendario— y gestiona sus roles de forma granular.'
  },
  {
    file: 'inicio_10.mp3',
    text: 'Organiza tu proceso de captación de talento. Añade jugadores a tu lista de observación y sigue su evolución a través del pipeline de scouting: desde el primer vistazo hasta el contacto formal con el club.'
  },
  {
    file: 'inicio_11.mp3',
    text: 'Tu videoteca deportiva en la nube. Sube grabaciones de partidos y entrenamientos, enlaza vídeos de YouTube o Vimeo, y organízalos en carpetas por equipo o temporada para acceder a ellos cuando los necesites.'
  },
  {
    file: 'inicio_12.mp3',
    text: 'Lleva el análisis táctico al siguiente nivel. Crea sesiones de trabajo sobre tus vídeos, añade anotaciones, dibuja sobre el campo y extrae clips clave para compartir con el cuerpo técnico.'
  },
  {
    file: 'inicio_13.mp3',
    text: 'Tu asistente inteligente, siempre disponible. Hazle preguntas sobre el club, pídele que genere informes, cree sesiones de entrenamiento o prepare convocatorias. Lo encontrarás en el botón circular de la esquina inferior derecha.'
  },
  {
    file: 'inicio_14.mp3',
    text: '¡Ya conoces todo lo que Sphaira tiene para ti! Navega por cualquier módulo desde el menú lateral. Si en algún momento necesitas orientación, el botón de ayuda en cada pantalla está para cuando lo necesites.'
  },

  // ── Cuadro de mandos ───────────────────────────────────────────────────────
  {
    file: 'cuadro_01.mp3',
    text: 'Bienvenido al centro de control de tu club. A la izquierda tienes acceso rápido a jugadores, entrenadores, estadísticas y calendario; a la derecha, un resumen en tiempo real de resultados, entrenamientos del día y próximos partidos.'
  },
  {
    file: 'cuadro_02.mp3',
    text: 'Cuando quieras volver al panel principal del club, pulsa aquí. Desde ahí podrás acceder al resto de módulos.'
  },
  {
    file: 'cuadro_03.mp3',
    text: 'Accede al directorio completo de todos los jugadores del club. Consulta fichas individuales con datos personales, estadísticas de rendimiento, historial de lesiones, estado de pagos y documentación asociada.'
  },
  {
    file: 'cuadro_04.mp3',
    text: 'Consulta y gestiona todo el cuerpo técnico del club. Revisa el listado de entrenadores, su asignación a cada equipo y sus datos de contacto de manera centralizada.'
  },
  {
    file: 'cuadro_05.mp3',
    text: 'Analiza el rendimiento individual de cada jugador. Consulta goles, asistencias, minutos jugados y tarjetas recibidas, y aplica filtros por equipo, posición o temporada.'
  },
  {
    file: 'cuadro_06.mp3',
    text: 'Evalúa el rendimiento colectivo de cada equipo del club. Visualiza clasificaciones, resultados y tendencias por temporada para tomar mejores decisiones tácticas.'
  },
  {
    file: 'cuadro_07.mp3',
    text: 'El módulo de planificación de entrenamientos estará disponible muy pronto. Podrás diseñar sesiones completas, asignar tareas tácticas y ver el calendario de trabajo en un solo lugar.'
  },
  {
    file: 'cuadro_08.mp3',
    text: 'Visualiza toda la actividad del club en un único calendario. Partidos, entrenamientos y eventos organizados de forma clara; crea o edita cualquier entrada desde la vista mensual o semanal.'
  },
  {
    file: 'cuadro_09.mp3',
    text: 'El módulo de gestión de lesiones llegará próximamente. Con él podrás registrar bajas, hacer seguimiento del estado de recuperación y planificar el retorno de cada jugador a la competición.'
  },
  {
    file: 'cuadro_10.mp3',
    text: 'Consulta los últimos resultados del club de un vistazo: marcador, equipo y resultado —victoria, empate o derrota—. Pulsa en cualquier partido para ver el detalle completo o actualizar el marcador.'
  },
  {
    file: 'cuadro_11.mp3',
    text: 'Conoce de un vistazo qué equipos entrenan hoy y a qué hora. La línea de tiempo te indica en qué momento del día estás respecto a los entrenamientos programados.'
  },
  {
    file: 'cuadro_12.mp3',
    text: 'Anticipa los próximos compromisos del club. Consulta fecha, hora y rival, y pulsa en cualquier partido para acceder a la convocatoria, editar los datos o preparar el análisis previo.'
  },
  {
    file: 'cuadro_13.mp3',
    text: 'Ahora dominas el cuadro de mandos. Usa el panel izquierdo para profundizar en cualquier módulo y mantén siempre un ojo en el lado derecho para estar al tanto de resultados y próximos partidos.'
  },

  // ── Login ──────────────────────────────────────────────────────────────────
  {
    file: 'login_01.mp3',
    text: 'Estás a punto de entrar en Sphaira, la plataforma de gestión deportiva de tu club. En unos segundos te mostramos cómo funciona esta pantalla para que empieces con todo claro.'
  },
  {
    file: 'login_02.mp3',
    text: 'Escribe aquí el correo electrónico con el que te diste de alta en Sphaira. Si estás explorando en modo demo, este campo es todo lo que necesitas para entrar.'
  },
  {
    file: 'login_03.mp3',
    text: 'Introduce tu contraseña para acceder a tu cuenta. Puedes usar el icono del ojo para mostrarla y comprobar que está escrita correctamente antes de continuar.'
  },
  {
    file: 'login_04.mp3',
    text: 'Cuando hayas introducido tus datos, pulsa aquí para entrar. Si es tu primera vez, asegúrate de que el correo y la contraseña coinciden con los que usaste al registrarte.'
  },
  {
    file: 'login_05.mp3',
    text: 'Ya tienes todo listo. Pulsa Iniciar sesión para acceder a tu panel de gestión y empezar a explorar Sphaira. Si tienes algún problema, el equipo de soporte está disponible en el menú de ayuda.'
  }
];

// ── Generación ─────────────────────────────────────────────────────────────────

async function generateAudio(text, outputPath) {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'xi-api-key': API_KEY,
      'Content-Type': 'application/json',
      'Accept': 'audio/mpeg'
    },
    body: JSON.stringify({
      text,
      model_id: MODEL_ID,
      voice_settings: VOICE_SETTINGS
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`ElevenLabs API error ${response.status}: ${errText}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(outputPath, buffer);
}

async function main() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  console.log(`\n🎙️  Generando ${STEPS.length} archivos de audio para el tutorial de Sphaira`);
  console.log(`   Voz: ${VOICE_ID}  |  Modelo: ${MODEL_ID}`);
  console.log(`   Destino: ${OUTPUT_DIR}\n`);

  let success = 0;
  let skipped = 0;
  let errors = 0;

  for (const step of STEPS) {
    const outputPath = path.join(OUTPUT_DIR, step.file);

    if (fs.existsSync(outputPath)) {
      console.log(`   ⏭️  ${step.file}  (ya existe, omitiendo)`);
      skipped++;
      continue;
    }

    try {
      process.stdout.write(`   ⏳  ${step.file}  …`);
      await generateAudio(step.text, outputPath);
      const size = Math.round(fs.statSync(outputPath).size / 1024);
      console.log(` ✅  (${size} KB)`);
      success++;
      // Pequeña pausa entre peticiones para respetar el rate-limit
      await new Promise(r => setTimeout(r, 300));
    } catch (err) {
      console.log(` ❌  ${err.message}`);
      errors++;
    }
  }

  console.log(`\n📊  Resultado: ${success} generados, ${skipped} omitidos, ${errors} errores`);
  if (errors === 0) {
    console.log('✅  ¡Todos los audios generados correctamente!\n');
  } else {
    console.log('⚠️   Algunos audios fallaron. Vuelve a ejecutar el script para reintentarlos.\n');
  }
}

main().catch(err => {
  console.error('Error fatal:', err);
  process.exit(1);
});
