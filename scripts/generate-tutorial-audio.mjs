/**
 * Genera los archivos MP3 del tutorial de Sphaira usando la API de ElevenLabs.
 *
 * Uso:
 *   npm run generate-tutorial-audio
 *   (lee la API key de scripts/.elevenlabs-api-key o de ELEVENLABS_API_KEY)
 *
 * Los archivos se guardan en: src/assets/audio/tutorial/
 *
 * Para ver tus voces: https://api.elevenlabs.io/v1/voices (GET con xi-api-key)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, '..', 'src', 'assets', 'audio', 'tutorial');
const PROJECT_ROOT = path.join(__dirname, '..');
const KEY_FILE = path.join(__dirname, '.elevenlabs-api-key');

// Cargar .env del proyecto (ELEVENLABS_API_KEY=xxx) si existe
function loadEnv() {
  const envPath = path.join(PROJECT_ROOT, '.env');
  if (!fs.existsSync(envPath)) return;
  try {
    const content = fs.readFileSync(envPath, 'utf8');
    for (const line of content.split(/\r?\n/)) {
      const m = line.match(/^\s*ELEVENLABS_API_KEY\s*=\s*(.+)\s*$/);
      if (m) process.env.ELEVENLABS_API_KEY = m[1].replace(/^["']|["']$/g, '').trim();
    }
  } catch (_) {}
}
loadEnv();

let API_KEY = process.env.ELEVENLABS_API_KEY;
if (!API_KEY) {
  try {
    if (fs.existsSync(KEY_FILE)) {
      API_KEY = fs.readFileSync(KEY_FILE, 'utf8').trim();
    }
  } catch (_) {}
}
if (!API_KEY) {
  console.error('❌  Falta la API key de ElevenLabs.');
  console.error('   Opciones:');
  console.error('   1. Crear scripts/.elevenlabs-api-key con tu clave (una línea).');
  console.error('   2. Crear .env en la raíz del proyecto con: ELEVENLABS_API_KEY=tu_clave');
  console.error('   3. Ejecutar: ELEVENLABS_API_KEY=tu_clave npm run generate-tutorial-audio');
  process.exit(1);
}

// ── Configuración de voz ──────────────────────────────────────────────────────
// Voz ES: hombre, castellano de España (Mateo por defecto). Se usa para todos los audios,
// incluidos demo_role_01/02/03 (selección de rol: narrativo en español).
// Para obtener IDs propios: GET https://api.elevenlabs.io/v1/voices
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || 'RwzBDEn5f6FIgpAjH9YN';
const MODEL_ID = 'eleven_turbo_v2_5'; // Más rápido y dinámico que multilingual_v2
const VOICE_SETTINGS = {
  stability: 0.38,        // Menos monótono → más natural y dinámico
  similarity_boost: 0.78,
  style: 0.22,            // Más expresivo
  use_speaker_boost: true,
  speed: 1.15             // 15% más rápido → cadencia ágil sin perder claridad
};

// Voz EN: hombre, inglés (Daniel — British English, natural y profesional).
// Alternativas: Adam (pNInz6obpgDQGcFmaJgB), Josh (TxGEqnHWrfWFTfGW9XjX)
// Para ver IDs disponibles: GET https://api.elevenlabs.io/v1/voices
const VOICE_ID_EN = process.env.ELEVENLABS_VOICE_ID_EN || 'onwK4e9ZLuTAKqWW03F9'; // Daniel (British)
const VOICE_SETTINGS_EN = {
  stability: 0.40,
  similarity_boost: 0.78,
  style: 0.20,
  use_speaker_boost: true,
  speed: 1.12
};

// Modelo multilingüe — para FR, DE, PT, IT se usa eleven_multilingual_v2 (mayor calidad en idiomas no nativos)
const MODEL_ID_MULTILINGUAL = 'eleven_multilingual_v2';
// Voz multilingual compartida (Daniel soporta todos estos idiomas con el modelo multilingual_v2)
// Puedes sobrescribir cada idioma con su propia ENV var, p.ej. ELEVENLABS_VOICE_ID_FR=xxx
const VOICE_SETTINGS_MULTILINGUAL = {
  stability: 0.42,
  similarity_boost: 0.80,
  style: 0.18,
  use_speaker_boost: true,
  speed: 1.10
};
const VOICE_ID_FR = process.env.ELEVENLABS_VOICE_ID_FR || 'N2lVS1w4EtoT3dr4eOWO'; // Callum — voz nativa francesa (hombre, natural)
const VOICE_ID_DE = process.env.ELEVENLABS_VOICE_ID_DE || 'pqHfZKP75CvOlQylNhV4'; // Bill — voz nativa alemana (hombre, profesional)
const VOICE_ID_PT = process.env.ELEVENLABS_VOICE_ID_PT || 'JBFqnCBsd6RMkjVDRZzb'; // George — voz multilingual clara para PT
const VOICE_ID_IT = process.env.ELEVENLABS_VOICE_ID_IT || 'zcAOhNBS3c14rBihAFp1'; // Giovanni — voz nativa italiana (hombre)

// ── Textos de todos los pasos ──────────────────────────────────────────────────
const STEPS = [
  // ── Header (pasos comunes en dashboard/inicio por rol) ───────────────────────
  { file: 'header_club_01.mp3', text: 'A la izquierda tienes el logo del club. Pulsa en él para volver siempre a esta pantalla de inicio.' },
  { file: 'header_club_02.mp3', text: 'Este botón abre el tutorial de la pantalla en la que estés. Úsalo cuando quieras repasar los pasos de cualquier sección.' },
  { file: 'header_club_03.mp3', text: 'Aquí puedes suscribirte o gestionar el plan de Sphaira de tu club.' },
  { file: 'header_club_04.mp3', text: 'Las notificaciones del club aparecen aquí. Pulsa para ver el listado y marcar como leídas.' },
  { file: 'header_club_05.mp3', text: 'Tu perfil, suscripción del club, idioma, cambio de rol y cerrar sesión están en este menú.' },
  { file: 'header_coach_01.mp3', text: 'A la izquierda tienes el logo de entrenador. Pulsa en él para volver siempre a esta pantalla de inicio.' },
  { file: 'header_coach_02.mp3', text: 'Este botón abre el tutorial de la pantalla actual. Úsalo cuando quieras repasar los pasos.' },
  { file: 'header_coach_03.mp3', text: 'Aquí puedes suscribirte o gestionar tu plan Sphaira Coach.' },
  { file: 'header_coach_04.mp3', text: 'Tus notificaciones aparecen aquí. Pulsa para ver el listado.' },
  { file: 'header_coach_05.mp3', text: 'Tu perfil, idioma, cambio de rol y cerrar sesión están en este menú.' },
  { file: 'header_player_01.mp3', text: 'A la izquierda tienes el logo de jugador. Pulsa en él para volver siempre a esta pantalla de inicio.' },
  { file: 'header_player_02.mp3', text: 'Este botón abre el tutorial de la pantalla actual. Úsalo cuando quieras repasar los pasos.' },
  { file: 'header_player_03.mp3', text: 'Aquí puedes consultar o gestionar la suscripción a Sphaira.' },
  { file: 'header_player_04.mp3', text: 'Tus notificaciones aparecen aquí. Pulsa para ver el listado.' },
  { file: 'header_player_05.mp3', text: 'Tu perfil, idioma, cambio de rol y cerrar sesión están en este menú.' },

  // ── Dashboard inicio Club (narrativo) ────────────────────────────────────────
  {
    file: 'inicio_01.mp3',
    text: 'Estás en el corazón de tu club: este es tu panel de gestión. Desde aquí se abre todo: equipos, documentos, pagos, equipación y mucho más. En los próximos pasos te guiamos por cada sección para que no te pierdas nada.'
  },
  {
    file: 'inicio_02.mp3',
    text: 'La primera parada es el Cuadro de mando: tu centro de control. Aquí tienes el pulso del club: resumen de equipos, jugadores y entrenadores, próximos partidos y entrenamientos, y alertas de pagos, lesiones o documentos pendientes. Pulsa cuando quieras entrar.'
  },
  {
    file: 'inicio_03.mp3',
    text: 'Seguimos con Equipos: la estructura deportiva del club. Desde aquí creas equipos por categoría, asignas jugadores y entrenadores, y accedes al detalle de cada uno con estadísticas, calendario y plantilla. Todo en un solo lugar.'
  },
  {
    file: 'inicio_04.mp3',
    text: 'Ahora, Documentos. Aquí centralizas autorizaciones, contratos, fichas médicas y formularios. Publica documentos para que los jugadores los firmen y haz seguimiento de quién ha entregado cada uno. La documentación del club, ordenada.'
  },
  {
    file: 'inicio_05.mp3',
    text: 'Pasamos a Pagos y cuotas. Consulta quién está al día y quién tiene pendientes, configura importes y acepta pagos online. La gestión económica del club, desde un único sitio.'
  },
  {
    file: 'inicio_06.mp3',
    text: 'Ropa y equipación: los padres indican las tallas desde la app y el club las recibe al instante. Puedes subir imágenes de la equipación para que las familias la vean antes de pedir. Todo el tema de ropa, aquí.'
  },
  {
    file: 'inicio_07.mp3',
    text: 'Patrocinadores: registra cada patrocinador con nombre, importe, logotipo y fechas. Dale visibilidad y muéstralo a todos los usuarios del club. Tus aliados tienen su espacio aquí.'
  },
  {
    file: 'inicio_08.mp3',
    text: 'Notificaciones: comunícate con todos o con un equipo concreto. Redacta mensajes, adjunta archivos y programa el momento exacto de envío. La comunicación del club, bajo control.'
  },
  {
    file: 'inicio_09.mp3',
    text: 'Gestión de Staff: define quién accede a qué. Añade miembros, asígnales permisos por módulo —pagos, documentos, estadísticas, calendario— y gestiona sus roles. El equipo que te ayuda, bien organizado.'
  },
  {
    file: 'inicio_10.mp3',
    text: 'Scouting: organiza la captación de talento. Añade jugadores a tu lista de observación y sigue su evolución desde el primer vistazo hasta el contacto con el club. El ojeo, digital.'
  },
  {
    file: 'inicio_11.mp3',
    text: 'Biblioteca de vídeos: tu videoteca en la nube. Sube grabaciones, enlaza YouTube o Vimeo y organízalos por equipo o temporada. Todo el material audiovisual del club, a mano.'
  },
  {
    file: 'inicio_12.mp3',
    text: 'Análisis de vídeo: da un paso más. Crea sesiones tácticas sobre tus grabaciones, añade anotaciones, dibuja sobre el campo y extrae clips para compartir con el cuerpo técnico.'
  },
  {
    file: 'inicio_13.mp3',
    text: 'Y el Asistente de IA: siempre disponible en todas las pantallas. Hazle preguntas, pídele informes, sesiones de entrenamiento o convocatorias. Lo tienes en el botón circular de la esquina.'
  },
  {
    file: 'inicio_14.mp3',
    text: '¿Sabías que Sphaira tiene una aplicación móvil disponible para iPhone y Android? Revisa convocatorias desde el banquillo, gestiona pagos entre reunión y reunión, consulta estadísticas en vivo y recibe alertas al instante. La experiencia en el móvil es mucho más rápida y cómoda que en el navegador. Descárgala buscando Sphaira en la tienda de Apple o en Google Play.'
  },
  {
    file: 'inicio_15.mp3',
    text: 'Ya conoces tu panel de club. Navega por cualquier módulo cuando quieras y, si necesitas orientación, el botón de ayuda en cada pantalla está ahí. ¡A sacar partido a Sphaira!'
  },

  // ── Cuadro de mandos (sin paso Volver) ──────────────────────────────────────
  {
    file: 'cuadro_01.mp3',
    text: 'Estás en el centro de control de tu club. A la izquierda tienes el acceso rápido a jugadores, entrenadores, estadísticas y calendario. A la derecha, el resumen en tiempo real: resultados, entrenamientos del día y próximos partidos. Te guiamos paso a paso.'
  },
  {
    file: 'cuadro_03.mp3',
    text: 'Empecemos por el panel izquierdo. Aquí tienes Info jugadores, donde accedes al directorio completo del club. Consulta fichas individuales con datos personales, estadísticas, historial de lesiones, pagos y documentación.'
  },
  {
    file: 'cuadro_04.mp3',
    text: 'A continuación, Info entrenadores. Consulta y gestiona todo el cuerpo técnico del club: listado de entrenadores, su asignación a cada equipo y sus datos de contacto, todo en un mismo lugar.'
  },
  {
    file: 'cuadro_05.mp3',
    text: 'Seguimos con Estadísticas de jugadores. Analiza el rendimiento individual de cada jugador: goles, asistencias, minutos jugados y tarjetas. Aplica filtros por equipo, posición o temporada.'
  },
  {
    file: 'cuadro_06.mp3',
    text: 'Y también tienes Estadísticas por equipo. Evalúa el rendimiento colectivo, visualiza clasificaciones, resultados y tendencias por temporada para tomar mejores decisiones tácticas.'
  },
  {
    file: 'cuadro_07.mp3',
    text: 'Pasamos a Entrenamientos. Los entrenadores ya pueden crear y gestionar sus sesiones desde la app. Muy pronto el club también tendrá aquí un resumen de toda la actividad de entrenamiento.'
  },
  {
    file: 'cuadro_08.mp3',
    text: 'Sigamos con el Calendario. Visualiza toda la actividad del club en un único lugar: partidos, entrenamientos y eventos organizados de forma clara. Crea o edita cualquier entrada desde la vista mensual o semanal.'
  },
  {
    file: 'cuadro_09.mp3',
    text: 'También encontrarás Lesiones. Los entrenadores ya pueden registrar y gestionar las bajas de sus jugadores desde la app. Próximamente el club tendrá aquí un resumen centralizado de todo el estado de lesiones del club.'
  },
  {
    file: 'cuadro_10.mp3',
    text: 'Ahora fíjate en el panel derecho. Aquí tienes los Resultados del club: marcador y resultado de cada partido, victoria, empate o derrota. Pulsa en cualquiera para ver el detalle completo o actualizar el marcador.'
  },
  {
    file: 'cuadro_11.mp3',
    text: 'A la derecha tienes los Entrenamientos de hoy. De un vistazo ves qué equipos entrenan y a qué hora, y la línea de tiempo te indica en qué momento del día te encuentras respecto a los entrenamientos programados.'
  },
  {
    file: 'cuadro_12.mp3',
    text: 'Y para cerrar este panel, los Próximos partidos. Anticipa los compromisos del club consultando fecha, hora y rival, y pulsa en cualquier partido para acceder a la convocatoria o preparar el análisis previo.'
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
    text: 'Introduce aquí tu correo electrónico para acceder a Sphaira. Asegúrate de que es un correo válido y al que tienes acceso.'
  },

  {
    file: 'login_04.mp3',
    text: 'Listo, ya sabes cómo iniciar sesión. Introduce tu correo y pulsa el botón cuando quieras entrar.'
  },

  // ── Demo role (selección de rol: voces españolas, narrativo) ──────────────
  {
    file: 'demo_role_00.mp3',
    text: 'Estás en la pantalla de selección de rol en modo demostración. Puedes probar la aplicación como Club, Entrenador o Jugador. Te explicamos cada opción; al final elige la que quieras para entrar.'
  },
  {
    file: 'demo_role_01.mp3',
    text: 'Si eliges el rol de Club, entrarás en el panel de quien lleva las riendas del día a día: equipos, cuadro de mandos, cuotas, documentos y toda la estructura del club. Pulsa esta tarjeta cuando quieras explorar esa experiencia.'
  },
  {
    file: 'demo_role_02.mp3',
    text: 'Como Entrenador verás la app con ojos de cuerpo técnico: tus equipos, las tareas de entrenamiento, el calendario, los jugadores y sus estadísticas. Todo lo que necesitas para dirigir desde la banda. Pulsa aquí para vivir esa perspectiva.'
  },
  {
    file: 'demo_role_03.mp3',
    text: 'Y si eliges Jugador, accederás a la vista de quien juega en el campo: mis datos, calendario de partidos y entrenamientos, cuotas, documentación y galería del equipo. Pulsa esta tarjeta para explorar como uno más de la plantilla.'
  },
  {
    file: 'demo_role_04.mp3',
    text: 'Ya conoces los tres roles. Selecciona el que quieras para entrar en la aplicación y explorar la plataforma.'
  },

  // ── Dashboard inicio — Entrenador (coach), vista "Mis equipos" ──────────────
  { file: 'coach_01.mp3', text: 'Como entrenador, esta es tu pantalla de inicio. Aquí ves todos los equipos que diriges en la temporada elegida. Cada tarjeta es la puerta de entrada a ese equipo: calendario, tareas, jugadores y mucho más. Te guiamos en un momento.' },
  { file: 'coach_02.mp3', text: 'Arriba tienes el selector de temporada. Cámbialo para ver los equipos asignados en otro curso; el listado se actualiza al instante. Así puedes saltar de una temporada a otra sin salir de esta pantalla.' },
  { file: 'coach_03.mp3', text: 'Aquí están tus equipos. Cada tarjeta muestra categoría, nombre, liga, horario de entrenamiento y número de jugadores. Pulsa en una para acceder a su calendario, tareas, jugadores, estadísticas, notificaciones y el resto de opciones de ese equipo.' },
  { file: 'coach_04.mp3', text: 'Si aún no tienes equipos asignados en esta temporada, verás un mensaje orientativo y un botón para ir a la gestión de equipos del club. Cuando te asignen equipos, aparecerán aquí.' },
  { file: 'coach_05.mp3', text: 'Los mejores entrenadores dirigen también fuera del campo. Con la app de Sphaira para iOS y Android tienes el calendario del equipo, las tareas de tus jugadores, el registro de lesiones y el chat con el cuerpo técnico en tu móvil, vayas donde vayas. La experiencia es mucho más ágil que en el navegador. ¡Descárgala en App Store o Google Play buscando Sphaira Tech!' },
  { file: 'coach_06.mp3', text: 'Ya conoces tu panel de entrenador. Elige un equipo cuando quieras y entra a su calendario, tareas, jugadores y el resto de opciones. ¡A dirigir desde la banda!' },

  // ── Dashboard inicio — Padre/Jugador (player), vista "Mis hijos" ────────────
  { file: 'player_01.mp3', text: 'Esta es tu pantalla principal como padre o jugador. Aquí ves los deportistas vinculados a tu cuenta en la temporada elegida. Cada tarjeta te lleva a su mundo: calendario, cuotas, documentación, estadísticas y galería. Te contamos en un momento qué ver en cada parte.' },
  { file: 'player_02.mp3', text: 'Arriba tienes el selector de temporada. Cámbialo para ver los jugadores y equipos de otro curso; el listado se actualiza al instante. Así puedes cambiar de temporada sin salir de esta pantalla.' },
  { file: 'player_03.mp3', text: 'Aquí están tus jugadores. Cada tarjeta muestra nombre, equipo, horario de entrenamiento y próximo partido. Pulsa en una tarjeta o en Ver jugador para acceder a todas las opciones de ese jugador: calendario, cuotas, documentos y más.' },
  { file: 'player_04.mp3', text: 'Si no tienes jugadores vinculados en esta temporada, verás un mensaje orientativo. Contacta con tu club para dar de alta a los jugadores; cuando estén dados de alta, aparecerán aquí.' },
  { file: 'player_05.mp3', text: 'Padres y jugadores que usan la app de Sphaira no se pierden nada: reciben notificaciones de convocatorias al instante, consultan horarios de entrenamiento, revisan cuotas pendientes y acceden a los documentos del club sin tener que buscar correos ni archivos. La experiencia es mucho mejor que en el navegador. Descárgala gratis buscando Sphaira en la tienda de Apple o en Google Play.' },
  { file: 'player_06.mp3', text: 'Ya conoces tu panel de jugador. Entra en cualquier tarjeta cuando quieras para ver el calendario, las cuotas, la documentación y todas las opciones disponibles. Todo lo tienes a tu alcance.' },

  // ── Equipos (sin paso Volver; narrativo) ──────────────────────────────────
  { file: 'equipos_01.mp3', text: 'En esta pantalla gestionas todos los equipos de la temporada: categorías, jugadores por equipo, horarios de entrenamiento y acceso rápido al calendario de cada equipo. Te guiamos paso a paso.' },
  { file: 'equipos_03.mp3', text: 'Empecemos por las acciones superiores. Desde aquí puedes importar jugadores desde Excel: descarga la plantilla, rellena los datos y súbela para dar de alta a varios jugadores a la vez.' },
  { file: 'equipos_04.mp3', text: 'También puedes invitar jugadores generando un enlace de registro. Compártelo por WhatsApp o correo y los jugadores se asignarán al club directamente.' },
  { file: 'equipos_05.mp3', text: 'Para crear un nuevo equipo, pulsa aquí: elige categoría, nivel y letra. Si la categoría no existe, puedes crearla en el momento.' },
  { file: 'equipos_06.mp3', text: 'Si quieres ver los equipos de otro curso, cambia la temporada desde este selector. El listado y las estadísticas se actualizan al instante.' },
  { file: 'equipos_07.mp3', text: 'Y aquí tienes el listado de todos los equipos. Cada tarjeta muestra el escudo, nombre, horario de entrenamientos y número de jugadores. Pulsa en una para abrir el calendario y el detalle.' },
  { file: 'equipos_08.mp3', text: 'Ya dominas la pantalla de equipos. Usa las acciones superiores para importar, invitar o crear equipos, y pulsa en cualquier tarjeta para ver su calendario cuando lo necesites.' },

  // ── Documentos del club (sin paso Volver; narrativo) ───────────────────────
  { file: 'docs_01.mp3', text: 'En esta pantalla almacenas y organizas toda la documentación del club: autorizaciones, fichas médicas, contratos y formularios personalizados. Puedes subir documentos, solicitarlos y hacer seguimiento de las entregas. Te explicamos cada parte.' },
  { file: 'docs_03.mp3', text: 'La pantalla tiene dos pestañas. Cambia entre la documentación de jugadores y la de entrenadores; cada una muestra los documentos y el estado de entrega correspondiente.' },
  { file: 'docs_04.mp3', text: 'En la parte superior tienes las tres acciones disponibles. Subir documento añade un archivo al club, Solicitar documento exige la entrega a jugadores o entrenadores, y Crear formulario diseña un formulario personalizado con campos a rellenar.' },
  { file: 'docs_05.mp3', text: 'También puedes buscar documentos por nombre o descripción y filtrar por equipo. El contador muestra cuántos documentos hay en la lista actual.' },
  { file: 'docs_06.mp3', text: 'Y aquí ves la tabla completa. Cada fila muestra el estado de completado, equipos asignados, nombre, descripción y fecha. Desde las acciones puedes ver visibilidad, solicitar subida, editar, abrir el archivo o eliminar.' },
  { file: 'docs_07.mp3', text: 'Ya dominas la pantalla de documentos. Usa las acciones superiores para subir, solicitar o crear formularios, y la tabla para revisar y gestionar cada documento cuando lo necesites.' },

  // ── Gestión de Cuotas (sin Volver; pasos modales Gestión de pagos, Cobros Sphaira Pay, Sphaira Pay) ─
  { file: 'cuotas_01.mp3', text: 'En esta pantalla gestionas todos los pagos y cuotas del club: configuración de pagos, Stripe, historial, Sphaira Pay, cuenta bancaria y notificaciones. Tendrás el resumen de cobros y el listado de jugadores con su estado de pago. Te guiamos paso a paso.' },
  { file: 'cuotas_03.mp3', text: 'Empecemos por la barra de acciones. Pagos abre la gestión de cuotas del club, Stripe conecta tu cuenta para cobros online, Historial muestra todos los movimientos, Sphaira Pay los cobros automáticos por tarjeta, y también tienes Banco y Notificaciones.' },
  { file: 'cuotas_gestion_pagos.mp3', text: 'Este es el modal de Gestión de pagos. Aquí configuras todas las cuotas de la temporada: creas cuotas, defines importes, fechas y tipo de cobro —pago puntual, Sphaira Pay u otro—. Puedes marcar cuotas como obligatorias y ver el listado completo para editarlas o eliminarlas.' },
  { file: 'cuotas_cobros_sphaira.mp3', text: 'En este modal ves los Cobros Sphaira Pay: los cobros programados por tarjeta guardada, agrupados por cuota. Aquí consultas qué cuotas tienen cobro automático activado, las fechas programadas y el estado de cada cobro. Es tu centro de control para el pago recurrente.' },
  { file: 'cuotas_sphaira_pay.mp3', text: 'Este botón abre el modal de Cobros Sphaira Pay que acabas de ver. Sphaira Pay permite a las familias guardar su tarjeta y cobrar las cuotas de forma automática en las fechas que configures. Úsalo para reducir impagados y ahorrar tiempo.' },
  { file: 'cuotas_notif_config.mp3', text: 'Este es el modal de Notificaciones de Cuotas. Configura cuándo y cómo avisar a los responsables: elige los días antes del vencimiento para enviar el recordatorio, activa la notificación push en la app móvil y el correo electrónico con el detalle del pago pendiente. Guarda la configuración cuando termines.' },
  { file: 'cuotas_04.mp3', text: 'A continuación tienes el resumen. Las tarjetas muestran el total de jugadores, el importe a cobrar, lo ya cobrado con su barra de progreso y el importe pendiente. Te dan una visión rápida del estado de las cuotas.' },
  { file: 'cuotas_05.mp3', text: 'Para encontrar un jugador concreto, busca por nombre o filtra por tipo de cuota. El filtro permite ver solo los jugadores de una o varias cuotas específicas.' },
  { file: 'cuotas_06.mp3', text: 'Aquí tienes el listado completo. Cada fila muestra nombre, equipo, estado, total a pagar, pagado, restante y progreso por cuota. Desde las acciones puedes editar, registrar un pago o ver el historial del jugador.' },
  { file: 'cuotas_07.mp3', text: 'Ya dominas la gestión de cuotas. Usa la barra superior para configurar pagos, Sphaira Pay y Stripe, y la tabla para revisar y registrar cobros por jugador cuando lo necesites.' },

  // ── Gestión de Ropa (sin paso Volver; narrativo) ──────────────────────────
  { file: 'ropa_01.mp3', text: 'En esta pantalla gestionas la equipación del club: el catálogo de prendas, las tallas disponibles y la tabla de tallas por jugador. Los padres pueden indicar las tallas de sus hijos y el club recibe esa información aquí. Te guiamos paso a paso.' },
  { file: 'ropa_03.mp3', text: 'Fíjate en el selector de temporada. Cámbialo para ver y editar las tallas del catálogo y de los jugadores del curso correspondiente.' },
  { file: 'ropa_04.mp3', text: 'La pantalla tiene tres pestañas. Tallas catálogo gestiona las tallas disponibles, Catálogo de prendas define las prendas del club con sus imágenes, y Tallas jugadores muestra la tabla clásica con las tallas de cada jugador.' },
  { file: 'ropa_05.mp3', text: 'En la primera pestaña ves la tabla de tallas del catálogo: cada prenda con las tallas disponibles. Puedes editar las tallas y gestionar el contenido que verán los jugadores desde la app.' },
  { file: 'ropa_06.mp3', text: 'Si pulsas en la segunda pestaña, accedes al catálogo de prendas: define las prendas disponibles y sube las imágenes de cada una para que los jugadores y padres las vean directamente en la app.' },
  { file: 'ropa_07.mp3', text: 'En cada pestaña puedes exportar el contenido a Excel y personalizar las columnas visibles según lo que necesites consultar.' },
  { file: 'ropa_08.mp3', text: 'Ya dominas la gestión de ropa. Cambia de pestaña para trabajar con el catálogo, subir imágenes de las prendas o revisar las tallas de los jugadores cuando lo necesites.' },

  // ── Patrocinadores (sin paso Volver; narrativo) ────────────────────────────
  { file: 'patro_01.mp3', text: 'En esta pantalla gestionas los patrocinadores del club: añade logo, nombre, descripción y datos de contacto de cada uno para que todos los miembros del club los vean y puedas darles la visibilidad que merecen. Te explicamos cada parte.' },
  { file: 'patro_03.mp3', text: 'Empecemos por el carrusel de logos. Los patrocinadores con visibilidad activada aparecen aquí. Cualquier usuario del club puede hacer clic en un logo para ver la ficha completa del patrocinador.' },
  { file: 'patro_04.mp3', text: 'Para añadir un nuevo patrocinador, pulsa aquí. Sube el logo, rellena nombre, descripción, web, email y teléfono para que los miembros del club puedan conocerlo. Después podrás activar o desactivar su aparición en el carrusel.' },
  { file: 'patro_crear_modal.mp3', text: 'Este es el formulario para crear un patrocinador. Arriba subes la imagen o logo del patrocinador; se recomienda 400 por 150 píxeles en JPG o PNG. En Datos del patrocinador rellena nombre, descripción, web, teléfono, email y beneficios. Cuando termines, pulsa Guardar para registrarlo en el club.' },
  { file: 'patro_05.mp3', text: 'Y aquí ves las fichas de todos los patrocinadores registrados. Cada tarjeta muestra logo, nombre, descripción, contacto y beneficios. Puedes ver la ficha completa, controlar su visibilidad o eliminarlo.' },
  { file: 'patro_06.mp3', text: 'Ya dominas la pantalla de patrocinadores. Usa el botón Nuevo para añadir patrocinadores y las tarjetas para editar o gestionar su visibilidad cuando lo necesites.' },

  // ── Notificaciones (sin paso Volver; narrativo) ───────────────────────────
  { file: 'notif_01.mp3', text: 'Desde aquí envías y gestionas las notificaciones del club: bandeja de entrada, enviados y mensajes programados. Puedes redactar mensajes a jugadores, entrenadores o equipos completos y programar envíos. Te guiamos paso a paso.' },
  { file: 'notif_03.mp3', text: 'Empecemos por el botón principal: Redactar. Abre el formulario para escribir una nueva notificación; elige destinatarios, asunto y cuerpo, y decide si envías al momento o programas el envío.' },
  { file: 'notif_04.mp3', text: 'A la izquierda tienes las tres bandejas. Entrada muestra los mensajes recibidos con el contador de no leídos, Enviados los que ya has mandado, y Programados los que tienen un envío futuro planificado.' },
  { file: 'notif_05.mp3', text: 'En la parte superior puedes buscar mensajes por remitente, asunto o contenido. Si tienes mensajes sin leer, el botón Marcar todo como leído los marca de una sola vez.' },
  { file: 'notif_06.mp3', text: 'Además puedes filtrar los mensajes de entrada por Todos, Leídos o No leídos. Muy útil para localizar rápidamente los pendientes de leer.' },
  { file: 'notif_07.mp3', text: 'Y aquí ves la lista de mensajes. Cada fila muestra remitente, asunto y fecha; los no leídos tienen un indicador visual. Pulsa en uno para abrirlo en el panel de lectura.' },
  { file: 'notif_08.mp3', text: 'Al seleccionar un mensaje verás aquí el asunto, remitente, fecha y el cuerpo completo. En móvil puedes volver atrás para ver de nuevo la lista.' },
  { file: 'notif_09.mp3', text: 'Ya dominas la gestión de notificaciones. Usa Redactar para enviar mensajes, cambia de bandeja en el menú lateral y aprovecha la búsqueda y los filtros para encontrar lo que necesitas.' },

  // ── Gestión de Staff (sin paso Volver; narrativo) ──────────────────────────
  { file: 'staff_01.mp3', text: 'Aquí creas y gestionas los usuarios con acceso al panel del club. Cada usuario Staff tiene permisos por módulo: jugadores, estadísticas, calendario, documentos, pagos y más. Puedes habilitar o deshabilitar el acceso y editar permisos en cualquier momento. Te explicamos cada parte.' },
  { file: 'staff_03.mp3', text: 'En la parte superior ves el número de usuarios Staff y el botón Nuevo Staff para crear uno nuevo. Al crearlo indicarás nombre, apellidos, email, contraseña y los módulos a los que tendrá acceso.' },
  { file: 'staff_04.mp3', text: 'Y aquí ves las tarjetas de todos los usuarios Staff. Cada una muestra identidad, estado Activo o Inhabilitado, el interruptor de acceso y los permisos asignados. Desde las acciones puedes editar permisos o eliminar al usuario.' },
  { file: 'staff_05.mp3', text: 'Fíjate en cada tarjeta: verás nombre, email y el badge de estado. El interruptor Acceso habilita o deshabilita el panel con confirmación, y los chips muestran los módulos a los que tiene acceso ese usuario.' },
  { file: 'staff_06.mp3', text: 'Ya dominas la gestión de Staff. Crea usuarios con Nuevo Staff, asigna solo los módulos que necesiten y usa el interruptor de acceso para activar o desactivar sin borrar al usuario.' },

  // ── Scouting del club (sin paso Volver; narrativo) ─────────────────────────
  { file: 'scout_01.mp3', text: 'En esta pantalla gestionas la lista de jugadores en observación: tu watchlist, el pipeline por estados y la opción de comparar jugadores. Puedes añadir jugadores externos, evaluarlos y generar informes con IA. Te guiamos paso a paso.' },
  { file: 'scout_03.mp3', text: 'Empecemos por la configuración del módulo. Desde aquí activas o desactivas el Pipeline, los informes y la comparativa de jugadores. Los cambios se aplican al guardar.' },
  { file: 'scout_04.mp3', text: 'La pantalla tiene dos vistas. La lista de seguimiento muestra todos los jugadores en observación con filtros y búsqueda, y el Pipeline presenta una vista por columnas para mover jugadores entre fases.' },
  { file: 'scout_05.mp3', text: 'En la lista de seguimiento puedes buscar por nombre, filtrar por estado del pipeline, añadir jugadores externos con Añadir externo, y activar el modo comparación para elegir hasta cuatro jugadores y compararlos.' },
  { file: 'scout_06.mp3', text: 'Aquí ves a todos los jugadores en observación. Cada fila muestra nombre, edad, posición, equipo, estado, valoración media y acciones para ver la ficha, añadir una evaluación o quitar de la lista.' },
  { file: 'scout_07.mp3', text: 'Y si tienes el pipeline activado, verás columnas por estado: Identificado, Observado, Evaluado, Contactado y más. Arrastra o usa las flechas para mover jugadores entre fases. Los descartados se agrupan en una sección separada y puedes restaurarlos.' },
  { file: 'scout_08.mp3', text: 'Ya dominas el módulo de Scouting. Usa la watchlist para evaluar jugadores, el pipeline para organizar por fase y la comparativa para analizar varios a la vez cuando lo necesites.' },

  // ── Biblioteca de Vídeos (sin paso Volver; narrativo) ──────────────────────
  { file: 'videos_01.mp3', text: 'En esta pantalla gestionas todos los vídeos del club: sube archivos desde tu equipo, importa desde Google Drive, añade enlaces de YouTube o Vimeo y organízalos en carpetas por temporada. Te explicamos cada parte.' },
  { file: 'videos_03.mp3', text: 'Empecemos por las acciones del header. Gestionar plan o Contratar almacenamiento abre los planes disponibles. Subir vídeo sube un archivo desde tu equipo, Importar desde Drive trae vídeos de Google Drive, y Añadir enlace agrega una URL de YouTube o Vimeo sin consumir espacio.' },
  { file: 'videos_04.mp3', text: 'Justo debajo ves el estado de tu almacenamiento: plan activo, espacio usado y límite total. Si no tienes plan, aparecerá un banner para contratar almacenamiento.' },
  { file: 'videos_05.mp3', text: 'A la izquierda tienes el organizador de carpetas. Puedes ver todos los vídeos, los que no tienen carpeta, o las carpetas que hayas creado. El botón de personas sincroniza carpetas por equipo y el de carpeta más crea una nueva.' },
  { file: 'videos_06.mp3', text: 'Para encontrar un vídeo concreto, busca por título, jugador o etiqueta. Si tienes una carpeta seleccionada, aparece un breadcrumb que puedes quitar para ver todos los vídeos de nuevo.' },
  { file: 'videos_07.mp3', text: 'Y aquí tienes todos tus vídeos. Cada tarjeta muestra miniatura, título, jugador, carpeta, etiquetas y fecha. Desde las acciones puedes reproducir, exportar a Drive, analizar el vídeo, moverlo de carpeta o eliminarlo.' },
  { file: 'videos_08.mp3', text: 'Ya dominas la Biblioteca de Vídeos. Sube o enlaza vídeos, organízalos en carpetas y usa Analizar vídeo para etiquetar jugadas en el módulo de Análisis de Vídeo cuando lo necesites.' },

  // ── Análisis de Vídeo (sin paso Volver; narrativo) ─────────────────────────
  { file: 'va_01.mp3', text: 'Desde aquí creas y gestionas proyectos de etiquetado de vídeo: subes un archivo local, eliges una plantilla de categorías, etiquetas jugadas y creas playlists que puedes compartir con el equipo. Te guiamos paso a paso.' },
  { file: 'va_03.mp3', text: 'Empecemos por las acciones rápidas. Plantillas gestiona las categorías de etiquetado, Playlists crea y comparte listas de clips, y Biblioteca enlaza con la Biblioteca de Vídeos del club.' },
  { file: 'va_04.mp3', text: 'Las tarjetas de estado te permiten filtrar la lista de proyectos. Pulsa en Total, En progreso, Completados o Borradores para ver solo los análisis en ese estado.' },
  { file: 'va_05.mp3', text: 'En la barra de proyectos tienes el contador de análisis, la búsqueda por título y el botón Nuevo análisis para crear un proyecto: título, descripción, archivo de vídeo local y plantilla.' },
  { file: 'va_06.mp3', text: 'Y aquí ves todos tus proyectos de análisis. Cada tarjeta muestra el estado, título, descripción, origen del vídeo y fecha. Pulsa en una tarjeta para abrir el workspace de etiquetado.' },
  { file: 'va_07.mp3', text: 'Ya dominas el Análisis de Vídeo. Crea análisis con Nuevo análisis, configura tus plantillas si hace falta y abre un proyecto para etiquetar jugadas y crear clips cuando lo necesites.' },

  // ── Asistente IA (sin paso Volver; narrativo) ──────────────────────────────
  { file: 'asistente_01.mp3', text: 'Este es el chat de inteligencia artificial del club. Haz preguntas, pide resúmenes o que ejecute acciones como consultar datos o crear elementos. Cada mensaje consume créditos; el saldo se muestra en la cabecera. Te explicamos cada parte.' },
  { file: 'asistente_03.mp3', text: 'A la izquierda tienes el historial de conversaciones anteriores. El botón más inicia una nueva conversación; pulsa en una entrada para cargarla, y la papelera la elimina.' },
  { file: 'asistente_04.mp3', text: 'Este botón abre o cierra el panel del historial para ganar espacio en pantalla cuando lo necesites.' },
  { file: 'asistente_05.mp3', text: 'En la cabecera del chat ves el título del asistente, el indicador de estado y los créditos disponibles. Pulsa en los créditos para ver detalles o comprar más.' },
  { file: 'asistente_06.mp3', text: 'Aquí se van mostrando tus mensajes y las respuestas del asistente. Las respuestas pueden incluir acciones que debes confirmar o cancelar. El asistente mostrará un indicador mientras genera la respuesta.' },
  { file: 'asistente_07.mp3', text: 'Para empezar rápido, al iniciar una conversación verás chips de sugerencias con preguntas o tareas frecuentes. Pulsa en uno para enviarlo directamente y obtener una respuesta inmediata.' },
  { file: 'asistente_08.mp3', text: 'Y para escribir tu consulta, usa el área de texto y pulsa Enviar o Intro. Si admite voz, el micrófono te permite dictar. Durante la respuesta puedes cancelar con el botón X.' },
  { file: 'asistente_09.mp3', text: 'Ya dominas el Asistente IA. Usa las sugerencias o escribe libremente, revisa tus créditos y confirma las acciones que el asistente te proponga cuando lo necesites.' },

  // ── Info Jugadores ────────────────────────────────────────────────────────
  { file: 'ij_01.mp3', text: 'En esta pantalla consultas y gestionas el perfil de cada jugador del club: datos personales, padre o madre, DNI, documentos y equipo asignado. Puedes mover jugadores de equipo, cambiar temporada, exportar a Excel y personalizar columnas. Sigue los pasos para no perderte nada.' },
  { file: 'ij_03.mp3', text: 'Aquí puedes consultar al Asistente IA sobre el listado de jugadores con datos anonimizados: distribución por posición, por equipo, posiciones con déficit, jugadores sin dorsal y mucho más. Pulsa para abrir el panel.' },
  { file: 'ij_04.mp3', text: 'En la barra superior tienes todos los controles: busca por nombre o datos, filtra por equipo, exporta la tabla a Excel y personaliza los campos visibles con Campos personalizados.' },
  { file: 'ij_05.mp3', text: 'Aquí ves la tabla completa de jugadores. Cada fila muestra foto, nombre, equipo con opciones de mover o cambiar temporada, fecha de nacimiento, teléfono, DNI, documentos, datos del padre o madre e IBAN.' },
  { file: 'ij_06.mp3', text: 'Al hacer clic en el nombre de un jugador se abre su ficha completa: información personal, datos financieros si aplica, documentos, DNI y campos personalizados. Úsala para revisar o editar cualquier dato.' },
  { file: 'ij_07.mp3', text: 'El panel del Asistente IA incluye sugerencias rápidas, historial de mensajes y un área de consulta. Escribe tu pregunta y pulsa Intro para enviar; Shift más Intro para añadir una nueva línea.' },
  { file: 'ij_08.mp3', text: 'Ya dominas Info Jugadores. Usa la búsqueda y los filtros, exporta a Excel, personaliza columnas y haz clic en cualquier nombre para ver la ficha completa cuando lo necesites.' },

  // ── Info Entrenadores ─────────────────────────────────────────────────────
  { file: 'ie_01.mp3', text: 'Aquí consultas y gestionas el perfil de cada entrenador del club: datos personales, rol, equipos asignados, certificados obligatorios, documentos e historial deportivo.' },
  { file: 'ie_02.mp3', text: 'Antes de continuar, recuerda que este botón te devuelve al cuadro de mandos del club.' },
  { file: 'ie_03.mp3', text: 'También puedes consultar la IA sobre el cuerpo técnico con datos anonimizados: total de entrenadores, equipos con entrenador asignado, distribución de perfiles y equipos sin entrenador.' },
  { file: 'ie_04.mp3', text: 'En la barra superior selecciona la temporada, busca por nombre, filtra por equipo, exporta a Excel y configura los campos personalizados visibles en la tabla.' },
  { file: 'ie_05.mp3', text: 'Y aquí ves la tabla de entrenadores con columnas ordenables: nombre, rol, equipos, email, teléfono, DNI, certificados, documentos y campos personalizados. Pulsa en el nombre de un entrenador para ver su ficha completa.' },
  { file: 'ie_06.mp3', text: 'El panel del Asistente IA incluye sugerencias sobre el cuerpo técnico, historial de mensajes y un área de consulta para preguntas más específicas.' },
  { file: 'ie_07.mp3', text: 'Ya conoces Info Entrenadores. Ordena por cualquier columna, abre la ficha pulsando el nombre y usa el panel IA para análisis del cuerpo técnico.' },

  // ── Estadísticas Jugadores Club ───────────────────────────────────────────
  { file: 'ej_01.mp3', text: 'Aquí tienes las métricas de rendimiento de todos los jugadores del club: partidos jugados, minutos, goles, asistencias, penaltis y tarjetas. Todas las columnas son ordenables e incluye un panel de consultas con IA.' },
  { file: 'ej_02.mp3', text: 'Antes de continuar, recuerda que este botón te devuelve al cuadro de mandos del club.' },
  { file: 'ej_03.mp3', text: 'Para análisis más profundos, abre el panel IA y pregunta por el goleador del club, la gráfica de asistencias, los jugadores con más tarjetas o la media de minutos por partido.' },
  { file: 'ej_04.mp3', text: 'Aquí tienes la tabla de estadísticas. Columnas ordenables: nombre, equipo, posición, partidos, minutos totales, media por partido, goles, asistencias, penaltis, tiros libres y tarjetas. Pulsa en el encabezado de cualquier columna para ordenar.' },
  { file: 'ej_05.mp3', text: 'Si hay muchos jugadores, usa la paginación para cambiar el tamaño de página y navegar entre páginas con los botones de avance y retroceso.' },
  { file: 'ej_06.mp3', text: 'El panel del Asistente IA incluye sugerencias sobre goleadores, asistencias, rendimiento, tarjetas y comparativas. Escribe tu consulta o usa las sugerencias directamente.' },
  { file: 'ej_07.mp3', text: 'Ya conoces las estadísticas de jugadores. Ordena por cualquier métrica para encontrar los mejores rendimientos y usa el panel IA para análisis más detallados.' },

  // ── Estadísticas Equipos Club ─────────────────────────────────────────────
  { file: 'ee_01.mp3', text: 'En esta pantalla ves las métricas de rendimiento de todos los equipos del club: posición, partidos jugados, puntos, victorias, empates, derrotas, goles a favor y en contra y últimos resultados. Pulsa en un equipo para ver el detalle de sus partidos. Te guiamos en cada elemento.' },
  { file: 'ee_03.mp3', text: 'Para análisis más profundos, abre el panel IA y pregunta por el equipo con más victorias, la gráfica de puntos, el rendimiento general o la comparativa de goles entre equipos. Pulsa aquí para abrirlo.' },
  { file: 'ee_04.mp3', text: 'En la cabecera tienes el número total de equipos y la leyenda de colores que indica Victoria, Empate o Derrota, para interpretar la columna de últimos resultados de cada equipo.' },
  { file: 'ee_05.mp3', text: 'Aquí ves la tabla completa de equipos: posición, categoría, partidos jugados, puntos, victorias, empates, derrotas, goles a favor, goles en contra, diferencia y última racha. Las tres primeras posiciones destacan con estilo podio.' },
  { file: 'ee_06.mp3', text: 'El panel del Asistente IA incluye sugerencias sobre estadísticas de equipos y un área de consulta para preguntas más específicas sobre el rendimiento del club.' },
  { file: 'ee_07.mp3', text: 'Ya dominas las estadísticas de equipos. Haz clic en cualquier equipo para ver el detalle de sus partidos en el modal cuando lo necesites.' },

  // ── Calendario Club ───────────────────────────────────────────────────────
  { file: 'cal_01.mp3', text: 'En esta pantalla tienes la vista mensual de partidos y entrenamientos de todos los equipos del club. Filtra por equipo con los chips, navega entre meses y pulsa en un día o en un evento para ver el detalle. Te explicamos cada parte.' },
  { file: 'cal_03.mp3', text: 'Empecemos por el filtro de equipos. Cada etiqueta de color corresponde a un equipo, y el icono de ojo indica si ese equipo está visible en el calendario. Pulsa en una etiqueta para mostrarlo u ocultarlo, o usa los botones para mostrar u ocultar todos a la vez.' },
  { file: 'cal_04.mp3', text: 'Para navegar entre meses usa las flechas de anterior y siguiente. El botón Hoy te lleva directamente al mes actual.' },
  { file: 'cal_05.mp3', text: 'Aquí tienes el calendario. Los puntos de color indican eventos: forma de pesa para entrenamientos y forma de balón para partidos. Pulsa en una celda para abrir el panel del día.' },
  { file: 'cal_06.mp3', text: 'Al pulsar en cualquier día se abre el panel lateral con todos los eventos de ese día agrupados por equipo. Cada evento puede abrirse para ver sus detalles completos.' },
  { file: 'cal_07.mp3', text: 'Ya dominas el Calendario del club. Filtra los equipos que quieras ver, navega entre meses y pulsa en cualquier día o evento para acceder a todos los detalles cuando lo necesites.' },

  // ── Menú del equipo (club) ────────────────────────────────────────────────
  { file: 'mc_01.mp3', text: 'Estás en el menú del equipo. Desde aquí accedes a cada sección mediante tarjetas: Calendario, Jugadores, Estadísticas de jugadores y del equipo, Ranking y resultados, Galería, Info del equipo y Lesiones. Te explicamos cada una.' },
  { file: 'mc_02.mp3', text: 'La tarjeta Calendario te lleva al calendario del equipo: partidos y entrenamientos organizados por fecha. Pulsa en ella para ver y gestionar el planning.' },
  { file: 'mc_03.mp3', text: 'La tarjeta Jugadores abre el listado completo de jugadores del equipo con su información, datos de contacto y rendimiento.' },
  { file: 'mc_04.mp3', text: 'Estadísticas de jugadores: desde aquí accedes a gráficos y tablas con goles, asistencias, minutos jugados y otras métricas individuales.' },
  { file: 'mc_05.mp3', text: 'Estadísticas del equipo: puntos, victorias, empates, derrotas, goles a favor y en contra del equipo en la competición.' },
  { file: 'mc_06.mp3', text: 'Ranking y resultados: consulta la clasificación de la liga y el historial de partidos del equipo.' },
  { file: 'mc_07.mp3', text: 'Siguiente, la Galería. Aquí se muestran fotos y momentos del equipo que puedes compartir con jugadores y familias.' },
  { file: 'mc_08.mp3', text: 'Info del equipo: nombre, categoría, liga, horarios y datos generales del equipo.' },
  { file: 'mc_09.mp3', text: 'Lesiones: registra y haz seguimiento del estado de recuperación de cada jugador lesionado.' },
  { file: 'mc_10.mp3', text: 'Has completado el recorrido. Ya conoces todas las opciones del menú. Pulsa en cualquier tarjeta para entrar en esa sección cuando lo necesites.' },

  // ── Menú entrenador ───────────────────────────────────────────────────────
  { file: 'me_01.mp3', text: 'Este es tu panel como entrenador. Desde aquí accedes a todo lo que necesitas: calendario, tareas, jugadores, estadísticas, notificaciones, galería, lesiones, asistente IA, debrief, perfil, documentos y análisis de vídeo.' },
  { file: 'me_02.mp3', text: 'Si en algún momento quieres volver atrás, este botón te lleva a la pantalla anterior.' },
  { file: 'me_03.mp3', text: 'Empecemos por el Calendario: aquí tienes todos los entrenamientos y partidos del equipo organizados por fecha.' },
  { file: 'me_04.mp3', text: 'Continuamos con Tareas, donde diseñas y gestionas las sesiones de entrenamiento: ejercicios, objetivos y planificación táctica.' },
  { file: 'me_05.mp3', text: 'Siguiente, Jugadores: el listado completo con la información de cada jugador del equipo.' },
  { file: 'me_06.mp3', text: 'Pasamos a Info del equipo, con toda la información general: nombre, categoría, liga, horarios y plantilla.' },
  { file: 'me_07.mp3', text: 'También tienes las Estadísticas del equipo: victorias, empates, derrotas, goles y la evolución del rendimiento colectivo.' },
  { file: 'me_08.mp3', text: 'Y las Estadísticas de jugadores, con métricas individuales como goles, asistencias, minutos jugados y mucho más.' },
  { file: 'me_09.mp3', text: 'Seguimos con Rankings: la clasificación del equipo en la competición y el historial de resultados.' },
  { file: 'me_10.mp3', text: 'Ahora las Notificaciones: tu centro de mensajes y avisos del club y de los jugadores del equipo.' },
  { file: 'me_11.mp3', text: 'Pasamos a la Galería: fotos y momentos del equipo que puedes compartir con jugadores y familias.' },
  { file: 'me_12.mp3', text: 'También tienes Lesiones para registrar y hacer seguimiento del estado de recuperación de cada jugador.' },
  { file: 'me_13.mp3', text: 'Y el Asistente IA: un chat de inteligencia artificial para consultar datos del equipo, pedir análisis o resolver dudas al instante.' },
  { file: 'me_14.mp3', text: 'Siguiente, el Historial de debrief: reuniones y análisis post-partido guardados para revisarlos cuando quieras.' },
  { file: 'me_15.mp3', text: 'Pasamos a tu Perfil: aquí tienes y editas tus datos personales como entrenador.' },
  { file: 'me_16.mp3', text: 'Y tus Documentos: todos los archivos y certificados vinculados a tu perfil de entrenador.' },
  { file: 'me_17.mp3', text: 'Y para terminar, Análisis de vídeo: etiqueta jugadas de tus partidos o entrenamientos y crea playlists para compartir con el equipo.' },
  { file: 'me_18.mp3', text: 'Ya dominas todas las opciones del menú del entrenador. Tienes todo lo que necesitas para gestionar tu equipo en un solo lugar cuando lo necesites.' },

  // ── Opciones jugador (sin paso Volver) ────────────────────────────────────
  { file: 'oj_01.mp3', text: 'Estás en el menú del jugador. Desde aquí accedes a cada sección mediante tarjetas: Datos personales, Calendario, Pagar cuotas, Documentación, Clasificación y resultados, Mis estadísticas, Galería, Notificaciones, Patrocinadores, Lesiones y Ropa. Te explicamos cada una.' },
  { file: 'oj_02.mp3', text: 'La tarjeta Datos personales abre tu perfil: consulta y edita nombre, fecha de nacimiento, posición, contacto y el resto de tu información personal.' },
  { file: 'oj_03.mp3', text: 'La tarjeta Calendario muestra todos tus entrenamientos y partidos organizados por fecha. Entra para ver el planning completo.' },
  { file: 'oj_04.mp3', text: 'Pagar cuotas: aquí tú o tu familia gestionáis y abonáis las cuotas del club. Vincula tarjeta con Sphaira Pay, revisa obligatorias y opcionales y pagad por transferencia si lo indica el club.' },
  { file: 'oj_05.mp3', text: 'Documentación: todos los archivos y documentos que el club te solicita. Descarga los que comparte el club, sube los que te piden o rellena formularios.' },
  { file: 'oj_06.mp3', text: 'Clasificación y resultados: consulta la tabla de tu equipo en la competición y el historial de partidos y resultados.' },
  { file: 'oj_07.mp3', text: 'Mis estadísticas: goles, asistencias, minutos jugados y otras métricas de tu rendimiento personal en la temporada.' },
  { file: 'oj_08.mp3', text: 'La Galería muestra fotos y momentos del equipo que puedes ver y descargar.' },
  { file: 'oj_09.mp3', text: 'Notificaciones: mensajes y avisos del club y del entrenador dirigidos a ti.' },
  { file: 'oj_10.mp3', text: 'Patrocinadores del club: logos, información de contacto y beneficios que ofrecen a los jugadores.' },
  { file: 'oj_11.mp3', text: 'Lesiones: consulta tu historial de lesiones y el estado de recuperación si las hubiera.' },
  { file: 'oj_12.mp3', text: 'Ropa del club: catálogo de equipación e indicación de tallas para que el club gestione los pedidos.' },
  { file: 'oj_13.mp3', text: 'Has completado el recorrido. Ya conoces todas las opciones del jugador. Pulsa en cualquier tarjeta para entrar en esa sección cuando lo necesites.' },

  // ── Cuotas (jugador/padre) ────────────────────────────────────────────────
  { file: 'cq_01.mp3', text: 'Estás en la pantalla de pagar cuotas. Aquí consultas el estado de tus cuotas, vinculas tarjeta con Sphaira Pay para cobros automáticos, ves obligatorias y opcionales, y tienes los datos para pagar por transferencia. Te guiamos paso a paso.' },
  { file: 'cq_02.mp3', text: 'Arriba verás las tarjetas de total pagado y pendiente. Desde aquí accedes a Sphaira Pay: vincular tarjeta, ver la asociada o gestionar cobros automáticos.' },
  { file: 'cq_03.mp3', text: 'Al marcar cuotas puntuales aparece la barra con el total y los botones Limpiar y Pagar para abrir el modal de pago.' },
  { file: 'cq_04.mp3', text: 'Panel de cuotas obligatorias: filtros por concepto, tipo de pago, estado, vencimiento y fecha. La tabla muestra concepto, tipo, importe, pagado, vencimiento y acciones como vincular tarjeta o cancelar.' },
  { file: 'cq_05.mp3', text: 'Cuotas opcionales: misma estructura con filtros y lista. Puedes seleccionar varias y pagar en bloque si está disponible.' },
  { file: 'cq_06.mp3', text: 'Datos bancarios del club: IBAN, concepto, contacto y Bizum. Realiza la transferencia y notifica al club cuando hayas pagado.' },
  { file: 'cq_07.mp3', text: 'Ya dominas la pantalla de cuotas. Vincula tarjeta con Sphaira Pay si la usas, selecciona y paga las cuotas o usa transferencia según indique el club.' },

  // ── Documentos jugador ────────────────────────────────────────────────────
  { file: 'dj_01.mp3', text: 'Estás en la documentación que tu club te solicita. Puedes descargar los documentos que comparte el club, subir los que te piden o rellenar formularios. Cada tarjeta muestra el estado: pendiente o completado. Te guiamos paso a paso.' },
  { file: 'dj_02.mp3', text: 'Usa el campo de búsqueda para filtrar la lista de documentos por nombre.' },
  { file: 'dj_03.mp3', text: 'Cada tarjeta muestra nombre, descripción y estado: Pendiente descargar o Descargado, Pendiente subir o Subido, Pendiente rellenar o Completado. Según el tipo, usa el botón Descargar, Subir documento o Rellenar.' },
  { file: 'dj_04.mp3', text: 'Ya conoces la documentación. Descarga, sube o rellena cada documento según lo que pida el club.' },
  // ── Jugador datos personales (ruta jugador/:teamId/:playerId) ─────────────────
  { file: 'jd_01.mp3', text: 'Estás en la ficha de datos personales del jugador. Aquí puedes consultar y editar su foto, datos personales, información deportiva, tutores y datos bancarios. Te guiamos paso a paso.' },
  { file: 'jd_02.mp3', text: 'Arriba tienes la foto del jugador. Puedes subir una nueva en formato JPG o PNG; al crear un jugador la foto se sube al guardar.' },
  { file: 'jd_03.mp3', text: 'Las pestañas Información personal e Información deportiva organizan el formulario. En personal verás nombre, apellido, fecha de nacimiento, contacto, dirección y datos de tutores y bancarios; en deportiva, posición, medidas y habilidades.' },
  { file: 'jd_04.mp3', text: 'Aquí se muestran todos los campos del jugador: nombre, apellido, DNI, teléfono, email, dirección, nacionalidad y el resto. Rellena o modifica los que necesites.' },
  { file: 'jd_05.mp3', text: 'En el pie tienes el botón DNI para subir o ver el documento de identidad del jugador, y Guardar para aplicar todos los cambios. Recuerda guardar después de editar.' },
  { file: 'jd_06.mp3', text: 'Has completado el recorrido. Ya conoces la ficha de datos personales del jugador. Mantén la información actualizada cuando lo necesites.' },

  // ── Scouting player (perfil jugador) ───────────────────────────────────────
  { file: 'sp_01.mp3', text: 'Estás en el perfil deportivo del jugador. Aquí verás su foto, datos, radar de habilidades, estadísticas de partidos, gráficas y asistencia a entrenamientos. Te guiamos paso a paso.' },
  { file: 'sp_02.mp3', text: 'Arriba: avatar, nombre y píldoras con posición, pierna y altura. El panel de habilidades muestra el radar con las valoraciones si hay datos cargados.' },
  { file: 'sp_03.mp3', text: 'Datos deportivos: posición principal, posición secundaria, pierna natural, altura y peso.' },
  { file: 'sp_04.mp3', text: 'Estadísticas de partidos: partidos jugados, titularidades, minutos, goles, tarjetas amarillas y rojas.' },
  { file: 'sp_05.mp3', text: 'Pestañas Partidos y Asistencia: cambia entre la gráfica de estadísticas y la de asistencia a entrenamientos por mes.' },
  { file: 'sp_06.mp3', text: 'Tabla de asistencia: fecha, si asistió y si llegó con retraso en cada sesión.' },
  { file: 'sp_07.mp3', text: 'Ya conoces el perfil de jugador. Revisa datos, estadísticas y asistencia cuando lo necesites.' },

  // ── Patrocinadores usuario (jugador/familia) ────────────────────────────────
  { file: 'patrou_01.mp3', text: 'Estás en los patrocinadores del club. Verás un carrusel de logos y tarjetas con información, enlaces y beneficios. Es la vista de consulta para jugadores y familias. Te guiamos paso a paso.' },
  { file: 'patrou_02.mp3', text: 'El carrusel muestra los logos de los patrocinadores. Pulsa en uno para ver su ficha con detalle.' },
  { file: 'patrou_03.mp3', text: 'Cada tarjeta muestra logo, nombre, descripción, enlaces a web, email y teléfono, beneficios y el botón Ver para abrir el detalle completo.' },
  { file: 'patrou_04.mp3', text: 'Ya conoces los patrocinadores del club. Consulta sus datos y beneficios cuando lo necesites.' },

  // ── Ropa jugador (mis tallas) ──────────────────────────────────────────────
  { file: 'rj_01.mp3', text: 'Estás en el catálogo de prendas del equipo. Selecciona tu talla para cada prenda; se guarda automáticamente y el club usa estas preferencias para los pedidos. Te guiamos paso a paso.' },
  { file: 'rj_02.mp3', text: 'Cada tarjeta muestra la imagen, nombre, descripción y el selector de talla. Elige entre Sin seleccionar o las tallas disponibles; al elegir se guarda al instante y verás el estado guardando o completado.' },
  { file: 'rj_03.mp3', text: 'Ya conoces mis tallas de ropa. Mantén tus preferencias actualizadas para cada prenda del equipo.' },

  // ── Menu fisio, Entrenadores, Asistencia ───────────────────────────────────
  { file: 'mf_01.mp3', text: 'Estás en el menú del fisio. Desde aquí accedes a Lesiones, Jugadores, Calendario, Estadísticas de jugadores y equipo, Clasificación, Documentos, Notificaciones, Mi perfil y Asistente de IA. Te guiamos paso a paso.' },
  { file: 'mf_02.mp3', text: 'Cada tarjeta abre una sección: Lesiones, Jugadores, Calendario, Estadísticas jugadores, Estadísticas equipo, Clasificación y resultado, Documentos, Notificaciones, Mi perfil y Asistente de IA. Pulsa en una para entrar.' },
  { file: 'mf_03.mp3', text: 'Ya conoces el menú del fisio. Elige la opción que necesites.' },
  { file: 'ent_01.mp3', text: 'Estás en el listado de entrenadores del equipo. Desde aquí ves la información de cada uno y puedes editar sus datos. Te guiamos paso a paso.' },
  { file: 'ent_02.mp3', text: 'Cada tarjeta muestra foto, nombre, posición, fecha de nacimiento y los botones Ver info y Editar. Pulsa en uno para abrir la ficha o editar.' },
  { file: 'ent_03.mp3', text: 'Ya conoces el listado de entrenadores. Gestiona la información del cuerpo técnico desde aquí.' },
  { file: 'asis_01.mp3', text: 'Estás en la pantalla de asistencia y multas del equipo. Consulta la asistencia de los jugadores por fecha y las multas asociadas. Hay dos pestañas: Asistencia y Multas. Te guiamos paso a paso.' },
  { file: 'asis_02.mp3', text: 'Cambia entre Asistencia —tabla con fechas y asistencia por jugador— y Multas —importes y estado de pago por fecha y jugador.' },
  { file: 'asis_03.mp3', text: 'En Asistencia verás el total por jugador y el detalle por fecha. En Multas podrás marcar cada multa como pagada o no.' },
  { file: 'asis_04.mp3', text: 'Ya conoces la pantalla de asistencia y multas.' },

  // ── Debrief templates, training, match, report ───────────────────────────
  { file: 'dbtpl_01.mp3', text: 'Estás en la gestión de plantillas de formularios para los análisis pre y post de partidos y entrenamientos. Crea y edita plantillas a medida. Te guiamos paso a paso.' },
  { file: 'dbtpl_02.mp3', text: 'Usa las pestañas para elegir el tipo: entrenamiento o partido. Cada tipo tiene sus propias plantillas.' },
  { file: 'dbtpl_03.mp3', text: 'Aquí ves la lista de formularios creados. En cada uno tienes Editar y Eliminar. El botón de crear te permite añadir un nuevo formulario.' },
  { file: 'dbtpl_04.mp3', text: 'Ya conoces la gestión de plantillas. Crea formularios a medida para tus debriefs.' },
  { file: 'dbt_01.mp3', text: 'Estás en el debrief de entrenamiento. Completa el análisis post-entrenamiento respondiendo a las preguntas. La barra de progreso y los indicadores muestran tu avance. Te guiamos paso a paso.' },
  { file: 'dbt_02.mp3', text: 'La barra y los puntos representan cada pregunta. Pulsa en un punto para ir a esa pregunta. Las ya respondidas se marcan.' },
  { file: 'dbt_03.mp3', text: 'Responde cada pregunta o omítela. El botón de engranaje permite personalizar las preguntas del formulario.' },
  { file: 'dbt_04.mp3', text: 'Completa todas las preguntas y guarda para generar el informe de debrief.' },
  { file: 'dbm_01.mp3', text: 'Estás en el debrief de partido. Completa el análisis post-partido respondiendo a las preguntas. Es similar al debrief de entrenamiento, adaptado al partido. Te guiamos paso a paso.' },
  { file: 'dbm_02.mp3', text: 'La barra y los puntos indican cada pregunta. Navega entre preguntas y completa el formulario.' },
  { file: 'dbm_03.mp3', text: 'Responde cada pregunta del análisis del partido. Puedes personalizar las preguntas desde el engranaje.' },
  { file: 'dbm_04.mp3', text: 'Completa el debrief y guarda para generar el informe.' },
  { file: 'dbr_01.mp3', text: 'Estás viendo el informe generado del análisis de entrenamiento o partido. Verás el resumen, las secciones y las acciones: regenerar, descargar PDF y compartir. Te guiamos paso a paso.' },
  { file: 'dbr_02.mp3', text: 'Usa Regenerar informe, Descargar PDF y Compartir según lo que necesites.' },
  { file: 'dbr_03.mp3', text: 'El resumen y las secciones con el análisis. Este contenido se usa para generar el PDF.' },
  { file: 'dbr_04.mp3', text: 'Ya conoces la vista del informe. Descarga o comparte cuando lo necesites.' },

  // ── Contabilidad, Historial pagos, Abonados (club) ────────────────────────
  { file: 'cont_01.mp3', text: 'Estás en la contabilidad del club. Verás el resumen de cuotas: total cuota, cuota ropa, pagado y pendiente. Hay pestañas Inicio, Abonados, Stripe y Configuración, y una tabla con búsqueda, paginación y exportar a Excel. Te guiamos paso a paso.' },
  { file: 'cont_02.mp3', text: 'Cambia entre Inicio —resumen y tabla—, Abonados, Stripe —pasarela de pago— y Configuración.' },
  { file: 'cont_03.mp3', text: 'Aquí ves la cuota total del club, cuota ropa si aplica, total pagado y restante pendiente.' },
  { file: 'cont_04.mp3', text: 'Usa el botón Descargar Excel, el selector de registros por página y la búsqueda para filtrar la tabla.' },
  { file: 'cont_05.mp3', text: 'Listado de abonados o jugadores con nombre, cuota, pagado, estado y más. Ordena por columnas haciendo clic en la cabecera.' },
  { file: 'cont_06.mp3', text: 'Ya conoces la contabilidad del club. Exporta y filtra cuando lo necesites.' },
  { file: 'hpc_01.mp3', text: 'Estás en el historial de cobros y pagos del club. Puedes filtrar por nombre y exportar a Excel. Te guiamos paso a paso.' },
  { file: 'hpc_02.mp3', text: 'Usa el campo de búsqueda para filtrar y el botón Exportar a Excel para descargar el listado.' },
  { file: 'hpc_03.mp3', text: 'La tabla muestra nombre, descripción, título, importe, método, tipo y fecha. Haz clic en la cabecera de una columna para ordenar.' },
  { file: 'hpc_04.mp3', text: 'Ya conoces el historial de pagos. Filtra y exporta cuando lo necesites.' },
  { file: 'abo_01.mp3', text: 'Estás en la gestión de abonados del club. Puedes crear abonados, ver el listado con búsqueda y paginación, y exportar a Excel. Te guiamos paso a paso.' },
  { file: 'abo_02.mp3', text: 'Usa el botón Crear abonado para dar de alta uno nuevo y Descargar Excel para exportar el listado.' },
  { file: 'abo_03.mp3', text: 'Ajusta los registros por página y usa la búsqueda para filtrar el listado.' },
  { file: 'abo_04.mp3', text: 'La tabla muestra imagen, nombre, apellidos, email, teléfono, estado, cuota, pagado y más. Ordena por columnas haciendo clic en la cabecera.' },
  { file: 'abo_05.mp3', text: 'Ya conoces la gestión de abonados.' },

  // ── Suscripción club, wizard, sugerencias, listado clubes ───────────────────
  { file: 'suc_01.mp3', text: 'Estás en la suscripción del club. Consulta tu plan activo o elige un plan: Familia, Club o Gratuito. Los asistentes te guían para contratar o activar el plan gratuito. Te guiamos paso a paso.' },
  { file: 'suc_02.mp3', text: 'Si tienes plan de pago verás el tipo de plan, estado, fecha de inicio, período y jugadores incluidos en plan club. Aquí se resume qué incluye tu plan.' },
  { file: 'suc_03.mp3', text: 'Las tarjetas muestran los planes Familia, Club y Gratuito con precio y botón para contratar o activar.' },
  { file: 'suc_04.mp3', text: 'Ya conoces la suscripción del club. Elige o cambia de plan cuando lo necesites.' },
  { file: 'scw_01.mp3', text: 'Estás en el asistente de suscripción. Te guía paso a paso para configurar el plan elegido. Completa cada paso y avanza hasta finalizar. Te explicamos cada parte.' },
  { file: 'scw_02.mp3', text: 'El indicador muestra los pasos del asistente. Puedes pulsar en un paso ya completado para volver a él.' },
  { file: 'scw_03.mp3', text: 'Aquí aparece el formulario o las opciones del paso actual. Rellena y pulsa Siguiente o Finalizar.' },
  { file: 'scw_04.mp3', text: 'Completa todos los pasos para activar tu plan.' },
  { file: 'sug_01.mp3', text: 'Estás en Sugerencias. Envía ideas al equipo de Sphaira y sigue el estado de tus sugerencias. Las mejores se convierten en funcionalidades. Te guiamos paso a paso.' },
  { file: 'sug_02.mp3', text: 'El banner explica la sección. Usa el botón Nueva sugerencia para abrir el formulario.' },
  { file: 'sug_03.mp3', text: 'Rellena categoría, título y descripción. Envía cuando esté completo.' },
  { file: 'sug_04.mp3', text: 'Aquí ves el listado de sugerencias enviadas con su estado: pendiente, en revisión, etc.' },
  { file: 'sug_05.mp3', text: 'Ya conoces las sugerencias. ¡Tu opinión construye Sphaira!' },
  { file: 'lc_01.mp3', text: 'Estás en el listado de clubes. Puedes filtrar por nombre y ver la tabla con equipos, entrenadores, jugadores, padres y la acción Ver equipos. Te guiamos paso a paso.' },
  { file: 'lc_02.mp3', text: 'Usa el campo de búsqueda para filtrar por nombre del club.' },
  { file: 'lc_03.mp3', text: 'La tabla muestra número, nombre, equipos, entrenadores, jugadores, padres y la acción Ver equipos. Haz clic en la cabecera para ordenar.' },
  { file: 'lc_04.mp3', text: 'Ya conoces el listado de clubes.' },

  // ── ERP (club) ────────────────────────────────────────────────────────────
  { file: 'erp_01.mp3', text: 'Estás en el módulo de gestión financiera del club: ingresos, gastos, resultado, facturas, plan contable, cobros y pagos, informes y configuración. Si el ERP no está inicializado, usa el botón para configurarlo. Te guiamos paso a paso.' },
  { file: 'erp_02.mp3', text: 'Si el módulo no está configurado, aquí puedes inicializarlo. Se creará el plan contable, centros de coste y el ejercicio fiscal.' },
  { file: 'erp_03.mp3', text: 'Usa el selector desde-hasta para filtrar los datos. El botón de engranaje abre la configuración de ejercicios fiscales.' },
  { file: 'erp_04.mp3', text: 'Las tarjetas muestran ingresos, gastos, resultado neto, facturas pendientes y facturas vencidas.' },
  { file: 'erp_05.mp3', text: 'Gráfica de barras y detalle por centro de coste. Puedes expandir para ver la tabla.' },
  { file: 'erp_06.mp3', text: 'Enlaces a facturas emitidas, facturas recibidas, cobros y pagos, plan contable, informes, presupuestos, clientes, proveedores y configuración.' },
  { file: 'erp_07.mp3', text: 'Ya conoces el dashboard ERP. Usa los accesos rápidos para gestionar la contabilidad del club.' },

  // ── Suscripción coach, success, individual training ────────────────────────
  { file: 'sco_01.mp3', text: 'Estás en la suscripción de Sphaira Coach. Elige el plan que se adapta a ti: gestión de equipo, asistente IA, estadísticas, lesiones, calendario e informes PDF. Te guiamos paso a paso.' },
  { file: 'sco_02.mp3', text: 'Arriba verás el resumen de lo que incluye Sphaira Coach y las tarjetas de planes con precio y botón Empezar.' },
  { file: 'sco_03.mp3', text: 'Cada tarjeta muestra el plan, precio y botón para contratar. El plan más popular está destacado.' },
  { file: 'sco_04.mp3', text: 'Elige tu plan y serás redirigido al pago.' },
  { file: 'css_01.mp3', text: 'Estás en la pantalla de resultado del pago. Verás el estado: verificando, éxito con bienvenida y acceso, o error con opción de reintentar o ir al panel.' },
  { file: 'css_02.mp3', text: 'Si el pago fue correcto verás tu plan activo, los beneficios y el botón Ir al panel principal.' },
  { file: 'css_03.mp3', text: 'Usa Ir al panel principal para continuar. En caso de error, puedes Intentar de nuevo o Ir al panel.' },
  { file: 'css_04.mp3', text: 'Ya conoces esta pantalla. Usa Ir al panel para continuar.' },
  { file: 'it_01.mp3', text: 'Estás en el entrenamiento individual. Como jugador verás los planes asignados por el entrenador, el progreso y las pestañas Hoy, Planificación e Historial. Como entrenador podrás crear y gestionar planes. Te guiamos paso a paso.' },
  { file: 'it_02.mp3', text: 'Arriba verás el título y la descripción según el modo: jugador o entrenador.' },
  { file: 'it_03.mp3', text: 'Lista de planes: como jugador selecciona uno; como entrenador crea y gestiona planes.' },
  { file: 'it_04.mp3', text: 'Pestañas para ver la sesión de hoy, la planificación semanal o el historial de sesiones.' },
  { file: 'it_05.mp3', text: 'Según la pestaña verás la sesión de hoy, el calendario de la semana o el listado de sesiones realizadas.' },
  { file: 'it_06.mp3', text: 'Ya conoces el entrenamiento individual.' },

  // ── Suscripción jugador, Inicio deportes ───────────────────────────────────
  { file: 'sus_01.mp3', text: 'Estás en Mi suscripción. Elige el perfil del jugador si hay varios y consulta el estado: activa o inactiva, tipo, fechas y opciones de renovación o contratación. Te guiamos paso a paso.' },
  { file: 'sus_02.mp3', text: 'Las tarjetas muestran los jugadores asociados. Pulsa en uno para ver su suscripción.' },
  { file: 'sus_03.mp3', text: 'Aquí ves si el plan está activo o inactivo, el tipo —mensual, trimestral o anual—, fecha de inicio y de renovación o fin.' },
  { file: 'sus_04.mp3', text: 'Según el estado puedes contratar, renovar o gestionar. Hay enlaces a planes si aplica.' },
  { file: 'sus_05.mp3', text: 'Ya conoces tu suscripción.' },
  { file: 'id_01.mp3', text: 'Estás en la pantalla de deportes de Sphaira. Selecciona el deporte con el que quieres trabajar. Fútbol está disponible; otros deportes pueden estar en desarrollo. Te guiamos paso a paso.' },
  { file: 'id_02.mp3', text: 'Cada tarjeta corresponde a un deporte: Fútbol, Baloncesto, Balonmano, Voleibol, etc. Pulsa en uno para acceder.' },
  { file: 'id_03.mp3', text: 'Elige tu deporte para continuar.' },

  // ── Calendario equipo (entrenador) ─────────────────────────────────────────
  { file: 'caleq_01.mp3', text: 'Aquí ves el calendario de entrenamientos y partidos del equipo. Puedes cambiar entre vista año, mes y semana, y usar el planificador con IA para organizar la semana. Te guiamos paso a paso.' },
  { file: 'caleq_02.mp3', text: 'Cambia entre tres vistas: la vista anual muestra todos los meses en cuadrícula, la mensual despliega los días en tabla y la semanal te da el detalle de siete días seguidos. Cada vista muestra los entrenamientos y partidos programados.' },
  { file: 'caleq_03.mp3', text: 'Abre el planificador semanal con IA para generar o ajustar la planificación de la semana.' },
  { file: 'caleq_04.mp3', text: 'Avanza o retrocede en el tiempo (año, mes o semana según la vista activa).' },
  { file: 'caleq_05.mp3', text: 'Celdas con entrenamientos y partidos. Pulsa en un día para ver o editar eventos. Puedes arrastrar eventos entre días en vista semana.' },
  { file: 'caleq_06.mp3', text: 'Ya dominas el calendario del equipo. Usa la vista que prefieras y el planificador IA para organizar la temporada cuando lo necesites.' },

  // ── Tareas (hub entrenador) ───────────────────────────────────────────────
  { file: 'tareas_01.mp3', text: 'Centro de tareas del equipo: pizarra táctica, catálogo en la nube, historial, favoritas y mis tareas propias. Elige una opción para continuar. Te explicamos cada parte.' },
  { file: 'tareas_02.mp3', text: 'Abre la pizarra táctica para dibujar jugadas, tácticas y animaciones. Puedes guardar imágenes o GIF en una tarea.' },
  { file: 'tareas_03.mp3', text: 'Catálogo de tareas en la nube: busca por estrategia e intención y añade tareas a tus entrenamientos.' },
  { file: 'tareas_04.mp3', text: 'Aquí ves las tareas que ya has usado en tus entrenamientos. Puedes reutilizarlas en una sesión nueva o guardarlas en favoritas para tenerlas a mano.' },
  { file: 'tareas_05.mp3', text: 'Tus tareas marcadas como favoritas para acceso rápido.' },
  { file: 'tareas_06.mp3', text: 'Tareas creadas por ti (desde la pizarra o manualmente). Crea, edita y elimina tus propias tareas.' },
  { file: 'tareas_07.mp3', text: 'Ya dominas el hub de tareas. Entra en la opción que necesites para preparar tus sesiones cuando lo necesites.' },

  // ── Catálogo de tareas (nube) ──────────────────────────────────────────────
  { file: 'tc_01.mp3', text: 'Busca y filtra tareas de la nube por texto, estrategia e intención. Añade tareas a favoritas o a un entrenamiento concreto. Te guiamos paso a paso.' },
  { file: 'tc_02.mp3', text: 'Escribe para filtrar tareas por título o descripción.' },
  { file: 'tc_03.mp3', text: 'Filtra por estrategia e intención. Muestra u oculta el panel de filtros avanzados.' },
  { file: 'tc_04.mp3', text: 'Tarjetas de tareas con imagen, etiquetas y botón Añadir a entrenamiento. Pulsa en una tarjeta para ver el detalle; desde el detalle puedes añadir a favoritas o a un entrenamiento.' },
  { file: 'tc_05.mp3', text: 'Navega entre páginas de resultados si hay muchas tareas.' },
  { file: 'tc_06.mp3', text: 'Ya dominas el catálogo. Busca, filtra y añade tareas a tus entrenamientos o favoritas cuando lo necesites.' },

  // ── Pizarra táctica ────────────────────────────────────────────────────────
  { file: 'tboard_01.mp3', text: 'Dibuja jugadas, tácticas y animaciones sobre el campo. Añade jugadores, usa herramientas de dibujo, captura keyframes para GIF y exporta PNG o GIF. Te guiamos paso a paso.' },
  { file: 'tboard_02.mp3', text: 'En modo tarea, guarda la imagen o el GIF actual en la tarea que estás editando.' },
  { file: 'tboard_03.mp3', text: 'Añade conos o jugadores con color y el balón. Elige un color en el desplegable y haz clic en el campo para colocar.' },
  { file: 'tboard_04.mp3', text: 'Selección, lápiz, línea, flecha, rectángulo, elipse, texto y goma. Activa una herramienta y dibuja sobre el campo.' },
  { file: 'tboard_05.mp3', text: 'Cambia el color y el grosor del trazo para las herramientas de dibujo.' },
  { file: 'tboard_06.mp3', text: 'Cambia entre campo completo o medio campo.' },
  { file: 'tboard_07.mp3', text: 'Deshace o rehace los últimos cambios.' },
  { file: 'tboard_08.mp3', text: 'Elimina el elemento seleccionado o limpia todo el dibujo.' },
  { file: 'tboard_09.mp3', text: 'Añade keyframes para crear una animación. Reproduce, ajusta velocidad y exporta en GIF.' },
  { file: 'tboard_10.mp3', text: 'Guarda el dibujo para retomarlo después, o exporta como PNG o GIF (si hay al menos 2 keyframes).' },
  { file: 'tboard_11.mp3', text: 'Ya dominas la pizarra táctica. Dibuja, anima y guarda o exporta según necesites cuando lo necesites.' },

  // ── Historial de tareas ───────────────────────────────────────────────────
  { file: 'thist_01.mp3', text: 'Tareas que ya has usado en entrenamientos. Consulta cuándo y cuántas veces las usaste, abre el detalle y añádelas a favoritas o vuelve a usarlas. Te explicamos cada parte.' },
  { file: 'thist_02.mp3', text: 'Tarjetas con imagen, origen, título, etiquetas y fecha de último uso. Pulsa en una tarjeta para ver el detalle y marcar como favorita.' },
  { file: 'thist_03.mp3', text: 'Cambia de página si hay muchas tareas en el historial.' },
  { file: 'thist_04.mp3', text: 'Ya dominas el historial. Reutiliza tareas y mantén tus favoritas al día cuando lo necesites.' },

  // ── Tareas favoritas ───────────────────────────────────────────────────────
  { file: 'tfav_01.mp3', text: 'Tus tareas marcadas como favoritas. Ábrelas para ver el detalle completo y quitar de favoritas si lo deseas. Te guiamos paso a paso.' },
  { file: 'tfav_02.mp3', text: 'Tarjetas de tus tareas favoritas. Pulsa en una para ver descripción, reglas, variantes y enlace a vídeo. Desde el detalle puedes quitar de favoritas.' },
  { file: 'tfav_03.mp3', text: 'Navega entre páginas si tienes muchas favoritas.' },
  { file: 'tfav_04.mp3', text: 'Ya dominas las tareas favoritas. Añade más desde el catálogo o el historial cuando lo necesites.' },

  // ── Mis tareas ─────────────────────────────────────────────────────────────
  { file: 'tmis_01.mp3', text: 'Tareas creadas por ti: desde la pizarra táctica o con el formulario. Crea, edita y elimina; puedes marcarlas como favoritas. Te explicamos cada parte.' },
  { file: 'tmis_02.mp3', text: 'Abre el formulario para crear una nueva tarea. Puedes usar una imagen desde la pizarra táctica o rellenar título, estrategia, descripción, reglas, variantes, tiempo, espacio, material y vídeo.' },
  { file: 'tmis_03.mp3', text: 'Tus tareas con imagen, título, etiquetas. En cada tarjeta: favorita, editar y eliminar. Pulsa en la tarjeta para ver el detalle completo.' },
  { file: 'tmis_04.mp3', text: 'Cambia de página si tienes muchas tareas propias.' },
  { file: 'tmis_05.mp3', text: 'Ya dominas Mis tareas. Crea y edita tus propias tareas para usarlas en tus entrenamientos cuando lo necesites.' },

  // ── Jugadores (entrenador) ────────────────────────────────────────────────
  { file: 'jug_01.mp3', text: 'Consulta todos los jugadores del equipo. Puedes ver tarjetas o tabla, crear jugadores, invitar, ver información, editar, mover entre equipos o eliminar según tu rol. Te guiamos paso a paso.' },
  { file: 'jug_02.mp3', text: 'Abre el modal para dar de alta un nuevo jugador en el equipo. Solo visible para club y entrenador.' },
  { file: 'jug_03.mp3', text: 'Cambia entre vista de tarjetas (fichas con foto, estadísticas y acciones) y vista de tabla (listado con búsqueda y exportar Excel).' },
  { file: 'jug_04.mp3', text: 'Cada tarjeta muestra foto, número, posición, valoración, nombre, fecha de nacimiento y estadísticas. Acciones: invitar, ver info, editar, mover, eliminar.' },
  { file: 'jug_05.mp3', text: 'Busca jugadores por nombre y exporta el listado a Excel. Solo visible en la pestaña Vista de tabla.' },
  { file: 'jug_06.mp3', text: 'Listado en tabla con imagen, nombre, fecha, pie, posición y todas las estadísticas. En cada fila: ver info, editar, mover, eliminar.' },
  { file: 'jug_07.mp3', text: 'Ya dominas el listado de jugadores. Usa las tarjetas o la tabla según prefieras y las acciones disponibles según tu permiso cuando lo necesites.' },

  // ── Información del equipo (entrenador) ────────────────────────────────────
  { file: 'infoeq_01.mp3', text: 'Configura los datos y la información general del equipo: logo, categoría, nivel de liga, nombre, horario de entrenamiento, objetivos, opiniones y staff. Te explicamos cada parte.' },
  { file: 'infoeq_02.mp3', text: 'Vista previa del logo. Si eres club, puedes subir o cambiar el logo desde el botón debajo.' },
  { file: 'infoeq_03.mp3', text: 'Pulsa para seleccionar una imagen y actualizar el logo del equipo. Solo visible para perfil club.' },
  { file: 'infoeq_04.mp3', text: 'Píldoras con categoría, nivel de liga y nombre del equipo (se actualizan al guardar el formulario).' },
  { file: 'infoeq_05.mp3', text: 'Categoría, nivel de liga, letra o nombre del equipo y botón de horario para configurar días y franjas de entrenamiento.' },
  { file: 'infoeq_06.mp3', text: 'Área de texto para el objetivo del equipo esta temporada y la opinión general sobre el equipo.' },
  { file: 'infoeq_07.mp3', text: 'Guarda los cambios del formulario o elimina el equipo (con confirmación).' },
  { file: 'infoeq_08.mp3', text: 'Listado de entrenadores, fisioterapeutas y nutricionistas asignados. Botón Invitar para añadir por email.' },
  { file: 'infoeq_09.mp3', text: 'Ya dominas la pantalla de información del equipo. Actualiza datos, horario y staff cuando lo necesites.' },

  // ── Estadísticas del equipo (entrenador) ───────────────────────────────────
  { file: 'stateq_01.mp3', text: 'Análisis estadístico del rendimiento del equipo: resumen, detalle de partidos y gráficas. Te guiamos paso a paso.' },
  { file: 'stateq_02.mp3', text: 'Tipo de partido: Liga, Amistoso o Torneo. Alterna entre Ver tabla y Ver gráficas.' },
  { file: 'stateq_03.mp3', text: 'Card con el resumen del equipo: partidos jugados, puntos, victorias, empates, derrotas, goles a favor, en contra, diferencia y últimos resultados.' },
  { file: 'stateq_04.mp3', text: 'Listado de partidos con fecha, rival, resultado y estadísticas detalladas. Pulsa en un rival para abrir el detalle del post partido.' },
  { file: 'stateq_05.mp3', text: 'Gráfica de resultados, puntos por partido, estadísticas por partido, goles por categoría y subcategoría.' },
  { file: 'stateq_06.mp3', text: 'Ya dominas las estadísticas del equipo. Cambia entre tabla y gráficas y filtra por tipo de partido cuando lo necesites.' },

  // ── Estadísticas de jugadores (entrenador) ──────────────────────────────────
  { file: 'estjug_01.mp3', text: 'Análisis estadístico del rendimiento individual: vista tabla o vista gráficas con comparativas y goles por jugador. Te explicamos cada parte.' },
  { file: 'estjug_02.mp3', text: 'Alterna entre Ver tabla (tabla de jugadores con búsqueda y paginación) y Ver gráficas (gráficas y tabla de goles).' },
  { file: 'estjug_03.mp3', text: 'Filtra por Liga, Amistoso o Torneo. Los datos mostrados se actualizan según la pestaña activa.' },
  { file: 'estjug_04.mp3', text: 'Card con búsqueda por nombre o posición, tabla con ID, nombre, posición, partidos jugados, minutos, goles, asistencias, tarjetas, etc. Paginación debajo.' },
  { file: 'estjug_05.mp3', text: 'Selector de tipo de gráfica (minutos, goles, asistencias, partidos, penaltis, tarjetas) y gráfica de barras comparativa.' },
  { file: 'estjug_06.mp3', text: 'Selector de jugador o Ver todos, búsqueda por goleador o rival, tabla de goles con minuto, fecha, categoría. Paginación debajo.' },
  { file: 'estjug_07.mp3', text: 'Ya dominas las estadísticas de jugadores. Usa la tabla o las gráficas y filtra por tipo de partido cuando lo necesites.' },

  // ── Clasificación y resultados ────────────────────────────────────────────
  { file: 'cr_01.mp3', text: 'Seguimiento de la liga y resultados del equipo. Configura la URL de tu federación si hace falta y consulta la clasificación y los resultados por jornada. Te guiamos paso a paso.' },
  { file: 'cr_02.mp3', text: 'Alterna entre la pestaña Clasificación (tabla de equipos con posición, puntos, forma) y Resultados (tarjetas de partidos con marcador y Ver acta).' },
  { file: 'cr_03.mp3', text: 'Selector de jornada (si la fuente lo permite) y botón para actualizar los datos desde la federación.' },
  { file: 'cr_04.mp3', text: 'Tabla con posición, equipo, puntos, partidos jugados, ganados, empatados, perdidos, goles y forma (últimos resultados).' },
  { file: 'cr_05.mp3', text: 'Grid de partidos con equipos, marcador, fecha, campo y botón Ver acta para abrir el acta en una pestaña nueva.' },
  { file: 'cr_06.mp3', text: 'Campo para introducir una nueva URL de clasificación y botón Actualizar URL si quieres cambiar la fuente de datos.' },
  { file: 'cr_07.mp3', text: 'Ya dominas clasificación y resultados. Actualiza cuando necesites y consulta las actas desde cada partido.' },

  // ── Galería partidos (partidos-entrevistas) ─────────────────────────────────
  { file: 'pente_01.mp3', text: 'Galería de fotos y vídeos de los partidos del equipo. Selecciona un partido en el carrusel y explora fotos y vídeos. Puedes subir nuevas imágenes o añadir por URL. Te explicamos cada parte.' },
  { file: 'pente_02.mp3', text: 'Píldoras con total de fotos, vídeos y partidos disponibles.' },
  { file: 'pente_03.mp3', text: 'Carrusel de partidos con letra V, E o D, nombre del rival, resultado y número de fotos o vídeos. Selecciona uno para ver su galería.' },
  { file: 'pente_04.mp3', text: 'Pestañas para ver las fotos o los vídeos del partido seleccionado.' },
  { file: 'pente_05.mp3', text: 'En Fotos: Nueva imagen para subir o arrastrar archivos, o Añadir por URL. En Vídeos: Añadir por URL o Subir desde dispositivo.' },
  { file: 'pente_06.mp3', text: 'Grid de fotos o vídeos. Pulsa en una foto para ampliarla en lightbox. En cada elemento puedes eliminar si es tuyo.' },
  { file: 'pente_07.mp3', text: 'Ya dominas la galería de partidos. Elige partido, sube contenido y consulta fotos y vídeos cuando lo necesites.' },

  // ── Lesiones (entrenador) ──────────────────────────────────────────────────
  { file: 'les_00.mp3', text: 'Selecciona un jugador del equipo para ver y gestionar sus lesiones. Puedes cambiar de jugador en cualquier momento. La insignia roja indica cuántas lesiones activas tiene cada uno.' },
  { file: 'les_01.mp3', text: 'Registro y seguimiento de lesiones del equipo: mapa corporal, línea temporal y estadísticas (Pro). Exporta informes PDF, imprime y configura notificaciones. Te guiamos paso a paso.' },
  { file: 'les_02.mp3', text: 'Alterna entre modo Base y Pro. En Pro se desbloquean estadísticas, notas médicas, fase RTP y gestión de Return to Play.' },
  { file: 'les_03.mp3', text: 'Descargar informe PDF, imprimir o exportar y configurar notificaciones (cuándo enviar avisos al crear, cambiar estado o avanzar RTP).' },
  { file: 'les_04.mp3', text: 'Mapa corporal (frontal y posterior con zonas clicables), Línea temporal (cronología de lesiones) y Estadísticas (Pro).' },
  { file: 'les_05.mp3', text: 'Tarjetas de resumen: total de lesiones, de baja, readaptando y con alta médica.' },
  { file: 'les_06.mp3', text: 'Vista frontal y posterior del cuerpo. Clic en una zona para registrar una lesión o ver el detalle. Leyenda de gravedad y estado.' },
  { file: 'les_07.mp3', text: 'Formulario de nueva o editar lesión (zona, tipo, gravedad, fechas, mecanismo, descripción, tratamiento, estado, RTP). Detalle con documentos y notas de evolución.' },
  { file: 'les_08.mp3', text: 'Ya dominas la gestión de lesiones. Registra lesiones en el mapa, consulta el historial y exporta informes cuando lo necesites.' },

  // ── Asistente IA Coach ──────────────────────────────────────────────────────
  { file: 'aic_01.mp3', text: 'Chat con el asistente de inteligencia artificial para entrenadores. Haz preguntas, pide planes de entrenamiento o que ejecute acciones. Usa créditos por cada uso; el historial se guarda en el panel lateral. Te explicamos cada parte.' },
  { file: 'aic_02.mp3', text: 'Panel lateral con lista de conversaciones anteriores. Botón más para nueva conversación. Pulsa en una para cargarla; desde cada una puedes eliminarla.' },
  { file: 'aic_03.mp3', text: 'Abre o cierra el panel del historial de conversaciones.' },
  { file: 'aic_04.mp3', text: 'Título del asistente, estado en línea, créditos disponibles (pulsable para ver modal de créditos) y botón nueva conversación.' },
  { file: 'aic_05.mp3', text: 'Área donde se muestran los mensajes del usuario y del asistente. El asistente puede mostrar vistas previas de acciones para confirmar o cancelar.' },
  { file: 'aic_06.mp3', text: 'Chips de sugerencias para enviar preguntas rápidas al asistente.' },
  { file: 'aic_07.mp3', text: 'Área de texto para escribir tu mensaje. Botón de micrófono (reconocimiento de voz si está disponible), cancelar (si hay petición en curso) y enviar.' },
  { file: 'aic_08.mp3', text: 'Ya dominas el asistente IA Coach. Escribe o usa la voz, revisa el historial y gestiona tus créditos cuando lo necesites.' },

  // ── Historial de debrief ───────────────────────────────────────────────────
  { file: 'dh_01.mp3', text: 'Aquí tienes todas tus sesiones de debrief: entrenamientos y partidos. Filtra por tipo, revisa el estado de cada una y abre cualquier informe completado. Te guiamos paso a paso.' },
  { file: 'dh_02.mp3', text: 'Usa los botones Todos, Entrenamientos o Partidos para filtrar la lista. Cada botón muestra cuántos elementos hay y actualiza las tarjetas al instante.' },
  { file: 'dh_03.mp3', text: 'Cada tarjeta muestra la fecha, si es entrenamiento o partido, el equipo, un resumen y el estado. Pulsa en una sesión completada para abrir el informe completo.' },
  { file: 'dh_04.mp3', text: 'Ya dominas el historial de debrief. Filtra por tipo y abre los informes que necesites cuando quieras revisarlos.' },

  // ── Perfil entrenador ──────────────────────────────────────────────────────
  { file: 'perfe_01.mp3', text: 'En esta pantalla consultas y actualizas tu perfil: datos personales, documento de identidad, certificados obligatorios y documentos que pida cada club. Si eres entrenador independiente verás también tu suscripción. Te guiamos paso a paso.' },
  { file: 'perfe_02.mp3', text: 'Aquí ves el estado de tu suscripción: Activa, Prueba, Vencida o Sin suscripción, la fecha de vencimiento y el botón para ver planes o gestionar. Solo visible si no estás vinculado a un club.' },
  { file: 'perfe_03.mp3', text: 'Tu foto de perfil (pulsa para cambiarla), nombre y botones para Editar y Subir documento de identidad. Más abajo: email, teléfono, fecha de nacimiento, documento, dirección, nacionalidad, licencia federativa, titulación y contacto de emergencia.' },
  { file: 'perfe_04.mp3', text: 'Al pulsar Editar podrás cambiar nombre, apellidos, email, teléfono, fecha de nacimiento, tipo y número de documento, dirección, nacionalidad, licencia, titulación y contacto de emergencia. Guarda o cancela cuando termines.' },
  { file: 'perfe_05.mp3', text: 'Cada club puede pedirte datos extra. En esta sección verás formularios dinámicos que debes rellenar según el club en el que trabajes.' },
  { file: 'perfe_06.mp3', text: 'Sube las imágenes del anverso y reverso de tu DNI o documento. Puedes cambiar o eliminar cada imagen desde el botón o desde la propia imagen.' },
  { file: 'perfe_07.mp3', text: 'Certificado de delitos sexuales, antecedentes penales, seguro de responsabilidad civil y formación en primeros auxilios. En cada uno puedes subir, cambiar, ver el archivo o eliminar.' },
  { file: 'perfe_08.mp3', text: 'Por cada club verás la lista de documentos: los que el club te comparte para descargar y los que tú debes subir o rellenar. Mantén todo al día para cumplir con cada club.' },
  { file: 'perfe_09.mp3', text: 'Ya dominas tu perfil de entrenador. Mantén datos, documento de identidad y certificados al día para cada club cuando lo necesites.' },

  // ── Documentos entrenador ─────────────────────────────────────────────────
  { file: 'doce_01.mp3', text: 'En esta pantalla ves todos los documentos que el club pone a tu disposición y los que tú debes entregar. Cada tarjeta indica si debes descargar, subir o rellenar un formulario, y si está pendiente o completado. Te guiamos paso a paso.' },
  { file: 'doce_02.mp3', text: 'Cada tarjeta muestra el nombre del documento, la descripción, el estado (Pendiente o Completado) y la acción: Descargar para documentos del club, Subir para los que debes entregar, o Rellenar para formularios personalizados.' },
  { file: 'doce_03.mp3', text: 'Ya dominas la pantalla de documentos. Descarga lo que el club comparte, sube o rellena lo que te pidan y mantén todo al día.' }
];

// ── Textos en inglés — /dashboard/inicio (club · coach · player) ───────────────
const STEPS_EN = [

  // ── Header Club (EN) ─────────────────────────────────────────────────────────
  { file: 'header_club_01_en.mp3', text: 'On the left you\'ll find your club logo. Tap it at any time to return to this home screen.' },
  { file: 'header_club_02_en.mp3', text: 'This button opens the tutorial for whatever screen you\'re on. Use it whenever you want to revisit the steps of any section.' },
  { file: 'header_club_03_en.mp3', text: 'Use this button to manage your club\'s Sphaira subscription: check your current plan, view the available options — Free, Family, and Club — and switch or activate the one that best suits your needs. It\'s available from every screen.' },
  { file: 'header_club_04_en.mp3', text: 'Club notifications appear here. Tap to view the list and mark them as read.' },
  { file: 'header_club_05_en.mp3', text: 'Your profile, club subscription, language settings, role switching, and sign out are all in this menu.' },

  // ── Header Coach (EN) ────────────────────────────────────────────────────────
  { file: 'header_coach_01_en.mp3', text: 'On the left you\'ll find the coach logo. Tap it at any time to return to this home screen.' },
  { file: 'header_coach_02_en.mp3', text: 'This button opens the tutorial for the current screen. Use it whenever you want to revisit the steps.' },
  { file: 'header_coach_03_en.mp3', text: 'Use this button to access the club\'s Sphaira subscription: view the current plan and the available options — Free, Family, and Club. It\'s available from every screen.' },
  { file: 'header_coach_04_en.mp3', text: 'Your notifications appear here. Tap to view the list.' },
  { file: 'header_coach_05_en.mp3', text: 'Your profile, language settings, role switching, and sign out are all in this menu.' },

  // ── Header Player (EN) ───────────────────────────────────────────────────────
  { file: 'header_player_01_en.mp3', text: 'On the left you\'ll find the player logo. Tap it at any time to return to this home screen.' },
  { file: 'header_player_02_en.mp3', text: 'This button opens the tutorial for the current screen. Use it whenever you want to revisit the steps.' },
  { file: 'header_player_03_en.mp3', text: 'Use this button to view the club\'s Sphaira subscription: check the current plan and the available options — Free, Family, and Club. It\'s available from every screen.' },
  { file: 'header_player_04_en.mp3', text: 'Your notifications appear here. Tap to view the list.' },
  { file: 'header_player_05_en.mp3', text: 'Your profile, language settings, role switching, and sign out are all in this menu.' },

  // ── Dashboard inicio — Club (EN) ─────────────────────────────────────────────
  {
    file: 'inicio_01_en.mp3',
    text: 'Welcome to the heart of your club — this is your management hub. From here you can access everything: teams, documents, payments, kit, and much more. The next steps will guide you through each section so you don\'t miss a thing.'
  },
  {
    file: 'inicio_02_en.mp3',
    text: 'First stop: the Control Panel — your club\'s command centre. Here you get a live snapshot of everything: team summaries, upcoming matches and training sessions, and alerts for pending payments, injuries, or outstanding documents. Tap it whenever you\'re ready to dive in.'
  },
  {
    file: 'inicio_03_en.mp3',
    text: 'Next up, Teams — your club\'s sporting structure. Create categories, assign players and coaches, and access each team\'s stats, calendar, and squad, all in one place.'
  },
  {
    file: 'inicio_04_en.mp3',
    text: 'Now, Documents. Centralise authorisations, contracts, medical records, and custom forms. Publish files for players to sign and track who has submitted each one. Your club\'s paperwork, all in order.'
  },
  {
    file: 'inicio_05_en.mp3',
    text: 'Payments and Fees. See who\'s up to date and who has outstanding balances, configure amounts, and accept online payments — all from a single place.'
  },
  {
    file: 'inicio_06_en.mp3',
    text: 'Kit and Clothing: parents submit sizing preferences directly from the app and the club receives them instantly. Upload kit images so families can preview the gear before ordering. Everything related to kit, right here.'
  },
  {
    file: 'inicio_07_en.mp3',
    text: 'Sponsors: register each sponsor with their name, logo, amount, and dates. Give them visibility and showcase them to all club users. Your partners have their own dedicated space here.'
  },
  {
    file: 'inicio_08_en.mp3',
    text: 'Notifications: communicate with everyone or with a specific team. Draft messages, attach files, and schedule the exact sending time. Club communications, fully under control.'
  },
  {
    file: 'inicio_09_en.mp3',
    text: 'Staff Management: define who has access to what. Add members, assign module-level permissions — payments, documents, stats, and calendar — and manage their roles. Your support team, perfectly organised.'
  },
  {
    file: 'inicio_10_en.mp3',
    text: 'Scouting: organise your talent search. Add players to your watchlist and track their development from first sighting to club contact. Talent spotting, gone digital.'
  },
  {
    file: 'inicio_11_en.mp3',
    text: 'Video Library: your cloud-based media hub. Upload recordings, link YouTube or Vimeo, and organise everything by team or season. All the club\'s audiovisual content, always at hand.'
  },
  {
    file: 'inicio_12_en.mp3',
    text: 'Video Analysis: take it to the next level. Create tactical sessions on your recordings, add annotations, draw over the pitch, and extract clips to share with the coaching staff.'
  },
  {
    file: 'inicio_13_en.mp3',
    text: 'And the AI Assistant: always available on every screen. Ask questions, request reports, training sessions, or call-up lists. Find it in the circular button in the corner.'
  },
  {
    file: 'inicio_14_en.mp3',
    text: 'Did you know Sphaira has a mobile app available for iPhone and Android? Review call-ups from the touchline, manage payments between meetings, check live stats, and receive instant alerts. The mobile experience is much faster and more convenient than the browser. Download it by searching Sphaira in the App Store or Google Play.'
  },
  {
    file: 'inicio_15_en.mp3',
    text: 'You now know your club dashboard. Explore any module whenever you like, and if you need guidance, the help button on each screen is always there. Get the most out of Sphaira!'
  },

  // ── Dashboard inicio — Coach (EN) ────────────────────────────────────────────
  {
    file: 'coach_01_en.mp3',
    text: 'As a coach, this is your home screen. Here you see all the teams you manage in the selected season. Each card is the gateway to that team: calendar, sessions, players, and much more. Let\'s walk you through it in a moment.'
  },
  {
    file: 'coach_02_en.mp3',
    text: 'At the top you have the season selector. Switch it to see teams assigned to a different year — the list updates instantly. Jump between seasons without leaving this screen.'
  },
  {
    file: 'coach_03_en.mp3',
    text: 'Here are your teams. Each card shows the category, name, league, training schedule, and number of players. Tap one to access its calendar, sessions, players, stats, notifications, and all other options for that team.'
  },
  {
    file: 'coach_04_en.mp3',
    text: 'If you have no teams assigned in this season, you\'ll see a guidance message and a button to go to the club\'s team management page. Once teams are assigned to you, they\'ll appear here.'
  },
  {
    file: 'coach_05_en.mp3',
    text: 'The best coaches lead beyond the pitch. With the Sphaira app for iOS and Android you have your team calendar, player sessions, injury records, and coaching staff chat in your pocket wherever you go. The experience is much smoother than the browser. Download it from the App Store or Google Play by searching Sphaira Tech!'
  },
  {
    file: 'coach_06_en.mp3',
    text: 'You now know your coaching dashboard. Choose a team whenever you\'re ready and access its calendar, sessions, players, and all other options. Time to lead from the touchline!'
  },

  // ── Dashboard inicio — Player (EN) ───────────────────────────────────────────
  {
    file: 'player_01_en.mp3',
    text: 'This is your main screen as a parent or player. Here you see the athletes linked to your account in the selected season. Each card takes you to their world: calendar, fees, documents, stats, and gallery. Let us walk you through each part in a moment.'
  },
  {
    file: 'player_02_en.mp3',
    text: 'At the top you have the season selector. Switch it to see players and teams from a different year — the list updates instantly. Change seasons without leaving this screen.'
  },
  {
    file: 'player_03_en.mp3',
    text: 'Here are your players. Each card shows name, team, training schedule, and next match. Tap a card or View player to access all options for that player: calendar, fees, documents, and more.'
  },
  {
    file: 'player_04_en.mp3',
    text: 'If no players are linked in this season, you\'ll see a guidance message. Contact your club to register players — once they\'re added, they\'ll appear here.'
  },
  {
    file: 'player_05_en.mp3',
    text: 'Parents and players who use the Sphaira app never miss a thing: instant call-up notifications, training schedules, pending fees, and club documents without having to hunt through emails or files. The experience is much better than the browser. Download it free by searching Sphaira in the App Store or Google Play.'
  },
  {
    file: 'player_06_en.mp3',
    text: 'You now know your player dashboard. Tap any card whenever you\'re ready to see the calendar, fees, documents, and all available options. Everything you need is right here.'
  },
];

// ── Textos en francés — /dashboard/inicio (club · coach · player) ─────────────
const STEPS_FR = [
  // Header Club FR
  { file: 'header_club_01_fr.mp3', text: 'À gauche, vous trouverez le logo de votre club. Appuyez dessus à tout moment pour revenir à cet écran d\'accueil.' },
  { file: 'header_club_02_fr.mp3', text: 'Ce bouton ouvre le tutoriel de l\'écran sur lequel vous vous trouvez. Utilisez-le dès que vous voulez revoir les étapes d\'une section.' },
  { file: 'header_club_03_fr.mp3', text: 'Utilisez ce bouton pour gérer l\'abonnement Sphaira de votre club : consultez votre plan actuel, les options disponibles — Gratuit, Famille et Club — et changez ou activez celui qui vous convient. Disponible depuis tous les écrans.' },
  { file: 'header_club_04_fr.mp3', text: 'Les notifications du club apparaissent ici. Appuyez pour consulter la liste et les marquer comme lues.' },
  { file: 'header_club_05_fr.mp3', text: 'Votre profil, l\'abonnement du club, les paramètres de langue, le changement de rôle et la déconnexion se trouvent dans ce menu.' },
  // Header Coach FR
  { file: 'header_coach_01_fr.mp3', text: 'À gauche, vous trouverez le logo entraîneur. Appuyez dessus à tout moment pour revenir à cet écran d\'accueil.' },
  { file: 'header_coach_02_fr.mp3', text: 'Ce bouton ouvre le tutoriel de l\'écran actuel. Utilisez-le dès que vous voulez revoir les étapes.' },
  { file: 'header_coach_03_fr.mp3', text: 'Utilisez ce bouton pour accéder à l\'abonnement Sphaira du club : consultez le plan actuel et les options disponibles — Gratuit, Famille et Club. Disponible depuis tous les écrans.' },
  { file: 'header_coach_04_fr.mp3', text: 'Vos notifications apparaissent ici. Appuyez pour consulter la liste.' },
  { file: 'header_coach_05_fr.mp3', text: 'Votre profil, les paramètres de langue, le changement de rôle et la déconnexion se trouvent dans ce menu.' },
  // Header Player FR
  { file: 'header_player_01_fr.mp3', text: 'À gauche, vous trouverez le logo joueur. Appuyez dessus à tout moment pour revenir à cet écran d\'accueil.' },
  { file: 'header_player_02_fr.mp3', text: 'Ce bouton ouvre le tutoriel de l\'écran actuel. Utilisez-le dès que vous voulez revoir les étapes.' },
  { file: 'header_player_03_fr.mp3', text: 'Utilisez ce bouton pour consulter l\'abonnement Sphaira du club : vérifiez le plan actuel et les options disponibles — Gratuit, Famille et Club. Disponible depuis tous les écrans.' },
  { file: 'header_player_04_fr.mp3', text: 'Vos notifications apparaissent ici. Appuyez pour consulter la liste.' },
  { file: 'header_player_05_fr.mp3', text: 'Votre profil, les paramètres de langue, le changement de rôle et la déconnexion se trouvent dans ce menu.' },
  // Dashboard inicio Club FR
  { file: 'inicio_01_fr.mp3', text: 'Bienvenue dans le cœur de votre club — voici votre tableau de bord. Depuis ici, vous accédez à tout : équipes, documents, paiements, tenues et bien plus encore. Les prochaines étapes vous guident dans chaque section pour ne rien manquer.' },
  { file: 'inicio_02_fr.mp3', text: 'Première étape : le Tableau de bord — le centre de contrôle de votre club. Vous y trouvez un aperçu en temps réel : résumé des équipes, matchs et entraînements à venir, et alertes pour paiements, blessures ou documents en attente. Appuyez pour y accéder.' },
  { file: 'inicio_03_fr.mp3', text: 'Ensuite, Équipes — la structure sportive de votre club. Créez des catégories, assignez joueurs et entraîneurs, et accédez aux statistiques, au calendrier et à l\'effectif de chaque équipe, tout en un seul endroit.' },
  { file: 'inicio_04_fr.mp3', text: 'Documents : centralisez autorisations, contrats, dossiers médicaux et formulaires personnalisés. Publiez des fichiers pour que les joueurs les signent et suivez les soumissions. La paperasse du club, enfin organisée.' },
  { file: 'inicio_05_fr.mp3', text: 'Paiements et cotisations. Voyez qui est à jour et qui a des soldes impayés, configurez les montants et acceptez les paiements en ligne — le tout depuis un seul endroit.' },
  { file: 'inicio_06_fr.mp3', text: 'Tenues et équipements : les parents soumettent leurs préférences de tailles directement depuis l\'application et le club les reçoit instantanément. Téléchargez les images pour que les familles les voient avant de commander. Tout ce qui concerne les tenues, ici.' },
  { file: 'inicio_07_fr.mp3', text: 'Sponsors : enregistrez chaque sponsor avec son nom, logo, montant et dates. Donnez-leur de la visibilité auprès de tous les membres du club. Vos partenaires ont leur espace dédié ici.' },
  { file: 'inicio_08_fr.mp3', text: 'Notifications : communiquez avec tous ou avec une équipe spécifique. Rédigez des messages, joignez des fichiers et programmez l\'envoi à un moment précis. La communication du club, entièrement maîtrisée.' },
  { file: 'inicio_09_fr.mp3', text: 'Gestion du Staff : définissez qui a accès à quoi. Ajoutez des membres, attribuez des autorisations par module — paiements, documents, statistiques et calendrier — et gérez leurs rôles. Votre équipe de soutien, parfaitement organisée.' },
  { file: 'inicio_10_fr.mp3', text: 'Scouting : organisez votre recherche de talents. Ajoutez des joueurs à votre liste de surveillance et suivez leur développement du premier regard jusqu\'au contact avec le club. Le repérage, version numérique.' },
  { file: 'inicio_11_fr.mp3', text: 'Vidéothèque : votre médiathèque dans le cloud. Téléchargez des enregistrements, liez YouTube ou Vimeo et organisez tout par équipe ou saison. Tout le contenu audiovisuel du club, toujours à portée de main.' },
  { file: 'inicio_12_fr.mp3', text: 'Analyse vidéo : allez encore plus loin. Créez des sessions tactiques sur vos enregistrements, ajoutez des annotations, dessinez sur le terrain et extrayez des clips à partager avec le staff technique.' },
  { file: 'inicio_13_fr.mp3', text: 'Et l\'Assistant IA : toujours disponible sur tous les écrans. Posez des questions, demandez des rapports, des séances d\'entraînement ou des convocations. Retrouvez-le dans le bouton circulaire dans le coin.' },
  { file: 'inicio_14_fr.mp3', text: 'Saviez-vous que Sphaira dispose d\'une application mobile pour iPhone et Android ? Consultez les convocations depuis le banc de touche, gérez les paiements entre réunions, vérifiez les statistiques en direct et recevez des alertes instantanément. L\'expérience mobile est bien plus rapide et pratique que le navigateur. Téléchargez-la en cherchant Sphaira dans l\'App Store ou sur Google Play.' },
  { file: 'inicio_15_fr.mp3', text: 'Vous connaissez maintenant votre tableau de bord club. Explorez n\'importe quel module quand vous le souhaitez, et si vous avez besoin d\'aide, le bouton d\'aide sur chaque écran est là pour vous. Tirez le meilleur parti de Sphaira !' },
  // Dashboard inicio Coach FR
  { file: 'coach_01_fr.mp3', text: 'En tant qu\'entraîneur, voici votre écran d\'accueil. Vous y voyez toutes les équipes que vous dirigez dans la saison sélectionnée. Chaque carte est la porte d\'entrée vers cette équipe : calendrier, séances, joueurs et bien plus encore. Nous vous guidons dans un instant.' },
  { file: 'coach_02_fr.mp3', text: 'En haut, vous avez le sélecteur de saison. Changez-le pour voir les équipes assignées à une autre année — la liste se met à jour instantanément. Passez d\'une saison à l\'autre sans quitter cet écran.' },
  { file: 'coach_03_fr.mp3', text: 'Voici vos équipes. Chaque carte affiche la catégorie, le nom, la ligue, les horaires d\'entraînement et le nombre de joueurs. Appuyez sur une pour accéder à son calendrier, ses séances, ses joueurs, ses statistiques, ses notifications et toutes les autres options.' },
  { file: 'coach_04_fr.mp3', text: 'Si vous n\'avez aucune équipe assignée cette saison, vous verrez un message d\'orientation et un bouton pour accéder à la gestion des équipes du club. Dès que des équipes vous sont assignées, elles apparaîtront ici.' },
  { file: 'coach_05_fr.mp3', text: 'Les meilleurs entraîneurs dirigent aussi en dehors du terrain. Avec l\'application Sphaira pour iOS et Android, vous avez le calendrier, les séances des joueurs, les blessures et le chat du staff dans votre poche où que vous alliez. L\'expérience est bien plus fluide que sur le navigateur. Téléchargez-la sur l\'App Store ou Google Play en cherchant Sphaira Tech !' },
  { file: 'coach_06_fr.mp3', text: 'Vous connaissez maintenant votre tableau de bord entraîneur. Choisissez une équipe quand vous êtes prêt et accédez à son calendrier, ses séances, ses joueurs et toutes les autres options. À vous de diriger depuis le banc !' },
  // Dashboard inicio Player FR
  { file: 'player_01_fr.mp3', text: 'Voici votre écran principal en tant que parent ou joueur. Vous y voyez les sportifs liés à votre compte dans la saison sélectionnée. Chaque carte vous emmène dans leur monde : calendrier, cotisations, documents, statistiques et galerie. Nous vous expliquons chaque partie dans un instant.' },
  { file: 'player_02_fr.mp3', text: 'En haut, vous avez le sélecteur de saison. Changez-le pour voir les joueurs et équipes d\'une autre année — la liste se met à jour instantanément. Changez de saison sans quitter cet écran.' },
  { file: 'player_03_fr.mp3', text: 'Voici vos joueurs. Chaque carte affiche le nom, l\'équipe, les horaires d\'entraînement et le prochain match. Appuyez sur une carte ou sur Voir joueur pour accéder à toutes les options : calendrier, cotisations, documents et plus.' },
  { file: 'player_04_fr.mp3', text: 'Si aucun joueur n\'est lié cette saison, vous verrez un message d\'orientation. Contactez votre club pour enregistrer des joueurs — une fois ajoutés, ils apparaîtront ici.' },
  { file: 'player_05_fr.mp3', text: 'Les parents et joueurs qui utilisent l\'application Sphaira ne manquent rien : notifications de convocations instantanées, horaires d\'entraînement, cotisations en attente et documents du club sans devoir chercher dans les e-mails. L\'expérience est bien meilleure que sur le navigateur. Téléchargez-la gratuitement en cherchant Sphaira sur l\'App Store ou Google Play.' },
  { file: 'player_06_fr.mp3', text: 'Vous connaissez maintenant votre tableau de bord joueur. Appuyez sur n\'importe quelle carte quand vous êtes prêt pour voir le calendrier, les cotisations, les documents et toutes les options disponibles. Tout est à portée de main.' },
];

// ── Textos en alemán — /dashboard/inicio (club · coach · player) ──────────────
const STEPS_DE = [
  // Header Club DE
  { file: 'header_club_01_de.mp3', text: 'Auf der linken Seite finden Sie das Logo Ihres Vereins. Tippen Sie jederzeit darauf, um zu diesem Startbildschirm zurückzukehren.' },
  { file: 'header_club_02_de.mp3', text: 'Diese Schaltfläche öffnet das Tutorial des Bildschirms, auf dem Sie sich befinden. Nutzen Sie es, wann immer Sie die Schritte eines Bereichs wiederholen möchten.' },
  { file: 'header_club_03_de.mp3', text: 'Verwalten Sie hier das Sphaira-Abonnement Ihres Vereins: Prüfen Sie Ihren aktuellen Plan, die verfügbaren Optionen — Kostenlos, Familie und Club — und wechseln oder aktivieren Sie den passenden Plan. Von jedem Bildschirm aus verfügbar.' },
  { file: 'header_club_04_de.mp3', text: 'Vereinsbenachrichtigungen erscheinen hier. Tippen Sie, um die Liste aufzurufen und sie als gelesen zu markieren.' },
  { file: 'header_club_05_de.mp3', text: 'Ihr Profil, das Vereinsabonnement, Spracheinstellungen, Rollenwechsel und Abmelden befinden sich in diesem Menü.' },
  // Header Coach DE
  { file: 'header_coach_01_de.mp3', text: 'Auf der linken Seite finden Sie das Trainer-Logo. Tippen Sie jederzeit darauf, um zu diesem Startbildschirm zurückzukehren.' },
  { file: 'header_coach_02_de.mp3', text: 'Diese Schaltfläche öffnet das Tutorial des aktuellen Bildschirms. Nutzen Sie es, wann immer Sie die Schritte wiederholen möchten.' },
  { file: 'header_coach_03_de.mp3', text: 'Greifen Sie hier auf das Sphaira-Abonnement des Vereins zu: Prüfen Sie den aktuellen Plan und die verfügbaren Optionen — Kostenlos, Familie und Club. Von jedem Bildschirm aus verfügbar.' },
  { file: 'header_coach_04_de.mp3', text: 'Ihre Benachrichtigungen erscheinen hier. Tippen Sie, um die Liste aufzurufen.' },
  { file: 'header_coach_05_de.mp3', text: 'Ihr Profil, Spracheinstellungen, Rollenwechsel und Abmelden befinden sich in diesem Menü.' },
  // Header Player DE
  { file: 'header_player_01_de.mp3', text: 'Auf der linken Seite finden Sie das Spieler-Logo. Tippen Sie jederzeit darauf, um zu diesem Startbildschirm zurückzukehren.' },
  { file: 'header_player_02_de.mp3', text: 'Diese Schaltfläche öffnet das Tutorial des aktuellen Bildschirms. Nutzen Sie es, wann immer Sie die Schritte wiederholen möchten.' },
  { file: 'header_player_03_de.mp3', text: 'Sehen Sie hier das Sphaira-Abonnement des Vereins ein: Prüfen Sie den aktuellen Plan und die verfügbaren Optionen — Kostenlos, Familie und Club. Von jedem Bildschirm aus verfügbar.' },
  { file: 'header_player_04_de.mp3', text: 'Ihre Benachrichtigungen erscheinen hier. Tippen Sie, um die Liste aufzurufen.' },
  { file: 'header_player_05_de.mp3', text: 'Ihr Profil, Spracheinstellungen, Rollenwechsel und Abmelden befinden sich in diesem Menü.' },
  // Dashboard inicio Club DE
  { file: 'inicio_01_de.mp3', text: 'Willkommen im Herz Ihres Vereins — das ist Ihr Verwaltungs-Dashboard. Von hier aus haben Sie Zugriff auf alles: Teams, Dokumente, Zahlungen, Ausrüstung und vieles mehr. Die nächsten Schritte führen Sie durch jeden Bereich.' },
  { file: 'inicio_02_de.mp3', text: 'Erster Halt: das Kontrollzentrum — die Kommandozentrale Ihres Vereins. Hier erhalten Sie einen Live-Überblick: Team-Zusammenfassungen, bevorstehende Spiele und Trainingseinheiten sowie Warnungen für Zahlungen, Verletzungen oder ausstehende Dokumente. Tippen Sie, um einzutreten.' },
  { file: 'inicio_03_de.mp3', text: 'Als nächstes, Teams — die sportliche Struktur Ihres Vereins. Erstellen Sie Kategorien, weisen Sie Spieler und Trainer zu und greifen Sie auf Statistiken, Kalender und Kader jedes Teams zu — alles an einem Ort.' },
  { file: 'inicio_04_de.mp3', text: 'Dokumente: Zentralisieren Sie Genehmigungen, Verträge, Krankenakten und Formulare. Veröffentlichen Sie Dateien zur Unterzeichnung durch Spieler und verfolgen Sie, wer was eingereicht hat. Die Vereinsdokumentation, endlich geordnet.' },
  { file: 'inicio_05_de.mp3', text: 'Zahlungen und Beiträge. Sehen Sie, wer aktuell ist und wer ausstehende Salden hat, konfigurieren Sie Beträge und akzeptieren Sie Online-Zahlungen — alles von einem einzigen Ort aus.' },
  { file: 'inicio_06_de.mp3', text: 'Ausrüstung und Kleidung: Eltern übermitteln Größenpräferenzen direkt über die App und der Verein erhält sie sofort. Laden Sie Ausrüstungsbilder hoch, damit Familien die Ausstattung vor dem Bestellen sehen können. Alles rund um Kleidung, hier.' },
  { file: 'inicio_07_de.mp3', text: 'Sponsoren: Registrieren Sie jeden Sponsor mit Name, Logo, Betrag und Datum. Geben Sie ihnen Sichtbarkeit und zeigen Sie sie allen Vereinsmitgliedern. Ihre Partner haben hier ihren eigenen Bereich.' },
  { file: 'inicio_08_de.mp3', text: 'Benachrichtigungen: Kommunizieren Sie mit allen oder mit einem bestimmten Team. Verfassen Sie Nachrichten, hängen Sie Dateien an und planen Sie den genauen Sendezeitpunkt. Die Vereinskommunikation, vollständig unter Kontrolle.' },
  { file: 'inicio_09_de.mp3', text: 'Mitarbeiterverwaltung: Legen Sie fest, wer Zugriff auf was hat. Fügen Sie Mitglieder hinzu, weisen Sie Modulberechtigungen zu — Zahlungen, Dokumente, Statistiken und Kalender — und verwalten Sie deren Rollen. Ihr Support-Team, perfekt organisiert.' },
  { file: 'inicio_10_de.mp3', text: 'Scouting: Organisieren Sie Ihre Talentsuche. Fügen Sie Spieler Ihrer Beobachtungsliste hinzu und verfolgen Sie deren Entwicklung vom ersten Blick bis zum Vereinskontakt. Talentspähen, digital.' },
  { file: 'inicio_11_de.mp3', text: 'Videothek: Ihr cloudbasierter Medienspeicher. Laden Sie Aufnahmen hoch, verlinken Sie YouTube oder Vimeo und organisieren Sie alles nach Team oder Saison. Das gesamte audiovisuelle Material des Vereins, stets griffbereit.' },
  { file: 'inicio_12_de.mp3', text: 'Videoanalyse: Gehen Sie einen Schritt weiter. Erstellen Sie taktische Sitzungen zu Ihren Aufnahmen, fügen Sie Anmerkungen hinzu, zeichnen Sie auf dem Spielfeld und extrahieren Sie Clips zum Teilen mit dem Trainerstab.' },
  { file: 'inicio_13_de.mp3', text: 'Und der KI-Assistent: auf jedem Bildschirm immer verfügbar. Stellen Sie Fragen, fordern Sie Berichte, Trainingseinheiten oder Kaderberufungen an. Sie finden ihn im runden Knopf in der Ecke.' },
  { file: 'inicio_14_de.mp3', text: 'Wussten Sie, dass Sphaira eine mobile App für iPhone und Android hat? Überprüfen Sie Kaderberufungen von der Seitenlinie, verwalten Sie Zahlungen zwischen Meetings, prüfen Sie Live-Statistiken und erhalten Sie sofortige Benachrichtigungen. Das mobile Erlebnis ist viel schneller und bequemer als der Browser. Laden Sie es herunter, indem Sie im App Store oder auf Google Play nach Sphaira suchen.' },
  { file: 'inicio_15_de.mp3', text: 'Sie kennen jetzt Ihr Vereins-Dashboard. Erkunden Sie jedes Modul, wann immer Sie möchten, und wenn Sie Orientierung benötigen, ist die Hilfe-Schaltfläche auf jedem Bildschirm für Sie da. Holen Sie das Beste aus Sphaira heraus!' },
  // Dashboard inicio Coach DE
  { file: 'coach_01_de.mp3', text: 'Als Trainer ist dies Ihr Startbildschirm. Hier sehen Sie alle Teams, die Sie in der ausgewählten Saison leiten. Jede Karte ist das Tor zu diesem Team: Kalender, Einheiten, Spieler und vieles mehr. Wir führen Sie gleich durch alles.' },
  { file: 'coach_02_de.mp3', text: 'Oben haben Sie die Saisonauswahl. Wechseln Sie sie, um Teams zu sehen, die einem anderen Jahr zugewiesen sind — die Liste aktualisiert sich sofort. Wechseln Sie zwischen Saisons, ohne diesen Bildschirm zu verlassen.' },
  { file: 'coach_03_de.mp3', text: 'Hier sind Ihre Teams. Jede Karte zeigt die Kategorie, den Namen, die Liga, den Trainingsplan und die Anzahl der Spieler. Tippen Sie auf eine, um auf Kalender, Einheiten, Spieler, Statistiken, Benachrichtigungen und alle anderen Optionen zuzugreifen.' },
  { file: 'coach_04_de.mp3', text: 'Wenn Ihnen in dieser Saison keine Teams zugewiesen sind, sehen Sie eine Orientierungsmeldung und eine Schaltfläche zur Team-Verwaltung des Vereins. Sobald Teams zugewiesen sind, erscheinen sie hier.' },
  { file: 'coach_05_de.mp3', text: 'Die besten Trainer führen auch jenseits des Spielfelds. Mit der Sphaira-App für iOS und Android haben Sie Ihren Teamkalender, Spielereinheiten, Verletzungsaufzeichnungen und den Trainerstab-Chat in der Tasche, wohin Sie auch gehen. Das Erlebnis ist viel reibungsloser als im Browser. Laden Sie sie im App Store oder Google Play — suchen Sie Sphaira Tech!' },
  { file: 'coach_06_de.mp3', text: 'Sie kennen jetzt Ihr Trainer-Dashboard. Wählen Sie ein Team, wann immer Sie bereit sind, und greifen Sie auf Kalender, Einheiten, Spieler und alle anderen Optionen zu. Zeit, von der Seitenlinie zu führen!' },
  // Dashboard inicio Player DE
  { file: 'player_01_de.mp3', text: 'Dies ist Ihr Hauptbildschirm als Elternteil oder Spieler. Hier sehen Sie die Athleten, die mit Ihrem Konto in der ausgewählten Saison verknüpft sind. Jede Karte führt Sie in ihre Welt: Kalender, Beiträge, Dokumente, Statistiken und Galerie. Wir erklären Ihnen jeden Teil gleich.' },
  { file: 'player_02_de.mp3', text: 'Oben haben Sie die Saisonauswahl. Wechseln Sie sie, um Spieler und Teams aus einem anderen Jahr zu sehen — die Liste aktualisiert sich sofort. Wechseln Sie Saisons, ohne diesen Bildschirm zu verlassen.' },
  { file: 'player_03_de.mp3', text: 'Hier sind Ihre Spieler. Jede Karte zeigt Name, Team, Trainingsplan und nächstes Spiel. Tippen Sie auf eine Karte oder auf Spieler anzeigen, um auf alle Optionen zuzugreifen: Kalender, Beiträge, Dokumente und mehr.' },
  { file: 'player_04_de.mp3', text: 'Wenn in dieser Saison keine Spieler verknüpft sind, sehen Sie eine Orientierungsmeldung. Kontaktieren Sie Ihren Verein, um Spieler zu registrieren — sobald diese hinzugefügt sind, erscheinen sie hier.' },
  { file: 'player_05_de.mp3', text: 'Eltern und Spieler, die die Sphaira-App nutzen, verpassen nichts: sofortige Kaderberufungsbenachrichtigungen, Trainingspläne, ausstehende Beiträge und Vereinsdokumente, ohne in E-Mails oder Dateien suchen zu müssen. Das Erlebnis ist viel besser als im Browser. Laden Sie es kostenlos herunter, indem Sie im App Store oder auf Google Play nach Sphaira suchen.' },
  { file: 'player_06_de.mp3', text: 'Sie kennen jetzt Ihr Spieler-Dashboard. Tippen Sie auf eine beliebige Karte, wenn Sie bereit sind, um Kalender, Beiträge, Dokumente und alle verfügbaren Optionen zu sehen. Alles, was Sie brauchen, ist hier.' },
];

// ── Textos en portugués — /dashboard/inicio (club · coach · player) ───────────
const STEPS_PT = [
  // Header Club PT
  { file: 'header_club_01_pt.mp3', text: 'À esquerda encontra o logótipo do seu clube. Toque nele a qualquer momento para voltar a este ecrã inicial.' },
  { file: 'header_club_02_pt.mp3', text: 'Este botão abre o tutorial do ecrã em que se encontra. Use-o sempre que quiser rever os passos de qualquer secção.' },
  { file: 'header_club_03_pt.mp3', text: 'Use este botão para gerir a subscrição Sphaira do seu clube: consulte o plano atual, veja as opções disponíveis — Gratuito, Família e Clube — e mude ou ative o que melhor se adapta. Disponível em todos os ecrãs.' },
  { file: 'header_club_04_pt.mp3', text: 'As notificações do clube aparecem aqui. Toque para ver a lista e marcá-las como lidas.' },
  { file: 'header_club_05_pt.mp3', text: 'O seu perfil, subscrição do clube, definições de idioma, mudança de papel e terminar sessão estão neste menu.' },
  // Header Coach PT
  { file: 'header_coach_01_pt.mp3', text: 'À esquerda encontra o logótipo de treinador. Toque nele a qualquer momento para voltar a este ecrã inicial.' },
  { file: 'header_coach_02_pt.mp3', text: 'Este botão abre o tutorial do ecrã atual. Use-o sempre que quiser rever os passos.' },
  { file: 'header_coach_03_pt.mp3', text: 'Use este botão para aceder à subscrição Sphaira do clube: veja o plano atual e as opções disponíveis — Gratuito, Família e Clube. Disponível em todos os ecrãs.' },
  { file: 'header_coach_04_pt.mp3', text: 'As suas notificações aparecem aqui. Toque para ver a lista.' },
  { file: 'header_coach_05_pt.mp3', text: 'O seu perfil, definições de idioma, mudança de papel e terminar sessão estão neste menu.' },
  // Header Player PT
  { file: 'header_player_01_pt.mp3', text: 'À esquerda encontra o logótipo de jogador. Toque nele a qualquer momento para voltar a este ecrã inicial.' },
  { file: 'header_player_02_pt.mp3', text: 'Este botão abre o tutorial do ecrã atual. Use-o sempre que quiser rever os passos.' },
  { file: 'header_player_03_pt.mp3', text: 'Use este botão para ver a subscrição Sphaira do clube: consulte o plano atual e as opções disponíveis — Gratuito, Família e Clube. Disponível em todos os ecrãs.' },
  { file: 'header_player_04_pt.mp3', text: 'As suas notificações aparecem aqui. Toque para ver a lista.' },
  { file: 'header_player_05_pt.mp3', text: 'O seu perfil, definições de idioma, mudança de papel e terminar sessão estão neste menu.' },
  // Dashboard inicio Club PT
  { file: 'inicio_01_pt.mp3', text: 'Bem-vindo ao coração do seu clube — este é o seu painel de gestão. Daqui tem acesso a tudo: equipas, documentos, pagamentos, equipamento e muito mais. Os próximos passos vão guiá-lo por cada secção para não perder nada.' },
  { file: 'inicio_02_pt.mp3', text: 'Primeira paragem: o Painel de Controlo — o centro de comando do seu clube. Aqui tem um resumo em tempo real: equipas, próximos jogos e treinos, e alertas de pagamentos pendentes, lesões ou documentos em falta. Toque para entrar quando quiser.' },
  { file: 'inicio_03_pt.mp3', text: 'A seguir, Equipas — a estrutura desportiva do clube. Crie categorias, atribua jogadores e treinadores, e aceda às estatísticas, calendário e plantel de cada equipa, tudo num só lugar.' },
  { file: 'inicio_04_pt.mp3', text: 'Documentos: centralize autorizações, contratos, fichas médicas e formulários. Publique ficheiros para os jogadores assinarem e acompanhe quem já entregou cada um. A documentação do clube, finalmente organizada.' },
  { file: 'inicio_05_pt.mp3', text: 'Pagamentos e quotas. Veja quem está em dia e quem tem saldos pendentes, configure os montantes e aceite pagamentos online — tudo num único lugar.' },
  { file: 'inicio_06_pt.mp3', text: 'Equipamento e vestuário: os pais indicam os tamanhos diretamente pela app e o clube recebe-os de imediato. Carregue imagens do equipamento para que as famílias o vejam antes de encomendar. Tudo relacionado com vestuário, aqui.' },
  { file: 'inicio_07_pt.mp3', text: 'Patrocinadores: registe cada patrocinador com nome, logótipo, montante e datas. Dê-lhes visibilidade e mostre-os a todos os membros do clube. Os seus parceiros têm o seu espaço dedicado aqui.' },
  { file: 'inicio_08_pt.mp3', text: 'Notificações: comunique com todos ou com uma equipa específica. Escreva mensagens, anexe ficheiros e agende o momento exato de envio. A comunicação do clube, totalmente sob controlo.' },
  { file: 'inicio_09_pt.mp3', text: 'Gestão de Staff: defina quem tem acesso a quê. Adicione membros, atribua permissões por módulo — pagamentos, documentos, estatísticas e calendário — e gira os seus papéis. A sua equipa de apoio, perfeitamente organizada.' },
  { file: 'inicio_10_pt.mp3', text: 'Scouting: organize a prospeção de talentos. Adicione jogadores à sua lista de observação e acompanhe o seu desenvolvimento desde o primeiro vislumbre até ao contacto com o clube. A deteção de talentos, digitalizada.' },
  { file: 'inicio_11_pt.mp3', text: 'Biblioteca de Vídeos: o seu hub multimédia na nuvem. Carregue gravações, ligue o YouTube ou Vimeo e organize tudo por equipa ou época. Todo o conteúdo audiovisual do clube, sempre à mão.' },
  { file: 'inicio_12_pt.mp3', text: 'Análise de Vídeo: vá mais longe. Crie sessões táticas sobre as suas gravações, adicione anotações, desenhe no campo e extraia clips para partilhar com a equipa técnica.' },
  { file: 'inicio_13_pt.mp3', text: 'E o Assistente IA: sempre disponível em todos os ecrãs. Faça perguntas, peça relatórios, sessões de treino ou convocatórias. Encontra-o no botão circular no canto.' },
  { file: 'inicio_14_pt.mp3', text: 'Sabia que o Sphaira tem uma aplicação móvel disponível para iPhone e Android? Reveja convocatórias do banco de suplentes, gira pagamentos entre reuniões, consulte estatísticas em direto e receba alertas instantâneos. A experiência móvel é muito mais rápida e cómoda que o browser. Faça o download pesquisando Sphaira na App Store ou no Google Play.' },
  { file: 'inicio_15_pt.mp3', text: 'Já conhece o seu painel de clube. Explore qualquer módulo quando quiser e, se precisar de orientação, o botão de ajuda em cada ecrã está lá para si. Tire o máximo partido do Sphaira!' },
  // Dashboard inicio Coach PT
  { file: 'coach_01_pt.mp3', text: 'Como treinador, este é o seu ecrã inicial. Aqui vê todas as equipas que dirige na época selecionada. Cada cartão é a porta de entrada para essa equipa: calendário, sessões, jogadores e muito mais. Guiamo-lo daqui a pouco.' },
  { file: 'coach_02_pt.mp3', text: 'No topo tem o seletor de época. Mude-o para ver as equipas atribuídas noutro ano — a lista atualiza-se instantaneamente. Passe entre épocas sem sair deste ecrã.' },
  { file: 'coach_03_pt.mp3', text: 'Aqui estão as suas equipas. Cada cartão mostra a categoria, nome, liga, horário de treinos e número de jogadores. Toque num para aceder ao calendário, sessões, jogadores, estatísticas, notificações e todas as outras opções.' },
  { file: 'coach_04_pt.mp3', text: 'Se não tiver equipas atribuídas nesta época, verá uma mensagem orientativa e um botão para ir à gestão de equipas do clube. Assim que lhe forem atribuídas equipas, aparecerão aqui.' },
  { file: 'coach_05_pt.mp3', text: 'Os melhores treinadores lideram também fora do campo. Com a app Sphaira para iOS e Android tem o calendário da equipa, as sessões dos jogadores, o registo de lesões e o chat com a equipa técnica no bolso, onde quer que vá. A experiência é muito mais fluida do que no browser. Faça o download na App Store ou Google Play pesquisando Sphaira Tech!' },
  { file: 'coach_06_pt.mp3', text: 'Já conhece o seu painel de treinador. Escolha uma equipa quando estiver pronto e aceda ao calendário, sessões, jogadores e todas as outras opções. Hora de liderar do banco!' },
  // Dashboard inicio Player PT
  { file: 'player_01_pt.mp3', text: 'Este é o seu ecrã principal como pai ou jogador. Aqui vê os atletas ligados à sua conta na época selecionada. Cada cartão leva-o ao seu mundo: calendário, quotas, documentos, estatísticas e galeria. Explicamos-lhe cada parte daqui a pouco.' },
  { file: 'player_02_pt.mp3', text: 'No topo tem o seletor de época. Mude-o para ver jogadores e equipas de outro ano — a lista atualiza-se instantaneamente. Mude de época sem sair deste ecrã.' },
  { file: 'player_03_pt.mp3', text: 'Aqui estão os seus jogadores. Cada cartão mostra nome, equipa, horário de treinos e próximo jogo. Toque num cartão ou em Ver jogador para aceder a todas as opções: calendário, quotas, documentos e mais.' },
  { file: 'player_04_pt.mp3', text: 'Se não houver jogadores ligados nesta época, verá uma mensagem orientativa. Contacte o seu clube para registar jogadores — assim que adicionados, aparecerão aqui.' },
  { file: 'player_05_pt.mp3', text: 'Pais e jogadores que usam a app Sphaira não perdem nada: notificações de convocatórias instantâneas, horários de treino, quotas pendentes e documentos do clube sem ter de procurar em e-mails. A experiência é muito melhor do que no browser. Faça o download gratuitamente pesquisando Sphaira na App Store ou no Google Play.' },
  { file: 'player_06_pt.mp3', text: 'Já conhece o seu painel de jogador. Toque em qualquer cartão quando estiver pronto para ver o calendário, as quotas, os documentos e todas as opções disponíveis. Tudo o que precisa está aqui.' },
];

// ── Textos en italiano — /dashboard/inicio (club · coach · player) ────────────
const STEPS_IT = [
  // Header Club IT
  { file: 'header_club_01_it.mp3', text: 'Sulla sinistra trovi il logo del tuo club. Toccalo in qualsiasi momento per tornare a questa schermata iniziale.' },
  { file: 'header_club_02_it.mp3', text: 'Questo pulsante apre il tutorial della schermata in cui ti trovi. Usalo ogni volta che vuoi ripassare i passaggi di qualsiasi sezione.' },
  { file: 'header_club_03_it.mp3', text: 'Usa questo pulsante per gestire l\'abbonamento Sphaira del tuo club: controlla il piano attuale, le opzioni disponibili — Gratuito, Famiglia e Club — e cambia o attiva quello più adatto alle tue esigenze. Disponibile da ogni schermata.' },
  { file: 'header_club_04_it.mp3', text: 'Le notifiche del club appaiono qui. Tocca per visualizzare l\'elenco e segnarle come lette.' },
  { file: 'header_club_05_it.mp3', text: 'Il tuo profilo, l\'abbonamento del club, le impostazioni della lingua, il cambio ruolo e la disconnessione si trovano in questo menu.' },
  // Header Coach IT
  { file: 'header_coach_01_it.mp3', text: 'Sulla sinistra trovi il logo allenatore. Toccalo in qualsiasi momento per tornare a questa schermata iniziale.' },
  { file: 'header_coach_02_it.mp3', text: 'Questo pulsante apre il tutorial della schermata corrente. Usalo ogni volta che vuoi ripassare i passaggi.' },
  { file: 'header_coach_03_it.mp3', text: 'Usa questo pulsante per accedere all\'abbonamento Sphaira del club: visualizza il piano attuale e le opzioni disponibili — Gratuito, Famiglia e Club. Disponibile da ogni schermata.' },
  { file: 'header_coach_04_it.mp3', text: 'Le tue notifiche appaiono qui. Tocca per visualizzare l\'elenco.' },
  { file: 'header_coach_05_it.mp3', text: 'Il tuo profilo, le impostazioni della lingua, il cambio ruolo e la disconnessione si trovano in questo menu.' },
  // Header Player IT
  { file: 'header_player_01_it.mp3', text: 'Sulla sinistra trovi il logo giocatore. Toccalo in qualsiasi momento per tornare a questa schermata iniziale.' },
  { file: 'header_player_02_it.mp3', text: 'Questo pulsante apre il tutorial della schermata corrente. Usalo ogni volta che vuoi ripassare i passaggi.' },
  { file: 'header_player_03_it.mp3', text: 'Usa questo pulsante per visualizzare l\'abbonamento Sphaira del club: controlla il piano attuale e le opzioni disponibili — Gratuito, Famiglia e Club. Disponibile da ogni schermata.' },
  { file: 'header_player_04_it.mp3', text: 'Le tue notifiche appaiono qui. Tocca per visualizzare l\'elenco.' },
  { file: 'header_player_05_it.mp3', text: 'Il tuo profilo, le impostazioni della lingua, il cambio ruolo e la disconnessione si trovano in questo menu.' },
  // Dashboard inicio Club IT
  { file: 'inicio_01_it.mp3', text: 'Benvenuto nel cuore del tuo club — questa è la tua dashboard di gestione. Da qui accedi a tutto: squadre, documenti, pagamenti, divise e molto altro. I prossimi passaggi ti guideranno attraverso ogni sezione affinché tu non perda nulla.' },
  { file: 'inicio_02_it.mp3', text: 'Prima tappa: il Pannello di Controllo — il centro di comando del tuo club. Qui ottieni una panoramica in tempo reale: riepiloghi delle squadre, prossime partite e allenamenti, avvisi per pagamenti, infortuni o documenti in sospeso. Toccalo quando sei pronto.' },
  { file: 'inicio_03_it.mp3', text: 'Poi, Squadre — la struttura sportiva del club. Crea categorie, assegna giocatori e allenatori, e accedi alle statistiche, al calendario e alla rosa di ogni squadra, tutto in un unico posto.' },
  { file: 'inicio_04_it.mp3', text: 'Documenti: centralizza autorizzazioni, contratti, cartelle mediche e moduli personalizzati. Pubblica file da far firmare ai giocatori e tieni traccia di chi ha consegnato cosa. La documentazione del club, finalmente in ordine.' },
  { file: 'inicio_05_it.mp3', text: 'Pagamenti e quote. Vedi chi è in regola e chi ha saldi in sospeso, configura gli importi e accetta pagamenti online — tutto da un unico posto.' },
  { file: 'inicio_06_it.mp3', text: 'Divise e abbigliamento: i genitori indicano le taglie direttamente dall\'app e il club le riceve istantaneamente. Carica le immagini delle divise affinché le famiglie le vedano prima di ordinare. Tutto ciò che riguarda l\'abbigliamento, qui.' },
  { file: 'inicio_07_it.mp3', text: 'Sponsor: registra ogni sponsor con nome, logo, importo e date. Dai loro visibilità e mostrali a tutti i membri del club. I tuoi partner hanno il loro spazio dedicato qui.' },
  { file: 'inicio_08_it.mp3', text: 'Notifiche: comunica con tutti o con un team specifico. Scrivi messaggi, allega file e pianifica l\'orario esatto di invio. La comunicazione del club, completamente sotto controllo.' },
  { file: 'inicio_09_it.mp3', text: 'Gestione Staff: definisci chi ha accesso a cosa. Aggiungi membri, assegna permessi per modulo — pagamenti, documenti, statistiche e calendario — e gestisci i loro ruoli. Il tuo team di supporto, perfettamente organizzato.' },
  { file: 'inicio_10_it.mp3', text: 'Scouting: organizza la ricerca dei talenti. Aggiungi giocatori alla tua lista di osservazione e segui il loro sviluppo dal primo sguardo al contatto con il club. Il talent scouting, digitalizzato.' },
  { file: 'inicio_11_it.mp3', text: 'Videoteca: il tuo hub multimediale nel cloud. Carica registrazioni, collega YouTube o Vimeo e organizza tutto per squadra o stagione. Tutto il materiale audiovisivo del club, sempre a portata di mano.' },
  { file: 'inicio_12_it.mp3', text: 'Analisi Video: vai oltre. Crea sessioni tattiche sulle tue registrazioni, aggiungi annotazioni, disegna sul campo ed estrai clip da condividere con lo staff tecnico.' },
  { file: 'inicio_13_it.mp3', text: 'E l\'Assistente IA: sempre disponibile su ogni schermata. Fai domande, richiedi report, sessioni di allenamento o convocazioni. Trovalo nel pulsante circolare nell\'angolo.' },
  { file: 'inicio_14_it.mp3', text: 'Lo sapevi che Sphaira ha un\'app mobile disponibile per iPhone e Android? Controlla le convocazioni dalla panchina, gestisci i pagamenti tra una riunione e l\'altra, consulta le statistiche in diretta e ricevi avvisi istantanei. L\'esperienza mobile è molto più rapida e comoda del browser. Scaricala cercando Sphaira nell\'App Store o su Google Play.' },
  { file: 'inicio_15_it.mp3', text: 'Ora conosci la tua dashboard club. Esplora qualsiasi modulo quando vuoi e, se hai bisogno di orientamento, il pulsante di aiuto su ogni schermata è lì per te. Ottieni il massimo da Sphaira!' },
  // Dashboard inicio Coach IT
  { file: 'coach_01_it.mp3', text: 'Come allenatore, questa è la tua schermata iniziale. Qui vedi tutte le squadre che alleni nella stagione selezionata. Ogni card è la porta d\'accesso a quella squadra: calendario, sessioni, giocatori e molto altro. Ti guidiamo tra poco.' },
  { file: 'coach_02_it.mp3', text: 'In alto hai il selettore della stagione. Cambialo per vedere le squadre assegnate a un anno diverso — la lista si aggiorna istantaneamente. Passa da una stagione all\'altra senza uscire da questa schermata.' },
  { file: 'coach_03_it.mp3', text: 'Ecco le tue squadre. Ogni card mostra la categoria, il nome, la lega, gli orari degli allenamenti e il numero di giocatori. Toccane una per accedere al calendario, alle sessioni, ai giocatori, alle statistiche, alle notifiche e a tutte le altre opzioni.' },
  { file: 'coach_04_it.mp3', text: 'Se non hai squadre assegnate in questa stagione, vedrai un messaggio orientativo e un pulsante per accedere alla gestione squadre del club. Non appena ti verranno assegnate squadre, appariranno qui.' },
  { file: 'coach_05_it.mp3', text: 'I migliori allenatori guidano anche fuori dal campo. Con l\'app Sphaira per iOS e Android hai il calendario della squadra, le sessioni dei giocatori, i registri degli infortuni e la chat con lo staff tecnico in tasca ovunque tu vada. L\'esperienza è molto più fluida del browser. Scaricala dall\'App Store o su Google Play cercando Sphaira Tech!' },
  { file: 'coach_06_it.mp3', text: 'Ora conosci la tua dashboard allenatore. Scegli una squadra quando sei pronto e accedi al calendario, alle sessioni, ai giocatori e a tutte le altre opzioni. È ora di guidare dalla panchina!' },
  // Dashboard inicio Player IT
  { file: 'player_01_it.mp3', text: 'Questa è la tua schermata principale come genitore o giocatore. Qui vedi gli atleti collegati al tuo account nella stagione selezionata. Ogni card ti porta nel loro mondo: calendario, quote, documenti, statistiche e galleria. Ti spieghiamo ogni parte tra poco.' },
  { file: 'player_02_it.mp3', text: 'In alto hai il selettore della stagione. Cambialo per vedere giocatori e squadre di un anno diverso — la lista si aggiorna istantaneamente. Cambia stagione senza uscire da questa schermata.' },
  { file: 'player_03_it.mp3', text: 'Ecco i tuoi giocatori. Ogni card mostra nome, squadra, orari di allenamento e prossima partita. Tocca una card o Visualizza giocatore per accedere a tutte le opzioni: calendario, quote, documenti e altro.' },
  { file: 'player_04_it.mp3', text: 'Se nessun giocatore è collegato in questa stagione, vedrai un messaggio orientativo. Contatta il tuo club per registrare i giocatori — una volta aggiunti, appariranno qui.' },
  { file: 'player_05_it.mp3', text: 'Genitori e giocatori che usano l\'app Sphaira non perdono nulla: notifiche istantanee di convocazione, orari di allenamento, quote in sospeso e documenti del club senza dover cercare tra e-mail o file. L\'esperienza è molto migliore del browser. Scaricala gratuitamente cercando Sphaira nell\'App Store o su Google Play.' },
  { file: 'player_06_it.mp3', text: 'Ora conosci la tua dashboard giocatore. Tocca qualsiasi card quando sei pronto per vedere il calendario, le quote, i documenti e tutte le opzioni disponibili. Tutto ciò di cui hai bisogno è qui.' },
];

// ── Cuadro de mandos — EN ─────────────────────────────────────────────────────
const STEPS_CUADRO_EN = [
  { file: 'cuadro_01_en.mp3', text: 'You\'re in your club\'s control centre. On the left you have quick access to players, coaches, statistics and the calendar. On the right, the real-time summary: results, today\'s training sessions and upcoming matches. We\'ll guide you through it step by step.' },
  { file: 'cuadro_03_en.mp3', text: 'Let\'s start with the left panel. Here you have Player Info, where you access the full club directory. Check individual profiles with personal data, statistics, injury history, payments and documentation.' },
  { file: 'cuadro_04_en.mp3', text: 'Next, Coach Info. Consult and manage your entire coaching staff: a list of coaches, their team assignments and contact details, all in one place.' },
  { file: 'cuadro_05_en.mp3', text: 'Moving on to Player Statistics. Analyse each player\'s individual performance: goals, assists, minutes played and cards. Apply filters by team, position or season.' },
  { file: 'cuadro_06_en.mp3', text: 'You also have Team Statistics. Evaluate collective performance, view standings, results and season trends to make better tactical decisions.' },
  { file: 'cuadro_07_en.mp3', text: 'Next, Training. Coaches can already create and manage their sessions from the app. Very soon the club will also have a full summary of all training activity right here.' },
  { file: 'cuadro_08_en.mp3', text: 'Now the Calendar. View all club activity in one place: matches, training sessions and events laid out clearly. Create or edit any entry from the monthly or weekly view.' },
  { file: 'cuadro_09_en.mp3', text: 'You\'ll also find Injuries. Coaches can already record and manage player absences from the app. Soon the club will have a centralised summary of all injury statuses here.' },
  { file: 'cuadro_10_en.mp3', text: 'Now look at the right panel. Here you have Club Results: the score and outcome of each match — win, draw or defeat. Tap on any one to see the full details or update the scoreline.' },
  { file: 'cuadro_11_en.mp3', text: 'On the right you have Today\'s Training. At a glance you can see which teams are training and at what time, and the timeline shows you where you are in the day relative to the scheduled sessions.' },
  { file: 'cuadro_12_en.mp3', text: 'And to close this panel, Upcoming Matches. Get ahead of the club\'s commitments by checking the date, time and opponent, and tap any match to access the squad list or prepare your pre-match analysis.' },
  { file: 'cuadro_13_en.mp3', text: 'You now have full command of the control centre. Use the left panel to dive deeper into any module, and always keep an eye on the right side to stay on top of results and upcoming matches.' },
];

// ── Cuadro de mandos — FR ─────────────────────────────────────────────────────
const STEPS_CUADRO_FR = [
  { file: 'cuadro_01_fr.mp3', text: 'Vous êtes dans le centre de contrôle de votre club. À gauche vous avez l\'accès rapide aux joueurs, entraîneurs, statistiques et calendrier. À droite, le résumé en temps réel : résultats, entraînements du jour et prochains matchs. Nous vous guidons étape par étape.' },
  { file: 'cuadro_03_fr.mp3', text: 'Commençons par le panneau gauche. Voici Info joueurs, où vous accédez au répertoire complet du club. Consultez les fiches individuelles avec données personnelles, statistiques, historique des blessures, paiements et documentation.' },
  { file: 'cuadro_04_fr.mp3', text: 'Ensuite, Info entraîneurs. Consultez et gérez tout le staff technique du club : liste des entraîneurs, leur affectation à chaque équipe et leurs coordonnées, le tout au même endroit.' },
  { file: 'cuadro_05_fr.mp3', text: 'Passons aux Statistiques des joueurs. Analysez les performances individuelles de chaque joueur : buts, passes décisives, minutes jouées et cartons. Appliquez des filtres par équipe, poste ou saison.' },
  { file: 'cuadro_06_fr.mp3', text: 'Vous avez également les Statistiques par équipe. Évaluez les performances collectives, visualisez les classements, résultats et tendances par saison pour prendre de meilleures décisions tactiques.' },
  { file: 'cuadro_07_fr.mp3', text: 'Passons aux Entraînements. Les entraîneurs peuvent déjà créer et gérer leurs séances depuis l\'application. Très bientôt le club disposera ici d\'un résumé complet de toute l\'activité d\'entraînement.' },
  { file: 'cuadro_08_fr.mp3', text: 'Continuons avec le Calendrier. Visualisez toute l\'activité du club en un seul endroit : matchs, entraînements et événements organisés clairement. Créez ou modifiez n\'importe quelle entrée depuis la vue mensuelle ou hebdomadaire.' },
  { file: 'cuadro_09_fr.mp3', text: 'Vous trouverez également les Blessures. Les entraîneurs peuvent déjà enregistrer et gérer les absences de leurs joueurs depuis l\'application. Bientôt le club disposera ici d\'un résumé centralisé de l\'état de toutes les blessures.' },
  { file: 'cuadro_10_fr.mp3', text: 'Regardez maintenant le panneau droit. Voici les Résultats du club : score et résultat de chaque match — victoire, nul ou défaite. Appuyez sur l\'un d\'eux pour voir le détail complet ou mettre à jour le score.' },
  { file: 'cuadro_11_fr.mp3', text: 'À droite vous avez les Entraînements du jour. En un coup d\'œil vous voyez quelles équipes s\'entraînent et à quelle heure, et la ligne de temps vous indique où vous en êtes dans la journée par rapport aux séances programmées.' },
  { file: 'cuadro_12_fr.mp3', text: 'Et pour clore ce panneau, les Prochains matchs. Anticipez les engagements du club en consultant date, heure et adversaire, et appuyez sur n\'importe quel match pour accéder à la convocation ou préparer l\'analyse d\'avant-match.' },
  { file: 'cuadro_13_fr.mp3', text: 'Vous maîtrisez maintenant le tableau de bord. Utilisez le panneau gauche pour approfondir n\'importe quel module et gardez toujours un œil sur le côté droit pour rester informé des résultats et des prochains matchs.' },
];

// ── Cuadro de mandos — DE ─────────────────────────────────────────────────────
const STEPS_CUADRO_DE = [
  { file: 'cuadro_01_de.mp3', text: 'Sie befinden sich in der Kommandozentrale Ihres Vereins. Links haben Sie schnellen Zugriff auf Spieler, Trainer, Statistiken und Kalender. Rechts die Echtzeit-Übersicht: Ergebnisse, heutige Trainingseinheiten und bevorstehende Spiele. Wir führen Sie Schritt für Schritt.' },
  { file: 'cuadro_03_de.mp3', text: 'Beginnen wir mit dem linken Panel. Hier haben Sie Spieler-Info, wo Sie auf das vollständige Vereinsverzeichnis zugreifen. Prüfen Sie individuelle Profile mit persönlichen Daten, Statistiken, Verletzungshistorie, Zahlungen und Dokumentation.' },
  { file: 'cuadro_04_de.mp3', text: 'Als nächstes, Trainer-Info. Konsultieren und verwalten Sie den gesamten Trainerstab des Vereins: Liste der Trainer, ihre Teamzuweisungen und Kontaktdaten, alles an einem einzigen Ort.' },
  { file: 'cuadro_05_de.mp3', text: 'Weiter zu Spielerstatistiken. Analysieren Sie die Einzelleistung jedes Spielers: Tore, Assists, gespielte Minuten und Karten. Wenden Sie Filter nach Team, Position oder Saison an.' },
  { file: 'cuadro_06_de.mp3', text: 'Sie haben auch Teamstatistiken. Bewerten Sie die Gesamtleistung, visualisieren Sie Tabellen, Ergebnisse und Saisontrends, um bessere taktische Entscheidungen zu treffen.' },
  { file: 'cuadro_07_de.mp3', text: 'Weiter zu Training. Trainer können bereits Einheiten über die App erstellen und verwalten. Bald wird der Verein hier auch eine vollständige Übersicht aller Trainingsaktivitäten erhalten.' },
  { file: 'cuadro_08_de.mp3', text: 'Nun der Kalender. Visualisieren Sie alle Vereinsaktivitäten an einem einzigen Ort: Spiele, Trainingseinheiten und Events übersichtlich angeordnet. Erstellen oder bearbeiten Sie jeden Eintrag aus der Monats- oder Wochenansicht.' },
  { file: 'cuadro_09_de.mp3', text: 'Sie finden auch Verletzungen. Trainer können bereits Spielerausfälle über die App erfassen und verwalten. Bald wird der Verein hier eine zentrale Übersicht aller Verletzungsstände haben.' },
  { file: 'cuadro_10_de.mp3', text: 'Schauen Sie jetzt auf das rechte Panel. Hier haben Sie Vereinsergebnisse: Spielstand und Ergebnis jedes Matches — Sieg, Unentschieden oder Niederlage. Tippen Sie auf eines, um alle Details einzusehen oder den Spielstand zu aktualisieren.' },
  { file: 'cuadro_11_de.mp3', text: 'Rechts haben Sie Heutige Trainingseinheiten. Auf einen Blick sehen Sie, welche Teams trainieren und zu welcher Uhrzeit, und die Zeitleiste zeigt Ihnen, wo Sie sich im Tagesverlauf relativ zu den geplanten Einheiten befinden.' },
  { file: 'cuadro_12_de.mp3', text: 'Und zum Abschluss dieses Panels, Bevorstehende Spiele. Bereiten Sie sich auf die Vereinstermine vor, indem Sie Datum, Uhrzeit und Gegner prüfen, und tippen Sie auf ein Spiel, um auf den Kader zuzugreifen oder die Voranalyse vorzubereiten.' },
  { file: 'cuadro_13_de.mp3', text: 'Sie beherrschen jetzt das Kontrollzentrum. Nutzen Sie das linke Panel, um tiefer in jedes Modul einzutauchen, und behalten Sie immer das rechte Panel im Blick, um über Ergebnisse und bevorstehende Spiele informiert zu bleiben.' },
];

// ── Cuadro de mandos — PT ─────────────────────────────────────────────────────
const STEPS_CUADRO_PT = [
  { file: 'cuadro_01_pt.mp3', text: 'Está no centro de controlo do seu clube. À esquerda tem acesso rápido a jogadores, treinadores, estatísticas e calendário. À direita, o resumo em tempo real: resultados, treinos do dia e próximos jogos. Guiamo-lo passo a passo.' },
  { file: 'cuadro_03_pt.mp3', text: 'Comecemos pelo painel esquerdo. Aqui tem Informação de Jogadores, onde acede ao diretório completo do clube. Consulte fichas individuais com dados pessoais, estatísticas, historial de lesões, pagamentos e documentação.' },
  { file: 'cuadro_04_pt.mp3', text: 'A seguir, Informação de Treinadores. Consulte e gira toda a equipa técnica do clube: lista de treinadores, a sua afetação a cada equipa e os seus contactos, tudo num só lugar.' },
  { file: 'cuadro_05_pt.mp3', text: 'Passamos a Estatísticas de Jogadores. Analise o desempenho individual de cada jogador: golos, assistências, minutos jogados e cartões. Aplique filtros por equipa, posição ou época.' },
  { file: 'cuadro_06_pt.mp3', text: 'Tem também Estatísticas por Equipa. Avalie o desempenho coletivo, visualize classificações, resultados e tendências por época para tomar melhores decisões táticas.' },
  { file: 'cuadro_07_pt.mp3', text: 'Passamos a Treinos. Os treinadores já podem criar e gerir as suas sessões pela app. Em breve o clube terá aqui um resumo completo de toda a atividade de treino.' },
  { file: 'cuadro_08_pt.mp3', text: 'Continuamos com o Calendário. Visualize toda a atividade do clube num só lugar: jogos, treinos e eventos organizados de forma clara. Crie ou edite qualquer entrada na vista mensal ou semanal.' },
  { file: 'cuadro_09_pt.mp3', text: 'Encontrará também Lesões. Os treinadores já podem registar e gerir as baixas dos seus jogadores pela app. Em breve o clube terá aqui um resumo centralizado do estado de todas as lesões.' },
  { file: 'cuadro_10_pt.mp3', text: 'Olhe agora para o painel direito. Aqui tem os Resultados do clube: marcador e resultado de cada jogo — vitória, empate ou derrota. Toque em qualquer um para ver o detalhe completo ou atualizar o marcador.' },
  { file: 'cuadro_11_pt.mp3', text: 'À direita tem os Treinos de Hoje. De um relance vê quais as equipas que treinam e a que horas, e a linha de tempo indica-lhe em que momento do dia se encontra relativamente aos treinos programados.' },
  { file: 'cuadro_12_pt.mp3', text: 'E para fechar este painel, os Próximos Jogos. Antecipe os compromissos do clube consultando data, hora e adversário, e toque em qualquer jogo para aceder à convocatória ou preparar a análise prévia.' },
  { file: 'cuadro_13_pt.mp3', text: 'Agora domina o painel de controlo. Use o painel esquerdo para aprofundar qualquer módulo e mantenha sempre um olho no lado direito para estar a par dos resultados e dos próximos jogos.' },
];

// ── Cuadro de mandos — IT ─────────────────────────────────────────────────────
const STEPS_CUADRO_IT = [
  { file: 'cuadro_01_it.mp3', text: 'Sei nel centro di comando del tuo club. A sinistra hai l\'accesso rapido a giocatori, allenatori, statistiche e calendario. A destra, il riepilogo in tempo reale: risultati, allenamenti del giorno e prossime partite. Ti guidiamo passo a passo.' },
  { file: 'cuadro_03_it.mp3', text: 'Iniziamo dal pannello sinistro. Qui hai Info giocatori, dove accedi alla rubrica completa del club. Consulta le schede individuali con dati personali, statistiche, storico degli infortuni, pagamenti e documentazione.' },
  { file: 'cuadro_04_it.mp3', text: 'A seguire, Info allenatori. Consulta e gestisci tutto lo staff tecnico del club: elenco degli allenatori, la loro assegnazione a ogni squadra e i loro contatti, tutto in un unico posto.' },
  { file: 'cuadro_05_it.mp3', text: 'Passiamo alle Statistiche giocatori. Analizza le prestazioni individuali di ogni giocatore: gol, assist, minuti giocati e cartellini. Applica filtri per squadra, ruolo o stagione.' },
  { file: 'cuadro_06_it.mp3', text: 'Hai anche le Statistiche per squadra. Valuta le prestazioni collettive, visualizza classifiche, risultati e tendenze stagionali per prendere decisioni tattiche migliori.' },
  { file: 'cuadro_07_it.mp3', text: 'Passiamo agli Allenamenti. Gli allenatori possono già creare e gestire le loro sessioni dall\'app. Presto il club avrà qui un riepilogo completo di tutta l\'attività di allenamento.' },
  { file: 'cuadro_08_it.mp3', text: 'Continuiamo con il Calendario. Visualizza tutta l\'attività del club in un unico posto: partite, allenamenti ed eventi organizzati in modo chiaro. Crea o modifica qualsiasi voce dalla vista mensile o settimanale.' },
  { file: 'cuadro_09_it.mp3', text: 'Troverai anche Infortuni. Gli allenatori possono già registrare e gestire le assenze dei giocatori dall\'app. Presto il club avrà qui un riepilogo centralizzato di tutti gli stati di infortunio.' },
  { file: 'cuadro_10_it.mp3', text: 'Guarda ora il pannello destro. Qui hai i Risultati del club: punteggio e risultato di ogni partita — vittoria, pareggio o sconfitta. Tocca qualsiasi voce per vedere il dettaglio completo o aggiornare il punteggio.' },
  { file: 'cuadro_11_it.mp3', text: 'A destra hai gli Allenamenti di oggi. A colpo d\'occhio vedi quali squadre si allenano e a che ora, e la linea temporale ti indica in quale momento della giornata ti trovi rispetto alle sessioni programmate.' },
  { file: 'cuadro_12_it.mp3', text: 'E per chiudere questo pannello, le Prossime partite. Anticipa gli impegni del club controllando data, ora e avversario, e tocca qualsiasi partita per accedere alla convocazione o preparare l\'analisi pre-partita.' },
  { file: 'cuadro_13_it.mp3', text: 'Ora padroneggi il pannello di controllo. Usa il pannello sinistro per approfondire qualsiasi modulo e tieni sempre un occhio sul lato destro per restare aggiornato su risultati e prossime partite.' },
];

// ── Info Jugadores — EN ───────────────────────────────────────────────────────
const STEPS_IJ_EN = [
  { file: 'ij_01_en.mp3', text: 'This screen lets you consult and manage each club player\'s profile: personal data, parent information, ID document, attached documents and assigned team. You can move players between teams, change the season, export to Excel and customise visible columns. Follow the steps to get the most out of it.' },
  { file: 'ij_03_en.mp3', text: 'Here you can consult the AI Assistant about the player list using anonymised data: distribution by position, by team, positions with gaps, players without a squad number, and much more. Tap to open the panel.' },
  { file: 'ij_04_en.mp3', text: 'The top toolbar has all the controls: search by name or data, filter by team, export the table to Excel and customise the visible fields with Custom Fields.' },
  { file: 'ij_05_en.mp3', text: 'Here you see the full player table. Each row shows the photo, name, team with options to move or change season, date of birth, phone, ID document, attachments, parent or guardian data and IBAN.' },
  { file: 'ij_06_en.mp3', text: 'Clicking on a player\'s name opens their full profile: personal information, financial data if applicable, documents, ID and custom fields. Use it to review or edit any detail.' },
  { file: 'ij_07_en.mp3', text: 'The AI Assistant panel includes quick suggestions, message history and a query area. Type your question and press Enter to send; Shift plus Enter to add a new line.' },
  { file: 'ij_08_en.mp3', text: 'You\'ve now mastered Player Info. Use the search and filters, export to Excel, customise columns and click any name to open the full profile whenever you need it.' },
];

// ── Info Jugadores — FR ───────────────────────────────────────────────────────
const STEPS_IJ_FR = [
  { file: 'ij_01_fr.mp3', text: 'Sur cet écran, vous consultez et gérez le profil de chaque joueur du club : données personnelles, parent, pièce d\'identité, documents et équipe assignée. Vous pouvez déplacer des joueurs entre équipes, changer de saison, exporter en Excel et personnaliser les colonnes. Suivez les étapes pour ne rien manquer.' },
  { file: 'ij_03_fr.mp3', text: 'Ici, vous pouvez consulter l\'Assistant IA sur la liste des joueurs avec des données anonymisées : répartition par poste, par équipe, postes en déficit, joueurs sans numéro et bien plus encore. Appuyez pour ouvrir le panneau.' },
  { file: 'ij_04_fr.mp3', text: 'La barre d\'outils en haut contient tous les contrôles : recherchez par nom ou données, filtrez par équipe, exportez la table en Excel et personnalisez les champs visibles avec Champs personnalisés.' },
  { file: 'ij_05_fr.mp3', text: 'Voici le tableau complet des joueurs. Chaque ligne affiche la photo, le nom, l\'équipe avec options de déplacement ou changement de saison, la date de naissance, le téléphone, la pièce d\'identité, les documents, les données du parent et l\'IBAN.' },
  { file: 'ij_06_fr.mp3', text: 'En cliquant sur le nom d\'un joueur, sa fiche complète s\'ouvre : informations personnelles, données financières si applicable, documents, pièce d\'identité et champs personnalisés. Utilisez-la pour consulter ou modifier n\'importe quelle donnée.' },
  { file: 'ij_07_fr.mp3', text: 'Le panneau de l\'Assistant IA inclut des suggestions rapides, l\'historique des messages et une zone de requête. Tapez votre question et appuyez sur Entrée pour envoyer ; Maj plus Entrée pour ajouter une nouvelle ligne.' },
  { file: 'ij_08_fr.mp3', text: 'Vous maîtrisez maintenant Info Joueurs. Utilisez la recherche et les filtres, exportez en Excel, personnalisez les colonnes et cliquez sur n\'importe quel nom pour voir la fiche complète quand vous en avez besoin.' },
];

// ── Info Jugadores — DE ───────────────────────────────────────────────────────
const STEPS_IJ_DE = [
  { file: 'ij_01_de.mp3', text: 'In diesem Bildschirm können Sie das Profil jedes Vereinsspielers einsehen und verwalten: persönliche Daten, Elternteil, Ausweis, Dokumente und zugewiesenes Team. Sie können Spieler zwischen Teams verschieben, die Saison wechseln, nach Excel exportieren und sichtbare Spalten anpassen. Folgen Sie den Schritten, um nichts zu verpassen.' },
  { file: 'ij_03_de.mp3', text: 'Hier können Sie den KI-Assistenten zum Spielerverzeichnis mit anonymisierten Daten befragen: Verteilung nach Position, nach Team, Positionen mit Lücken, Spieler ohne Rückennummer und vieles mehr. Tippen Sie, um das Panel zu öffnen.' },
  { file: 'ij_04_de.mp3', text: 'Die obere Symbolleiste enthält alle Steuerelemente: Suchen Sie nach Name oder Daten, filtern Sie nach Team, exportieren Sie die Tabelle nach Excel und passen Sie die sichtbaren Felder mit Benutzerdefinierte Felder an.' },
  { file: 'ij_05_de.mp3', text: 'Hier sehen Sie die vollständige Spielertabelle. Jede Zeile zeigt Foto, Name, Team mit Optionen zum Verschieben oder Saisonwechsel, Geburtsdatum, Telefon, Ausweis, Dokumente, Elterndaten und IBAN.' },
  { file: 'ij_06_de.mp3', text: 'Durch Klicken auf den Namen eines Spielers öffnet sich sein vollständiges Profil: persönliche Informationen, Finanzdaten falls zutreffend, Dokumente, Ausweis und benutzerdefinierte Felder. Nutzen Sie es, um alle Daten einzusehen oder zu bearbeiten.' },
  { file: 'ij_07_de.mp3', text: 'Das KI-Assistenten-Panel enthält schnelle Vorschläge, den Nachrichtenverlauf und einen Eingabebereich. Geben Sie Ihre Frage ein und drücken Sie die Eingabetaste zum Senden; Umschalt plus Eingabe für eine neue Zeile.' },
  { file: 'ij_08_de.mp3', text: 'Sie beherrschen jetzt Spieler-Info. Nutzen Sie Suche und Filter, exportieren Sie nach Excel, passen Sie Spalten an und klicken Sie auf einen Namen, um das vollständige Profil anzuzeigen, wann immer Sie es benötigen.' },
];

// ── Info Jugadores — PT ───────────────────────────────────────────────────────
const STEPS_IJ_PT = [
  { file: 'ij_01_pt.mp3', text: 'Neste ecrã consulta e gere o perfil de cada jogador do clube: dados pessoais, pai ou mãe, documento de identidade, documentos e equipa atribuída. Pode mover jogadores entre equipas, mudar de época, exportar para Excel e personalizar colunas. Siga os passos para não perder nada.' },
  { file: 'ij_03_pt.mp3', text: 'Aqui pode consultar o Assistente IA sobre a lista de jogadores com dados anonimizados: distribuição por posição, por equipa, posições em défice, jogadores sem número e muito mais. Toque para abrir o painel.' },
  { file: 'ij_04_pt.mp3', text: 'A barra de ferramentas superior tem todos os controlos: pesquise por nome ou dados, filtre por equipa, exporte a tabela para Excel e personalize os campos visíveis com Campos personalizados.' },
  { file: 'ij_05_pt.mp3', text: 'Aqui vê a tabela completa de jogadores. Cada linha mostra foto, nome, equipa com opções de mover ou mudar de época, data de nascimento, telefone, documento de identidade, documentos, dados do pai ou mãe e IBAN.' },
  { file: 'ij_06_pt.mp3', text: 'Ao clicar no nome de um jogador abre-se a sua ficha completa: informações pessoais, dados financeiros se aplicável, documentos, documento de identidade e campos personalizados. Use-a para consultar ou editar qualquer dado.' },
  { file: 'ij_07_pt.mp3', text: 'O painel do Assistente IA inclui sugestões rápidas, histórico de mensagens e uma área de consulta. Escreva a sua pergunta e prima Enter para enviar; Shift mais Enter para adicionar uma nova linha.' },
  { file: 'ij_08_pt.mp3', text: 'Já domina Info Jogadores. Use a pesquisa e os filtros, exporte para Excel, personalize colunas e clique em qualquer nome para ver a ficha completa quando precisar.' },
];

// ── Info Jugadores — IT ───────────────────────────────────────────────────────
const STEPS_IJ_IT = [
  { file: 'ij_01_it.mp3', text: 'In questa schermata consulti e gestisci il profilo di ogni giocatore del club: dati personali, genitore, documento d\'identità, documenti e squadra assegnata. Puoi spostare giocatori tra squadre, cambiare stagione, esportare in Excel e personalizzare le colonne visibili. Segui i passaggi per non perdere nulla.' },
  { file: 'ij_03_it.mp3', text: 'Qui puoi consultare l\'Assistente IA sulla lista dei giocatori con dati anonimizzati: distribuzione per ruolo, per squadra, ruoli con deficit, giocatori senza numero di maglia e molto altro. Tocca per aprire il pannello.' },
  { file: 'ij_04_it.mp3', text: 'La barra degli strumenti in alto contiene tutti i controlli: cerca per nome o dati, filtra per squadra, esporta la tabella in Excel e personalizza i campi visibili con Campi personalizzati.' },
  { file: 'ij_05_it.mp3', text: 'Qui vedi la tabella completa dei giocatori. Ogni riga mostra foto, nome, squadra con opzioni per spostare o cambiare stagione, data di nascita, telefono, documento d\'identità, documenti, dati del genitore e IBAN.' },
  { file: 'ij_06_it.mp3', text: 'Cliccando sul nome di un giocatore si apre la sua scheda completa: informazioni personali, dati finanziari se applicabile, documenti, documento d\'identità e campi personalizzati. Usala per consultare o modificare qualsiasi dato.' },
  { file: 'ij_07_it.mp3', text: 'Il pannello dell\'Assistente IA include suggerimenti rapidi, cronologia dei messaggi e un\'area di interrogazione. Digita la tua domanda e premi Invio per inviare; Shift più Invio per aggiungere una nuova riga.' },
  { file: 'ij_08_it.mp3', text: 'Ora padroneggi Info Giocatori. Usa la ricerca e i filtri, esporta in Excel, personalizza le colonne e clicca su qualsiasi nome per vedere la scheda completa quando ne hai bisogno.' },
];

// ── Info Entrenadores — EN ────────────────────────────────────────────────────
const STEPS_IE_EN = [
  { file: 'ie_01_en.mp3', text: 'This screen lets you consult and manage each club coach\'s profile: personal data, role, assigned teams, mandatory certificates, documents and sports history. Follow the steps to get the most out of it.' },
  { file: 'ie_03_en.mp3', text: 'Here you can consult the AI Assistant about the coaching staff using anonymised data: total coaches, teams with an assigned coach, profile distribution and teams without a coach. Tap to open the panel.' },
  { file: 'ie_04_en.mp3', text: 'The top toolbar lets you select the season, search by name, filter by team, export to Excel and configure the custom fields you want to see in the table.' },
  { file: 'ie_05_en.mp3', text: 'Here you see the coaches table with sortable columns: name, role, teams, email, phone, ID, certificates, documents and custom fields. Click on a coach\'s name to open their full profile.' },
  { file: 'ie_06_en.mp3', text: 'The AI Assistant panel includes coaching staff suggestions, message history and a query area for more specific questions about your coaches.' },
  { file: 'ie_07_en.mp3', text: 'You\'ve now mastered Coach Info. Sort by any column, open a profile by clicking the name and use the AI panel for coaching staff analysis whenever you need it.' },
];

// ── Info Entrenadores — FR ────────────────────────────────────────────────────
const STEPS_IE_FR = [
  { file: 'ie_01_fr.mp3', text: 'Sur cet écran, vous consultez et gérez le profil de chaque entraîneur du club : données personnelles, rôle, équipes assignées, certificats obligatoires, documents et historique sportif. Suivez les étapes pour ne rien manquer.' },
  { file: 'ie_03_fr.mp3', text: 'Ici, vous pouvez consulter l\'Assistant IA sur le corps technique avec des données anonymisées : total d\'entraîneurs, équipes avec entraîneur assigné, répartition des profils et équipes sans entraîneur. Appuyez pour ouvrir le panneau.' },
  { file: 'ie_04_fr.mp3', text: 'La barre d\'outils en haut permet de sélectionner la saison, rechercher par nom, filtrer par équipe, exporter en Excel et configurer les champs personnalisés à afficher dans le tableau.' },
  { file: 'ie_05_fr.mp3', text: 'Voici le tableau des entraîneurs avec des colonnes triables : nom, rôle, équipes, email, téléphone, pièce d\'identité, certificats, documents et champs personnalisés. Cliquez sur le nom d\'un entraîneur pour ouvrir sa fiche complète.' },
  { file: 'ie_06_fr.mp3', text: 'Le panneau de l\'Assistant IA inclut des suggestions sur le corps technique, l\'historique des messages et une zone de requête pour des questions plus spécifiques sur vos entraîneurs.' },
  { file: 'ie_07_fr.mp3', text: 'Vous maîtrisez maintenant Info Entraîneurs. Triez par n\'importe quelle colonne, ouvrez une fiche en cliquant sur le nom et utilisez le panneau IA pour l\'analyse du corps technique quand vous en avez besoin.' },
];

// ── Info Entrenadores — DE ────────────────────────────────────────────────────
const STEPS_IE_DE = [
  { file: 'ie_01_de.mp3', text: 'In diesem Bildschirm können Sie das Profil jedes Vereinstrainers einsehen und verwalten: persönliche Daten, Rolle, zugewiesene Teams, Pflichtlizenzen, Dokumente und Sporthistorie. Folgen Sie den Schritten, um alles kennenzulernen.' },
  { file: 'ie_03_de.mp3', text: 'Hier können Sie den KI-Assistenten zum Trainerstab mit anonymisierten Daten befragen: Gesamtanzahl der Trainer, Teams mit zugewiesenem Trainer, Profilverteilung und Teams ohne Trainer. Tippen Sie, um das Panel zu öffnen.' },
  { file: 'ie_04_de.mp3', text: 'Die obere Symbolleiste ermöglicht die Auswahl der Saison, Suche nach Name, Filterung nach Team, Excel-Export und die Konfiguration der benutzerdefinierten Felder in der Tabelle.' },
  { file: 'ie_05_de.mp3', text: 'Hier sehen Sie die Trainertabelle mit sortierbaren Spalten: Name, Rolle, Teams, E-Mail, Telefon, Ausweis, Zertifikate, Dokumente und benutzerdefinierte Felder. Klicken Sie auf den Namen eines Trainers, um sein vollständiges Profil zu öffnen.' },
  { file: 'ie_06_de.mp3', text: 'Das KI-Assistenten-Panel enthält Vorschläge zum Trainerstab, den Nachrichtenverlauf und einen Eingabebereich für spezifischere Fragen zu Ihren Trainern.' },
  { file: 'ie_07_de.mp3', text: 'Sie beherrschen jetzt Trainer-Info. Sortieren Sie nach beliebiger Spalte, öffnen Sie ein Profil durch Klick auf den Namen und nutzen Sie das KI-Panel für die Trainerstab-Analyse, wann immer Sie es benötigen.' },
];

// ── Info Entrenadores — PT ────────────────────────────────────────────────────
const STEPS_IE_PT = [
  { file: 'ie_01_pt.mp3', text: 'Neste ecrã consulta e gere o perfil de cada treinador do clube: dados pessoais, função, equipas atribuídas, certificados obrigatórios, documentos e historial desportivo. Siga os passos para conhecer tudo.' },
  { file: 'ie_03_pt.mp3', text: 'Aqui pode consultar o Assistente IA sobre o corpo técnico com dados anonimizados: total de treinadores, equipas com treinador atribuído, distribuição de perfis e equipas sem treinador. Toque para abrir o painel.' },
  { file: 'ie_04_pt.mp3', text: 'A barra de ferramentas superior permite selecionar a época, pesquisar por nome, filtrar por equipa, exportar para Excel e configurar os campos personalizados a mostrar na tabela.' },
  { file: 'ie_05_pt.mp3', text: 'Aqui vê a tabela de treinadores com colunas ordenáveis: nome, função, equipas, email, telefone, documento de identidade, certificados, documentos e campos personalizados. Clique no nome de um treinador para abrir a sua ficha completa.' },
  { file: 'ie_06_pt.mp3', text: 'O painel do Assistente IA inclui sugestões sobre o corpo técnico, histórico de mensagens e uma área de consulta para perguntas mais específicas sobre os seus treinadores.' },
  { file: 'ie_07_pt.mp3', text: 'Já domina Info Treinadores. Ordene por qualquer coluna, abra uma ficha clicando no nome e use o painel IA para análise do corpo técnico quando precisar.' },
];

// ── Info Entrenadores — IT ────────────────────────────────────────────────────
const STEPS_IE_IT = [
  { file: 'ie_01_it.mp3', text: 'In questa schermata consulti e gestisci il profilo di ogni allenatore del club: dati personali, ruolo, squadre assegnate, certificati obbligatori, documenti e storico sportivo. Segui i passaggi per scoprire tutto.' },
  { file: 'ie_03_it.mp3', text: 'Qui puoi consultare l\'Assistente IA sullo staff tecnico con dati anonimizzati: totale degli allenatori, squadre con allenatore assegnato, distribuzione dei profili e squadre senza allenatore. Tocca per aprire il pannello.' },
  { file: 'ie_04_it.mp3', text: 'La barra degli strumenti in alto consente di selezionare la stagione, cercare per nome, filtrare per squadra, esportare in Excel e configurare i campi personalizzati da visualizzare nella tabella.' },
  { file: 'ie_05_it.mp3', text: 'Qui vedi la tabella degli allenatori con colonne ordinabili: nome, ruolo, squadre, email, telefono, documento d\'identità, certificati, documenti e campi personalizzati. Clicca sul nome di un allenatore per aprire la sua scheda completa.' },
  { file: 'ie_06_it.mp3', text: 'Il pannello dell\'Assistente IA include suggerimenti sullo staff tecnico, cronologia dei messaggi e un\'area di interrogazione per domande più specifiche sui tuoi allenatori.' },
  { file: 'ie_07_it.mp3', text: 'Ora padroneggi Info Allenatori. Ordina per qualsiasi colonna, apri una scheda cliccando sul nome e usa il pannello IA per l\'analisi dello staff tecnico quando ne hai bisogno.' },
];

// ── Estadísticas Jugadores Club — EN ─────────────────────────────────────────
const STEPS_EJ_EN = [
  { file: 'ej_01_en.mp3', text: 'This screen shows you the performance metrics for all club players: matches played, minutes, goals, assists, penalties and cards. All columns are sortable and there is an AI query panel. Let us guide you step by step.' },
  { file: 'ej_03_en.mp3', text: 'For deeper analysis, open the AI panel and ask about the club\'s top scorer, the assists chart, players with the most cards or the average minutes per match. Tap here to open it.' },
  { file: 'ej_04_en.mp3', text: 'Here you have the statistics table with sortable columns: name, team, position, matches, total minutes, average per match, goals, assists, penalties, free kicks and cards. Click on any column header to sort.' },
  { file: 'ej_05_en.mp3', text: 'If there are many players, use the pagination to change the page size and navigate between pages with the forward and back buttons.' },
  { file: 'ej_06_en.mp3', text: 'The AI Assistant panel includes suggestions about top scorers, assists, performance, cards and comparisons. Type your query or use the suggestions directly.' },
  { file: 'ej_07_en.mp3', text: 'You\'ve now mastered player statistics. Sort by any metric to find the best performances and use the AI panel for more detailed analysis whenever you need it.' },
];

// ── Estadísticas Jugadores Club — FR ─────────────────────────────────────────
const STEPS_EJ_FR = [
  { file: 'ej_01_fr.mp3', text: 'Cet écran affiche les métriques de performance de tous les joueurs du club : matchs joués, minutes, buts, passes décisives, pénaltys et cartons. Toutes les colonnes sont triables et un panneau de requêtes IA est disponible. Suivez-nous pas à pas.' },
  { file: 'ej_03_fr.mp3', text: 'Pour des analyses plus approfondies, ouvrez le panneau IA et demandez le meilleur buteur du club, le graphique des passes décisives, les joueurs avec le plus de cartons ou la moyenne de minutes par match. Appuyez ici pour l\'ouvrir.' },
  { file: 'ej_04_fr.mp3', text: 'Voici le tableau de statistiques avec des colonnes triables : nom, équipe, position, matchs, minutes totales, moyenne par match, buts, passes décisives, pénaltys, coups francs et cartons. Cliquez sur l\'en-tête d\'une colonne pour trier.' },
  { file: 'ej_05_fr.mp3', text: 'S\'il y a beaucoup de joueurs, utilisez la pagination pour changer la taille de page et naviguer entre les pages avec les boutons suivant et précédent.' },
  { file: 'ej_06_fr.mp3', text: 'Le panneau de l\'Assistant IA inclut des suggestions sur les buteurs, les passes décisives, les performances, les cartons et les comparatifs. Tapez votre requête ou utilisez les suggestions directement.' },
  { file: 'ej_07_fr.mp3', text: 'Vous maîtrisez maintenant les statistiques des joueurs. Triez par n\'importe quelle métrique pour trouver les meilleures performances et utilisez le panneau IA pour des analyses plus détaillées quand vous en avez besoin.' },
];

// ── Estadísticas Jugadores Club — DE ─────────────────────────────────────────
const STEPS_EJ_DE = [
  { file: 'ej_01_de.mp3', text: 'Dieser Bildschirm zeigt die Leistungsmetriken aller Vereinsspieler: gespielte Spiele, Minuten, Tore, Torvorlagen, Elfmeter und Karten. Alle Spalten sind sortierbar und es gibt ein KI-Abfragepanel. Wir führen Sie Schritt für Schritt.' },
  { file: 'ej_03_de.mp3', text: 'Für tiefere Analysen öffnen Sie das KI-Panel und fragen Sie nach dem besten Torschützen, der Vorlagengrafik, den Spielern mit den meisten Karten oder dem Minuten-Durchschnitt pro Spiel. Tippen Sie hier, um es zu öffnen.' },
  { file: 'ej_04_de.mp3', text: 'Hier haben Sie die Statistiktabelle mit sortierbaren Spalten: Name, Team, Position, Spiele, Gesamtminuten, Durchschnitt pro Spiel, Tore, Vorlagen, Elfmeter, Freistöße und Karten. Klicken Sie auf eine Spaltenüberschrift zum Sortieren.' },
  { file: 'ej_05_de.mp3', text: 'Bei vielen Spielern nutzen Sie die Seitennavigation, um die Seitengröße zu ändern und mit den Vor- und Zurück-Schaltflächen zwischen den Seiten zu wechseln.' },
  { file: 'ej_06_de.mp3', text: 'Das KI-Assistenten-Panel enthält Vorschläge zu Torschützen, Vorlagen, Leistung, Karten und Vergleichen. Geben Sie Ihre Abfrage ein oder verwenden Sie die Vorschläge direkt.' },
  { file: 'ej_07_de.mp3', text: 'Sie beherrschen jetzt die Spielerstatistiken. Sortieren Sie nach jeder Metrik, um die besten Leistungen zu finden, und nutzen Sie das KI-Panel für detailliertere Analysen, wann immer Sie es benötigen.' },
];

// ── Estadísticas Jugadores Club — PT ─────────────────────────────────────────
const STEPS_EJ_PT = [
  { file: 'ej_01_pt.mp3', text: 'Este ecrã mostra as métricas de desempenho de todos os jogadores do clube: partidas jogadas, minutos, golos, assistências, penáltis e cartões. Todas as colunas são ordenáveis e há um painel de consultas com IA. Guiamo-lo passo a passo.' },
  { file: 'ej_03_pt.mp3', text: 'Para análises mais profundas, abra o painel IA e pergunte sobre o melhor marcador do clube, o gráfico de assistências, os jogadores com mais cartões ou a média de minutos por partida. Toque aqui para o abrir.' },
  { file: 'ej_04_pt.mp3', text: 'Aqui tem a tabela de estatísticas com colunas ordenáveis: nome, equipa, posição, partidas, minutos totais, média por partida, golos, assistências, penáltis, livres e cartões. Clique no cabeçalho de qualquer coluna para ordenar.' },
  { file: 'ej_05_pt.mp3', text: 'Se houver muitos jogadores, use a paginação para alterar o tamanho da página e navegar entre páginas com os botões seguinte e anterior.' },
  { file: 'ej_06_pt.mp3', text: 'O painel do Assistente IA inclui sugestões sobre marcadores, assistências, desempenho, cartões e comparações. Escreva a sua consulta ou use as sugestões diretamente.' },
  { file: 'ej_07_pt.mp3', text: 'Já domina as estatísticas de jogadores. Ordene por qualquer métrica para encontrar os melhores desempenhos e use o painel IA para análises mais detalhadas quando precisar.' },
];

// ── Estadísticas Jugadores Club — IT ─────────────────────────────────────────
const STEPS_EJ_IT = [
  { file: 'ej_01_it.mp3', text: 'Questa schermata mostra le metriche di prestazione di tutti i giocatori del club: partite giocate, minuti, gol, assist, calci di rigore e cartellini. Tutte le colonne sono ordinabili ed è disponibile un pannello di interrogazione IA. Ti guidiamo passo dopo passo.' },
  { file: 'ej_03_it.mp3', text: 'Per analisi più approfondite, apri il pannello IA e chiedi del capocannoniere del club, del grafico degli assist, dei giocatori con più cartellini o della media minuti a partita. Tocca qui per aprirlo.' },
  { file: 'ej_04_it.mp3', text: 'Qui hai la tabella delle statistiche con colonne ordinabili: nome, squadra, posizione, partite, minuti totali, media per partita, gol, assist, rigori, punizioni e cartellini. Clicca sull\'intestazione di qualsiasi colonna per ordinare.' },
  { file: 'ej_05_it.mp3', text: 'Se ci sono molti giocatori, usa la paginazione per modificare la dimensione della pagina e navigare tra le pagine con i pulsanti avanti e indietro.' },
  { file: 'ej_06_it.mp3', text: 'Il pannello dell\'Assistente IA include suggerimenti su capocannonieri, assist, rendimento, cartellini e comparazioni. Digita la tua interrogazione o usa i suggerimenti direttamente.' },
  { file: 'ej_07_it.mp3', text: 'Ora padroneggi le statistiche dei giocatori. Ordina per qualsiasi metrica per trovare le migliori prestazioni e usa il pannello IA per analisi più dettagliate quando ne hai bisogno.' },
];

// ── Estadísticas Equipos Club — EN ───────────────────────────────────────────
const STEPS_EE_EN = [
  { file: 'ee_01_en.mp3', text: 'Here you can see the performance metrics of all club teams: position, matches played, points, wins, draws, losses, goals for and against and latest results. Click on a team to see the detail of their matches.' },
  { file: 'ee_02_en.mp3', text: 'Before we continue, remember that this button takes you back to the club dashboard.' },
  { file: 'ee_03_en.mp3', text: 'For deeper analysis, open the AI panel and ask about the team with the most wins, the points chart, the overall performance or the goals comparison between teams. Tap here to open it.' },
  { file: 'ee_04_en.mp3', text: 'The header shows you the total number of teams and the colour legend indicating Win, Draw or Loss, to help interpret the last results column of each team.' },
  { file: 'ee_05_en.mp3', text: 'And here you see the full teams table. You will see position, category, matches played, points, wins, draws, losses, goals for, goals against, difference and last streak. The top three positions are highlighted with a podium style.' },
  { file: 'ee_06_en.mp3', text: 'The AI Assistant panel includes suggestions about team statistics and a query area for more specific questions about the club\'s performance.' },
  { file: 'ee_07_en.mp3', text: 'You now know the team statistics. Click on any team to see the detail of their matches in the modal.' },
];

// ── Estadísticas Equipos Club — FR ───────────────────────────────────────────
const STEPS_EE_FR = [
  { file: 'ee_01_fr.mp3', text: 'Ici, vous voyez les métriques de performance de toutes les équipes du club : position, matchs joués, points, victoires, nuls, défaites, buts pour et contre et derniers résultats. Cliquez sur une équipe pour voir le détail de ses matchs.' },
  { file: 'ee_02_fr.mp3', text: 'Avant de continuer, souvenez-vous que ce bouton vous ramène au tableau de bord du club.' },
  { file: 'ee_03_fr.mp3', text: 'Pour des analyses plus approfondies, ouvrez le panneau IA et demandez l\'équipe avec le plus de victoires, le graphique des points, la performance générale ou la comparaison des buts entre équipes. Appuyez ici pour l\'ouvrir.' },
  { file: 'ee_04_fr.mp3', text: 'L\'en-tête vous montre le nombre total d\'équipes et la légende de couleurs indiquant Victoire, Nul ou Défaite, pour interpréter la colonne des derniers résultats de chaque équipe.' },
  { file: 'ee_05_fr.mp3', text: 'Et voici le tableau complet des équipes. Vous verrez la position, la catégorie, les matchs joués, les points, les victoires, les nuls, les défaites, les buts pour et contre, la différence et la dernière série. Les trois premières positions sont mises en valeur avec un style podium.' },
  { file: 'ee_06_fr.mp3', text: 'Le panneau de l\'Assistant IA inclut des suggestions sur les statistiques des équipes et une zone de requête pour des questions plus spécifiques sur la performance du club.' },
  { file: 'ee_07_fr.mp3', text: 'Vous connaissez maintenant les statistiques des équipes. Cliquez sur n\'importe quelle équipe pour voir le détail de ses matchs dans le modal.' },
];

// ── Estadísticas Equipos Club — DE ───────────────────────────────────────────
const STEPS_EE_DE = [
  { file: 'ee_01_de.mp3', text: 'Hier sehen Sie die Leistungsmetriken aller Vereinsteams: Position, gespielte Spiele, Punkte, Siege, Unentschieden, Niederlagen, Tore und Gegentore sowie die letzten Ergebnisse. Klicken Sie auf ein Team, um das Detail seiner Spiele zu sehen.' },
  { file: 'ee_02_de.mp3', text: 'Bevor wir fortfahren, denken Sie daran, dass Sie mit dieser Schaltfläche zum Vereins-Dashboard zurückkehren.' },
  { file: 'ee_03_de.mp3', text: 'Für tiefere Analysen öffnen Sie das KI-Panel und fragen Sie nach dem Team mit den meisten Siegen, der Punktegrafik, der Gesamtleistung oder dem Torvergleich zwischen Teams. Tippen Sie hier, um es zu öffnen.' },
  { file: 'ee_04_de.mp3', text: 'Die Kopfzeile zeigt die Gesamtzahl der Teams und die Farblegende für Sieg, Unentschieden oder Niederlage, um die Spalte der letzten Ergebnisse jedes Teams zu interpretieren.' },
  { file: 'ee_05_de.mp3', text: 'Und hier sehen Sie die vollständige Teamtabelle mit Position, Kategorie, gespielten Spielen, Punkten, Siegen, Unentschieden, Niederlagen, Toren, Gegentoren, Differenz und letzter Serie. Die ersten drei Positionen sind mit Podiumstil hervorgehoben.' },
  { file: 'ee_06_de.mp3', text: 'Das KI-Assistenten-Panel enthält Vorschläge zu Teamstatistiken und einen Eingabebereich für spezifischere Fragen zur Leistung des Vereins.' },
  { file: 'ee_07_de.mp3', text: 'Sie kennen jetzt die Teamstatistiken. Klicken Sie auf ein beliebiges Team, um das Detail seiner Spiele im Modal zu sehen.' },
];

// ── Estadísticas Equipos Club — PT ───────────────────────────────────────────
const STEPS_EE_PT = [
  { file: 'ee_01_pt.mp3', text: 'Aqui vê as métricas de desempenho de todas as equipas do clube: posição, partidas jogadas, pontos, vitórias, empates, derrotas, golos marcados e sofridos e últimos resultados. Clique numa equipa para ver o detalhe das suas partidas.' },
  { file: 'ee_02_pt.mp3', text: 'Antes de continuar, lembre-se que este botão o leva de volta ao painel do clube.' },
  { file: 'ee_03_pt.mp3', text: 'Para análises mais profundas, abra o painel IA e pergunte sobre a equipa com mais vitórias, o gráfico de pontos, o desempenho geral ou a comparação de golos entre equipas. Toque aqui para o abrir.' },
  { file: 'ee_04_pt.mp3', text: 'O cabeçalho mostra o número total de equipas e a legenda de cores indicando Vitória, Empate ou Derrota, para interpretar a coluna dos últimos resultados de cada equipa.' },
  { file: 'ee_05_pt.mp3', text: 'E aqui vê a tabela completa de equipas com posição, categoria, partidas jogadas, pontos, vitórias, empates, derrotas, golos marcados e sofridos, diferença e última série. As três primeiras posições destacam-se com estilo pódio.' },
  { file: 'ee_06_pt.mp3', text: 'O painel do Assistente IA inclui sugestões sobre estatísticas de equipas e uma área de consulta para perguntas mais específicas sobre o desempenho do clube.' },
  { file: 'ee_07_pt.mp3', text: 'Já conhece as estatísticas de equipas. Clique em qualquer equipa para ver o detalhe das suas partidas no modal.' },
];

// ── Estadísticas Equipos Club — IT ───────────────────────────────────────────
const STEPS_EE_IT = [
  { file: 'ee_01_it.mp3', text: 'Qui vedi le metriche di prestazione di tutte le squadre del club: posizione, partite giocate, punti, vittorie, pareggi, sconfitte, gol fatti e subiti e ultimi risultati. Clicca su una squadra per vedere il dettaglio delle sue partite.' },
  { file: 'ee_02_it.mp3', text: 'Prima di continuare, ricorda che questo pulsante ti riporta alla dashboard del club.' },
  { file: 'ee_03_it.mp3', text: 'Per analisi più approfondite, apri il pannello IA e chiedi della squadra con più vittorie, del grafico dei punti, del rendimento generale o del confronto gol tra squadre. Tocca qui per aprirlo.' },
  { file: 'ee_04_it.mp3', text: 'L\'intestazione mostra il numero totale di squadre e la legenda dei colori che indica Vittoria, Pareggio o Sconfitta, per interpretare la colonna degli ultimi risultati di ogni squadra.' },
  { file: 'ee_05_it.mp3', text: 'E qui vedi la tabella completa delle squadre con posizione, categoria, partite giocate, punti, vittorie, pareggi, sconfitte, gol fatti e subiti, differenza e ultima striscia. Le prime tre posizioni sono evidenziate con stile podio.' },
  { file: 'ee_06_it.mp3', text: 'Il pannello dell\'Assistente IA include suggerimenti sulle statistiche delle squadre e un\'area di interrogazione per domande più specifiche sulle prestazioni del club.' },
  { file: 'ee_07_it.mp3', text: 'Ora conosci le statistiche delle squadre. Clicca su qualsiasi squadra per vedere il dettaglio delle sue partite nel modal.' },
];

// ── Calendario Club — EN ──────────────────────────────────────────────────────
const STEPS_CAL_EN = [
  { file: 'cal_01_en.mp3', text: 'This screen shows you the monthly view of matches and training sessions for all club teams. Filter by team with the chips, navigate between months and click on a day or event to see the details. We will explain each part.' },
  { file: 'cal_03_en.mp3', text: 'Let\'s start with the team filter. Each colour label corresponds to a team, and the eye icon indicates whether that team is visible in the calendar. Tap a label to show or hide it, or use the buttons to show or hide all at once.' },
  { file: 'cal_04_en.mp3', text: 'To navigate between months, use the previous and next arrows. The Today button takes you directly to the current month.' },
  { file: 'cal_05_en.mp3', text: 'Here you have the calendar. Colour dots indicate events: a dumbbell shape for training sessions and a ball shape for matches. Tap a cell to open the day panel.' },
  { file: 'cal_06_en.mp3', text: 'Tapping on any day opens the side panel with all events for that day grouped by team. Each event can be opened to see its full details.' },
  { file: 'cal_07_en.mp3', text: 'You\'ve now mastered the Club Calendar. Filter the teams you want to see, navigate between months and tap on any day or event to access all the details whenever you need them.' },
];

// ── Calendario Club — FR ──────────────────────────────────────────────────────
const STEPS_CAL_FR = [
  { file: 'cal_01_fr.mp3', text: 'Cet écran affiche la vue mensuelle des matchs et des entraînements de toutes les équipes du club. Filtrez par équipe avec les puces, naviguez entre les mois et cliquez sur un jour ou un événement pour voir les détails. Nous vous expliquons chaque partie.' },
  { file: 'cal_03_fr.mp3', text: 'Commençons par le filtre d\'équipes. Chaque étiquette de couleur correspond à une équipe, et l\'icône d\'œil indique si cette équipe est visible dans le calendrier. Appuyez sur une étiquette pour l\'afficher ou la masquer, ou utilisez les boutons pour tout afficher ou masquer.' },
  { file: 'cal_04_fr.mp3', text: 'Pour naviguer entre les mois, utilisez les flèches précédent et suivant. Le bouton Aujourd\'hui vous amène directement au mois actuel.' },
  { file: 'cal_05_fr.mp3', text: 'Voici le calendrier. Les points de couleur indiquent des événements : forme d\'haltère pour les entraînements et forme de ballon pour les matchs. Appuyez sur une cellule pour ouvrir le panneau du jour.' },
  { file: 'cal_06_fr.mp3', text: 'En appuyant sur n\'importe quel jour, le panneau latéral s\'ouvre avec tous les événements de ce jour regroupés par équipe. Chaque événement peut être ouvert pour voir ses détails complets.' },
  { file: 'cal_07_fr.mp3', text: 'Vous maîtrisez maintenant le Calendrier du club. Filtrez les équipes que vous souhaitez voir, naviguez entre les mois et appuyez sur n\'importe quel jour ou événement pour accéder à tous les détails quand vous en avez besoin.' },
];

// ── Calendario Club — DE ──────────────────────────────────────────────────────
const STEPS_CAL_DE = [
  { file: 'cal_01_de.mp3', text: 'Dieser Bildschirm zeigt die Monatsansicht der Spiele und Trainings aller Vereinsteams. Filtern Sie nach Team mit den Chips, navigieren Sie zwischen Monaten und klicken Sie auf einen Tag oder ein Ereignis, um die Details zu sehen. Wir erklären Ihnen jeden Teil.' },
  { file: 'cal_03_de.mp3', text: 'Beginnen wir mit dem Team-Filter. Jedes Farb-Label entspricht einem Team, und das Augensymbol zeigt an, ob dieses Team im Kalender sichtbar ist. Tippen Sie auf ein Label, um es ein- oder auszublenden, oder verwenden Sie die Schaltflächen, um alle auf einmal zu steuern.' },
  { file: 'cal_04_de.mp3', text: 'Um zwischen Monaten zu navigieren, verwenden Sie die Vor- und Zurück-Pfeile. Die Schaltfläche Heute bringt Sie direkt zum aktuellen Monat.' },
  { file: 'cal_05_de.mp3', text: 'Hier haben Sie den Kalender. Farbige Punkte zeigen Ereignisse an: Hantelform für Trainings und Ballform für Spiele. Tippen Sie auf eine Zelle, um das Tagespanel zu öffnen.' },
  { file: 'cal_06_de.mp3', text: 'Durch Tippen auf einen beliebigen Tag öffnet sich das Seitenpanel mit allen Ereignissen dieses Tages nach Team gruppiert. Jedes Ereignis kann geöffnet werden, um seine vollständigen Details zu sehen.' },
  { file: 'cal_07_de.mp3', text: 'Sie beherrschen jetzt den Vereinskalender. Filtern Sie die Teams, navigieren Sie zwischen Monaten und tippen Sie auf einen beliebigen Tag oder ein Ereignis, um jederzeit auf alle Details zuzugreifen.' },
];

// ── Calendario Club — PT ──────────────────────────────────────────────────────
const STEPS_CAL_PT = [
  { file: 'cal_01_pt.mp3', text: 'Este ecrã mostra a vista mensal das partidas e treinos de todas as equipas do clube. Filtre por equipa com os chips, navegue entre meses e clique num dia ou evento para ver os detalhes. Explicamos cada parte.' },
  { file: 'cal_03_pt.mp3', text: 'Comecemos pelo filtro de equipas. Cada etiqueta de cor corresponde a uma equipa, e o ícone de olho indica se essa equipa está visível no calendário. Toque numa etiqueta para mostrar ou ocultar, ou use os botões para mostrar ou ocultar todas de uma vez.' },
  { file: 'cal_04_pt.mp3', text: 'Para navegar entre meses, use as setas anterior e seguinte. O botão Hoje leva-o diretamente ao mês atual.' },
  { file: 'cal_05_pt.mp3', text: 'Aqui tem o calendário. Os pontos de cor indicam eventos: forma de haltere para treinos e forma de bola para partidas. Toque numa célula para abrir o painel do dia.' },
  { file: 'cal_06_pt.mp3', text: 'Ao tocar em qualquer dia, abre-se o painel lateral com todos os eventos desse dia agrupados por equipa. Cada evento pode ser aberto para ver os seus detalhes completos.' },
  { file: 'cal_07_pt.mp3', text: 'Já domina o Calendário do clube. Filtre as equipas que quer ver, navegue entre meses e toque em qualquer dia ou evento para aceder a todos os detalhes quando precisar.' },
];

// ── Calendario Club — IT ──────────────────────────────────────────────────────
const STEPS_CAL_IT = [
  { file: 'cal_01_it.mp3', text: 'Questa schermata mostra la vista mensile delle partite e degli allenamenti di tutte le squadre del club. Filtra per squadra con i chip, naviga tra i mesi e clicca su un giorno o un evento per vedere i dettagli. Ti spieghiamo ogni parte.' },
  { file: 'cal_03_it.mp3', text: 'Iniziamo con il filtro delle squadre. Ogni etichetta colorata corrisponde a una squadra, e l\'icona dell\'occhio indica se quella squadra è visibile nel calendario. Tocca un\'etichetta per mostrarla o nasconderla, o usa i pulsanti per gestirle tutte in una volta.' },
  { file: 'cal_04_it.mp3', text: 'Per navigare tra i mesi, usa le frecce precedente e successivo. Il pulsante Oggi ti porta direttamente al mese corrente.' },
  { file: 'cal_05_it.mp3', text: 'Qui hai il calendario. I punti colorati indicano eventi: forma di manubrio per gli allenamenti e forma di pallone per le partite. Tocca una cella per aprire il pannello del giorno.' },
  { file: 'cal_06_it.mp3', text: 'Toccando qualsiasi giorno si apre il pannello laterale con tutti gli eventi di quel giorno raggruppati per squadra. Ogni evento può essere aperto per vedere i suoi dettagli completi.' },
  { file: 'cal_07_it.mp3', text: 'Ora padroneggi il Calendario del club. Filtra le squadre che vuoi vedere, naviga tra i mesi e tocca qualsiasi giorno o evento per accedere a tutti i dettagli quando ne hai bisogno.' },
];

// ── Equipos — EN ─────────────────────────────────────────────────────────────
const STEPS_EQ_EN = [
  { file: 'equipos_01_en.mp3', text: 'On this screen you manage all the club\'s teams for the season: categories, players per team, training schedules and quick access to each team\'s calendar. We will guide you step by step.' },
  { file: 'equipos_03_en.mp3', text: 'Let\'s start with the top actions. From here you can import players from Excel: download the template, fill in the data and upload it to register multiple players at once.' },
  { file: 'equipos_04_en.mp3', text: 'You can also invite players by generating a registration link. Share it via WhatsApp or email and players will be assigned to the club directly.' },
  { file: 'equipos_05_en.mp3', text: 'To create a new team, press here: choose the category, level and letter. If the category does not exist, you can create it on the spot.' },
  { file: 'equipos_06_en.mp3', text: 'If you want to see the teams from another season, change the season using this selector. The list and statistics update instantly.' },
  { file: 'equipos_07_en.mp3', text: 'And here you have the list of all teams. Each card shows the badge, name, training schedule and number of players. Tap on one to open the calendar and details.' },
  { file: 'equipos_08_en.mp3', text: 'You\'ve now mastered the teams screen. Use the top actions to import, invite or create teams, and tap on any card to see its calendar whenever you need it.' },
];

// ── Equipos — FR ─────────────────────────────────────────────────────────────
const STEPS_EQ_FR = [
  { file: 'equipos_01_fr.mp3', text: 'Sur cet écran, vous gérez toutes les équipes du club pour la saison : catégories, joueurs par équipe, horaires d\'entraînement et accès rapide au calendrier de chaque équipe. Nous vous guidons étape par étape.' },
  { file: 'equipos_03_fr.mp3', text: 'Commençons par les actions supérieures. D\'ici, vous pouvez importer des joueurs depuis Excel : téléchargez le modèle, remplissez les données et téléversez-le pour enregistrer plusieurs joueurs à la fois.' },
  { file: 'equipos_04_fr.mp3', text: 'Vous pouvez aussi inviter des joueurs en générant un lien d\'inscription. Partagez-le via WhatsApp ou e-mail et les joueurs seront assignés au club directement.' },
  { file: 'equipos_05_fr.mp3', text: 'Pour créer une nouvelle équipe, appuyez ici : choisissez la catégorie, le niveau et la lettre. Si la catégorie n\'existe pas, vous pouvez la créer sur le moment.' },
  { file: 'equipos_06_fr.mp3', text: 'Si vous souhaitez voir les équipes d\'une autre saison, changez la saison depuis ce sélecteur. La liste et les statistiques se mettent à jour instantanément.' },
  { file: 'equipos_07_fr.mp3', text: 'Et voici la liste de toutes les équipes. Chaque carte affiche le blason, le nom, l\'horaire d\'entraînement et le nombre de joueurs. Appuyez sur l\'une d\'elles pour ouvrir le calendrier et les détails.' },
  { file: 'equipos_08_fr.mp3', text: 'Vous maîtrisez maintenant l\'écran des équipes. Utilisez les actions supérieures pour importer, inviter ou créer des équipes, et appuyez sur n\'importe quelle carte pour voir son calendrier quand vous en avez besoin.' },
];

// ── Equipos — DE ─────────────────────────────────────────────────────────────
const STEPS_EQ_DE = [
  { file: 'equipos_01_de.mp3', text: 'Auf diesem Bildschirm verwalten Sie alle Teams des Vereins für die Saison: Kategorien, Spieler pro Team, Trainingszeiten und schnellen Zugriff auf den Kalender jedes Teams. Wir führen Sie Schritt für Schritt.' },
  { file: 'equipos_03_de.mp3', text: 'Beginnen wir mit den oberen Aktionen. Von hier aus können Sie Spieler aus Excel importieren: Laden Sie die Vorlage herunter, füllen Sie die Daten aus und laden Sie sie hoch, um mehrere Spieler auf einmal zu registrieren.' },
  { file: 'equipos_04_de.mp3', text: 'Sie können auch Spieler einladen, indem Sie einen Registrierungslink erstellen. Teilen Sie ihn per WhatsApp oder E-Mail und die Spieler werden dem Verein direkt zugewiesen.' },
  { file: 'equipos_05_de.mp3', text: 'Um ein neues Team zu erstellen, drücken Sie hier: Wählen Sie Kategorie, Niveau und Buchstabe. Wenn die Kategorie nicht existiert, können Sie sie sofort erstellen.' },
  { file: 'equipos_06_de.mp3', text: 'Wenn Sie die Teams einer anderen Saison sehen möchten, ändern Sie die Saison über diesen Selektor. Die Liste und die Statistiken werden sofort aktualisiert.' },
  { file: 'equipos_07_de.mp3', text: 'Und hier haben Sie die Liste aller Teams. Jede Karte zeigt das Wappen, den Namen, den Trainingsplan und die Anzahl der Spieler. Tippen Sie auf eine, um den Kalender und die Details zu öffnen.' },
  { file: 'equipos_08_de.mp3', text: 'Sie beherrschen jetzt den Teams-Bildschirm. Verwenden Sie die oberen Aktionen zum Importieren, Einladen oder Erstellen von Teams, und tippen Sie auf eine beliebige Karte, um deren Kalender bei Bedarf zu sehen.' },
];

// ── Equipos — PT ─────────────────────────────────────────────────────────────
const STEPS_EQ_PT = [
  { file: 'equipos_01_pt.mp3', text: 'Neste ecrã gere todas as equipas do clube da temporada: categorias, jogadores por equipa, horários de treino e acesso rápido ao calendário de cada equipa. Guiamo-lo passo a passo.' },
  { file: 'equipos_03_pt.mp3', text: 'Comecemos pelas ações superiores. Daqui pode importar jogadores do Excel: descarregue o modelo, preencha os dados e carregue-o para registar vários jogadores de uma vez.' },
  { file: 'equipos_04_pt.mp3', text: 'Pode também convidar jogadores gerando um link de registo. Partilhe-o pelo WhatsApp ou e-mail e os jogadores serão atribuídos ao clube diretamente.' },
  { file: 'equipos_05_pt.mp3', text: 'Para criar uma nova equipa, pressione aqui: escolha a categoria, o nível e a letra. Se a categoria não existir, pode criá-la na hora.' },
  { file: 'equipos_06_pt.mp3', text: 'Se quiser ver as equipas de outra temporada, mude a temporada neste seletor. A lista e as estatísticas atualizam-se instantaneamente.' },
  { file: 'equipos_07_pt.mp3', text: 'E aqui tem a lista de todas as equipas. Cada cartão mostra o escudo, o nome, o horário de treinos e o número de jogadores. Toque num para abrir o calendário e os detalhes.' },
  { file: 'equipos_08_pt.mp3', text: 'Já domina o ecrã de equipas. Use as ações superiores para importar, convidar ou criar equipas, e toque em qualquer cartão para ver o seu calendário quando precisar.' },
];

// ── Equipos — IT ─────────────────────────────────────────────────────────────
const STEPS_EQ_IT = [
  { file: 'equipos_01_it.mp3', text: 'In questa schermata gestisci tutte le squadre del club per la stagione: categorie, giocatori per squadra, orari di allenamento e accesso rapido al calendario di ogni squadra. Ti guidiamo passo passo.' },
  { file: 'equipos_03_it.mp3', text: 'Iniziamo con le azioni in alto. Da qui puoi importare giocatori da Excel: scarica il modello, compila i dati e caricalo per registrare più giocatori contemporaneamente.' },
  { file: 'equipos_04_it.mp3', text: 'Puoi anche invitare giocatori generando un link di registrazione. Condividilo via WhatsApp o e-mail e i giocatori verranno assegnati al club direttamente.' },
  { file: 'equipos_05_it.mp3', text: 'Per creare una nuova squadra, premi qui: scegli la categoria, il livello e la lettera. Se la categoria non esiste, puoi crearla sul momento.' },
  { file: 'equipos_06_it.mp3', text: 'Se vuoi vedere le squadre di un\'altra stagione, cambia la stagione da questo selettore. La lista e le statistiche si aggiornano istantaneamente.' },
  { file: 'equipos_07_it.mp3', text: 'E qui hai la lista di tutte le squadre. Ogni scheda mostra lo stemma, il nome, l\'orario degli allenamenti e il numero di giocatori. Tocca su una per aprire il calendario e i dettagli.' },
  { file: 'equipos_08_it.mp3', text: 'Ora padroneggi la schermata delle squadre. Usa le azioni in alto per importare, invitare o creare squadre, e tocca qualsiasi scheda per vedere il suo calendario quando ne hai bisogno.' },
];

// ── Menú Club — EN ────────────────────────────────────────────────────────────
const STEPS_MC_EN = [
  { file: 'mc_01_en.mp3', text: 'You are on the team menu. From here you access each section through cards: Calendar, Players, Player and Team Statistics, Rankings and Results, Gallery, Team Info and Injuries. We\'ll explain each one.' },
  { file: 'mc_02_en.mp3', text: 'The Calendar card takes you to the team\'s calendar: matches and training sessions organised by date. Tap it to view and manage the schedule.' },
  { file: 'mc_03_en.mp3', text: 'The Players card opens the complete list of team players with their information, contact details and performance.' },
  { file: 'mc_04_en.mp3', text: 'Player Statistics: from here you access charts and tables with goals, assists, minutes played and other individual metrics.' },
  { file: 'mc_05_en.mp3', text: 'Team Statistics: points, wins, draws, losses, goals for and against the team in the competition.' },
  { file: 'mc_06_en.mp3', text: 'Rankings and Results: check the league standings and the team\'s match history.' },
  { file: 'mc_07_en.mp3', text: 'Next, the Gallery. Here you can see photos and team moments that you can share with players and families.' },
  { file: 'mc_08_en.mp3', text: 'Team Info: name, category, league, schedules and general team data.' },
  { file: 'mc_09_en.mp3', text: 'Injuries: record and track the recovery status of each injured player.' },
  { file: 'mc_10_en.mp3', text: 'You\'ve completed the tour. You now know all the menu options. Tap on any card to enter that section whenever you need it.' },
];

// ── Menú Club — FR ────────────────────────────────────────────────────────────
const STEPS_MC_FR = [
  { file: 'mc_01_fr.mp3', text: 'Vous êtes sur le menu de l\'équipe. D\'ici, vous accédez à chaque section via des cartes : Calendrier, Joueurs, Statistiques des joueurs et de l\'équipe, Classements et résultats, Galerie, Infos équipe et Blessures. Nous vous expliquons chacune.' },
  { file: 'mc_02_fr.mp3', text: 'La carte Calendrier vous amène au calendrier de l\'équipe : matchs et entraînements organisés par date. Appuyez dessus pour voir et gérer le planning.' },
  { file: 'mc_03_fr.mp3', text: 'La carte Joueurs ouvre la liste complète des joueurs de l\'équipe avec leurs informations, coordonnées et performances.' },
  { file: 'mc_04_fr.mp3', text: 'Statistiques des joueurs : d\'ici vous accédez à des graphiques et tableaux avec les buts, passes décisives, minutes jouées et autres métriques individuelles.' },
  { file: 'mc_05_fr.mp3', text: 'Statistiques de l\'équipe : points, victoires, nuls, défaites, buts pour et contre l\'équipe en compétition.' },
  { file: 'mc_06_fr.mp3', text: 'Classements et résultats : consultez le classement de la ligue et l\'historique des matchs de l\'équipe.' },
  { file: 'mc_07_fr.mp3', text: 'Ensuite, la Galerie. Ici vous pouvez voir des photos et moments de l\'équipe que vous pouvez partager avec les joueurs et les familles.' },
  { file: 'mc_08_fr.mp3', text: 'Infos équipe : nom, catégorie, ligue, horaires et données générales de l\'équipe.' },
  { file: 'mc_09_fr.mp3', text: 'Blessures : enregistrez et suivez l\'état de récupération de chaque joueur blessé.' },
  { file: 'mc_10_fr.mp3', text: 'Vous avez terminé le tour. Vous connaissez maintenant toutes les options du menu. Appuyez sur n\'importe quelle carte pour accéder à cette section quand vous en avez besoin.' },
];

// ── Menú Club — DE ────────────────────────────────────────────────────────────
const STEPS_MC_DE = [
  { file: 'mc_01_de.mp3', text: 'Sie befinden sich im Team-Menü. Von hier aus gelangen Sie über Karten zu jeder Sektion: Kalender, Spieler, Spieler- und Teamstatistiken, Ranglisten und Ergebnisse, Galerie, Teaminfo und Verletzungen. Wir erklären Ihnen jede einzelne.' },
  { file: 'mc_02_de.mp3', text: 'Die Kalender-Karte führt Sie zum Teamkalender: Spiele und Trainingseinheiten nach Datum organisiert. Tippen Sie darauf, um den Zeitplan zu sehen und zu verwalten.' },
  { file: 'mc_03_de.mp3', text: 'Die Spieler-Karte öffnet die vollständige Liste der Spieler des Teams mit ihren Informationen, Kontaktdaten und Leistungen.' },
  { file: 'mc_04_de.mp3', text: 'Spielerstatistiken: Von hier aus gelangen Sie zu Grafiken und Tabellen mit Toren, Assists, gespielten Minuten und anderen individuellen Metriken.' },
  { file: 'mc_05_de.mp3', text: 'Teamstatistiken: Punkte, Siege, Unentschieden, Niederlagen, Tore und Gegentore des Teams im Wettbewerb.' },
  { file: 'mc_06_de.mp3', text: 'Ranglisten und Ergebnisse: Überprüfen Sie die Ligastandings und die Spielhistorie des Teams.' },
  { file: 'mc_07_de.mp3', text: 'Als Nächstes die Galerie. Hier sehen Sie Fotos und Teammomente, die Sie mit Spielern und Familien teilen können.' },
  { file: 'mc_08_de.mp3', text: 'Teaminfo: Name, Kategorie, Liga, Spielpläne und allgemeine Teamdaten.' },
  { file: 'mc_09_de.mp3', text: 'Verletzungen: Erfassen und verfolgen Sie den Genesungsstatus jedes verletzten Spielers.' },
  { file: 'mc_10_de.mp3', text: 'Sie haben die Tour abgeschlossen. Sie kennen jetzt alle Menüoptionen. Tippen Sie auf eine beliebige Karte, um bei Bedarf auf diesen Bereich zuzugreifen.' },
];

// ── Menú Club — PT ────────────────────────────────────────────────────────────
const STEPS_MC_PT = [
  { file: 'mc_01_pt.mp3', text: 'Está no menu da equipa. Daqui acede a cada secção através de cartões: Calendário, Jogadores, Estatísticas de jogadores e de equipa, Rankings e resultados, Galeria, Info da equipa e Lesões. Explicamos cada uma.' },
  { file: 'mc_02_pt.mp3', text: 'O cartão Calendário leva-o ao calendário da equipa: partidas e treinos organizados por data. Toque nele para ver e gerir o planeamento.' },
  { file: 'mc_03_pt.mp3', text: 'O cartão Jogadores abre a lista completa dos jogadores da equipa com as suas informações, contactos e desempenho.' },
  { file: 'mc_04_pt.mp3', text: 'Estatísticas de jogadores: daqui acede a gráficos e tabelas com golos, assistências, minutos jogados e outras métricas individuais.' },
  { file: 'mc_05_pt.mp3', text: 'Estatísticas da equipa: pontos, vitórias, empates, derrotas, golos marcados e sofridos da equipa na competição.' },
  { file: 'mc_06_pt.mp3', text: 'Rankings e resultados: consulte a classificação da liga e o histórico de partidas da equipa.' },
  { file: 'mc_07_pt.mp3', text: 'A seguir, a Galeria. Aqui pode ver fotos e momentos da equipa que pode partilhar com jogadores e famílias.' },
  { file: 'mc_08_pt.mp3', text: 'Info da equipa: nome, categoria, liga, horários e dados gerais da equipa.' },
  { file: 'mc_09_pt.mp3', text: 'Lesões: registe e acompanhe o estado de recuperação de cada jogador lesionado.' },
  { file: 'mc_10_pt.mp3', text: 'Completou o percurso. Já conhece todas as opções do menu. Toque em qualquer cartão para entrar nessa secção quando precisar.' },
];

// ── Menú Club — IT ────────────────────────────────────────────────────────────
const STEPS_MC_IT = [
  { file: 'mc_01_it.mp3', text: 'Sei nel menu della squadra. Da qui accedi a ogni sezione tramite le schede: Calendario, Giocatori, Statistiche giocatori e squadra, Classifiche e risultati, Galleria, Info squadra e Infortuni. Ti spieghiamo ognuna.' },
  { file: 'mc_02_it.mp3', text: 'La scheda Calendario ti porta al calendario della squadra: partite e allenamenti organizzati per data. Toccala per vedere e gestire il planning.' },
  { file: 'mc_03_it.mp3', text: 'La scheda Giocatori apre la lista completa dei giocatori della squadra con le loro informazioni, contatti e prestazioni.' },
  { file: 'mc_04_it.mp3', text: 'Statistiche giocatori: da qui accedi a grafici e tabelle con gol, assist, minuti giocati e altre metriche individuali.' },
  { file: 'mc_05_it.mp3', text: 'Statistiche squadra: punti, vittorie, pareggi, sconfitte, gol fatti e subiti dalla squadra in competizione.' },
  { file: 'mc_06_it.mp3', text: 'Classifiche e risultati: consulta la classifica del campionato e lo storico delle partite della squadra.' },
  { file: 'mc_07_it.mp3', text: 'Poi la Galleria. Qui puoi vedere foto e momenti della squadra che puoi condividere con giocatori e famiglie.' },
  { file: 'mc_08_it.mp3', text: 'Info squadra: nome, categoria, campionato, orari e dati generali della squadra.' },
  { file: 'mc_09_it.mp3', text: 'Infortuni: registra e segui lo stato di recupero di ogni giocatore infortunato.' },
  { file: 'mc_10_it.mp3', text: 'Hai completato il tour. Ora conosci tutte le opzioni del menu. Tocca qualsiasi scheda per accedere a quella sezione quando ne hai bisogno.' },
];

// ── Ropa — EN ─────────────────────────────────────────────────────────────────
const STEPS_ROPA_EN = [
  { file: 'ropa_01_en.mp3', text: 'On this screen you manage the club\'s kit: the clothing catalogue, available sizes and the size table per player. Parents can indicate their children\'s sizes and the club receives that information here. We\'ll guide you step by step.' },
  { file: 'ropa_03_en.mp3', text: 'Note the season selector. Change it to view and edit the catalogue sizes and players\' sizes for the corresponding year.' },
  { file: 'ropa_04_en.mp3', text: 'The screen has three tabs. Catalogue sizes manages the available sizes, Clothing catalogue defines the club\'s garments with their images, and Player sizes shows the classic table with each player\'s sizes.' },
  { file: 'ropa_05_en.mp3', text: 'On the first tab you see the catalogue size table: each garment with its available sizes. You can edit the sizes and manage the content that players will see from the app.' },
  { file: 'ropa_06_en.mp3', text: 'If you click on the second tab, you access the clothing catalogue: define the available garments and upload images of each one so players and parents can see them directly in the app.' },
  { file: 'ropa_07_en.mp3', text: 'On each tab you can export the content to Excel and customise the visible columns according to what you need to review.' },
  { file: 'ropa_08_en.mp3', text: 'You\'ve now mastered kit management. Switch tabs to work with the catalogue, upload garment images or review player sizes whenever you need it.' },
];

// ── Ropa — FR ─────────────────────────────────────────────────────────────────
const STEPS_ROPA_FR = [
  { file: 'ropa_01_fr.mp3', text: 'Sur cet écran vous gérez l\'équipement du club : le catalogue de vêtements, les tailles disponibles et le tableau des tailles par joueur. Les parents peuvent indiquer les tailles de leurs enfants et le club reçoit ces informations ici. Nous vous guidons étape par étape.' },
  { file: 'ropa_03_fr.mp3', text: 'Remarquez le sélecteur de saison. Changez-le pour afficher et modifier les tailles du catalogue et des joueurs de la saison correspondante.' },
  { file: 'ropa_04_fr.mp3', text: 'L\'écran a trois onglets. Tailles catalogue gère les tailles disponibles, Catalogue de vêtements définit les vêtements du club avec leurs images, et Tailles joueurs affiche le tableau classique avec les tailles de chaque joueur.' },
  { file: 'ropa_05_fr.mp3', text: 'Dans le premier onglet vous voyez le tableau des tailles du catalogue : chaque vêtement avec les tailles disponibles. Vous pouvez modifier les tailles et gérer le contenu que les joueurs verront depuis l\'application.' },
  { file: 'ropa_06_fr.mp3', text: 'En cliquant sur le deuxième onglet, vous accédez au catalogue de vêtements : définissez les vêtements disponibles et téléversez les images de chacun pour que les joueurs et les parents les voient directement dans l\'application.' },
  { file: 'ropa_07_fr.mp3', text: 'Dans chaque onglet vous pouvez exporter le contenu en Excel et personnaliser les colonnes visibles selon vos besoins.' },
  { file: 'ropa_08_fr.mp3', text: 'Vous maîtrisez maintenant la gestion de l\'équipement. Changez d\'onglet pour travailler avec le catalogue, téléverser des images ou consulter les tailles des joueurs quand vous en avez besoin.' },
];

// ── Ropa — DE ─────────────────────────────────────────────────────────────────
const STEPS_ROPA_DE = [
  { file: 'ropa_01_de.mp3', text: 'Auf diesem Bildschirm verwalten Sie die Vereinsausrüstung: den Kleidungskatalog, verfügbare Größen und die Größentabelle pro Spieler. Eltern können die Größen ihrer Kinder angeben und der Verein erhält diese Informationen hier. Wir führen Sie Schritt für Schritt.' },
  { file: 'ropa_03_de.mp3', text: 'Beachten Sie den Saisonwähler. Ändern Sie ihn, um die Kataloggrößen und Spielergrößen der entsprechenden Saison einzusehen und zu bearbeiten.' },
  { file: 'ropa_04_de.mp3', text: 'Der Bildschirm hat drei Registerkarten. Kataloggrößen verwaltet die verfügbaren Größen, Kleidungskatalog definiert die Vereinskleidung mit Bildern, und Spielergrößen zeigt die klassische Tabelle mit den Größen jedes Spielers.' },
  { file: 'ropa_05_de.mp3', text: 'Im ersten Tab sehen Sie die Kataloggrößentabelle: jedes Kleidungsstück mit den verfügbaren Größen. Sie können die Größen bearbeiten und den Inhalt verwalten, den Spieler in der App sehen werden.' },
  { file: 'ropa_06_de.mp3', text: 'Wenn Sie auf den zweiten Tab klicken, gelangen Sie zum Kleidungskatalog: Definieren Sie die verfügbaren Kleidungsstücke und laden Sie Bilder davon hoch, damit Spieler und Eltern sie direkt in der App sehen können.' },
  { file: 'ropa_07_de.mp3', text: 'In jedem Tab können Sie den Inhalt in Excel exportieren und die sichtbaren Spalten nach Bedarf anpassen.' },
  { file: 'ropa_08_de.mp3', text: 'Sie beherrschen jetzt die Ausrüstungsverwaltung. Wechseln Sie zwischen Tabs, um mit dem Katalog zu arbeiten, Bilder hochzuladen oder Spielergrößen bei Bedarf einzusehen.' },
];

// ── Ropa — PT ─────────────────────────────────────────────────────────────────
const STEPS_ROPA_PT = [
  { file: 'ropa_01_pt.mp3', text: 'Neste ecrã gere a equipação do clube: o catálogo de vestuário, os tamanhos disponíveis e a tabela de tamanhos por jogador. Os pais podem indicar os tamanhos dos seus filhos e o clube recebe essa informação aqui. Guiamo-lo passo a passo.' },
  { file: 'ropa_03_pt.mp3', text: 'Note o seletor de temporada. Altere-o para ver e editar os tamanhos do catálogo e dos jogadores da temporada correspondente.' },
  { file: 'ropa_04_pt.mp3', text: 'O ecrã tem três separadores. Tamanhos catálogo gere os tamanhos disponíveis, Catálogo de vestuário define as peças do clube com as suas imagens, e Tamanhos jogadores mostra a tabela clássica com os tamanhos de cada jogador.' },
  { file: 'ropa_05_pt.mp3', text: 'No primeiro separador vê a tabela de tamanhos do catálogo: cada peça com os tamanhos disponíveis. Pode editar os tamanhos e gerir o conteúdo que os jogadores verão na app.' },
  { file: 'ropa_06_pt.mp3', text: 'Se clicar no segundo separador, acede ao catálogo de vestuário: defina as peças disponíveis e carregue imagens de cada uma para que os jogadores e pais as vejam diretamente na app.' },
  { file: 'ropa_07_pt.mp3', text: 'Em cada separador pode exportar o conteúdo para Excel e personalizar as colunas visíveis conforme as suas necessidades.' },
  { file: 'ropa_08_pt.mp3', text: 'Já domina a gestão de equipação. Mude de separador para trabalhar com o catálogo, carregar imagens de vestuário ou rever os tamanhos dos jogadores quando precisar.' },
];

// ── Ropa — IT ─────────────────────────────────────────────────────────────────
const STEPS_ROPA_IT = [
  { file: 'ropa_01_it.mp3', text: 'In questa schermata gestisci l\'equipaggiamento del club: il catalogo abbigliamento, le taglie disponibili e la tabella delle taglie per giocatore. I genitori possono indicare le taglie dei loro figli e il club riceve queste informazioni qui. Ti guidiamo passo passo.' },
  { file: 'ropa_03_it.mp3', text: 'Nota il selettore di stagione. Modificalo per visualizzare e modificare le taglie del catalogo e dei giocatori della stagione corrispondente.' },
  { file: 'ropa_04_it.mp3', text: 'La schermata ha tre schede. Taglie catalogo gestisce le taglie disponibili, Catalogo abbigliamento definisce i capi del club con le loro immagini, e Taglie giocatori mostra la tabella classica con le taglie di ogni giocatore.' },
  { file: 'ropa_05_it.mp3', text: 'Nella prima scheda vedi la tabella delle taglie del catalogo: ogni capo con le taglie disponibili. Puoi modificare le taglie e gestire il contenuto che i giocatori vedranno dall\'app.' },
  { file: 'ropa_06_it.mp3', text: 'Se clicchi sulla seconda scheda, accedi al catalogo abbigliamento: definisci i capi disponibili e carica le immagini di ognuno in modo che giocatori e genitori li vedano direttamente nell\'app.' },
  { file: 'ropa_07_it.mp3', text: 'In ogni scheda puoi esportare il contenuto in Excel e personalizzare le colonne visibili in base alle tue esigenze.' },
  { file: 'ropa_08_it.mp3', text: 'Ora padroneggi la gestione dell\'equipaggiamento. Passa da una scheda all\'altra per lavorare con il catalogo, caricare immagini dei capi o consultare le taglie dei giocatori quando ne hai bisogno.' },
];

// ── Patrocinadores (club) — EN ────────────────────────────────────────────────
const STEPS_PATRO_EN = [
  { file: 'patro_01_en.mp3', text: 'On this screen you manage the club\'s sponsors: add the logo, name, description and contact details of each one so all club members can see them and you can give them the visibility they deserve. We\'ll explain each part.' },
  { file: 'patro_03_en.mp3', text: 'Let\'s start with the logo carousel. Sponsors with visibility enabled appear here. Any club member can click on a logo to see the sponsor\'s full profile.' },
  { file: 'patro_04_en.mp3', text: 'To add a new sponsor, click here. Upload the logo, fill in the name, description, website, email and phone so club members can find out about them. Then you can enable or disable their appearance in the carousel.' },
  { file: 'patro_crear_modal_en.mp3', text: 'This is the form for creating a sponsor. At the top you upload the sponsor\'s image or logo; 400 by 150 pixels in JPG or PNG is recommended. In Sponsor details fill in the name, description, website, phone, email and benefits. When done, click Save to register them in the club.' },
  { file: 'patro_05_en.mp3', text: 'And here you see the cards for all registered sponsors. Each card shows logo, name, description, contact and benefits. You can view the full profile, control their visibility or delete them.' },
  { file: 'patro_06_en.mp3', text: 'You\'ve now mastered the sponsors screen. Use the New button to add sponsors and the cards to edit or manage their visibility whenever you need it.' },
];

// ── Patrocinadores (club) — FR ────────────────────────────────────────────────
const STEPS_PATRO_FR = [
  { file: 'patro_01_fr.mp3', text: 'Sur cet écran vous gérez les sponsors du club : ajoutez le logo, le nom, la description et les coordonnées de chacun pour que tous les membres du club les voient et que vous puissiez leur donner la visibilité qu\'ils méritent. Nous vous expliquons chaque partie.' },
  { file: 'patro_03_fr.mp3', text: 'Commençons par le carrousel de logos. Les sponsors avec la visibilité activée apparaissent ici. Tout membre du club peut cliquer sur un logo pour voir la fiche complète du sponsor.' },
  { file: 'patro_04_fr.mp3', text: 'Pour ajouter un nouveau sponsor, cliquez ici. Téléversez le logo, remplissez le nom, la description, le site web, l\'e-mail et le téléphone pour que les membres du club puissent le connaître. Ensuite vous pourrez activer ou désactiver son apparition dans le carrousel.' },
  { file: 'patro_crear_modal_fr.mp3', text: 'Il s\'agit du formulaire pour créer un sponsor. En haut vous téléversez l\'image ou le logo du sponsor ; 400 par 150 pixels en JPG ou PNG est recommandé. Dans Données du sponsor remplissez le nom, la description, le site web, le téléphone, l\'e-mail et les avantages. Quand vous avez terminé, cliquez sur Enregistrer pour l\'inscrire dans le club.' },
  { file: 'patro_05_fr.mp3', text: 'Et voici les fiches de tous les sponsors enregistrés. Chaque carte affiche logo, nom, description, contact et avantages. Vous pouvez voir la fiche complète, contrôler leur visibilité ou les supprimer.' },
  { file: 'patro_06_fr.mp3', text: 'Vous maîtrisez maintenant l\'écran des sponsors. Utilisez le bouton Nouveau pour ajouter des sponsors et les cartes pour modifier ou gérer leur visibilité quand vous en avez besoin.' },
];

// ── Patrocinadores (club) — DE ────────────────────────────────────────────────
const STEPS_PATRO_DE = [
  { file: 'patro_01_de.mp3', text: 'Auf diesem Bildschirm verwalten Sie die Vereinssponsoren: Fügen Sie das Logo, den Namen, die Beschreibung und die Kontaktdaten jedes Sponsors hinzu, damit alle Vereinsmitglieder sie sehen und Sie ihnen die verdiente Sichtbarkeit geben können. Wir erklären Ihnen jeden Teil.' },
  { file: 'patro_03_de.mp3', text: 'Beginnen wir mit dem Logo-Karussell. Sponsoren mit aktivierter Sichtbarkeit erscheinen hier. Jedes Vereinsmitglied kann auf ein Logo klicken, um das vollständige Sponsorprofil zu sehen.' },
  { file: 'patro_04_de.mp3', text: 'Um einen neuen Sponsor hinzuzufügen, klicken Sie hier. Laden Sie das Logo hoch, füllen Sie Name, Beschreibung, Website, E-Mail und Telefon aus, damit die Vereinsmitglieder ihn kennenlernen können. Dann können Sie sein Erscheinen im Karussell aktivieren oder deaktivieren.' },
  { file: 'patro_crear_modal_de.mp3', text: 'Dies ist das Formular zum Erstellen eines Sponsors. Oben laden Sie das Bild oder Logo des Sponsors hoch; 400 mal 150 Pixel in JPG oder PNG wird empfohlen. In Sponsordaten füllen Sie Name, Beschreibung, Website, Telefon, E-Mail und Vorteile aus. Wenn fertig, klicken Sie auf Speichern, um ihn im Verein zu registrieren.' },
  { file: 'patro_05_de.mp3', text: 'Und hier sehen Sie die Karten aller registrierten Sponsoren. Jede Karte zeigt Logo, Name, Beschreibung, Kontakt und Vorteile. Sie können das vollständige Profil anzeigen, die Sichtbarkeit steuern oder sie löschen.' },
  { file: 'patro_06_de.mp3', text: 'Sie beherrschen jetzt den Sponsorenbildschirm. Verwenden Sie die Schaltfläche Neu, um Sponsoren hinzuzufügen, und die Karten zum Bearbeiten oder Verwalten ihrer Sichtbarkeit bei Bedarf.' },
];

// ── Patrocinadores (club) — PT ────────────────────────────────────────────────
const STEPS_PATRO_PT = [
  { file: 'patro_01_pt.mp3', text: 'Neste ecrã gere os patrocinadores do clube: adicione o logótipo, nome, descrição e dados de contacto de cada um para que todos os membros do clube os vejam e possa dar-lhes a visibilidade que merecem. Explicamos cada parte.' },
  { file: 'patro_03_pt.mp3', text: 'Comecemos pelo carrossel de logótipos. Os patrocinadores com visibilidade ativada aparecem aqui. Qualquer membro do clube pode clicar num logótipo para ver a ficha completa do patrocinador.' },
  { file: 'patro_04_pt.mp3', text: 'Para adicionar um novo patrocinador, clique aqui. Carregue o logótipo, preencha nome, descrição, site, email e telefone para que os membros do clube o possam conhecer. Depois pode ativar ou desativar a sua aparição no carrossel.' },
  { file: 'patro_crear_modal_pt.mp3', text: 'Este é o formulário para criar um patrocinador. Em cima carrega a imagem ou logótipo do patrocinador; recomenda-se 400 por 150 píxeis em JPG ou PNG. Em Dados do patrocinador preencha nome, descrição, site, telefone, email e benefícios. Quando terminar, clique em Guardar para o registar no clube.' },
  { file: 'patro_05_pt.mp3', text: 'E aqui vê os cartões de todos os patrocinadores registados. Cada cartão mostra logótipo, nome, descrição, contacto e benefícios. Pode ver a ficha completa, controlar a visibilidade ou eliminá-los.' },
  { file: 'patro_06_pt.mp3', text: 'Já domina o ecrã de patrocinadores. Use o botão Novo para adicionar patrocinadores e os cartões para editar ou gerir a visibilidade quando precisar.' },
];

// ── Patrocinadores (club) — IT ────────────────────────────────────────────────
const STEPS_PATRO_IT = [
  { file: 'patro_01_it.mp3', text: 'In questa schermata gestisci gli sponsor del club: aggiungi logo, nome, descrizione e dati di contatto di ognuno affinché tutti i membri del club li vedano e tu possa dare loro la visibilità che meritano. Ti spieghiamo ogni parte.' },
  { file: 'patro_03_it.mp3', text: 'Iniziamo con il carosello di loghi. Gli sponsor con la visibilità attivata appaiono qui. Qualsiasi membro del club può cliccare su un logo per vedere il profilo completo dello sponsor.' },
  { file: 'patro_04_it.mp3', text: 'Per aggiungere un nuovo sponsor, clicca qui. Carica il logo, inserisci nome, descrizione, sito web, email e telefono in modo che i membri del club possano conoscerlo. Poi potrai attivare o disattivare la sua comparsa nel carosello.' },
  { file: 'patro_crear_modal_it.mp3', text: 'Questo è il modulo per creare uno sponsor. In alto carichi l\'immagine o il logo dello sponsor; si consiglia 400 per 150 pixel in JPG o PNG. In Dati dello sponsor inserisci nome, descrizione, sito web, telefono, email e benefit. Quando hai finito, clicca su Salva per registrarlo nel club.' },
  { file: 'patro_05_it.mp3', text: 'E qui vedi le schede di tutti gli sponsor registrati. Ogni scheda mostra logo, nome, descrizione, contatti e benefit. Puoi vedere il profilo completo, controllare la visibilità o eliminarli.' },
  { file: 'patro_06_it.mp3', text: 'Ora padroneggi la schermata degli sponsor. Usa il pulsante Nuovo per aggiungere sponsor e le schede per modificare o gestire la loro visibilità quando ne hai bisogno.' },
];

// ── Patrocinadores (usuario) — EN ─────────────────────────────────────────────
const STEPS_PATROU_EN = [
  { file: 'patrou_01_en.mp3', text: 'You\'re in the club\'s sponsors section. You\'ll see a logo carousel and cards with information, links and benefits. This is the view for players and families. We\'ll guide you step by step.' },
  { file: 'patrou_02_en.mp3', text: 'The carousel shows the sponsor logos. Click on one to see their full profile with details.' },
  { file: 'patrou_03_en.mp3', text: 'Each card shows logo, name, description, links to website, email and phone, benefits and the View button to open the full details.' },
  { file: 'patrou_04_en.mp3', text: 'Now you know the club\'s sponsors. Check their information and benefits whenever you need it.' },
];

// ── Patrocinadores (usuario) — FR ─────────────────────────────────────────────
const STEPS_PATROU_FR = [
  { file: 'patrou_01_fr.mp3', text: 'Vous êtes dans les sponsors du club. Vous verrez un carrousel de logos et des cartes avec des informations, des liens et des avantages. C\'est la vue de consultation pour les joueurs et les familles. Nous vous guidons étape par étape.' },
  { file: 'patrou_02_fr.mp3', text: 'Le carrousel affiche les logos des sponsors. Cliquez sur l\'un d\'eux pour voir sa fiche avec les détails.' },
  { file: 'patrou_03_fr.mp3', text: 'Chaque carte affiche logo, nom, description, liens vers le site web, l\'e-mail et le téléphone, les avantages et le bouton Voir pour ouvrir les détails complets.' },
  { file: 'patrou_04_fr.mp3', text: 'Vous connaissez maintenant les sponsors du club. Consultez leurs informations et avantages quand vous en avez besoin.' },
];

// ── Patrocinadores (usuario) — DE ─────────────────────────────────────────────
const STEPS_PATROU_DE = [
  { file: 'patrou_01_de.mp3', text: 'Sie befinden sich bei den Vereinssponsoren. Sie sehen ein Logo-Karussell und Karten mit Informationen, Links und Vorteilen. Dies ist die Ansicht für Spieler und Familien. Wir führen Sie Schritt für Schritt.' },
  { file: 'patrou_02_de.mp3', text: 'Das Karussell zeigt die Sponsor-Logos. Klicken Sie auf eines, um das detaillierte Profil zu sehen.' },
  { file: 'patrou_03_de.mp3', text: 'Jede Karte zeigt Logo, Name, Beschreibung, Links zur Website, E-Mail und Telefon, Vorteile und die Schaltfläche Anzeigen zum Öffnen der vollständigen Details.' },
  { file: 'patrou_04_de.mp3', text: 'Jetzt kennen Sie die Vereinssponsoren. Überprüfen Sie ihre Informationen und Vorteile wann immer Sie es brauchen.' },
];

// ── Patrocinadores (usuario) — PT ─────────────────────────────────────────────
const STEPS_PATROU_PT = [
  { file: 'patrou_01_pt.mp3', text: 'Está na secção dos patrocinadores do clube. Verá um carrossel de logótipos e cartões com informações, ligações e benefícios. Esta é a vista de consulta para jogadores e famílias. Guiamo-lo passo a passo.' },
  { file: 'patrou_02_pt.mp3', text: 'O carrossel mostra os logótipos dos patrocinadores. Clique num para ver a sua ficha com detalhes.' },
  { file: 'patrou_03_pt.mp3', text: 'Cada cartão mostra logótipo, nome, descrição, ligações para site, email e telefone, benefícios e o botão Ver para abrir os detalhes completos.' },
  { file: 'patrou_04_pt.mp3', text: 'Agora conhece os patrocinadores do clube. Consulte as suas informações e benefícios quando precisar.' },
];

// ── Patrocinadores (usuario) — IT ─────────────────────────────────────────────
const STEPS_PATROU_IT = [
  { file: 'patrou_01_it.mp3', text: 'Sei nella sezione degli sponsor del club. Vedrai un carosello di loghi e schede con informazioni, link e benefit. Questa è la vista di consultazione per giocatori e famiglie. Ti guidiamo passo passo.' },
  { file: 'patrou_02_it.mp3', text: 'Il carosello mostra i loghi degli sponsor. Clicca su uno per vedere il profilo con i dettagli.' },
  { file: 'patrou_03_it.mp3', text: 'Ogni scheda mostra logo, nome, descrizione, link al sito web, email e telefono, benefit e il pulsante Vedi per aprire i dettagli completi.' },
  { file: 'patrou_04_it.mp3', text: 'Ora conosci gli sponsor del club. Consulta le loro informazioni e benefit quando ne hai bisogno.' },
];

// ── Documentos Club — EN ─────────────────────────────────────────────────────
const STEPS_DOCS_EN = [
  { file: 'docs_01_en.mp3', text: 'On this screen you store and organise all club documentation: authorisations, medical records, contracts and custom forms. You can upload documents, request them and track deliveries. We\'ll explain each part.' },
  { file: 'docs_03_en.mp3', text: 'The screen has two tabs. Switch between player and coach documentation; each one shows the corresponding documents and delivery status.' },
  { file: 'docs_04_en.mp3', text: 'At the top you have the three available actions. Upload document adds a file to the club, Request document requires delivery from players or coaches, and Create form designs a custom form with fields to fill in.' },
  { file: 'docs_05_en.mp3', text: 'You can also search for documents by name or description and filter by team. The counter shows how many documents are in the current list.' },
  { file: 'docs_06_en.mp3', text: 'And here you see the full table. Each row shows the completion status, assigned teams, name, description and date. From the actions you can manage visibility, request uploads, edit, open the file or delete it.' },
  { file: 'docs_07_en.mp3', text: 'You\'ve now mastered the documents screen. Use the top actions to upload, request or create forms, and the table to review and manage each document whenever you need it.' },
];

// ── Documentos Club — FR ─────────────────────────────────────────────────────
const STEPS_DOCS_FR = [
  { file: 'docs_01_fr.mp3', text: 'Sur cet écran, vous stockez et organisez toute la documentation du club : autorisations, dossiers médicaux, contrats et formulaires personnalisés. Vous pouvez téléverser des documents, les demander et suivre les livraisons. Nous vous expliquons chaque partie.' },
  { file: 'docs_03_fr.mp3', text: 'L\'écran a deux onglets. Passez entre la documentation des joueurs et celle des entraîneurs ; chacun affiche les documents correspondants et l\'état de livraison.' },
  { file: 'docs_04_fr.mp3', text: 'En haut vous avez les trois actions disponibles. Téléverser un document ajoute un fichier au club, Demander un document exige la livraison aux joueurs ou entraîneurs, et Créer un formulaire conçoit un formulaire personnalisé avec des champs à remplir.' },
  { file: 'docs_05_fr.mp3', text: 'Vous pouvez aussi rechercher des documents par nom ou description et filtrer par équipe. Le compteur indique combien de documents figurent dans la liste actuelle.' },
  { file: 'docs_06_fr.mp3', text: 'Et voici le tableau complet. Chaque ligne affiche le statut de complétion, les équipes assignées, le nom, la description et la date. Depuis les actions, vous pouvez gérer la visibilité, demander des téléversements, modifier, ouvrir le fichier ou supprimer.' },
  { file: 'docs_07_fr.mp3', text: 'Vous maîtrisez maintenant l\'écran des documents. Utilisez les actions supérieures pour téléverser, demander ou créer des formulaires, et le tableau pour réviser et gérer chaque document quand vous en avez besoin.' },
];

// ── Documentos Club — DE ─────────────────────────────────────────────────────
const STEPS_DOCS_DE = [
  { file: 'docs_01_de.mp3', text: 'Auf diesem Bildschirm speichern und organisieren Sie die gesamte Vereinsdokumentation: Genehmigungen, Krankenakten, Verträge und benutzerdefinierte Formulare. Sie können Dokumente hochladen, anfordern und Lieferungen verfolgen. Wir erklären Ihnen jeden Teil.' },
  { file: 'docs_03_de.mp3', text: 'Der Bildschirm hat zwei Registerkarten. Wechseln Sie zwischen der Dokumentation für Spieler und Trainer; jede zeigt die entsprechenden Dokumente und den Lieferstatus.' },
  { file: 'docs_04_de.mp3', text: 'Oben haben Sie die drei verfügbaren Aktionen. Dokument hochladen fügt eine Datei dem Verein hinzu, Dokument anfordern verlangt die Lieferung von Spielern oder Trainern, und Formular erstellen entwirft ein benutzerdefiniertes Formular mit auszufüllenden Feldern.' },
  { file: 'docs_05_de.mp3', text: 'Sie können auch Dokumente nach Name oder Beschreibung suchen und nach Team filtern. Der Zähler zeigt, wie viele Dokumente in der aktuellen Liste sind.' },
  { file: 'docs_06_de.mp3', text: 'Und hier sehen Sie die vollständige Tabelle. Jede Zeile zeigt den Abschlussstatus, zugewiesene Teams, Name, Beschreibung und Datum. Über die Aktionen können Sie Sichtbarkeit verwalten, Uploads anfordern, bearbeiten, die Datei öffnen oder löschen.' },
  { file: 'docs_07_de.mp3', text: 'Sie beherrschen jetzt den Dokumentenbildschirm. Verwenden Sie die oberen Aktionen zum Hochladen, Anfordern oder Erstellen von Formularen, und die Tabelle zur Überprüfung und Verwaltung jedes Dokuments bei Bedarf.' },
];

// ── Documentos Club — PT ─────────────────────────────────────────────────────
const STEPS_DOCS_PT = [
  { file: 'docs_01_pt.mp3', text: 'Neste ecrã armazena e organiza toda a documentação do clube: autorizações, fichas médicas, contratos e formulários personalizados. Pode carregar documentos, solicitá-los e acompanhar as entregas. Explicamos cada parte.' },
  { file: 'docs_03_pt.mp3', text: 'O ecrã tem dois separadores. Alterne entre a documentação de jogadores e a de treinadores; cada um mostra os documentos correspondentes e o estado de entrega.' },
  { file: 'docs_04_pt.mp3', text: 'Na parte superior tem as três ações disponíveis. Carregar documento adiciona um ficheiro ao clube, Solicitar documento exige a entrega a jogadores ou treinadores, e Criar formulário cria um formulário personalizado com campos a preencher.' },
  { file: 'docs_05_pt.mp3', text: 'Pode também pesquisar documentos por nome ou descrição e filtrar por equipa. O contador mostra quantos documentos existem na lista atual.' },
  { file: 'docs_06_pt.mp3', text: 'E aqui vê a tabela completa. Cada linha mostra o estado de conclusão, equipas atribuídas, nome, descrição e data. Nas ações pode gerir a visibilidade, solicitar carregamentos, editar, abrir o ficheiro ou eliminar.' },
  { file: 'docs_07_pt.mp3', text: 'Já domina o ecrã de documentos. Use as ações superiores para carregar, solicitar ou criar formulários, e a tabela para rever e gerir cada documento quando precisar.' },
];

// ── Documentos Club — IT ─────────────────────────────────────────────────────
const STEPS_DOCS_IT = [
  { file: 'docs_01_it.mp3', text: 'In questa schermata archivi e organizzi tutta la documentazione del club: autorizzazioni, cartelle mediche, contratti e moduli personalizzati. Puoi caricare documenti, richiederli e monitorare le consegne. Ti spieghiamo ogni parte.' },
  { file: 'docs_03_it.mp3', text: 'La schermata ha due schede. Passa dalla documentazione dei giocatori a quella degli allenatori; ognuna mostra i documenti corrispondenti e lo stato di consegna.' },
  { file: 'docs_04_it.mp3', text: 'In alto hai le tre azioni disponibili. Carica documento aggiunge un file al club, Richiedi documento richiede la consegna a giocatori o allenatori, e Crea modulo progetta un modulo personalizzato con campi da compilare.' },
  { file: 'docs_05_it.mp3', text: 'Puoi anche cercare documenti per nome o descrizione e filtrare per squadra. Il contatore mostra quanti documenti ci sono nella lista corrente.' },
  { file: 'docs_06_it.mp3', text: 'E qui vedi la tabella completa. Ogni riga mostra lo stato di completamento, le squadre assegnate, il nome, la descrizione e la data. Dalle azioni puoi gestire la visibilità, richiedere caricamenti, modificare, aprire il file o eliminare.' },
  { file: 'docs_07_it.mp3', text: 'Ora padroneggi la schermata dei documenti. Usa le azioni in alto per caricare, richiedere o creare moduli, e la tabella per esaminare e gestire ogni documento quando ne hai bisogno.' },
];

// ── New Cuotas — EN ───────────────────────────────────────────────────────────
const STEPS_CQ_EN = [
  { file: 'cuotas_01_en.mp3', text: 'On this screen you manage all club payments and fees: payment setup, Stripe, history, Sphaira Pay, bank account and notifications. You will have a summary of charges and a list of players with their payment status. We\'ll guide you step by step.' },
  { file: 'cuotas_03_en.mp3', text: 'Let\'s start with the action bar. Payments opens club fee management, Stripe connects your account for online payments, History shows all transactions, Sphaira Pay shows automatic card charges, and you also have Bank and Notifications.' },
  { file: 'cuotas_gestion_pagos_en.mp3', text: 'This is the Payment Management modal. Here you set up all the season\'s fees: create fees, set amounts, dates and payment type — one-off payment, Sphaira Pay or other. You can mark fees as mandatory and see the full list to edit or delete them.' },
  { file: 'cuotas_cobros_sphaira_en.mp3', text: 'This modal shows Sphaira Pay Charges: scheduled card charges grouped by fee. Here you can check which fees have automatic payment enabled, the scheduled dates and the status of each charge. It\'s your control centre for recurring payments.' },
  { file: 'cuotas_sphaira_pay_en.mp3', text: 'This button opens the Sphaira Pay Charges modal you just saw. Sphaira Pay lets families save their card and charge fees automatically on the dates you configure. Use it to reduce missed payments and save time.' },
  { file: 'cuotas_notif_config_en.mp3', text: 'This is the Fee Notifications modal. Set up when and how to alert guardians: choose the days before the due date to send the reminder, enable push notifications in the mobile app and email with the pending payment details. Save the settings when done.' },
  { file: 'cuotas_04_en.mp3', text: 'Next you have the summary. The cards show total players, amount to be charged, amount already charged with its progress bar and outstanding amount. They give you a quick snapshot of the fee status.' },
  { file: 'cuotas_05_en.mp3', text: 'To find a specific player, search by name or filter by fee type. The filter lets you see only the players for one or more specific fees.' },
  { file: 'cuotas_06_en.mp3', text: 'Here you have the full list. Each row shows name, team, status, total to pay, paid, remaining and progress per fee. From the actions you can edit, register a payment or view the player\'s history.' },
  { file: 'cuotas_07_en.mp3', text: 'You\'ve now mastered fee management. Use the top bar to set up payments, Sphaira Pay and Stripe, and the table to review and register charges per player whenever you need it.' },
];

// ── New Cuotas — FR ───────────────────────────────────────────────────────────
const STEPS_CQ_FR = [
  { file: 'cuotas_01_fr.mp3', text: 'Sur cet écran vous gérez tous les paiements et cotisations du club : configuration des paiements, Stripe, historique, Sphaira Pay, compte bancaire et notifications. Vous aurez un résumé des encaissements et la liste des joueurs avec leur état de paiement. Nous vous guidons étape par étape.' },
  { file: 'cuotas_03_fr.mp3', text: 'Commençons par la barre d\'actions. Paiements ouvre la gestion des cotisations, Stripe connecte votre compte pour les paiements en ligne, Historique affiche tous les mouvements, Sphaira Pay les encaissements automatiques par carte, et vous avez aussi Banque et Notifications.' },
  { file: 'cuotas_gestion_pagos_fr.mp3', text: 'Il s\'agit du modal de Gestion des paiements. Ici vous configurez toutes les cotisations de la saison : créez des cotisations, définissez les montants, les dates et le type d\'encaissement — paiement ponctuel, Sphaira Pay ou autre. Vous pouvez marquer des cotisations comme obligatoires et voir la liste complète pour les modifier ou supprimer.' },
  { file: 'cuotas_cobros_sphaira_fr.mp3', text: 'Ce modal affiche les Encaissements Sphaira Pay : les prélèvements programmés par carte enregistrée, regroupés par cotisation. Consultez ici quelles cotisations ont le paiement automatique activé, les dates programmées et l\'état de chaque prélèvement. C\'est votre centre de contrôle pour le paiement récurrent.' },
  { file: 'cuotas_sphaira_pay_fr.mp3', text: 'Ce bouton ouvre le modal d\'Encaissements Sphaira Pay que vous venez de voir. Sphaira Pay permet aux familles d\'enregistrer leur carte et de prélever les cotisations automatiquement aux dates que vous configurez. Utilisez-le pour réduire les impayés et gagner du temps.' },
  { file: 'cuotas_notif_config_fr.mp3', text: 'Il s\'agit du modal de Notifications de Cotisations. Configurez quand et comment alerter les responsables : choisissez les jours avant l\'échéance pour envoyer le rappel, activez la notification push dans l\'application mobile et l\'e-mail avec les détails du paiement en attente. Sauvegardez quand vous avez terminé.' },
  { file: 'cuotas_04_fr.mp3', text: 'Ensuite vous avez le résumé. Les cartes affichent le nombre total de joueurs, le montant à encaisser, le montant déjà encaissé avec sa barre de progression et le montant en attente. Elles vous donnent un aperçu rapide de l\'état des cotisations.' },
  { file: 'cuotas_05_fr.mp3', text: 'Pour trouver un joueur spécifique, recherchez par nom ou filtrez par type de cotisation. Le filtre permet de voir uniquement les joueurs d\'une ou plusieurs cotisations spécifiques.' },
  { file: 'cuotas_06_fr.mp3', text: 'Voici la liste complète. Chaque ligne affiche le nom, l\'équipe, le statut, le total à payer, le payé, le restant et la progression par cotisation. Depuis les actions, vous pouvez modifier, enregistrer un paiement ou voir l\'historique du joueur.' },
  { file: 'cuotas_07_fr.mp3', text: 'Vous maîtrisez maintenant la gestion des cotisations. Utilisez la barre supérieure pour configurer les paiements, Sphaira Pay et Stripe, et le tableau pour réviser et enregistrer les encaissements par joueur quand vous en avez besoin.' },
];

// ── New Cuotas — DE ───────────────────────────────────────────────────────────
const STEPS_CQ_DE = [
  { file: 'cuotas_01_de.mp3', text: 'Auf diesem Bildschirm verwalten Sie alle Zahlungen und Beiträge des Vereins: Zahlungseinrichtung, Stripe, Verlauf, Sphaira Pay, Bankkonto und Benachrichtigungen. Sie haben eine Zusammenfassung der Einzüge und eine Liste der Spieler mit ihrem Zahlungsstatus. Wir führen Sie Schritt für Schritt.' },
  { file: 'cuotas_03_de.mp3', text: 'Beginnen wir mit der Aktionsleiste. Zahlungen öffnet die Beitragsverwaltung, Stripe verbindet Ihr Konto für Online-Zahlungen, Verlauf zeigt alle Transaktionen, Sphaira Pay die automatischen Karteneinzüge, und Sie haben auch Bank und Benachrichtigungen.' },
  { file: 'cuotas_gestion_pagos_de.mp3', text: 'Dies ist das Modal für die Zahlungsverwaltung. Hier konfigurieren Sie alle Beiträge der Saison: Erstellen Sie Beiträge, legen Sie Beträge, Daten und Zahlungsart fest — Einmalzahlung, Sphaira Pay oder andere. Sie können Beiträge als obligatorisch markieren und die vollständige Liste zur Bearbeitung oder Löschung einsehen.' },
  { file: 'cuotas_cobros_sphaira_de.mp3', text: 'Dieses Modal zeigt Sphaira Pay-Einzüge: geplante Karteneinzüge nach Beitrag gruppiert. Prüfen Sie hier, welche Beiträge automatische Zahlung aktiviert haben, die geplanten Daten und den Status jedes Einzugs. Es ist Ihr Kontrollzentrum für wiederkehrende Zahlungen.' },
  { file: 'cuotas_sphaira_pay_de.mp3', text: 'Diese Schaltfläche öffnet das Sphaira Pay-Einzugsmodal, das Sie gerade gesehen haben. Sphaira Pay ermöglicht es Familien, ihre Karte zu speichern und Beiträge automatisch an den konfigurierten Daten einzuziehen. Nutzen Sie es, um Zahlungsausfälle zu reduzieren und Zeit zu sparen.' },
  { file: 'cuotas_notif_config_de.mp3', text: 'Dies ist das Beitragsbenachrichtigungsmodal. Konfigurieren Sie wann und wie Erziehungsberechtigte benachrichtigt werden: Wählen Sie die Tage vor Fälligkeit für die Erinnerung, aktivieren Sie Push-Benachrichtigungen in der App und E-Mail mit ausstehenden Zahlungsdetails. Speichern Sie die Einstellungen wenn fertig.' },
  { file: 'cuotas_04_de.mp3', text: 'Als Nächstes haben Sie die Zusammenfassung. Die Karten zeigen Gesamtspieler, einzuziehenden Betrag, bereits eingezogenen Betrag mit Fortschrittsbalken und ausstehenden Betrag. Sie geben Ihnen einen schnellen Überblick über den Beitragsstatus.' },
  { file: 'cuotas_05_de.mp3', text: 'Um einen bestimmten Spieler zu finden, suchen Sie nach Name oder filtern Sie nach Beitragsart. Der Filter zeigt nur die Spieler einer oder mehrerer spezifischer Beiträge.' },
  { file: 'cuotas_06_de.mp3', text: 'Hier haben Sie die vollständige Liste. Jede Zeile zeigt Name, Team, Status, Gesamtbetrag, bezahlten Betrag, Restbetrag und Fortschritt pro Beitrag. Über die Aktionen können Sie bearbeiten, eine Zahlung registrieren oder den Spielerverlauf einsehen.' },
  { file: 'cuotas_07_de.mp3', text: 'Sie beherrschen jetzt die Beitragsverwaltung. Verwenden Sie die obere Leiste zur Konfiguration von Zahlungen, Sphaira Pay und Stripe, und die Tabelle zur Überprüfung und Erfassung von Einzügen pro Spieler bei Bedarf.' },
];

// ── New Cuotas — PT ───────────────────────────────────────────────────────────
const STEPS_CQ_PT = [
  { file: 'cuotas_01_pt.mp3', text: 'Neste ecrã gere todos os pagamentos e quotas do clube: configuração de pagamentos, Stripe, histórico, Sphaira Pay, conta bancária e notificações. Terá um resumo de cobranças e a lista de jogadores com o seu estado de pagamento. Guiamo-lo passo a passo.' },
  { file: 'cuotas_03_pt.mp3', text: 'Comecemos pela barra de ações. Pagamentos abre a gestão de quotas, Stripe conecta a sua conta para cobranças online, Histórico mostra todos os movimentos, Sphaira Pay as cobranças automáticas por cartão, e também tem Banco e Notificações.' },
  { file: 'cuotas_gestion_pagos_pt.mp3', text: 'Este é o modal de Gestão de pagamentos. Aqui configura todas as quotas da temporada: cria quotas, define valores, datas e tipo de cobrança — pagamento pontual, Sphaira Pay ou outro. Pode marcar quotas como obrigatórias e ver a lista completa para as editar ou eliminar.' },
  { file: 'cuotas_cobros_sphaira_pt.mp3', text: 'Este modal mostra os Cobros Sphaira Pay: cobranças programadas por cartão guardado, agrupadas por quota. Aqui verifica quais quotas têm cobrança automática ativada, as datas programadas e o estado de cada cobrança. É o seu centro de controlo para pagamentos recorrentes.' },
  { file: 'cuotas_sphaira_pay_pt.mp3', text: 'Este botão abre o modal de Cobros Sphaira Pay que acabou de ver. O Sphaira Pay permite às famílias guardar o cartão e cobrar as quotas automaticamente nas datas que configurar. Use-o para reduzir incumprimentos e poupar tempo.' },
  { file: 'cuotas_notif_config_pt.mp3', text: 'Este é o modal de Notificações de Quotas. Configure quando e como avisar os responsáveis: escolha os dias antes do vencimento para enviar o lembrete, ative a notificação push na app móvel e o email com os detalhes do pagamento pendente. Guarde a configuração quando terminar.' },
  { file: 'cuotas_04_pt.mp3', text: 'A seguir tem o resumo. Os cartões mostram o total de jogadores, o valor a cobrar, o já cobrado com a sua barra de progresso e o valor pendente. Dão-lhe uma visão rápida do estado das quotas.' },
  { file: 'cuotas_05_pt.mp3', text: 'Para encontrar um jogador específico, pesquise por nome ou filtre por tipo de quota. O filtro permite ver apenas os jogadores de uma ou várias quotas específicas.' },
  { file: 'cuotas_06_pt.mp3', text: 'Aqui tem a lista completa. Cada linha mostra nome, equipa, estado, total a pagar, pago, restante e progresso por quota. Nas ações pode editar, registar um pagamento ou ver o histórico do jogador.' },
  { file: 'cuotas_07_pt.mp3', text: 'Já domina a gestão de quotas. Use a barra superior para configurar pagamentos, Sphaira Pay e Stripe, e a tabela para rever e registar cobranças por jogador quando precisar.' },
];

// ── New Cuotas — IT ───────────────────────────────────────────────────────────
const STEPS_CQ_IT = [
  { file: 'cuotas_01_it.mp3', text: 'In questa schermata gestisci tutti i pagamenti e le quote del club: configurazione dei pagamenti, Stripe, storico, Sphaira Pay, conto bancario e notifiche. Avrai un riepilogo degli incassi e la lista dei giocatori con il loro stato di pagamento. Ti guidiamo passo passo.' },
  { file: 'cuotas_03_it.mp3', text: 'Iniziamo con la barra delle azioni. Pagamenti apre la gestione delle quote, Stripe collega il tuo account per i pagamenti online, Storico mostra tutti i movimenti, Sphaira Pay gli addebiti automatici con carta, e hai anche Banca e Notifiche.' },
  { file: 'cuotas_gestion_pagos_it.mp3', text: 'Questo è il modal di Gestione dei pagamenti. Qui configuri tutte le quote della stagione: crei quote, definisci importi, date e tipo di addebito — pagamento puntuale, Sphaira Pay o altro. Puoi contrassegnare quote come obbligatorie e vedere la lista completa per modificarle o eliminarle.' },
  { file: 'cuotas_cobros_sphaira_it.mp3', text: 'Questo modal mostra gli Addebiti Sphaira Pay: addebiti programmati con carta salvata, raggruppati per quota. Qui controlla quali quote hanno il pagamento automatico attivato, le date programmate e lo stato di ogni addebito. È il tuo centro di controllo per i pagamenti ricorrenti.' },
  { file: 'cuotas_sphaira_pay_it.mp3', text: 'Questo pulsante apre il modal degli Addebiti Sphaira Pay che hai appena visto. Sphaira Pay permette alle famiglie di salvare la carta e addebitare le quote automaticamente nelle date che configuri. Usalo per ridurre i mancati pagamenti e risparmiare tempo.' },
  { file: 'cuotas_notif_config_it.mp3', text: 'Questo è il modal delle Notifiche Quote. Configura quando e come avvisare i responsabili: scegli i giorni prima della scadenza per inviare il promemoria, attiva la notifica push nell\'app mobile e l\'email con i dettagli del pagamento in sospeso. Salva la configurazione quando hai finito.' },
  { file: 'cuotas_04_it.mp3', text: 'Poi hai il riepilogo. Le schede mostrano il totale giocatori, l\'importo da addebitare, quello già addebitato con la barra di avanzamento e l\'importo pendente. Ti danno una visione rapida dello stato delle quote.' },
  { file: 'cuotas_05_it.mp3', text: 'Per trovare un giocatore specifico, cerca per nome o filtra per tipo di quota. Il filtro permette di vedere solo i giocatori di una o più quote specifiche.' },
  { file: 'cuotas_06_it.mp3', text: 'Qui hai la lista completa. Ogni riga mostra nome, squadra, stato, totale da pagare, pagato, rimanente e avanzamento per quota. Dalle azioni puoi modificare, registrare un pagamento o vedere lo storico del giocatore.' },
  { file: 'cuotas_07_it.mp3', text: 'Ora padroneggi la gestione delle quote. Usa la barra superiore per configurare pagamenti, Sphaira Pay e Stripe, e la tabella per esaminare e registrare gli incassi per giocatore quando ne hai bisogno.' },
];

// ── Generación ─────────────────────────────────────────────────────────────────

async function generateAudio(text, outputPath, voiceId = VOICE_ID, voiceSettings = VOICE_SETTINGS, modelId = MODEL_ID) {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'xi-api-key': API_KEY,
      'Content-Type': 'application/json',
      'Accept': 'audio/mpeg'
    },
    body: JSON.stringify({
      text,
      model_id: modelId,
      voice_settings: voiceSettings
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`ElevenLabs API error ${response.status}: ${errText}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(outputPath, buffer);
}

// ── Notificaciones — EN ───────────────────────────────────────────────────────
const STEPS_NOTIF_EN = [
  { file: 'notif_01_en.mp3', text: 'Notification Management. This screen is your communication hub: send messages to the whole club, individual teams, coaches or specific players. We\'ll guide you through all the features.' },
  { file: 'notif_03_en.mp3', text: 'Compose a message. Click this button to open the composition window. Add multiple recipients, write a subject, type a rich-text body and send immediately or schedule for later.' },
  { file: 'notif_04_en.mp3', text: 'Folders. The sidebar shows three folders: Inbox for received messages, Sent for messages you\'ve sent, and Scheduled for future messages awaiting delivery.' },
  { file: 'notif_05_en.mp3', text: 'Search and mark all as read. Use the search bar to filter by sender, subject or content. The "Mark all as read" button clears all unread indicators at once.' },
  { file: 'notif_06_en.mp3', text: 'Inbox filters. In the Inbox you can filter by All messages, Read or Unread to quickly find what you\'re looking for.' },
  { file: 'notif_07_en.mp3', text: 'Message list. Each row shows the sender, subject and date. Unread messages appear in bold. Click any message to open it in the reading panel.' },
  { file: 'notif_08_en.mp3', text: 'Reading panel. The selected message opens here. You can see the full content, mark it as read or delete it from this panel.' },
  { file: 'notif_09_en.mp3', text: 'You\'re now a messaging expert. Use the sidebar to switch between folders and the compose button whenever you need to contact your club.' },
];

// ── Notificaciones — FR ───────────────────────────────────────────────────────
const STEPS_NOTIF_FR = [
  { file: 'notif_01_fr.mp3', text: 'Gestion des notifications. Cet écran est votre centre de communication : envoyez des messages à tout le club, à des équipes, des entraîneurs ou des joueurs spécifiques. Nous vous guidons pas à pas.' },
  { file: 'notif_03_fr.mp3', text: 'Rédiger un message. Cliquez sur ce bouton pour ouvrir la fenêtre de rédaction. Ajoutez plusieurs destinataires, rédigez objet et corps enrichi, puis envoyez immédiatement ou programmez l\'envoi.' },
  { file: 'notif_04_fr.mp3', text: 'Dossiers. La barre latérale affiche trois dossiers : Reçus pour les messages reçus, Envoyés pour les messages envoyés, et Programmés pour les messages en attente d\'envoi futur.' },
  { file: 'notif_05_fr.mp3', text: 'Recherche et tout marquer comme lu. Utilisez la barre de recherche pour filtrer par expéditeur, objet ou contenu. Le bouton "Tout marquer comme lu" efface tous les indicateurs non lus d\'un coup.' },
  { file: 'notif_06_fr.mp3', text: 'Filtres de la boîte de réception. Dans la boîte de réception, filtrez par Tous les messages, Lus ou Non lus pour trouver rapidement ce que vous cherchez.' },
  { file: 'notif_07_fr.mp3', text: 'Liste des messages. Chaque ligne affiche l\'expéditeur, l\'objet et la date. Les messages non lus apparaissent en gras. Cliquez sur un message pour l\'ouvrir dans le panneau de lecture.' },
  { file: 'notif_08_fr.mp3', text: 'Panneau de lecture. Le message sélectionné s\'ouvre ici. Vous pouvez voir le contenu complet, le marquer comme lu ou le supprimer depuis ce panneau.' },
  { file: 'notif_09_fr.mp3', text: 'Vous maîtrisez désormais la gestion des notifications. Utilisez la barre latérale pour changer de dossier et le bouton Rédiger pour contacter votre club.' },
];

// ── Notificaciones — DE ───────────────────────────────────────────────────────
const STEPS_NOTIF_DE = [
  { file: 'notif_01_de.mp3', text: 'Benachrichtigungsverwaltung. Dieser Bereich ist Ihr Kommunikationszentrum: Senden Sie Nachrichten an den gesamten Verein, einzelne Mannschaften, Trainer oder bestimmte Spieler. Wir führen Sie Schritt für Schritt.' },
  { file: 'notif_03_de.mp3', text: 'Nachricht verfassen. Klicken Sie auf diese Schaltfläche, um das Verfassungsfenster zu öffnen. Fügen Sie mehrere Empfänger hinzu, schreiben Sie Betreff und Text und senden Sie sofort oder planen Sie den Versand.' },
  { file: 'notif_04_de.mp3', text: 'Ordner. Die Seitenleiste zeigt drei Ordner: Eingang für empfangene Nachrichten, Gesendet für gesendete Nachrichten und Geplant für zukünftige Sendungen.' },
  { file: 'notif_05_de.mp3', text: 'Suche und alle als gelesen markieren. Nutzen Sie die Suchleiste zum Filtern nach Absender, Betreff oder Inhalt. Die Schaltfläche "Alle als gelesen markieren" löscht alle Ungelesen-Anzeigen auf einmal.' },
  { file: 'notif_06_de.mp3', text: 'Eingangsfilter. Im Eingang können Sie nach Alle Nachrichten, Gelesen oder Ungelesen filtern, um schnell zu finden, was Sie suchen.' },
  { file: 'notif_07_de.mp3', text: 'Nachrichtenliste. Jede Zeile zeigt Absender, Betreff und Datum. Ungelesene Nachrichten erscheinen fett. Klicken Sie auf eine Nachricht, um sie im Lesebereich zu öffnen.' },
  { file: 'notif_08_de.mp3', text: 'Lesebereich. Die ausgewählte Nachricht öffnet sich hier. Sie können den vollständigen Inhalt sehen, sie als gelesen markieren oder von hier löschen.' },
  { file: 'notif_09_de.mp3', text: 'Sie beherrschen jetzt die Benachrichtigungsverwaltung. Wechseln Sie über die Seitenleiste zwischen Ordnern und nutzen Sie Verfassen, um Ihren Verein zu kontaktieren.' },
];

// ── Notificaciones — PT ───────────────────────────────────────────────────────
const STEPS_NOTIF_PT = [
  { file: 'notif_01_pt.mp3', text: 'Gestão de Notificações. Este ecrã é o seu centro de comunicação: envie mensagens para todo o clube, equipas, treinadores ou jogadores específicos. Vamos guiá-lo passo a passo.' },
  { file: 'notif_03_pt.mp3', text: 'Redigir mensagem. Clique neste botão para abrir a janela de redação. Adicione vários destinatários, escreva assunto e corpo de texto enriquecido, e envie imediatamente ou programe o envio.' },
  { file: 'notif_04_pt.mp3', text: 'Pastas. A barra lateral mostra três pastas: Recebidos para mensagens recebidas, Enviados para mensagens enviadas e Programados para envios futuros.' },
  { file: 'notif_05_pt.mp3', text: 'Pesquisa e marcar tudo como lido. Use a barra de pesquisa para filtrar por remetente, assunto ou conteúdo. O botão "Marcar tudo como lido" limpa todos os indicadores de não lido de uma vez.' },
  { file: 'notif_06_pt.mp3', text: 'Filtros dos Recebidos. Na caixa de entrada pode filtrar por Todas as mensagens, Lidas ou Não lidas para encontrar rapidamente o que procura.' },
  { file: 'notif_07_pt.mp3', text: 'Lista de mensagens. Cada linha mostra o remetente, assunto e data. As mensagens não lidas aparecem a negrito. Clique numa mensagem para a abrir no painel de leitura.' },
  { file: 'notif_08_pt.mp3', text: 'Painel de leitura. A mensagem selecionada abre-se aqui. Pode ver o conteúdo completo, marcá-la como lida ou eliminá-la a partir deste painel.' },
  { file: 'notif_09_pt.mp3', text: 'Já domina a gestão de notificações. Use a barra lateral para mudar de pasta e o botão Redigir sempre que precisar de contactar o seu clube.' },
];

// ── Notificaciones — IT ───────────────────────────────────────────────────────
const STEPS_NOTIF_IT = [
  { file: 'notif_01_it.mp3', text: 'Gestione Notifiche. Questa schermata è il tuo centro di comunicazione: invia messaggi a tutto il club, a singole squadre, allenatori o giocatori specifici. Ti guidiamo passo dopo passo.' },
  { file: 'notif_03_it.mp3', text: 'Redigi un messaggio. Clicca questo pulsante per aprire la finestra di composizione. Aggiungi più destinatari, scrivi oggetto e corpo del testo arricchito e invia subito o programma l\'invio.' },
  { file: 'notif_04_it.mp3', text: 'Cartelle. La barra laterale mostra tre cartelle: Ricevuti per i messaggi ricevuti, Inviati per i messaggi inviati e Programmati per gli invii futuri.' },
  { file: 'notif_05_it.mp3', text: 'Ricerca e segna tutti come letti. Usa la barra di ricerca per filtrare per mittente, oggetto o contenuto. Il pulsante "Segna tutti come letti" rimuove tutti gli indicatori di non letto in una volta sola.' },
  { file: 'notif_06_it.mp3', text: 'Filtri posta in arrivo. Nella posta in arrivo puoi filtrare per Tutti i messaggi, Letti o Non letti per trovare rapidamente ciò che cerchi.' },
  { file: 'notif_07_it.mp3', text: 'Elenco messaggi. Ogni riga mostra il mittente, l\'oggetto e la data. I messaggi non letti appaiono in grassetto. Clicca su un messaggio per aprirlo nel pannello di lettura.' },
  { file: 'notif_08_it.mp3', text: 'Pannello di lettura. Il messaggio selezionato si apre qui. Puoi vedere il contenuto completo, contrassegnarlo come letto o eliminarlo da questo pannello.' },
  { file: 'notif_09_it.mp3', text: 'Ora padroneggi la gestione delle notifiche. Usa la barra laterale per cambiare cartella e il pulsante Redigi quando hai bisogno di contattare il tuo club.' },
];

// ── Staff Club — EN ───────────────────────────────────────────────────────────
const STEPS_STAFF_EN = [
  { file: 'staff_01_en.mp3', text: 'Staff Management. This screen lets you create users with selective access to the club panel. Each staff member only sees and manages the modules you assign. Let\'s see how it works.' },
  { file: 'staff_03_en.mp3', text: 'Actions bar. From here you can see the number of staff users and create a new one. Click "New Staff" to open the creation form where you\'ll set the name, email, password and module permissions.' },
  { file: 'staff_04_en.mp3', text: 'User cards. Each staff member appears as a card showing their name, email and access status. Active users have a green badge, disabled ones an orange badge.' },
  { file: 'staff_05_en.mp3', text: 'Card details. Each card shows the list of assigned permission modules. Use the pencil icon to edit permissions, or the other buttons to disable or delete the user.' },
  { file: 'staff_06_en.mp3', text: 'Staff management done. Remember that each user only accesses what you explicitly assign. Keep permissions updated as the club\'s needs change.' },
];

// ── Staff Club — FR ───────────────────────────────────────────────────────────
const STEPS_STAFF_FR = [
  { file: 'staff_01_fr.mp3', text: 'Gestion du staff. Cet écran vous permet de créer des utilisateurs avec un accès sélectif au panneau du club. Chaque membre du staff ne voit et ne gère que les modules que vous lui assignez. Voyons comment cela fonctionne.' },
  { file: 'staff_03_fr.mp3', text: 'Barre d\'actions. Depuis ici vous pouvez voir le nombre d\'utilisateurs staff et en créer un nouveau. Cliquez sur "Nouveau staff" pour ouvrir le formulaire de création avec nom, email, mot de passe et permissions.' },
  { file: 'staff_04_fr.mp3', text: 'Fiches utilisateurs. Chaque membre du staff apparaît comme une fiche montrant son nom, son email et son statut d\'accès. Les utilisateurs actifs ont un badge vert, les désactivés un badge orange.' },
  { file: 'staff_05_fr.mp3', text: 'Détails de la fiche. Chaque fiche affiche la liste des modules de permission assignés. Utilisez l\'icône crayon pour modifier les permissions, ou les autres boutons pour désactiver ou supprimer l\'utilisateur.' },
  { file: 'staff_06_fr.mp3', text: 'Gestion du staff terminée. Rappellez-vous que chaque utilisateur n\'accède qu\'à ce que vous lui avez assigné. Mettez les permissions à jour selon l\'évolution des besoins du club.' },
];

// ── Staff Club — DE ───────────────────────────────────────────────────────────
const STEPS_STAFF_DE = [
  { file: 'staff_01_de.mp3', text: 'Personalverwaltung. Auf diesem Bildschirm erstellen Sie Benutzer mit selektivem Zugang zum Club-Panel. Jeder Mitarbeiter sieht und verwaltet nur die Module, die Sie ihm zuweisen. Sehen wir uns das an.' },
  { file: 'staff_03_de.mp3', text: 'Aktionsleiste. Hier sehen Sie die Anzahl der Personalbenutzer und können einen neuen anlegen. Klicken Sie auf "Neues Personal", um das Erstellungsformular mit Name, E-Mail, Passwort und Berechtigungen zu öffnen.' },
  { file: 'staff_04_de.mp3', text: 'Benutzerkarten. Jeder Mitarbeiter erscheint als Karte mit Name, E-Mail und Zugangsstatus. Aktive Benutzer haben ein grünes Abzeichen, deaktivierte ein oranges.' },
  { file: 'staff_05_de.mp3', text: 'Kartendetails. Jede Karte zeigt die Liste der zugewiesenen Berechtigungsmodule. Nutzen Sie das Stiftsymbol zum Bearbeiten oder die anderen Schaltflächen zum Deaktivieren oder Löschen des Benutzers.' },
  { file: 'staff_06_de.mp3', text: 'Personalverwaltung abgeschlossen. Denken Sie daran, dass jeder Benutzer nur auf das zugreift, was Sie ihm explizit zuweisen. Halten Sie die Berechtigungen aktuell.' },
];

// ── Staff Club — PT ───────────────────────────────────────────────────────────
const STEPS_STAFF_PT = [
  { file: 'staff_01_pt.mp3', text: 'Gestão de Staff. Este ecrã permite-lhe criar utilizadores com acesso seletivo ao painel do clube. Cada membro do staff só vê e gere os módulos que lhe atribuir. Vamos ver como funciona.' },
  { file: 'staff_03_pt.mp3', text: 'Barra de ações. Aqui pode ver o número de utilizadores staff e criar um novo. Clique em "Novo Staff" para abrir o formulário de criação com nome, email, palavra-passe e permissões de módulos.' },
  { file: 'staff_04_pt.mp3', text: 'Cartões de utilizadores. Cada membro do staff aparece como um cartão com o seu nome, email e estado de acesso. Os utilizadores ativos têm um emblema verde, os desativados um emblema laranja.' },
  { file: 'staff_05_pt.mp3', text: 'Detalhes do cartão. Cada cartão mostra a lista de módulos de permissão atribuídos. Use o ícone de lápis para editar as permissões, ou os outros botões para desativar ou eliminar o utilizador.' },
  { file: 'staff_06_pt.mp3', text: 'Gestão de staff concluída. Lembre-se que cada utilizador só acede ao que lhe atribuir explicitamente. Mantenha as permissões atualizadas à medida que as necessidades do clube evoluem.' },
];

// ── Staff Club — IT ───────────────────────────────────────────────────────────
const STEPS_STAFF_IT = [
  { file: 'staff_01_it.mp3', text: 'Gestione Staff. Questa schermata ti permette di creare utenti con accesso selettivo al pannello del club. Ogni membro dello staff vede e gestisce solo i moduli che gli assegni. Vediamo come funziona.' },
  { file: 'staff_03_it.mp3', text: 'Barra delle azioni. Da qui puoi vedere il numero di utenti staff e crearne uno nuovo. Clicca su "Nuovo Staff" per aprire il modulo di creazione con nome, email, password e permessi dei moduli.' },
  { file: 'staff_04_it.mp3', text: 'Schede utente. Ogni membro dello staff appare come una scheda con nome, email e stato di accesso. Gli utenti attivi hanno un badge verde, quelli disabilitati un badge arancione.' },
  { file: 'staff_05_it.mp3', text: 'Dettagli della scheda. Ogni scheda mostra l\'elenco dei moduli di permesso assegnati. Usa l\'icona matita per modificare i permessi, o gli altri pulsanti per disabilitare o eliminare l\'utente.' },
  { file: 'staff_06_it.mp3', text: 'Gestione staff completata. Ricorda che ogni utente accede solo a ciò che gli hai assegnato esplicitamente. Tieni aggiornati i permessi man mano che le esigenze del club cambiano.' },
];

// ── Scouting Club — EN ────────────────────────────────────────────────────────
const STEPS_SCOUT_EN = [
  { file: 'scout_01_en.mp3', text: 'Club Scouting. This screen is your player observation hub: manage your watchlist, track stages via the pipeline, and compare players side by side. You can add external players, evaluate them, and generate AI reports. Let\'s walk you through it step by step.' },
  { file: 'scout_03_en.mp3', text: 'Settings. Start with module settings. Here you enable or disable the Pipeline, reports, and player comparison. Changes take effect after saving.' },
  { file: 'scout_04_en.mp3', text: 'Tabs. The screen has two views. The watchlist shows all observed players with filters and search, while the Pipeline shows a column view to move players between stages.' },
  { file: 'scout_05_en.mp3', text: 'Watchlist toolbar. In the watchlist you can search by name, filter by pipeline stage, add external players with Add external, and enable compare mode to select up to four players and compare them.' },
  { file: 'scout_06_en.mp3', text: 'Players table. Here you see all observed players. Each row shows name, age, position, team, stage, average rating, and actions to view the profile, add an evaluation, or remove from the list.' },
  { file: 'scout_07_en.mp3', text: 'Pipeline view. With the pipeline enabled, you\'ll see columns by stage: Identified, Observed, Evaluated, Contacted and more. Use the arrows to move players between stages. Discarded players are grouped separately and can be restored.' },
  { file: 'scout_08_en.mp3', text: 'All set. You\'ve mastered the Scouting module. Use the watchlist to evaluate players, the pipeline to organise by stage, and the comparison to analyse several at once whenever you need.' },
];

// ── Scouting Club — FR ────────────────────────────────────────────────────────
const STEPS_SCOUT_FR = [
  { file: 'scout_01_fr.mp3', text: 'Scouting du club. Cet écran est votre hub d\'observation de joueurs : gérez votre liste de suivi, suivez les étapes via le pipeline et comparez les joueurs côte à côte. Vous pouvez ajouter des joueurs externes, les évaluer et générer des rapports IA. Nous vous guidons pas à pas.' },
  { file: 'scout_03_fr.mp3', text: 'Paramètres. Commencez par les paramètres du module. Ici, vous activez ou désactivez le Pipeline, les rapports et la comparaison de joueurs. Les modifications sont appliquées après l\'enregistrement.' },
  { file: 'scout_04_fr.mp3', text: 'Onglets. L\'écran comporte deux vues. La liste de suivi affiche tous les joueurs observés avec filtres et recherche, tandis que le Pipeline présente une vue en colonnes pour déplacer les joueurs entre les étapes.' },
  { file: 'scout_05_fr.mp3', text: 'Barre de la liste de suivi. Dans la liste de suivi, vous pouvez rechercher par nom, filtrer par étape du pipeline, ajouter des joueurs externes et activer le mode comparaison pour sélectionner jusqu\'à quatre joueurs.' },
  { file: 'scout_06_fr.mp3', text: 'Tableau des joueurs. Ici, vous voyez tous les joueurs observés. Chaque ligne affiche nom, âge, position, équipe, statut, note moyenne et les actions pour voir la fiche, ajouter une évaluation ou retirer de la liste.' },
  { file: 'scout_07_fr.mp3', text: 'Vue Pipeline. Avec le pipeline activé, vous verrez des colonnes par étape : Identifié, Observé, Évalué, Contacté et plus encore. Utilisez les flèches pour déplacer les joueurs entre les étapes. Les joueurs écartés sont regroupés séparément et peuvent être restaurés.' },
  { file: 'scout_08_fr.mp3', text: 'Terminé. Vous maîtrisez désormais le module Scouting. Utilisez la liste de suivi pour évaluer les joueurs, le pipeline pour organiser par étape et la comparaison pour analyser plusieurs joueurs à la fois.' },
];

// ── Scouting Club — DE ────────────────────────────────────────────────────────
const STEPS_SCOUT_DE = [
  { file: 'scout_01_de.mp3', text: 'Club-Scouting. Dieser Bildschirm ist Ihr Beobachtungs-Hub: Verwalten Sie Ihre Beobachtungsliste, verfolgen Sie Phasen über die Pipeline und vergleichen Sie Spieler nebeneinander. Sie können externe Spieler hinzufügen, bewerten und KI-Berichte erstellen. Wir führen Sie Schritt für Schritt.' },
  { file: 'scout_03_de.mp3', text: 'Einstellungen. Beginnen Sie mit den Moduleinstellungen. Hier aktivieren oder deaktivieren Sie die Pipeline, Berichte und den Spielervergleich. Änderungen werden nach dem Speichern wirksam.' },
  { file: 'scout_04_de.mp3', text: 'Registerkarten. Der Bildschirm hat zwei Ansichten. Die Beobachtungsliste zeigt alle beobachteten Spieler mit Filtern und Suche, während die Pipeline eine Spaltenansicht zum Verschieben von Spielern zwischen Phasen bietet.' },
  { file: 'scout_05_de.mp3', text: 'Werkzeugleiste der Beobachtungsliste. In der Beobachtungsliste können Sie nach Name suchen, nach Pipeline-Phase filtern, externe Spieler hinzufügen und den Vergleichsmodus für bis zu vier Spieler aktivieren.' },
  { file: 'scout_06_de.mp3', text: 'Spielertabelle. Hier sehen Sie alle beobachteten Spieler. Jede Zeile zeigt Name, Alter, Position, Verein, Status, Durchschnittsbewertung und Aktionen zum Anzeigen des Profils, Hinzufügen einer Bewertung oder Entfernen aus der Liste.' },
  { file: 'scout_07_de.mp3', text: 'Pipeline-Ansicht. Mit aktivierter Pipeline sehen Sie Spalten nach Phase: Identifiziert, Beobachtet, Bewertet, Kontaktiert und mehr. Verwenden Sie die Pfeile, um Spieler zwischen Phasen zu verschieben. Verworfene Spieler werden getrennt gruppiert und können wiederhergestellt werden.' },
  { file: 'scout_08_de.mp3', text: 'Fertig. Sie beherrschen jetzt das Scouting-Modul. Nutzen Sie die Beobachtungsliste zur Bewertung, die Pipeline zur Phasenorganisation und den Vergleich zur gleichzeitigen Analyse mehrerer Spieler.' },
];

// ── Scouting Club — PT ────────────────────────────────────────────────────────
const STEPS_SCOUT_PT = [
  { file: 'scout_01_pt.mp3', text: 'Scouting do clube. Este ecrã é o seu hub de observação de jogadores: gira a sua lista de observação, acompanhe as fases via pipeline e compare jogadores lado a lado. Pode adicionar jogadores externos, avaliá-los e gerar relatórios com IA. Guiamo-lo passo a passo.' },
  { file: 'scout_03_pt.mp3', text: 'Configurações. Comece pelas configurações do módulo. Aqui ativa ou desativa o Pipeline, os relatórios e a comparação de jogadores. As alterações são aplicadas após guardar.' },
  { file: 'scout_04_pt.mp3', text: 'Separadores. O ecrã tem duas vistas. A lista de observação mostra todos os jogadores observados com filtros e pesquisa, enquanto o Pipeline apresenta uma vista em colunas para mover jogadores entre fases.' },
  { file: 'scout_05_pt.mp3', text: 'Barra da lista de observação. Na lista de observação pode pesquisar por nome, filtrar por fase do pipeline, adicionar jogadores externos e ativar o modo comparação para selecionar até quatro jogadores.' },
  { file: 'scout_06_pt.mp3', text: 'Tabela de jogadores. Aqui vê todos os jogadores observados. Cada linha mostra nome, idade, posição, equipa, estado, avaliação média e ações para ver a ficha, adicionar uma avaliação ou remover da lista.' },
  { file: 'scout_07_pt.mp3', text: 'Vista Pipeline. Com o pipeline ativado, verá colunas por fase: Identificado, Observado, Avaliado, Contactado e mais. Use as setas para mover jogadores entre fases. Os jogadores descartados são agrupados separadamente e podem ser restaurados.' },
  { file: 'scout_08_pt.mp3', text: 'Concluído. Já domina o módulo de Scouting. Use a lista de observação para avaliar jogadores, o pipeline para organizar por fase e a comparação para analisar vários ao mesmo tempo.' },
];

// ── Scouting Club — IT ────────────────────────────────────────────────────────
const STEPS_SCOUT_IT = [
  { file: 'scout_01_it.mp3', text: 'Scouting del club. Questa schermata è il tuo hub di osservazione giocatori: gestisci la tua lista di osservazione, monitora le fasi tramite il pipeline e confronta i giocatori fianco a fianco. Puoi aggiungere giocatori esterni, valutarli e generare report con l\'IA. Ti guidiamo passo dopo passo.' },
  { file: 'scout_03_it.mp3', text: 'Impostazioni. Inizia con le impostazioni del modulo. Qui attivi o disattivi il Pipeline, i report e il confronto giocatori. Le modifiche vengono applicate dopo il salvataggio.' },
  { file: 'scout_04_it.mp3', text: 'Schede. La schermata ha due viste. La lista di osservazione mostra tutti i giocatori osservati con filtri e ricerca, mentre il Pipeline presenta una vista a colonne per spostare i giocatori tra le fasi.' },
  { file: 'scout_05_it.mp3', text: 'Barra della lista di osservazione. Nella lista di osservazione puoi cercare per nome, filtrare per fase del pipeline, aggiungere giocatori esterni e attivare la modalità confronto per selezionare fino a quattro giocatori.' },
  { file: 'scout_06_it.mp3', text: 'Tabella giocatori. Qui vedi tutti i giocatori osservati. Ogni riga mostra nome, età, posizione, squadra, stato, valutazione media e azioni per visualizzare il profilo, aggiungere una valutazione o rimuovere dalla lista.' },
  { file: 'scout_07_it.mp3', text: 'Vista Pipeline. Con il pipeline attivato, vedrai colonne per fase: Identificato, Osservato, Valutato, Contattato e altro. Usa le frecce per spostare i giocatori tra le fasi. I giocatori scartati sono raggruppati separatamente e possono essere ripristinati.' },
  { file: 'scout_08_it.mp3', text: 'Completato. Hai padroneggiato il modulo Scouting. Usa la lista di osservazione per valutare i giocatori, il pipeline per organizzare per fase e il confronto per analizzare più giocatori contemporaneamente.' },
];

// ── Club Videos — EN ──────────────────────────────────────────────────────────
const STEPS_VIDEOS_EN = [
  { file: 'videos_01_en.mp3', text: 'Video Library. This screen is where you manage all club videos: upload files from your device, import from Google Drive, add YouTube or Vimeo links, and organise them in seasonal folders. Let us explain each part.' },
  { file: 'videos_03_en.mp3', text: 'Header actions. Start with the header actions. Manage plan or Get storage opens available plans. Upload video uploads a file from your device, Import from Drive brings videos from Google Drive, and Add link adds a YouTube or Vimeo URL without using storage.' },
  { file: 'videos_04_en.mp3', text: 'Storage usage. Just below you can see your storage status: active plan, space used, and total limit. If you don\'t have a plan, a banner will appear to get storage.' },
  { file: 'videos_05_en.mp3', text: 'Folders. On the left you have the folder organiser. You can view all videos, those without a folder, or the folders you\'ve created. The people button syncs team folders and the folder-plus button creates a new one.' },
  { file: 'videos_06_en.mp3', text: 'Search and folder filter. To find a specific video, search by title, player or tag. If a folder is selected, a breadcrumb appears that you can clear to see all videos again.' },
  { file: 'videos_07_en.mp3', text: 'Video grid. And here are all your videos. Each card shows thumbnail, title, player, folder, tags, and date. From the actions you can play, export to Drive, analyse the video, move it to a folder, or delete it.' },
  { file: 'videos_08_en.mp3', text: 'All set. You\'ve mastered the Video Library. Upload or link videos, organise them in folders, and use Analyse video to tag plays in the Video Analysis module whenever you need.' },
];

// ── Club Videos — FR ──────────────────────────────────────────────────────────
const STEPS_VIDEOS_FR = [
  { file: 'videos_01_fr.mp3', text: 'Bibliothèque de Vidéos. Cet écran vous permet de gérer toutes les vidéos du club : téléversez des fichiers depuis votre appareil, importez depuis Google Drive, ajoutez des liens YouTube ou Vimeo et organisez-les dans des dossiers par saison. Nous vous expliquons chaque partie.' },
  { file: 'videos_03_fr.mp3', text: 'Actions du header. Commençons par les actions du header. Gérer le plan ou Obtenir un stockage ouvre les plans disponibles. Téléverser une vidéo envoie un fichier depuis votre appareil, Importer depuis Drive amène des vidéos de Google Drive, et Ajouter un lien ajoute une URL YouTube ou Vimeo sans consommer d\'espace.' },
  { file: 'videos_04_fr.mp3', text: 'Utilisation du stockage. Juste en dessous, vous voyez l\'état de votre stockage : plan actif, espace utilisé et limite totale. Si vous n\'avez pas de plan, une bannière apparaîtra pour en obtenir un.' },
  { file: 'videos_05_fr.mp3', text: 'Dossiers. À gauche, vous avez l\'organisateur de dossiers. Vous pouvez voir toutes les vidéos, celles sans dossier, ou les dossiers que vous avez créés. Le bouton personnes synchronise les dossiers d\'équipe et le bouton dossier-plus en crée un nouveau.' },
  { file: 'videos_06_fr.mp3', text: 'Recherche et filtre par dossier. Pour trouver une vidéo spécifique, recherchez par titre, joueur ou étiquette. Si un dossier est sélectionné, un fil d\'Ariane apparaît que vous pouvez supprimer pour voir toutes les vidéos à nouveau.' },
  { file: 'videos_07_fr.mp3', text: 'Grille de vidéos. Et ici, toutes vos vidéos. Chaque carte affiche miniature, titre, joueur, dossier, étiquettes et date. Depuis les actions, vous pouvez lire, exporter vers Drive, analyser la vidéo, la déplacer ou la supprimer.' },
  { file: 'videos_08_fr.mp3', text: 'Terminé. Vous maîtrisez la Bibliothèque de Vidéos. Téléversez ou liez des vidéos, organisez-les dans des dossiers et utilisez Analyser la vidéo pour étiqueter des actions dans le module Analyse Vidéo.' },
];

// ── Club Videos — DE ──────────────────────────────────────────────────────────
const STEPS_VIDEOS_DE = [
  { file: 'videos_01_de.mp3', text: 'Videobibliothek. Auf diesem Bildschirm verwalten Sie alle Club-Videos: Laden Sie Dateien von Ihrem Gerät hoch, importieren Sie von Google Drive, fügen Sie YouTube- oder Vimeo-Links hinzu und organisieren Sie sie in saisonalen Ordnern. Wir erklären jeden Teil.' },
  { file: 'videos_03_de.mp3', text: 'Header-Aktionen. Beginnen Sie mit den Header-Aktionen. Plan verwalten oder Speicher kaufen öffnet die verfügbaren Pläne. Video hochladen lädt eine Datei von Ihrem Gerät hoch, Von Drive importieren holt Videos von Google Drive, und Link hinzufügen fügt eine YouTube- oder Vimeo-URL ohne Speicherverbrauch hinzu.' },
  { file: 'videos_04_de.mp3', text: 'Speichernutzung. Direkt darunter sehen Sie Ihren Speicherstatus: aktiver Plan, verwendeter Speicher und Gesamtlimit. Wenn Sie keinen Plan haben, erscheint ein Banner zum Kauf.' },
  { file: 'videos_05_de.mp3', text: 'Ordner. Links haben Sie den Ordner-Organiser. Sie können alle Videos, Videos ohne Ordner oder Ihre erstellten Ordner sehen. Der Personen-Button synchronisiert Team-Ordner und der Ordner-Plus-Button erstellt einen neuen.' },
  { file: 'videos_06_de.mp3', text: 'Suche und Ordnerfilter. Um ein bestimmtes Video zu finden, suchen Sie nach Titel, Spieler oder Tag. Bei ausgewähltem Ordner erscheint ein Breadcrumb, den Sie entfernen können, um alle Videos wieder zu sehen.' },
  { file: 'videos_07_de.mp3', text: 'Video-Raster. Und hier sind alle Ihre Videos. Jede Karte zeigt Vorschaubild, Titel, Spieler, Ordner, Tags und Datum. Über die Aktionen können Sie abspielen, nach Drive exportieren, das Video analysieren, verschieben oder löschen.' },
  { file: 'videos_08_de.mp3', text: 'Fertig. Sie beherrschen die Videobibliothek. Laden Sie Videos hoch oder verknüpfen Sie sie, organisieren Sie sie in Ordnern und nutzen Sie Video analysieren, um Spielzüge im Videoanalyse-Modul zu taggen.' },
];

// ── Club Videos — PT ──────────────────────────────────────────────────────────
const STEPS_VIDEOS_PT = [
  { file: 'videos_01_pt.mp3', text: 'Biblioteca de Vídeos. Este ecrã é onde gere todos os vídeos do clube: carregue ficheiros do seu dispositivo, importe do Google Drive, adicione links do YouTube ou Vimeo e organize-os em pastas por temporada. Explicamos cada parte.' },
  { file: 'videos_03_pt.mp3', text: 'Ações do cabeçalho. Comecemos pelas ações do cabeçalho. Gerir plano ou Contratar armazenamento abre os planos disponíveis. Carregar vídeo envia um ficheiro do seu dispositivo, Importar do Drive traz vídeos do Google Drive, e Adicionar link adiciona um URL do YouTube ou Vimeo sem consumir espaço.' },
  { file: 'videos_04_pt.mp3', text: 'Uso do armazenamento. Logo abaixo vê o estado do seu armazenamento: plano ativo, espaço utilizado e limite total. Se não tiver plano, aparecerá um banner para contratar armazenamento.' },
  { file: 'videos_05_pt.mp3', text: 'Pastas. À esquerda tem o organizador de pastas. Pode ver todos os vídeos, os sem pasta, ou as pastas que criou. O botão de pessoas sincroniza pastas de equipa e o de pasta-mais cria uma nova.' },
  { file: 'videos_06_pt.mp3', text: 'Pesquisa e filtro por pasta. Para encontrar um vídeo específico, pesquise por título, jogador ou etiqueta. Se uma pasta estiver selecionada, aparece um breadcrumb que pode remover para ver todos os vídeos novamente.' },
  { file: 'videos_07_pt.mp3', text: 'Grelha de vídeos. E aqui estão todos os seus vídeos. Cada cartão mostra miniatura, título, jogador, pasta, etiquetas e data. Nas ações pode reproduzir, exportar para Drive, analisar o vídeo, mover para pasta ou eliminar.' },
  { file: 'videos_08_pt.mp3', text: 'Concluído. Já domina a Biblioteca de Vídeos. Carregue ou ligue vídeos, organize-os em pastas e use Analisar vídeo para etiquetar jogadas no módulo de Análise de Vídeo.' },
];

// ── Demo Role — ES ────────────────────────────────────────────────────────────
const STEPS_DR_ES = [
  { file: 'demo_role_00.mp3', text: 'Estás en la pantalla de selección de rol en modo demostración. Puedes probar la aplicación como Club, Entrenador o Jugador. Te explicamos cada opción; al final elige la que quieras para entrar.' },
  { file: 'demo_role_01.mp3', text: 'Si eliges el rol de Club, entrarás en el panel de quien lleva las riendas del día a día: equipos, cuadro de mandos, cuotas, documentos y toda la estructura del club. Pulsa esta tarjeta cuando quieras explorar esa experiencia.' },
  { file: 'demo_role_02.mp3', text: 'Como Entrenador verás la app con ojos de cuerpo técnico: tus equipos, las tareas de entrenamiento, el calendario, los jugadores y sus estadísticas. Todo lo que necesitas para dirigir desde la banda. Pulsa aquí para vivir esa perspectiva.' },
  { file: 'demo_role_03.mp3', text: 'Y si eliges Jugador, accederás a la vista de quien juega en el campo: mis datos, calendario de partidos y entrenamientos, cuotas, documentación y galería del equipo. Pulsa esta tarjeta para explorar como uno más de la plantilla.' },
  { file: 'demo_role_04.mp3', text: 'Ya conoces los tres roles. Selecciona el que quieras para entrar en la aplicación y explorar la plataforma.' },
];

// ── Demo Role — EN ────────────────────────────────────────────────────────────
const STEPS_DR_EN = [
  { file: 'demo_role_00_en.mp3', text: 'You are on the role selection screen in demo mode. You can try the application as Club, Coach or Player. We will explain each option; at the end choose the one you want to enter.' },
  { file: 'demo_role_01_en.mp3', text: 'If you choose the Club role, you will enter the panel of whoever runs the day-to-day: teams, dashboard, fees, documents and the whole club structure. Tap this card whenever you want to explore that experience.' },
  { file: 'demo_role_02_en.mp3', text: 'As a Coach you will see the app through the eyes of the coaching staff: your teams, training tasks, calendar, players and their statistics. Everything you need to lead from the touchline. Tap here to live that perspective.' },
  { file: 'demo_role_03_en.mp3', text: 'And if you choose Player, you will access the view of someone who plays on the pitch: my data, match and training calendar, fees, documentation and team gallery. Tap this card to explore as one of the squad.' },
  { file: 'demo_role_04_en.mp3', text: 'You now know all three roles. Select the one you want to enter the application and explore the platform.' },
];

// ── Demo Role — FR ────────────────────────────────────────────────────────────
const STEPS_DR_FR = [
  { file: 'demo_role_00_fr.mp3', text: 'Vous êtes sur l\'écran de sélection de rôle en mode démonstration. Vous pouvez essayer l\'application en tant que Club, Entraîneur ou Joueur. Nous vous expliquons chaque option ; à la fin choisissez celle que vous souhaitez.' },
  { file: 'demo_role_01_fr.mp3', text: 'Si vous choisissez le rôle Club, vous entrerez dans le panneau de gestion quotidienne : équipes, tableau de bord, cotisations, documents et toute la structure du club. Appuyez sur cette carte pour explorer cette expérience.' },
  { file: 'demo_role_02_fr.mp3', text: 'En tant qu\'Entraîneur, vous verrez l\'application avec les yeux du corps technique : vos équipes, les tâches d\'entraînement, le calendrier, les joueurs et leurs statistiques. Tout ce qu\'il faut pour diriger depuis la touche. Appuyez ici pour vivre cette perspective.' },
  { file: 'demo_role_03_fr.mp3', text: 'Et si vous choisissez Joueur, vous accéderez à la vue de celui qui joue sur le terrain : mes données, calendrier des matchs et entraînements, cotisations, documentation et galerie de l\'équipe. Appuyez sur cette carte pour explorer en tant que membre de l\'équipe.' },
  { file: 'demo_role_04_fr.mp3', text: 'Vous connaissez maintenant les trois rôles. Sélectionnez celui que vous souhaitez pour entrer dans l\'application et explorer la plateforme.' },
];

// ── Demo Role — DE ────────────────────────────────────────────────────────────
const STEPS_DR_DE = [
  { file: 'demo_role_00_de.mp3', text: 'Sie befinden sich auf der Rollenauswahlseite im Demo-Modus. Sie können die App als Verein, Trainer oder Spieler ausprobieren. Wir erklären jede Option; wählen Sie am Ende die gewünschte Rolle, um einzusteigen.' },
  { file: 'demo_role_01_de.mp3', text: 'Wenn Sie die Vereinsrolle wählen, gelangen Sie in das Panel der täglichen Verwaltung: Teams, Dashboard, Beiträge, Dokumente und die gesamte Vereinsstruktur. Tippen Sie auf diese Karte, um dieses Erlebnis zu erkunden.' },
  { file: 'demo_role_02_de.mp3', text: 'Als Trainer sehen Sie die App mit den Augen des Trainerstabes: Ihre Teams, Trainingsaufgaben, Kalender, Spieler und deren Statistiken. Alles, was Sie brauchen, um von der Seitenlinie aus zu führen. Tippen Sie hier, um diese Perspektive zu erleben.' },
  { file: 'demo_role_03_de.mp3', text: 'Und wenn Sie Spieler wählen, gelangen Sie zur Ansicht desjenigen, der auf dem Platz spielt: meine Daten, Spiel- und Trainingskalender, Beiträge, Dokumentation und Teamgalerie. Tippen Sie auf diese Karte, um als Kadermitglied zu erkunden.' },
  { file: 'demo_role_04_de.mp3', text: 'Sie kennen jetzt alle drei Rollen. Wählen Sie die gewünschte aus, um die Anwendung zu betreten und die Plattform zu erkunden.' },
];

// ── Demo Role — PT ────────────────────────────────────────────────────────────
const STEPS_DR_PT = [
  { file: 'demo_role_00_pt.mp3', text: 'Está no ecrã de seleção de papel no modo demonstração. Pode experimentar a aplicação como Clube, Treinador ou Jogador. Explicamos cada opção; no final escolha a que quiser para entrar.' },
  { file: 'demo_role_01_pt.mp3', text: 'Se escolher o papel de Clube, entrará no painel de quem gere o dia a dia: equipas, painel de controlo, quotas, documentos e toda a estrutura do clube. Toque neste cartão para explorar essa experiência.' },
  { file: 'demo_role_02_pt.mp3', text: 'Como Treinador verá a app com olhos da equipa técnica: as suas equipas, tarefas de treino, calendário, jogadores e as suas estatísticas. Tudo o que precisa para dirigir a partir do banco. Toque aqui para viver essa perspetiva.' },
  { file: 'demo_role_03_pt.mp3', text: 'E se escolher Jogador, acederá à vista de quem joga em campo: os meus dados, calendário de jogos e treinos, quotas, documentação e galeria da equipa. Toque neste cartão para explorar como um membro do plantel.' },
  { file: 'demo_role_04_pt.mp3', text: 'Já conhece os três papéis. Selecione o que quiser para entrar na aplicação e explorar a plataforma.' },
];

// ── Demo Role — IT ────────────────────────────────────────────────────────────
const STEPS_DR_IT = [
  { file: 'demo_role_00_it.mp3', text: 'Sei nella schermata di selezione del ruolo in modalità dimostrazione. Puoi provare l\'applicazione come Club, Allenatore o Giocatore. Spieghiamo ogni opzione; alla fine scegli quella che vuoi per accedere.' },
  { file: 'demo_role_01_it.mp3', text: 'Se scegli il ruolo Club, entrerai nel pannello di chi gestisce il quotidiano: squadre, cruscotto, quote, documenti e tutta la struttura del club. Tocca questa scheda per esplorare quell\'esperienza.' },
  { file: 'demo_role_02_it.mp3', text: 'Come Allenatore vedrai l\'app con gli occhi dello staff tecnico: le tue squadre, i compiti di allenamento, il calendario, i giocatori e le loro statistiche. Tutto ciò che ti serve per guidare dalla panchina. Tocca qui per vivere quella prospettiva.' },
  { file: 'demo_role_03_it.mp3', text: 'E se scegli Giocatore, accederai alla vista di chi gioca in campo: i miei dati, calendario di partite e allenamenti, quote, documentazione e galleria della squadra. Tocca questa scheda per esplorare come un membro della rosa.' },
  { file: 'demo_role_04_it.mp3', text: 'Ora conosci i tre ruoli. Seleziona quello che vuoi per entrare nell\'applicazione ed esplorare la piattaforma.' },
];

// ── /dashboard/video-analysis ────────────────────────────────────────────────
const STEPS_VA_EN = [
  { file: 'va_01_en.mp3', text: 'From here you create and manage video tagging projects: upload a local file, choose a category template, tag plays and create playlists you can share with the team. We will guide you step by step.' },
  { file: 'va_03_en.mp3', text: 'Let\'s start with quick actions. Templates manages tagging categories, Playlists creates and shares clip lists, and Library links to the club\'s Video Library.' },
  { file: 'va_04_en.mp3', text: 'The status cards let you filter the project list. Click Total, In Progress, Completed or Drafts to see only analyses in that state.' },
  { file: 'va_05_en.mp3', text: 'The toolbar shows the analysis counter, search by title and the New Analysis button to create a project: title, description, local video file and template.' },
  { file: 'va_06_en.mp3', text: 'Here you see all your analysis projects. Each card shows the status, title, description, video source and date. Click a card to open the tagging workspace.' },
  { file: 'va_07_en.mp3', text: 'You now know Video Analysis. Create analyses with New Analysis, configure your templates if needed and open a project to tag plays and create clips whenever you need.' },
];
const STEPS_VA_FR = [
  { file: 'va_01_fr.mp3', text: 'Depuis ici vous créez et gérez des projets de balisage vidéo : téléchargez un fichier local, choisissez un modèle de catégories, balisez des actions et créez des playlists à partager avec l\'équipe. Nous vous guidons étape par étape.' },
  { file: 'va_03_fr.mp3', text: 'Commençons par les actions rapides. Modèles gère les catégories de balisage, Playlists crée et partage des listes de clips, et Bibliothèque renvoie à la Vidéothèque du club.' },
  { file: 'va_04_fr.mp3', text: 'Les cartes de statut vous permettent de filtrer la liste des projets. Cliquez sur Total, En cours, Terminés ou Brouillons pour afficher uniquement les analyses dans cet état.' },
  { file: 'va_05_fr.mp3', text: 'La barre affiche le compteur d\'analyses, la recherche par titre et le bouton Nouvelle analyse pour créer un projet : titre, description, fichier vidéo local et modèle.' },
  { file: 'va_06_fr.mp3', text: 'Ici vous voyez tous vos projets d\'analyse. Chaque carte affiche le statut, le titre, la description, la source vidéo et la date. Cliquez sur une carte pour ouvrir le workspace de balisage.' },
  { file: 'va_07_fr.mp3', text: 'Vous maîtrisez maintenant l\'Analyse Vidéo. Créez des analyses avec Nouvelle analyse, configurez vos modèles si besoin et ouvrez un projet pour baliser des actions et créer des clips quand vous en avez besoin.' },
];
const STEPS_VA_DE = [
  { file: 'va_01_de.mp3', text: 'Von hier aus erstellen und verwalten Sie Video-Tagging-Projekte: Laden Sie eine lokale Datei hoch, wählen Sie eine Kategorienvorlage, taggen Sie Spielzüge und erstellen Sie Playlists zum Teilen mit dem Team. Wir führen Sie Schritt für Schritt.' },
  { file: 'va_03_de.mp3', text: 'Beginnen wir mit den Schnellaktionen. Vorlagen verwaltet Tagging-Kategorien, Playlists erstellt und teilt Clip-Listen, und Bibliothek verlinkt zur Video-Bibliothek des Vereins.' },
  { file: 'va_04_de.mp3', text: 'Die Statuskarten ermöglichen es Ihnen, die Projektliste zu filtern. Klicken Sie auf Gesamt, In Bearbeitung, Abgeschlossen oder Entwürfe, um nur Analysen in diesem Status zu sehen.' },
  { file: 'va_05_de.mp3', text: 'Die Werkzeugleiste zeigt den Analysezähler, die Suche nach Titel und die Schaltfläche Neue Analyse zum Erstellen eines Projekts: Titel, Beschreibung, lokale Videodatei und Vorlage.' },
  { file: 'va_06_de.mp3', text: 'Hier sehen Sie alle Ihre Analyseprojekte. Jede Karte zeigt den Status, Titel, Beschreibung, Videoquelle und Datum. Klicken Sie auf eine Karte, um den Tagging-Workspace zu öffnen.' },
  { file: 'va_07_de.mp3', text: 'Sie beherrschen jetzt die Videoanalyse. Erstellen Sie Analysen mit Neue Analyse, konfigurieren Sie bei Bedarf Ihre Vorlagen und öffnen Sie ein Projekt, um Spielzüge zu taggen und Clips zu erstellen.' },
];
const STEPS_VA_PT = [
  { file: 'va_01_pt.mp3', text: 'Daqui cria e gere projetos de etiquetagem de vídeo: carrega um ficheiro local, escolhe um modelo de categorias, etiqueta jogadas e cria playlists para partilhar com a equipa. Guiamo-lo passo a passo.' },
  { file: 'va_03_pt.mp3', text: 'Comecemos pelas ações rápidas. Modelos gere as categorias de etiquetagem, Playlists cria e partilha listas de clips, e Biblioteca liga à Biblioteca de Vídeos do clube.' },
  { file: 'va_04_pt.mp3', text: 'Os cartões de estado permitem filtrar a lista de projetos. Clique em Total, Em progresso, Concluídos ou Rascunhos para ver apenas as análises nesse estado.' },
  { file: 'va_05_pt.mp3', text: 'A barra mostra o contador de análises, a pesquisa por título e o botão Nova análise para criar um projeto: título, descrição, ficheiro de vídeo local e modelo.' },
  { file: 'va_06_pt.mp3', text: 'Aqui vê todos os seus projetos de análise. Cada cartão mostra o estado, título, descrição, origem do vídeo e data. Clique num cartão para abrir o workspace de etiquetagem.' },
  { file: 'va_07_pt.mp3', text: 'Já domina a Análise de Vídeo. Crie análises com Nova análise, configure os seus modelos se necessário e abra um projeto para etiquetar jogadas e criar clips quando precisar.' },
];
const STEPS_VA_IT = [
  { file: 'va_01_it.mp3', text: 'Da qui crei e gestisci progetti di tagging video: carica un file locale, scegli un modello di categorie, tagga le azioni e crea playlist da condividere con il team. Ti guidiamo passo dopo passo.' },
  { file: 'va_03_it.mp3', text: 'Iniziamo dalle azioni rapide. Modelli gestisce le categorie di tagging, Playlist crea e condivide liste di clip, e Libreria collega alla Libreria Video del club.' },
  { file: 'va_04_it.mp3', text: 'Le schede di stato ti permettono di filtrare l\'elenco dei progetti. Clicca su Totale, In corso, Completati o Bozze per vedere solo le analisi in quello stato.' },
  { file: 'va_05_it.mp3', text: 'La barra mostra il contatore delle analisi, la ricerca per titolo e il pulsante Nuova analisi per creare un progetto: titolo, descrizione, file video locale e modello.' },
  { file: 'va_06_it.mp3', text: 'Qui vedi tutti i tuoi progetti di analisi. Ogni scheda mostra lo stato, il titolo, la descrizione, la sorgente video e la data. Clicca su una scheda per aprire il workspace di tagging.' },
  { file: 'va_07_it.mp3', text: 'Ora padroneggi l\'Analisi Video. Crea analisi con Nuova analisi, configura i tuoi modelli se necessario e apri un progetto per taggare le azioni e creare clip quando ne hai bisogno.' },
];

// ── /dashboard/asistente-ia ──────────────────────────────────────────────────
const STEPS_ASISTENTE_EN = [
  { file: 'asistente_01_en.mp3', text: 'This is the club\'s artificial intelligence chat. Ask questions, request summaries or have it perform actions such as querying data or creating elements. Each message uses credits; the balance is shown in the header. Let us walk you through each part.' },
  { file: 'asistente_03_en.mp3', text: 'On the left you have the history of previous conversations. The plus button starts a new conversation; click an entry to load it, and the trash icon deletes it.' },
  { file: 'asistente_04_en.mp3', text: 'This button opens or closes the history panel to gain screen space whenever you need it.' },
  { file: 'asistente_05_en.mp3', text: 'In the chat header you can see the assistant title, status indicator and available credits. Click the credits to view details or purchase more.' },
  { file: 'asistente_06_en.mp3', text: 'Here your messages and the assistant\'s replies are displayed. Replies may include actions you need to confirm or cancel. The assistant will show an indicator while generating a response.' },
  { file: 'asistente_07_en.mp3', text: 'To get started quickly, when you begin a conversation you will see suggestion chips with common questions or tasks. Click one to send it directly and get an immediate response.' },
  { file: 'asistente_08_en.mp3', text: 'To type your query, use the text area and press Send or Enter. If voice is supported, the microphone lets you dictate. During a response you can cancel with the X button.' },
  { file: 'asistente_09_en.mp3', text: 'You now know the AI Assistant. Use suggestions or write freely, check your credits and confirm the actions the assistant proposes whenever you need.' },
];
const STEPS_ASISTENTE_FR = [
  { file: 'asistente_01_fr.mp3', text: 'Voici le chat d\'intelligence artificielle du club. Posez des questions, demandez des résumés ou faites-lui exécuter des actions comme consulter des données ou créer des éléments. Chaque message consomme des crédits ; le solde s\'affiche dans l\'en-tête. Nous vous expliquons chaque partie.' },
  { file: 'asistente_03_fr.mp3', text: 'À gauche vous trouvez l\'historique des conversations précédentes. Le bouton plus démarre une nouvelle conversation ; cliquez sur une entrée pour la charger, et la corbeille la supprime.' },
  { file: 'asistente_04_fr.mp3', text: 'Ce bouton ouvre ou ferme le panneau d\'historique pour gagner de l\'espace à l\'écran quand vous en avez besoin.' },
  { file: 'asistente_05_fr.mp3', text: 'Dans l\'en-tête du chat vous voyez le titre de l\'assistant, l\'indicateur de statut et les crédits disponibles. Cliquez sur les crédits pour voir les détails ou en acheter davantage.' },
  { file: 'asistente_06_fr.mp3', text: 'Ici s\'affichent vos messages et les réponses de l\'assistant. Les réponses peuvent inclure des actions que vous devez confirmer ou annuler. L\'assistant affichera un indicateur pendant qu\'il génère la réponse.' },
  { file: 'asistente_07_fr.mp3', text: 'Pour démarrer rapidement, au début d\'une conversation vous verrez des chips de suggestion avec des questions ou tâches fréquentes. Cliquez sur l\'une pour l\'envoyer directement et obtenir une réponse immédiate.' },
  { file: 'asistente_08_fr.mp3', text: 'Pour saisir votre requête, utilisez la zone de texte et appuyez sur Envoyer ou Entrée. Si la voix est supportée, le microphone vous permet de dicter. Pendant une réponse vous pouvez annuler avec le bouton X.' },
  { file: 'asistente_09_fr.mp3', text: 'Vous maîtrisez maintenant l\'Assistant IA. Utilisez les suggestions ou écrivez librement, vérifiez vos crédits et confirmez les actions que l\'assistant vous propose quand vous en avez besoin.' },
];
const STEPS_ASISTENTE_DE = [
  { file: 'asistente_01_de.mp3', text: 'Dies ist der KI-Chat des Vereins. Stellen Sie Fragen, fordern Sie Zusammenfassungen an oder lassen Sie ihn Aktionen ausführen wie Daten abfragen oder Elemente erstellen. Jede Nachricht verbraucht Guthaben; der Saldo wird in der Kopfzeile angezeigt. Wir erklären Ihnen jeden Teil.' },
  { file: 'asistente_03_de.mp3', text: 'Auf der linken Seite finden Sie den Verlauf früherer Gespräche. Die Plus-Schaltfläche startet ein neues Gespräch; klicken Sie auf einen Eintrag, um ihn zu laden, und der Papierkorb löscht ihn.' },
  { file: 'asistente_04_de.mp3', text: 'Diese Schaltfläche öffnet oder schließt das Verlaufspanel, um Bildschirmplatz zu gewinnen, wenn Sie ihn benötigen.' },
  { file: 'asistente_05_de.mp3', text: 'In der Chat-Kopfzeile sehen Sie den Assistenztitel, die Statusanzeige und das verfügbare Guthaben. Klicken Sie auf das Guthaben, um Details zu sehen oder mehr zu kaufen.' },
  { file: 'asistente_06_de.mp3', text: 'Hier werden Ihre Nachrichten und die Antworten des Assistenten angezeigt. Antworten können Aktionen enthalten, die Sie bestätigen oder abbrechen müssen. Der Assistent zeigt einen Indikator an, während er die Antwort generiert.' },
  { file: 'asistente_07_de.mp3', text: 'Für einen schnellen Einstieg sehen Sie beim Start eines Gesprächs Vorschlagschips mit häufigen Fragen oder Aufgaben. Klicken Sie auf einen, um ihn direkt zu senden und eine sofortige Antwort zu erhalten.' },
  { file: 'asistente_08_de.mp3', text: 'Um Ihre Anfrage einzugeben, verwenden Sie den Textbereich und drücken Sie Senden oder Eingabe. Falls Sprache unterstützt wird, können Sie mit dem Mikrofon diktieren. Während einer Antwort können Sie mit der X-Schaltfläche abbrechen.' },
  { file: 'asistente_09_de.mp3', text: 'Sie beherrschen jetzt den KI-Assistenten. Nutzen Sie Vorschläge oder schreiben Sie frei, überprüfen Sie Ihr Guthaben und bestätigen Sie die Aktionen, die der Assistent Ihnen vorschlägt, wann immer Sie es benötigen.' },
];
const STEPS_ASISTENTE_PT = [
  { file: 'asistente_01_pt.mp3', text: 'Este é o chat de inteligência artificial do clube. Faça perguntas, peça resumos ou que execute ações como consultar dados ou criar elementos. Cada mensagem consome créditos; o saldo é mostrado no cabeçalho. Explicamos-lhe cada parte.' },
  { file: 'asistente_03_pt.mp3', text: 'À esquerda tem o histórico de conversas anteriores. O botão mais inicia uma nova conversa; clique numa entrada para a carregar, e o caixote elimina-a.' },
  { file: 'asistente_04_pt.mp3', text: 'Este botão abre ou fecha o painel do histórico para ganhar espaço no ecrã quando precisar.' },
  { file: 'asistente_05_pt.mp3', text: 'No cabeçalho do chat vê o título do assistente, o indicador de estado e os créditos disponíveis. Clique nos créditos para ver detalhes ou comprar mais.' },
  { file: 'asistente_06_pt.mp3', text: 'Aqui são mostradas as suas mensagens e as respostas do assistente. As respostas podem incluir ações que precisa de confirmar ou cancelar. O assistente mostrará um indicador enquanto gera a resposta.' },
  { file: 'asistente_07_pt.mp3', text: 'Para começar rapidamente, ao iniciar uma conversa verá chips de sugestão com perguntas ou tarefas frequentes. Clique num para enviá-lo diretamente e obter uma resposta imediata.' },
  { file: 'asistente_08_pt.mp3', text: 'Para escrever a sua consulta, use a área de texto e prima Enviar ou Enter. Se suportar voz, o microfone permite ditar. Durante a resposta pode cancelar com o botão X.' },
  { file: 'asistente_09_pt.mp3', text: 'Já domina o Assistente IA. Use as sugestões ou escreva livremente, verifique os seus créditos e confirme as ações que o assistente lhe propuser quando precisar.' },
];
const STEPS_ASISTENTE_IT = [
  { file: 'asistente_01_it.mp3', text: 'Questa è la chat di intelligenza artificiale del club. Fai domande, chiedi riassunti o che esegua azioni come consultare dati o creare elementi. Ogni messaggio consuma crediti; il saldo è mostrato nell\'intestazione. Ti spieghiamo ogni parte.' },
  { file: 'asistente_03_it.mp3', text: 'A sinistra hai lo storico delle conversazioni precedenti. Il pulsante più avvia una nuova conversazione; clicca su una voce per caricarla, e il cestino la elimina.' },
  { file: 'asistente_04_it.mp3', text: 'Questo pulsante apre o chiude il pannello della cronologia per guadagnare spazio sullo schermo quando ne hai bisogno.' },
  { file: 'asistente_05_it.mp3', text: 'Nell\'intestazione della chat vedi il titolo dell\'assistente, l\'indicatore di stato e i crediti disponibili. Clicca sui crediti per vedere i dettagli o acquistarne di più.' },
  { file: 'asistente_06_it.mp3', text: 'Qui vengono mostrati i tuoi messaggi e le risposte dell\'assistente. Le risposte possono includere azioni che devi confermare o annullare. L\'assistente mostrerà un indicatore mentre genera la risposta.' },
  { file: 'asistente_07_it.mp3', text: 'Per iniziare rapidamente, all\'avvio di una conversazione vedrai chip di suggerimento con domande o compiti frequenti. Clicca su uno per inviarlo direttamente e ottenere una risposta immediata.' },
  { file: 'asistente_08_it.mp3', text: 'Per scrivere la tua richiesta, usa l\'area di testo e premi Invia o Invio. Se è supportata la voce, il microfono ti permette di dettare. Durante una risposta puoi annullare con il pulsante X.' },
  { file: 'asistente_09_it.mp3', text: 'Ora padroneggi l\'Assistente IA. Usa i suggerimenti o scrivi liberamente, controlla i tuoi crediti e conferma le azioni che l\'assistente ti propone quando ne hai bisogno.' },
];

// ── Club Videos — IT ──────────────────────────────────────────────────────────
const STEPS_VIDEOS_IT = [
  { file: 'videos_01_it.mp3', text: 'Videoteca. Questa schermata è dove gestisci tutti i video del club: carica file dal tuo dispositivo, importa da Google Drive, aggiungi link YouTube o Vimeo e organizzali in cartelle per stagione. Spieghiamo ogni parte.' },
  { file: 'videos_03_it.mp3', text: 'Azioni intestazione. Iniziamo con le azioni dell\'intestazione. Gestisci piano o Acquista archiviazione apre i piani disponibili. Carica video carica un file dal tuo dispositivo, Importa da Drive porta video da Google Drive, e Aggiungi link aggiunge un URL YouTube o Vimeo senza consumare spazio.' },
  { file: 'videos_04_it.mp3', text: 'Uso dello spazio. Appena sotto vedi lo stato del tuo spazio: piano attivo, spazio utilizzato e limite totale. Se non hai un piano, apparirà un banner per acquistarne uno.' },
  { file: 'videos_05_it.mp3', text: 'Cartelle. A sinistra hai l\'organizzatore di cartelle. Puoi vedere tutti i video, quelli senza cartella o le cartelle che hai creato. Il pulsante persone sincronizza le cartelle per squadra e il pulsante cartella-più ne crea una nuova.' },
  { file: 'videos_06_it.mp3', text: 'Ricerca e filtro per cartella. Per trovare un video specifico, cerca per titolo, giocatore o etichetta. Se è selezionata una cartella, appare un breadcrumb che puoi rimuovere per vedere tutti i video di nuovo.' },
  { file: 'videos_07_it.mp3', text: 'Griglia video. E qui ci sono tutti i tuoi video. Ogni scheda mostra miniatura, titolo, giocatore, cartella, etichette e data. Dalle azioni puoi riprodurre, esportare in Drive, analizzare il video, spostarlo in cartella o eliminarlo.' },
  { file: 'videos_08_it.mp3', text: 'Completato. Hai padroneggiato la Videoteca. Carica o collega video, organizzali in cartelle e usa Analizza video per etichettare le giocate nel modulo Analisi Video quando ne hai bisogno.' },
];

// ── Menu Entrenador — EN ──────────────────────────────────────────────────────
const STEPS_ME_EN = [
  { file: 'me_01_en.mp3', text: 'This is your panel as a coach. From here you access everything you need: calendar, tasks, players, statistics, notifications, gallery, injuries, AI assistant, debrief, profile, documents and video analysis. We guide you step by step.' },
  { file: 'me_03_en.mp3', text: 'Let\'s start with Calendar: here you have all the team\'s training sessions and matches organised by date.' },
  { file: 'me_04_en.mp3', text: 'Next, Tasks, where you design and manage training sessions: exercises, objectives and tactical planning.' },
  { file: 'me_05_en.mp3', text: 'Then Players: the complete list with information about each player in the team.' },
  { file: 'me_06_en.mp3', text: 'Next, Team info, with all the general information: name, category, league, schedules and squad.' },
  { file: 'me_07_en.mp3', text: 'You also have Team statistics: wins, draws, losses, goals and the evolution of collective performance.' },
  { file: 'me_08_en.mp3', text: 'And Player statistics, with individual metrics such as goals, assists, minutes played and much more.' },
  { file: 'me_09_en.mp3', text: 'Next, Rankings: the team\'s standing in the competition and the results history.' },
  { file: 'me_10_en.mp3', text: 'Now Notifications: your message centre with news and alerts from the club and the team\'s players.' },
  { file: 'me_11_en.mp3', text: 'Next, Gallery: photos and moments from the team that you can share with players and families.' },
  { file: 'me_12_en.mp3', text: 'You also have Injuries to record and track each player\'s recovery status.' },
  { file: 'me_13_en.mp3', text: 'And the AI Assistant: an artificial intelligence chat to query team data, request analyses or resolve questions instantly.' },
  { file: 'me_14_en.mp3', text: 'Next, the Debrief history: post-match meetings and analyses saved for you to review whenever you like.' },
  { file: 'me_15_en.mp3', text: 'Next, your Profile: here you view and edit your personal data as a coach.' },
  { file: 'me_16_en.mp3', text: 'And your Documents: all the files and certificates linked to your coaching profile.' },
  { file: 'me_17_en.mp3', text: 'And finally, Video analysis: tag plays from your matches or training sessions and create playlists to share with the team.' },
  { file: 'me_18_en.mp3', text: 'You now know all the options in the coach menu. You have everything you need to manage your team in one place whenever you need it.' },
];

// ── Menu Entrenador — FR ──────────────────────────────────────────────────────
const STEPS_ME_FR = [
  { file: 'me_01_fr.mp3', text: 'Voici votre tableau de bord en tant qu\'entraîneur. Depuis ici vous accédez à tout ce dont vous avez besoin : calendrier, tâches, joueurs, statistiques, notifications, galerie, blessures, assistant IA, debrief, profil, documents et analyse vidéo. Nous vous guidons étape par étape.' },
  { file: 'me_03_fr.mp3', text: 'Commençons par le Calendrier : ici vous avez tous les entraînements et matchs de l\'équipe organisés par date.' },
  { file: 'me_04_fr.mp3', text: 'Ensuite, Tâches, où vous concevez et gérez les séances d\'entraînement : exercices, objectifs et planification tactique.' },
  { file: 'me_05_fr.mp3', text: 'Puis Joueurs : la liste complète avec les informations sur chaque joueur de l\'équipe.' },
  { file: 'me_06_fr.mp3', text: 'Ensuite, Info équipe, avec toutes les informations générales : nom, catégorie, ligue, horaires et effectif.' },
  { file: 'me_07_fr.mp3', text: 'Vous avez aussi les Statistiques de l\'équipe : victoires, nuls, défaites, buts et l\'évolution des performances collectives.' },
  { file: 'me_08_fr.mp3', text: 'Et les Statistiques des joueurs, avec des métriques individuelles comme les buts, les passes décisives, les minutes jouées et bien plus encore.' },
  { file: 'me_09_fr.mp3', text: 'Ensuite, Classement : la position de l\'équipe dans la compétition et l\'historique des résultats.' },
  { file: 'me_10_fr.mp3', text: 'Maintenant les Notifications : votre centre de messages et alertes du club et des joueurs de l\'équipe.' },
  { file: 'me_11_fr.mp3', text: 'Ensuite, la Galerie : photos et moments de l\'équipe que vous pouvez partager avec les joueurs et les familles.' },
  { file: 'me_12_fr.mp3', text: 'Vous avez aussi Blessures pour enregistrer et suivre l\'état de récupération de chaque joueur.' },
  { file: 'me_13_fr.mp3', text: 'Et l\'Assistant IA : un chat d\'intelligence artificielle pour consulter les données de l\'équipe, demander des analyses ou résoudre des questions instantanément.' },
  { file: 'me_14_fr.mp3', text: 'Ensuite, l\'Historique de debrief : réunions et analyses post-match sauvegardées pour les revoir quand vous le souhaitez.' },
  { file: 'me_15_fr.mp3', text: 'Ensuite, votre Profil : ici vous consultez et modifiez vos données personnelles en tant qu\'entraîneur.' },
  { file: 'me_16_fr.mp3', text: 'Et vos Documents : tous les fichiers et certificats liés à votre profil d\'entraîneur.' },
  { file: 'me_17_fr.mp3', text: 'Et pour finir, Analyse vidéo : balisez les actions de vos matchs ou entraînements et créez des playlists à partager avec l\'équipe.' },
  { file: 'me_18_fr.mp3', text: 'Vous maîtrisez maintenant toutes les options du menu entraîneur. Vous avez tout ce qu\'il vous faut pour gérer votre équipe en un seul endroit quand vous en avez besoin.' },
];

// ── Menu Entrenador — DE ──────────────────────────────────────────────────────
const STEPS_ME_DE = [
  { file: 'me_01_de.mp3', text: 'Dies ist Ihr Panel als Trainer. Von hier aus haben Sie Zugriff auf alles, was Sie benötigen: Kalender, Aufgaben, Spieler, Statistiken, Benachrichtigungen, Galerie, Verletzungen, KI-Assistent, Debrief, Profil, Dokumente und Videoanalyse. Wir führen Sie Schritt für Schritt.' },
  { file: 'me_03_de.mp3', text: 'Beginnen wir mit dem Kalender: hier haben Sie alle Trainingseinheiten und Spiele des Teams nach Datum geordnet.' },
  { file: 'me_04_de.mp3', text: 'Als nächstes Aufgaben, wo Sie Trainingseinheiten entwerfen und verwalten: Übungen, Ziele und taktische Planung.' },
  { file: 'me_05_de.mp3', text: 'Dann Spieler: die vollständige Liste mit Informationen zu jedem Spieler des Teams.' },
  { file: 'me_06_de.mp3', text: 'Als nächstes Team-Info, mit allen allgemeinen Informationen: Name, Kategorie, Liga, Zeiten und Kader.' },
  { file: 'me_07_de.mp3', text: 'Sie haben auch die Teamstatistiken: Siege, Unentschieden, Niederlagen, Tore und die Entwicklung der kollektiven Leistung.' },
  { file: 'me_08_de.mp3', text: 'Und die Spielerstatistiken, mit individuellen Metriken wie Tore, Vorlagen, gespielte Minuten und vielem mehr.' },
  { file: 'me_09_de.mp3', text: 'Als nächstes Rangliste: die Position des Teams im Wettbewerb und die Ergebnishistorie.' },
  { file: 'me_10_de.mp3', text: 'Jetzt Benachrichtigungen: Ihr Nachrichtenzentrum mit Meldungen und Hinweisen vom Club und den Spielern des Teams.' },
  { file: 'me_11_de.mp3', text: 'Als nächstes die Galerie: Fotos und Momente des Teams, die Sie mit Spielern und Familien teilen können.' },
  { file: 'me_12_de.mp3', text: 'Sie haben auch Verletzungen, um den Erholungsstatus jedes Spielers aufzuzeichnen und zu verfolgen.' },
  { file: 'me_13_de.mp3', text: 'Und der KI-Assistent: ein Künstliche-Intelligenz-Chat zum Abfragen von Teamdaten, Anfordern von Analysen oder sofortigen Lösen von Fragen.' },
  { file: 'me_14_de.mp3', text: 'Als nächstes der Debrief-Verlauf: Nach-Spiel-Meetings und Analysen, gespeichert zum Nachschlagen wann immer Sie möchten.' },
  { file: 'me_15_de.mp3', text: 'Als nächstes Ihr Profil: hier sehen und bearbeiten Sie Ihre persönlichen Daten als Trainer.' },
  { file: 'me_16_de.mp3', text: 'Und Ihre Dokumente: alle Dateien und Zertifikate, die mit Ihrem Trainerprofil verknüpft sind.' },
  { file: 'me_17_de.mp3', text: 'Und abschließend Videoanalyse: taggen Sie Spielzüge aus Ihren Spielen oder Trainingseinheiten und erstellen Sie Playlists zum Teilen mit dem Team.' },
  { file: 'me_18_de.mp3', text: 'Sie kennen jetzt alle Optionen des Trainer-Menüs. Sie haben alles, was Sie brauchen, um Ihr Team an einem Ort zu verwalten, wann immer Sie es benötigen.' },
];

// ── Menu Entrenador — PT ──────────────────────────────────────────────────────
const STEPS_ME_PT = [
  { file: 'me_01_pt.mp3', text: 'Este é o seu painel como treinador. Daqui acede a tudo o que precisa: calendário, tarefas, jogadores, estatísticas, notificações, galeria, lesões, assistente IA, debrief, perfil, documentos e análise de vídeo. Guiamo-lo passo a passo.' },
  { file: 'me_03_pt.mp3', text: 'Comecemos pelo Calendário: aqui tem todos os treinos e jogos da equipa organizados por data.' },
  { file: 'me_04_pt.mp3', text: 'De seguida, Tarefas, onde desenha e gere as sessões de treino: exercícios, objetivos e planeamento tático.' },
  { file: 'me_05_pt.mp3', text: 'Depois Jogadores: a lista completa com a informação de cada jogador da equipa.' },
  { file: 'me_06_pt.mp3', text: 'De seguida, Info da equipa, com toda a informação geral: nome, categoria, liga, horários e plantel.' },
  { file: 'me_07_pt.mp3', text: 'Tem também as Estatísticas da equipa: vitórias, empates, derrotas, golos e a evolução do desempenho coletivo.' },
  { file: 'me_08_pt.mp3', text: 'E as Estatísticas dos jogadores, com métricas individuais como golos, assistências, minutos jogados e muito mais.' },
  { file: 'me_09_pt.mp3', text: 'De seguida, Classificação: a posição da equipa na competição e o historial de resultados.' },
  { file: 'me_10_pt.mp3', text: 'Agora as Notificações: o seu centro de mensagens e avisos do clube e dos jogadores da equipa.' },
  { file: 'me_11_pt.mp3', text: 'De seguida, a Galeria: fotos e momentos da equipa que pode partilhar com jogadores e famílias.' },
  { file: 'me_12_pt.mp3', text: 'Tem também Lesões para registar e acompanhar o estado de recuperação de cada jogador.' },
  { file: 'me_13_pt.mp3', text: 'E o Assistente IA: um chat de inteligência artificial para consultar dados da equipa, pedir análises ou resolver dúvidas instantaneamente.' },
  { file: 'me_14_pt.mp3', text: 'De seguida, o Histórico de debrief: reuniões e análises pós-jogo guardadas para rever quando quiser.' },
  { file: 'me_15_pt.mp3', text: 'De seguida, o seu Perfil: aqui consulta e edita os seus dados pessoais como treinador.' },
  { file: 'me_16_pt.mp3', text: 'E os seus Documentos: todos os ficheiros e certificados associados ao seu perfil de treinador.' },
  { file: 'me_17_pt.mp3', text: 'E por fim, Análise de vídeo: etiquete jogadas dos seus jogos ou treinos e crie playlists para partilhar com a equipa.' },
  { file: 'me_18_pt.mp3', text: 'Já domina todas as opções do menu do treinador. Tem tudo o que precisa para gerir a sua equipa num só lugar quando precisar.' },
];

// ── Menu Entrenador — IT ──────────────────────────────────────────────────────
const STEPS_ME_IT = [
  { file: 'me_01_it.mp3', text: 'Questo è il tuo pannello come allenatore. Da qui accedi a tutto ciò di cui hai bisogno: calendario, compiti, giocatori, statistiche, notifiche, galleria, infortuni, assistente IA, debrief, profilo, documenti e analisi video. Ti guidiamo passo dopo passo.' },
  { file: 'me_03_it.mp3', text: 'Iniziamo dal Calendario: qui hai tutti gli allenamenti e le partite della squadra organizzati per data.' },
  { file: 'me_04_it.mp3', text: 'Poi Compiti, dove progetti e gestisci le sessioni di allenamento: esercizi, obiettivi e pianificazione tattica.' },
  { file: 'me_05_it.mp3', text: 'Quindi Giocatori: l\'elenco completo con le informazioni di ogni giocatore della squadra.' },
  { file: 'me_06_it.mp3', text: 'Poi Info squadra, con tutte le informazioni generali: nome, categoria, lega, orari e rosa.' },
  { file: 'me_07_it.mp3', text: 'Hai anche le Statistiche della squadra: vittorie, pareggi, sconfitte, gol e l\'evoluzione delle prestazioni collettive.' },
  { file: 'me_08_it.mp3', text: 'E le Statistiche dei giocatori, con metriche individuali come gol, assist, minuti giocati e molto altro.' },
  { file: 'me_09_it.mp3', text: 'Poi Classifica: la posizione della squadra in competizione e la cronologia dei risultati.' },
  { file: 'me_10_it.mp3', text: 'Ora le Notifiche: il tuo centro messaggi e avvisi dal club e dai giocatori della squadra.' },
  { file: 'me_11_it.mp3', text: 'Poi la Galleria: foto e momenti della squadra che puoi condividere con giocatori e famiglie.' },
  { file: 'me_12_it.mp3', text: 'Hai anche Infortuni per registrare e monitorare lo stato di recupero di ogni giocatore.' },
  { file: 'me_13_it.mp3', text: 'E l\'Assistente IA: una chat di intelligenza artificiale per consultare i dati della squadra, richiedere analisi o risolvere dubbi all\'istante.' },
  { file: 'me_14_it.mp3', text: 'Poi lo Storico debrief: riunioni e analisi post-partita salvate da rivedere quando vuoi.' },
  { file: 'me_15_it.mp3', text: 'Poi il tuo Profilo: qui visualizzi e modifichi i tuoi dati personali come allenatore.' },
  { file: 'me_16_it.mp3', text: 'E i tuoi Documenti: tutti i file e certificati collegati al tuo profilo da allenatore.' },
  { file: 'me_17_it.mp3', text: 'E per finire, Analisi video: tagga le azioni delle tue partite o allenamenti e crea playlist da condividere con la squadra.' },
  { file: 'me_18_it.mp3', text: 'Ora conosci tutte le opzioni del menu allenatore. Hai tutto ciò di cui hai bisogno per gestire la tua squadra in un unico posto quando ne hai bisogno.' },
];

// ── /dashboard/informacion-equipo — EN ──────────────────────────────────────
const STEPS_INFOEQ_EN = [
  { file: 'infoeq_01_en.mp3', text: "Configure the team's general data: logo, category, league level, name, training schedule, objectives, opinions and staff. We'll guide you through each part." },
  { file: 'infoeq_02_en.mp3', text: 'Logo preview. If you are a club, you can upload or change the logo using the button below.' },
  { file: 'infoeq_03_en.mp3', text: 'Tap to select an image and update the team logo. Only visible to club profiles.' },
  { file: 'infoeq_04_en.mp3', text: 'Badges showing category, league level and team name — updated when you save the form.' },
  { file: 'infoeq_05_en.mp3', text: 'Category with search and create option, league level with search and create, team letter or name and a schedule button to configure training days and time slots.' },
  { file: 'infoeq_06_en.mp3', text: "Text area for the team's objective this season and the general opinion about the team." },
  { file: 'infoeq_07_en.mp3', text: 'Save form changes or delete the team with confirmation.' },
  { file: 'infoeq_08_en.mp3', text: 'List of assigned coaches, physios and nutritionists. Use the Invite button to add by email.' },
  { file: 'infoeq_09_en.mp3', text: "You've now mastered team information. Update data, schedule and staff whenever you need." },
];

// ── /dashboard/informacion-equipo — FR ──────────────────────────────────────
const STEPS_INFOEQ_FR = [
  { file: 'infoeq_01_fr.mp3', text: "Configurez les données générales de l'équipe : logo, catégorie, niveau de ligue, nom, horaire d'entraînement, objectifs, opinions et staff. Nous vous guidons étape par étape." },
  { file: 'infoeq_02_fr.mp3', text: "Aperçu du logo. Si vous êtes un club, vous pouvez télécharger ou changer le logo via le bouton ci-dessous." },
  { file: 'infoeq_03_fr.mp3', text: "Appuyez pour sélectionner une image et mettre à jour le logo de l'équipe. Visible uniquement pour le profil club." },
  { file: 'infoeq_04_fr.mp3', text: "Badges avec catégorie, niveau de ligue et nom de l'équipe — mis à jour à la sauvegarde du formulaire." },
  { file: 'infoeq_05_fr.mp3', text: "Catégorie avec recherche et option créer, niveau de ligue avec recherche et créer, lettre ou nom de l'équipe et bouton horaire pour configurer les jours et créneaux d'entraînement." },
  { file: 'infoeq_06_fr.mp3', text: "Zone de texte pour l'objectif de l'équipe cette saison et l'opinion générale sur l'équipe." },
  { file: 'infoeq_07_fr.mp3', text: "Enregistrez les modifications du formulaire ou supprimez l'équipe avec confirmation." },
  { file: 'infoeq_08_fr.mp3', text: "Liste des entraîneurs, kinés et nutritionnistes assignés. Bouton Inviter pour ajouter par e-mail." },
  { file: 'infoeq_09_fr.mp3', text: "Vous maîtrisez maintenant les informations de l'équipe. Mettez à jour les données, l'horaire et le staff quand vous en avez besoin." },
];

// ── /dashboard/informacion-equipo — DE ──────────────────────────────────────
const STEPS_INFOEQ_DE = [
  { file: 'infoeq_01_de.mp3', text: 'Konfigurieren Sie die allgemeinen Daten des Teams: Logo, Kategorie, Liganiveau, Name, Trainingsplan, Ziele, Meinungen und Staff. Wir führen Sie Schritt für Schritt.' },
  { file: 'infoeq_02_de.mp3', text: 'Logo-Vorschau. Als Club können Sie das Logo über die Schaltfläche unten hochladen oder ändern.' },
  { file: 'infoeq_03_de.mp3', text: 'Tippen Sie, um ein Bild auszuwählen und das Team-Logo zu aktualisieren. Nur für Club-Profile sichtbar.' },
  { file: 'infoeq_04_de.mp3', text: 'Badges mit Kategorie, Liganiveau und Teamname — werden beim Speichern des Formulars aktualisiert.' },
  { file: 'infoeq_05_de.mp3', text: 'Kategorie mit Suche und Erstelloption, Liganiveau mit Suche und Erstellen, Teambuchstabe oder -name und ein Zeitplan-Button zur Konfiguration von Trainingstagen und -zeiten.' },
  { file: 'infoeq_06_de.mp3', text: 'Textbereich für das Teamziel dieser Saison und die allgemeine Meinung über das Team.' },
  { file: 'infoeq_07_de.mp3', text: 'Speichern Sie die Formularänderungen oder löschen Sie das Team mit Bestätigung.' },
  { file: 'infoeq_08_de.mp3', text: 'Liste der zugewiesenen Trainer, Physios und Ernährungsberater. Schaltfläche Einladen zum Hinzufügen per E-Mail.' },
  { file: 'infoeq_09_de.mp3', text: 'Sie beherrschen jetzt die Teaminformationen. Aktualisieren Sie Daten, Zeitplan und Staff, wann immer Sie es benötigen.' },
];

// ── /dashboard/informacion-equipo — PT ──────────────────────────────────────
const STEPS_INFOEQ_PT = [
  { file: 'infoeq_01_pt.mp3', text: 'Configure os dados gerais da equipa: logo, categoria, nível de liga, nome, horário de treino, objetivos, opiniões e staff. Vamos guiá-lo passo a passo.' },
  { file: 'infoeq_02_pt.mp3', text: 'Pré-visualização do logo. Se for clube, pode carregar ou alterar o logo através do botão abaixo.' },
  { file: 'infoeq_03_pt.mp3', text: 'Toque para selecionar uma imagem e atualizar o logo da equipa. Visível apenas para perfis de clube.' },
  { file: 'infoeq_04_pt.mp3', text: 'Badges com categoria, nível de liga e nome da equipa — atualizados ao guardar o formulário.' },
  { file: 'infoeq_05_pt.mp3', text: 'Categoria com pesquisa e opção criar, nível de liga com pesquisa e criar, letra ou nome da equipa e botão de horário para configurar dias e horários de treino.' },
  { file: 'infoeq_06_pt.mp3', text: 'Área de texto para o objetivo da equipa esta época e a opinião geral sobre a equipa.' },
  { file: 'infoeq_07_pt.mp3', text: 'Guarde as alterações do formulário ou elimine a equipa com confirmação.' },
  { file: 'infoeq_08_pt.mp3', text: 'Lista de treinadores, fisioterapeutas e nutricionistas atribuídos. Botão Convidar para adicionar por email.' },
  { file: 'infoeq_09_pt.mp3', text: 'Já domina a informação da equipa. Atualize dados, horário e staff quando precisar.' },
];

// ── /dashboard/informacion-equipo — IT ──────────────────────────────────────
const STEPS_INFOEQ_IT = [
  { file: 'infoeq_01_it.mp3', text: 'Configura i dati generali della squadra: logo, categoria, livello di lega, nome, orario degli allenamenti, obiettivi, opinioni e staff. Ti guidiamo passo dopo passo.' },
  { file: 'infoeq_02_it.mp3', text: 'Anteprima del logo. Se sei un club, puoi caricare o cambiare il logo tramite il pulsante sottostante.' },
  { file: 'infoeq_03_it.mp3', text: "Tocca per selezionare un'immagine e aggiornare il logo della squadra. Visibile solo per i profili club." },
  { file: 'infoeq_04_it.mp3', text: 'Badge con categoria, livello di lega e nome della squadra — aggiornati al salvataggio del modulo.' },
  { file: 'infoeq_05_it.mp3', text: 'Categoria con ricerca e opzione crea, livello di lega con ricerca e crea, lettera o nome della squadra e pulsante orario per configurare i giorni e le fasce di allenamento.' },
  { file: 'infoeq_06_it.mp3', text: "Area di testo per l'obiettivo della squadra questa stagione e l'opinione generale sulla squadra." },
  { file: 'infoeq_07_it.mp3', text: 'Salva le modifiche del modulo o elimina la squadra con conferma.' },
  { file: 'infoeq_08_it.mp3', text: 'Elenco di allenatori, fisioterapisti e nutrizionisti assegnati. Pulsante Invita per aggiungere tramite email.' },
  { file: 'infoeq_09_it.mp3', text: 'Ora padroneggi le informazioni della squadra. Aggiorna dati, orario e staff quando ne hai bisogno.' },
];

// ── /dashboard/estadisticas-equipo — EN ─────────────────────────────────────
const STEPS_STATEQ_EN = [
  { file: 'stateq_01_en.mp3', text: "Statistical analysis of team performance: summary with matches, points, wins, draws, losses, goals for and against, goal difference and last results; match detail; and charts. We'll guide you through each part." },
  { file: 'stateq_02_en.mp3', text: 'Match type: League, Friendly or Tournament. Toggle between View table — summary plus matches — and View charts — all analysis charts.' },
  { file: 'stateq_03_en.mp3', text: 'Card with the team summary: matches played, points, wins, draws, losses, goals for, against, goal difference and last results.' },
  { file: 'stateq_04_en.mp3', text: 'List of matches with date, opponent, result, goals and detailed statistics including shots, fouls, corners, recoveries, losses, cards, dangerous arrivals and penalties. Tap an opponent to open the post-match detail.' },
  { file: 'stateq_05_en.mp3', text: 'Results chart, points per match, statistics per match with a type selector, goals by category and goals by subcategory with a category selector.' },
  { file: 'stateq_06_en.mp3', text: "You've now mastered team statistics. Switch between table and charts and filter by match type whenever you need." },
];

// ── /dashboard/estadisticas-equipo — FR ─────────────────────────────────────
const STEPS_STATEQ_FR = [
  { file: 'stateq_01_fr.mp3', text: "Analyse statistique des performances de l'équipe : résumé avec matchs, points, victoires, nuls, défaites, buts pour et contre, différence et derniers résultats ; détail des matchs ; et graphiques. Nous vous guidons étape par étape." },
  { file: 'stateq_02_fr.mp3', text: "Type de match : Championnat, Amical ou Tournoi. Basculez entre Voir tableau — résumé et matchs — et Voir graphiques — tous les graphiques d'analyse." },
  { file: 'stateq_03_fr.mp3', text: "Carte avec le résumé de l'équipe : matchs joués, points, victoires, nuls, défaites, buts pour, contre, différence et derniers résultats." },
  { file: 'stateq_04_fr.mp3', text: "Liste des matchs avec date, adversaire, résultat, buts et statistiques détaillées incluant tirs, fautes, corners, récupérations, pertes, cartons, occasions dangereuses et penaltys. Appuyez sur un adversaire pour ouvrir le détail d'après-match." },
  { file: 'stateq_05_fr.mp3', text: "Graphique de résultats, points par match, statistiques par match avec sélecteur de type, buts par catégorie et buts par sous-catégorie avec sélecteur de catégorie." },
  { file: 'stateq_06_fr.mp3', text: "Vous maîtrisez maintenant les statistiques de l'équipe. Basculez entre tableau et graphiques et filtrez par type de match quand vous en avez besoin." },
];

// ── /dashboard/estadisticas-equipo — DE ─────────────────────────────────────
const STEPS_STATEQ_DE = [
  { file: 'stateq_01_de.mp3', text: 'Statistische Analyse der Teamleistung: Zusammenfassung mit Spielen, Punkten, Siegen, Unentschieden, Niederlagen, Toren, Tordifferenz und letzten Ergebnissen; Spieldetails; und Diagramme. Wir führen Sie Schritt für Schritt.' },
  { file: 'stateq_02_de.mp3', text: 'Spieltyp: Liga, Freundschaftsspiel oder Turnier. Wechseln Sie zwischen Tabelle anzeigen — Zusammenfassung plus Spiele — und Diagramme anzeigen — alle Analysediagramme.' },
  { file: 'stateq_03_de.mp3', text: 'Karte mit der Teamübersicht: Spiele, Punkte, Siege, Unentschieden, Niederlagen, Tore, Tordifferenz und letzte Ergebnisse.' },
  { file: 'stateq_04_de.mp3', text: 'Spielliste mit Datum, Gegner, Ergebnis, Toren und detaillierten Statistiken wie Schüsse, Fouls, Ecken, Ballgewinne, Ballverluste, Karten, gefährliche Angriffe und Elfmeter. Tippen Sie auf einen Gegner, um das Nachspiel-Detail zu öffnen.' },
  { file: 'stateq_05_de.mp3', text: 'Ergebnisdiagramm, Punkte pro Spiel, Statistiken pro Spiel mit Typauswahl, Tore nach Kategorie und Tore nach Unterkategorie mit Kategorieauswahl.' },
  { file: 'stateq_06_de.mp3', text: 'Sie beherrschen jetzt die Teamstatistiken. Wechseln Sie zwischen Tabelle und Diagrammen und filtern Sie nach Spieltyp, wann immer Sie es benötigen.' },
];

// ── /dashboard/estadisticas-equipo — PT ─────────────────────────────────────
const STEPS_STATEQ_PT = [
  { file: 'stateq_01_pt.mp3', text: 'Análise estatística do desempenho da equipa: resumo com jogos, pontos, vitórias, empates, derrotas, golos marcados e sofridos, diferença e últimos resultados; detalhe de jogos; e gráficos. Vamos guiá-lo passo a passo.' },
  { file: 'stateq_02_pt.mp3', text: 'Tipo de jogo: Liga, Amigável ou Torneio. Alterne entre Ver tabela — resumo mais jogos — e Ver gráficos — todos os gráficos de análise.' },
  { file: 'stateq_03_pt.mp3', text: 'Cartão com o resumo da equipa: jogos, pontos, vitórias, empates, derrotas, golos marcados, sofridos, diferença e últimos resultados.' },
  { file: 'stateq_04_pt.mp3', text: 'Lista de jogos com data, adversário, resultado, golos e estatísticas detalhadas incluindo remates, faltas, cantos, recuperações, perdas, cartões, chegadas perigosas e penáltis. Toque num adversário para abrir o detalhe pós-jogo.' },
  { file: 'stateq_05_pt.mp3', text: 'Gráfico de resultados, pontos por jogo, estatísticas por jogo com seletor de tipo, golos por categoria e golos por subcategoria com seletor de categoria.' },
  { file: 'stateq_06_pt.mp3', text: 'Já domina as estatísticas da equipa. Alterne entre tabela e gráficos e filtre por tipo de jogo quando precisar.' },
];

// ── /dashboard/estadisticas-equipo — IT ─────────────────────────────────────
const STEPS_STATEQ_IT = [
  { file: 'stateq_01_it.mp3', text: 'Analisi statistica delle prestazioni della squadra: riepilogo con partite, punti, vittorie, pareggi, sconfitte, gol fatti e subiti, differenza reti e ultimi risultati; dettaglio delle partite; e grafici. Ti guidiamo passo dopo passo.' },
  { file: 'stateq_02_it.mp3', text: 'Tipo di partita: Campionato, Amichevole o Torneo. Alterna tra Vedi tabella — riepilogo e partite — e Vedi grafici — tutti i grafici di analisi.' },
  { file: 'stateq_03_it.mp3', text: 'Scheda con il riepilogo della squadra: partite, punti, vittorie, pareggi, sconfitte, gol fatti, subiti, differenza reti e ultimi risultati.' },
  { file: 'stateq_04_it.mp3', text: "Elenco delle partite con data, avversario, risultato, gol e statistiche dettagliate tra cui tiri, falli, calci d'angolo, recuperi, palle perse, cartellini, azioni pericolose e rigori. Tocca un avversario per aprire il dettaglio post-partita." },
  { file: 'stateq_05_it.mp3', text: 'Grafico dei risultati, punti per partita, statistiche per partita con selettore di tipo, gol per categoria e gol per sottocategoria con selettore di categoria.' },
  { file: 'stateq_06_it.mp3', text: 'Ora padroneggi le statistiche della squadra. Alterna tra tabella e grafici e filtra per tipo di partita quando ne hai bisogno.' },
];

// ── /dashboard/calendario — EN ───────────────────────────────────────────────
const STEPS_CALEQ_EN = [
  { file: 'caleq_01_en.mp3', text: "Here you'll find your team's training and match calendar. Switch between year, month and week views, and use the AI planner to organise the week. Let's walk you through each part." },
  { file: 'caleq_02_en.mp3', text: 'Switch between three views: the annual view shows all months in a grid, the monthly view lays out the days in a table, and the weekly view gives you the detail for seven consecutive days. Each view shows scheduled training sessions and matches.' },
  { file: 'caleq_03_en.mp3', text: 'Open the AI weekly planner to generate or adjust the planning for the week.' },
  { file: 'caleq_04_en.mp3', text: 'Move forward or backward in time — year, month or week depending on the active view.' },
  { file: 'caleq_05_en.mp3', text: 'Cells showing training sessions and matches. Tap a day to view or edit events. You can drag events between days in the week view.' },
  { file: 'caleq_06_en.mp3', text: "You've mastered the team calendar. Use whichever view you prefer and the AI planner to organise the season whenever you need it." },
];

// ── /dashboard/calendario — FR ───────────────────────────────────────────────
const STEPS_CALEQ_FR = [
  { file: 'caleq_01_fr.mp3', text: "Ici vous trouvez le calendrier des entraînements et des matchs de l'équipe. Passez entre la vue annuelle, mensuelle et hebdomadaire, et utilisez le planificateur IA pour organiser la semaine. Nous vous guidons étape par étape." },
  { file: 'caleq_02_fr.mp3', text: "Passez entre trois vues : la vue annuelle affiche tous les mois dans une grille, la vue mensuelle déploie les jours en tableau et la vue hebdomadaire vous donne le détail de sept jours consécutifs. Chaque vue affiche les entraînements et matchs programmés." },
  { file: 'caleq_03_fr.mp3', text: "Ouvrez le planificateur hebdomadaire IA pour générer ou ajuster la planification de la semaine." },
  { file: 'caleq_04_fr.mp3', text: "Avancez ou reculez dans le temps selon la vue active : année, mois ou semaine." },
  { file: 'caleq_05_fr.mp3', text: "Cases avec entraînements et matchs. Appuyez sur un jour pour voir ou modifier des événements. Vous pouvez glisser des événements entre les jours en vue semaine." },
  { file: 'caleq_06_fr.mp3', text: "Vous maîtrisez maintenant le calendrier de l'équipe. Utilisez la vue que vous préférez et le planificateur IA pour organiser la saison quand vous en avez besoin." },
];

// ── /dashboard/calendario — DE ───────────────────────────────────────────────
const STEPS_CALEQ_DE = [
  { file: 'caleq_01_de.mp3', text: 'Hier sehen Sie den Trainings- und Spielkalender des Teams. Wechseln Sie zwischen Jahr-, Monats- und Wochenansicht und nutzen Sie den KI-Planer zur Wochenorganisation. Wir führen Sie Schritt für Schritt.' },
  { file: 'caleq_02_de.mp3', text: 'Wechseln Sie zwischen drei Ansichten: Die Jahresansicht zeigt alle Monate im Raster, die Monatsansicht zeigt Tage in einer Tabelle und die Wochenansicht zeigt Details für sieben aufeinanderfolgende Tage. Jede Ansicht zeigt geplante Trainings und Spiele.' },
  { file: 'caleq_03_de.mp3', text: 'Öffnen Sie den wöchentlichen KI-Planer, um die Wochenplanung zu erstellen oder anzupassen.' },
  { file: 'caleq_04_de.mp3', text: 'Vor- oder Rückwärts in der Zeit navigieren: Jahr, Monat oder Woche je nach aktiver Ansicht.' },
  { file: 'caleq_05_de.mp3', text: 'Zellen mit Trainings und Spielen. Tippen Sie auf einen Tag, um Ereignisse anzusehen oder zu bearbeiten. In der Wochenansicht können Sie Ereignisse zwischen Tagen verschieben.' },
  { file: 'caleq_06_de.mp3', text: 'Sie beherrschen jetzt den Teamkalender. Nutzen Sie Ihre bevorzugte Ansicht und den KI-Planer, um die Saison nach Bedarf zu organisieren.' },
];

// ── /dashboard/calendario — PT ───────────────────────────────────────────────
const STEPS_CALEQ_PT = [
  { file: 'caleq_01_pt.mp3', text: 'Aqui vê o calendário de treinos e jogos da equipa. Alterne entre as vistas anual, mensal e semanal, e utilize o planificador de IA para organizar a semana. Vamos guiá-lo passo a passo.' },
  { file: 'caleq_02_pt.mp3', text: 'Alterne entre três vistas: a vista anual mostra todos os meses numa grelha, a vista mensal apresenta os dias numa tabela e a vista semanal dá-lhe o detalhe de sete dias consecutivos. Cada vista mostra os treinos e jogos programados.' },
  { file: 'caleq_03_pt.mp3', text: 'Abra o planificador semanal com IA para gerar ou ajustar o planeamento da semana.' },
  { file: 'caleq_04_pt.mp3', text: 'Avance ou recue no tempo: ano, mês ou semana consoante a vista ativa.' },
  { file: 'caleq_05_pt.mp3', text: 'Células com treinos e jogos. Toque num dia para ver ou editar eventos. Pode arrastar eventos entre dias na vista semanal.' },
  { file: 'caleq_06_pt.mp3', text: 'Já domina o calendário da equipa. Use a vista que preferir e o planificador de IA para organizar a época quando precisar.' },
];

// ── /dashboard/calendario — IT ───────────────────────────────────────────────
const STEPS_CALEQ_IT = [
  { file: 'caleq_01_it.mp3', text: 'Qui trovi il calendario degli allenamenti e delle partite della squadra. Passa tra la vista annuale, mensile e settimanale e usa il pianificatore IA per organizzare la settimana. Ti guidiamo passo dopo passo.' },
  { file: 'caleq_02_it.mp3', text: 'Passa tra tre viste: la vista annuale mostra tutti i mesi in griglia, quella mensile mostra i giorni in tabella e quella settimanale ti dà il dettaglio di sette giorni consecutivi. Ogni vista mostra allenamenti e partite programmati.' },
  { file: 'caleq_03_it.mp3', text: "Apri il pianificatore settimanale con IA per generare o adattare la pianificazione della settimana." },
  { file: 'caleq_04_it.mp3', text: 'Avanza o torna indietro nel tempo: anno, mese o settimana in base alla vista attiva.' },
  { file: 'caleq_05_it.mp3', text: 'Celle con allenamenti e partite. Tocca un giorno per vedere o modificare gli eventi. Puoi trascinare eventi tra i giorni nella vista settimanale.' },
  { file: 'caleq_06_it.mp3', text: 'Ora padroneggi il calendario della squadra. Usa la vista che preferisci e il pianificatore IA per organizzare la stagione quando ne hai bisogno.' },
];

// ── /dashboard/tareas — EN ───────────────────────────────────────────────────
const STEPS_TAREAS_EN = [
  { file: 'tareas_01_en.mp3', text: "Team task centre: tactical board, cloud catalogue, history, favourites and my own tasks. Choose an option to continue. We'll explain each section." },
  { file: 'tareas_02_en.mp3', text: 'Open the tactical board to draw plays, tactics and animations. You can save images or GIFs to a task.' },
  { file: 'tareas_03_en.mp3', text: 'Cloud task catalogue: search by strategy and intention, and add tasks to your training sessions.' },
  { file: 'tareas_04_en.mp3', text: 'Here you see tasks you have already used in your training sessions. You can reuse them in a new session or save them to favourites for easy access.' },
  { file: 'tareas_05_en.mp3', text: 'Your tasks marked as favourites for quick access.' },
  { file: 'tareas_06_en.mp3', text: 'Tasks created by you from the board or manually. Create, edit and delete your own tasks.' },
  { file: 'tareas_07_en.mp3', text: "You've mastered the task hub. Enter whichever section you need to prepare your sessions whenever you need it." },
];

// ── /dashboard/tareas — FR ───────────────────────────────────────────────────
const STEPS_TAREAS_FR = [
  { file: 'tareas_01_fr.mp3', text: "Centre de tâches de l'équipe : tableau tactique, catalogue en ligne, historique, favoris et mes propres tâches. Choisissez une option pour continuer. Nous vous expliquons chaque partie." },
  { file: 'tareas_02_fr.mp3', text: "Ouvrez le tableau tactique pour dessiner des actions, tactiques et animations. Vous pouvez enregistrer des images ou des GIF dans une tâche." },
  { file: 'tareas_03_fr.mp3', text: "Catalogue de tâches en ligne : recherchez par stratégie et intention et ajoutez des tâches à vos entraînements." },
  { file: 'tareas_04_fr.mp3', text: "Ici vous voyez les tâches que vous avez déjà utilisées dans vos entraînements. Vous pouvez les réutiliser dans une nouvelle session ou les enregistrer en favoris pour les avoir à portée de main." },
  { file: 'tareas_05_fr.mp3', text: "Vos tâches marquées comme favorites pour un accès rapide." },
  { file: 'tareas_06_fr.mp3', text: "Tâches créées par vous depuis le tableau ou manuellement. Créez, modifiez et supprimez vos propres tâches." },
  { file: 'tareas_07_fr.mp3', text: "Vous maîtrisez maintenant le hub de tâches. Accédez à la section dont vous avez besoin pour préparer vos sessions quand vous le souhaitez." },
];

// ── /dashboard/tareas — DE ───────────────────────────────────────────────────
const STEPS_TAREAS_DE = [
  { file: 'tareas_01_de.mp3', text: 'Aufgaben-Hub des Teams: Taktikboard, Cloud-Katalog, Verlauf, Favoriten und eigene Aufgaben. Wählen Sie eine Option, um fortzufahren. Wir erklären jeden Bereich.' },
  { file: 'tareas_02_de.mp3', text: 'Öffnen Sie das Taktikboard, um Spielzüge, Taktiken und Animationen zu zeichnen. Sie können Bilder oder GIFs in einer Aufgabe speichern.' },
  { file: 'tareas_03_de.mp3', text: 'Cloud-Aufgabenkatalog: Suchen nach Strategie und Absicht und Aufgaben zu Trainings hinzufügen.' },
  { file: 'tareas_04_de.mp3', text: 'Hier sehen Sie Aufgaben, die Sie bereits in Trainings verwendet haben. Sie können sie in einer neuen Einheit wiederverwenden oder als Favoriten speichern.' },
  { file: 'tareas_05_de.mp3', text: 'Ihre als Favoriten markierten Aufgaben für schnellen Zugriff.' },
  { file: 'tareas_06_de.mp3', text: 'Von Ihnen erstellte Aufgaben vom Board oder manuell. Erstellen, bearbeiten und löschen Sie Ihre eigenen Aufgaben.' },
  { file: 'tareas_07_de.mp3', text: 'Sie beherrschen jetzt den Aufgaben-Hub. Gehen Sie in den Bereich, den Sie benötigen, um Ihre Einheiten vorzubereiten.' },
];

// ── /dashboard/tareas — PT ───────────────────────────────────────────────────
const STEPS_TAREAS_PT = [
  { file: 'tareas_01_pt.mp3', text: 'Centro de tarefas da equipa: quadro tático, catálogo na nuvem, histórico, favoritas e as minhas tarefas. Escolha uma opção para continuar. Explicamos cada secção.' },
  { file: 'tareas_02_pt.mp3', text: 'Abra o quadro tático para desenhar jogadas, táticas e animações. Pode guardar imagens ou GIFs numa tarefa.' },
  { file: 'tareas_03_pt.mp3', text: 'Catálogo de tarefas na nuvem: pesquise por estratégia e intenção e adicione tarefas aos seus treinos.' },
  { file: 'tareas_04_pt.mp3', text: 'Aqui vê as tarefas que já utilizou nos seus treinos. Pode reutilizá-las numa nova sessão ou guardá-las nos favoritos para tê-las à mão.' },
  { file: 'tareas_05_pt.mp3', text: 'As suas tarefas marcadas como favoritas para acesso rápido.' },
  { file: 'tareas_06_pt.mp3', text: 'Tarefas criadas por si do quadro ou manualmente. Crie, edite e elimine as suas próprias tarefas.' },
  { file: 'tareas_07_pt.mp3', text: 'Já domina o hub de tarefas. Entre na secção de que precisa para preparar as suas sessões quando precisar.' },
];

// ── /dashboard/tareas — IT ───────────────────────────────────────────────────
const STEPS_TAREAS_IT = [
  { file: 'tareas_01_it.mp3', text: "Centro compiti della squadra: lavagna tattica, catalogo cloud, cronologia, preferiti e i miei compiti. Scegli un'opzione per continuare. Spieghiamo ogni sezione." },
  { file: 'tareas_02_it.mp3', text: 'Apri la lavagna tattica per disegnare azioni, tattiche e animazioni. Puoi salvare immagini o GIF in un compito.' },
  { file: 'tareas_03_it.mp3', text: 'Catalogo compiti cloud: cerca per strategia e intenzione e aggiungi compiti ai tuoi allenamenti.' },
  { file: 'tareas_04_it.mp3', text: 'Qui vedi i compiti che hai già usato nei tuoi allenamenti. Puoi riutilizzarli in una nuova sessione o salvarli nei preferiti per averli a portata di mano.' },
  { file: 'tareas_05_it.mp3', text: 'I tuoi compiti contrassegnati come preferiti per accesso rapido.' },
  { file: 'tareas_06_it.mp3', text: 'Compiti creati da te dalla lavagna o manualmente. Crea, modifica ed elimina i tuoi compiti.' },
  { file: 'tareas_07_it.mp3', text: 'Ora padroneggi il hub dei compiti. Accedi alla sezione che ti serve per preparare le tue sessioni quando ne hai bisogno.' },
];

// ── /dashboard/tactical-board — EN ───────────────────────────────────────────
const STEPS_TBOARD_EN = [
  { file: 'tboard_01_en.mp3', text: 'Draw plays, tactics and animations on the pitch. Add players, use drawing tools, capture keyframes for GIFs and export as PNG or GIF. Let us walk you through it step by step.' },
  { file: 'tboard_02_en.mp3', text: 'In task mode, save the current image or GIF to the task you are editing.' },
  { file: 'tboard_03_en.mp3', text: 'Add cones or players with a colour and the ball. Choose a colour in the dropdown and click on the pitch to place them.' },
  { file: 'tboard_04_en.mp3', text: 'Select, pencil, line, arrow, rectangle, ellipse, text and eraser. Activate a tool and draw on the pitch.' },
  { file: 'tboard_05_en.mp3', text: 'Change the colour and stroke width for the drawing tools.' },
  { file: 'tboard_06_en.mp3', text: 'Switch between full pitch and half pitch.' },
  { file: 'tboard_07_en.mp3', text: 'Undo or redo the last changes.' },
  { file: 'tboard_08_en.mp3', text: 'Delete the selected element or clear the entire drawing.' },
  { file: 'tboard_09_en.mp3', text: 'Add keyframes to create an animation. Play it back, adjust speed and export as GIF.' },
  { file: 'tboard_10_en.mp3', text: 'Save the drawing to resume it later, or export as PNG or GIF if at least 2 keyframes are set.' },
  { file: 'tboard_11_en.mp3', text: "You've mastered the tactical board. Draw, animate and save or export as needed whenever you need it." },
];

// ── /dashboard/tactical-board — FR ───────────────────────────────────────────
const STEPS_TBOARD_FR = [
  { file: 'tboard_01_fr.mp3', text: "Dessinez des actions, tactiques et animations sur le terrain. Ajoutez des joueurs, utilisez les outils de dessin, capturez des images clés pour les GIF et exportez en PNG ou GIF. Nous vous guidons étape par étape." },
  { file: 'tboard_02_fr.mp3', text: "En mode tâche, enregistrez l'image ou le GIF actuel dans la tâche que vous modifiez." },
  { file: 'tboard_03_fr.mp3', text: "Ajoutez des cônes ou joueurs avec une couleur et le ballon. Choisissez une couleur dans le menu déroulant et cliquez sur le terrain pour les placer." },
  { file: 'tboard_04_fr.mp3', text: "Sélection, crayon, ligne, flèche, rectangle, ellipse, texte et gomme. Activez un outil et dessinez sur le terrain." },
  { file: 'tboard_05_fr.mp3', text: "Changez la couleur et l'épaisseur du trait pour les outils de dessin." },
  { file: 'tboard_06_fr.mp3', text: "Passez entre terrain complet et demi-terrain." },
  { file: 'tboard_07_fr.mp3', text: "Annulez ou rétablissez les dernières modifications." },
  { file: 'tboard_08_fr.mp3', text: "Supprimez l'élément sélectionné ou effacez tout le dessin." },
  { file: 'tboard_09_fr.mp3', text: "Ajoutez des images clés pour créer une animation. Lisez-la, ajustez la vitesse et exportez en GIF." },
  { file: 'tboard_10_fr.mp3', text: "Enregistrez le dessin pour le reprendre plus tard, ou exportez en PNG ou GIF si au moins 2 images clés sont définies." },
  { file: 'tboard_11_fr.mp3', text: "Vous maîtrisez le tableau tactique. Dessinez, animez et enregistrez ou exportez selon vos besoins." },
];

// ── /dashboard/tactical-board — DE ───────────────────────────────────────────
const STEPS_TBOARD_DE = [
  { file: 'tboard_01_de.mp3', text: 'Zeichnen Sie Spielzüge, Taktiken und Animationen auf dem Feld. Fügen Sie Spieler hinzu, nutzen Sie Zeichenwerkzeuge, erfassen Sie Keyframes für GIFs und exportieren Sie als PNG oder GIF. Wir führen Sie Schritt für Schritt.' },
  { file: 'tboard_02_de.mp3', text: 'Im Aufgabenmodus speichern Sie das aktuelle Bild oder GIF in der zu bearbeitenden Aufgabe.' },
  { file: 'tboard_03_de.mp3', text: 'Fügen Sie Kegel oder Spieler mit einer Farbe und den Ball hinzu. Wählen Sie eine Farbe im Dropdown und klicken Sie auf das Feld zum Platzieren.' },
  { file: 'tboard_04_de.mp3', text: 'Auswahl, Stift, Linie, Pfeil, Rechteck, Ellipse, Text und Radierer. Aktivieren Sie ein Werkzeug und zeichnen Sie auf dem Feld.' },
  { file: 'tboard_05_de.mp3', text: 'Ändern Sie die Farbe und Strichstärke für die Zeichenwerkzeuge.' },
  { file: 'tboard_06_de.mp3', text: 'Wechseln Sie zwischen ganzem Feld und halbem Feld.' },
  { file: 'tboard_07_de.mp3', text: 'Machen Sie die letzten Änderungen rückgängig oder stellen Sie sie wieder her.' },
  { file: 'tboard_08_de.mp3', text: 'Löschen Sie das ausgewählte Element oder den gesamten Zeichenbereich.' },
  { file: 'tboard_09_de.mp3', text: 'Fügen Sie Keyframes hinzu, um eine Animation zu erstellen. Abspielen, Geschwindigkeit anpassen und als GIF exportieren.' },
  { file: 'tboard_10_de.mp3', text: 'Speichern Sie die Zeichnung zum späteren Fortfahren oder exportieren Sie als PNG oder GIF ab 2 Keyframes.' },
  { file: 'tboard_11_de.mp3', text: 'Sie beherrschen jetzt das Taktikboard. Zeichnen, animieren und speichern oder exportieren Sie nach Bedarf.' },
];

// ── /dashboard/tactical-board — PT ───────────────────────────────────────────
const STEPS_TBOARD_PT = [
  { file: 'tboard_01_pt.mp3', text: 'Desenhe jogadas, táticas e animações no campo. Adicione jogadores, use ferramentas de desenho, capture keyframes para GIFs e exporte como PNG ou GIF. Vamos guiá-lo passo a passo.' },
  { file: 'tboard_02_pt.mp3', text: 'No modo de tarefa, guarde a imagem ou o GIF atual na tarefa que está a editar.' },
  { file: 'tboard_03_pt.mp3', text: 'Adicione cones ou jogadores com uma cor e a bola. Escolha uma cor no menu e clique no campo para colocar.' },
  { file: 'tboard_04_pt.mp3', text: 'Seleção, lápis, linha, seta, retângulo, elipse, texto e borracha. Ative uma ferramenta e desenhe no campo.' },
  { file: 'tboard_05_pt.mp3', text: 'Altere a cor e a espessura do traço para as ferramentas de desenho.' },
  { file: 'tboard_06_pt.mp3', text: 'Alterne entre campo inteiro e meio campo.' },
  { file: 'tboard_07_pt.mp3', text: 'Desfaça ou refaça as últimas alterações.' },
  { file: 'tboard_08_pt.mp3', text: 'Elimine o elemento selecionado ou limpe todo o desenho.' },
  { file: 'tboard_09_pt.mp3', text: 'Adicione keyframes para criar uma animação. Reproduza, ajuste a velocidade e exporte em GIF.' },
  { file: 'tboard_10_pt.mp3', text: 'Guarde o desenho para retomar mais tarde, ou exporte como PNG ou GIF se tiver pelo menos 2 keyframes.' },
  { file: 'tboard_11_pt.mp3', text: 'Já domina o quadro tático. Desenhe, anime e guarde ou exporte conforme necessário.' },
];

// ── /dashboard/tactical-board — IT ───────────────────────────────────────────
const STEPS_TBOARD_IT = [
  { file: 'tboard_01_it.mp3', text: 'Disegna azioni, tattiche e animazioni sul campo. Aggiungi giocatori, usa gli strumenti di disegno, cattura keyframe per GIF ed esporta come PNG o GIF. Ti guidiamo passo dopo passo.' },
  { file: 'tboard_02_it.mp3', text: "In modalità compito, salva l'immagine o il GIF attuale nel compito che stai modificando." },
  { file: 'tboard_03_it.mp3', text: 'Aggiungi coni o giocatori con un colore e il pallone. Scegli un colore nel menu a tendina e clicca sul campo per posizionarli.' },
  { file: 'tboard_04_it.mp3', text: 'Selezione, matita, linea, freccia, rettangolo, ellisse, testo e gomma. Attiva uno strumento e disegna sul campo.' },
  { file: 'tboard_05_it.mp3', text: 'Cambia il colore e lo spessore del tratto per gli strumenti di disegno.' },
  { file: 'tboard_06_it.mp3', text: 'Passa tra campo intero e metà campo.' },
  { file: 'tboard_07_it.mp3', text: 'Annulla o ripristina le ultime modifiche.' },
  { file: 'tboard_08_it.mp3', text: "Elimina l'elemento selezionato o cancella tutto il disegno." },
  { file: 'tboard_09_it.mp3', text: "Aggiungi keyframe per creare un'animazione. Riproduci, regola la velocità ed esporta in GIF." },
  { file: 'tboard_10_it.mp3', text: 'Salva il disegno per riprenderlo in seguito, oppure esporta come PNG o GIF se ci sono almeno 2 keyframe.' },
  { file: 'tboard_11_it.mp3', text: 'Ora padroneggi la lavagna tattica. Disegna, anima e salva o esporta secondo le tue necessità.' },
];

// ── /dashboard/tareas-catalog — EN ───────────────────────────────────────────
const STEPS_TC_EN = [
  { file: 'tc_01_en.mp3', text: 'Search and filter cloud tasks by text, strategy and intention. Add tasks to favourites or to a specific training session. Let us walk you through it step by step.' },
  { file: 'tc_02_en.mp3', text: 'Type to filter tasks by title or description.' },
  { file: 'tc_03_en.mp3', text: 'Filter by strategy and intention. Show or hide the advanced filters panel.' },
  { file: 'tc_04_en.mp3', text: 'Task cards with image, tags and Add to training button. Tap a card to view details; from the detail you can add to favourites or to a training session.' },
  { file: 'tc_05_en.mp3', text: 'Navigate between pages of results if there are many tasks.' },
  { file: 'tc_06_en.mp3', text: "You've mastered the catalogue. Search, filter and add tasks to your training sessions or favourites whenever you need it." },
];

// ── /dashboard/tareas-catalog — FR ───────────────────────────────────────────
const STEPS_TC_FR = [
  { file: 'tc_01_fr.mp3', text: "Recherchez et filtrez les tâches du catalogue par texte, stratégie et intention. Ajoutez des tâches aux favoris ou à un entraînement spécifique. Nous vous guidons étape par étape." },
  { file: 'tc_02_fr.mp3', text: 'Tapez pour filtrer les tâches par titre ou description.' },
  { file: 'tc_03_fr.mp3', text: "Filtrez par stratégie et intention. Affichez ou masquez le panneau de filtres avancés." },
  { file: 'tc_04_fr.mp3', text: "Cartes de tâches avec image, étiquettes et bouton Ajouter à l'entraînement. Appuyez sur une carte pour voir les détails ; depuis le détail vous pouvez ajouter aux favoris ou à un entraînement." },
  { file: 'tc_05_fr.mp3', text: "Naviguez entre les pages de résultats s'il y a beaucoup de tâches." },
  { file: 'tc_06_fr.mp3', text: "Vous maîtrisez le catalogue. Recherchez, filtrez et ajoutez des tâches à vos entraînements ou favoris quand vous le souhaitez." },
];

// ── /dashboard/tareas-catalog — DE ───────────────────────────────────────────
const STEPS_TC_DE = [
  { file: 'tc_01_de.mp3', text: 'Suchen und filtern Sie Cloud-Aufgaben nach Text, Strategie und Absicht. Fügen Sie Aufgaben zu Favoriten oder einem bestimmten Training hinzu. Wir führen Sie Schritt für Schritt.' },
  { file: 'tc_02_de.mp3', text: 'Geben Sie Text ein, um Aufgaben nach Titel oder Beschreibung zu filtern.' },
  { file: 'tc_03_de.mp3', text: 'Filtern nach Strategie und Absicht. Das erweiterte Filterpanel ein- oder ausblenden.' },
  { file: 'tc_04_de.mp3', text: 'Aufgabenkarten mit Bild, Tags und Schaltfläche Zum Training hinzufügen. Tippen Sie auf eine Karte, um Details zu sehen; von dort können Sie zu Favoriten oder einem Training hinzufügen.' },
  { file: 'tc_05_de.mp3', text: 'Navigieren Sie zwischen Ergebnisseiten, wenn es viele Aufgaben gibt.' },
  { file: 'tc_06_de.mp3', text: 'Sie beherrschen jetzt den Katalog. Suchen, filtern und Aufgaben zu Trainings oder Favoriten hinzufügen, wann immer Sie möchten.' },
];

// ── /dashboard/tareas-catalog — PT ───────────────────────────────────────────
const STEPS_TC_PT = [
  { file: 'tc_01_pt.mp3', text: 'Pesquise e filtre tarefas da nuvem por texto, estratégia e intenção. Adicione tarefas aos favoritos ou a um treino específico. Vamos guiá-lo passo a passo.' },
  { file: 'tc_02_pt.mp3', text: 'Escreva para filtrar tarefas por título ou descrição.' },
  { file: 'tc_03_pt.mp3', text: 'Filtre por estratégia e intenção. Mostre ou oculte o painel de filtros avançados.' },
  { file: 'tc_04_pt.mp3', text: 'Cartões de tarefas com imagem, etiquetas e botão Adicionar ao treino. Toque num cartão para ver os detalhes; a partir daí pode adicionar aos favoritos ou a um treino.' },
  { file: 'tc_05_pt.mp3', text: 'Navegue entre páginas de resultados se houver muitas tarefas.' },
  { file: 'tc_06_pt.mp3', text: 'Já domina o catálogo. Pesquise, filtre e adicione tarefas aos seus treinos ou favoritos quando precisar.' },
];

// ── /dashboard/tareas-catalog — IT ───────────────────────────────────────────
const STEPS_TC_IT = [
  { file: 'tc_01_it.mp3', text: "Cerca e filtra i compiti cloud per testo, strategia e intenzione. Aggiungi compiti ai preferiti o a un allenamento specifico. Ti guidiamo passo dopo passo." },
  { file: 'tc_02_it.mp3', text: 'Digita per filtrare i compiti per titolo o descrizione.' },
  { file: 'tc_03_it.mp3', text: 'Filtra per strategia e intenzione. Mostra o nascondi il pannello dei filtri avanzati.' },
  { file: 'tc_04_it.mp3', text: "Schede compiti con immagine, etichette e pulsante Aggiungi all'allenamento. Tocca una scheda per vedere i dettagli; da lì puoi aggiungere ai preferiti o a un allenamento." },
  { file: 'tc_05_it.mp3', text: 'Naviga tra le pagine dei risultati se ci sono molti compiti.' },
  { file: 'tc_06_it.mp3', text: 'Ora padroneggi il catalogo. Cerca, filtra e aggiungi compiti ai tuoi allenamenti o preferiti quando ne hai bisogno.' },
];

// ── /dashboard/tareas-historial — EN ─────────────────────────────────────────
const STEPS_THIST_EN = [
  { file: 'thist_01_en.mp3', text: 'Tasks you have already used in training sessions. Check when and how many times you used them, open the detail and add them to favourites or reuse them. Let us explain each part.' },
  { file: 'thist_02_en.mp3', text: 'Cards with image, origin, title, tags and last use date. Tap a card to view the detail and mark it as a favourite.' },
  { file: 'thist_03_en.mp3', text: 'Change page if there are many tasks in the history.' },
  { file: 'thist_04_en.mp3', text: "You've mastered the history. Reuse tasks and keep your favourites up to date whenever you need it." },
];

// ── /dashboard/tareas-historial — FR ─────────────────────────────────────────
const STEPS_THIST_FR = [
  { file: 'thist_01_fr.mp3', text: "Tâches que vous avez déjà utilisées dans des entraînements. Consultez quand et combien de fois vous les avez utilisées, ouvrez les détails et ajoutez-les aux favoris ou réutilisez-les. Nous vous expliquons chaque partie." },
  { file: 'thist_02_fr.mp3', text: "Cartes avec image, origine, titre, étiquettes et date de dernière utilisation. Appuyez sur une carte pour voir les détails et la marquer comme favorite." },
  { file: 'thist_03_fr.mp3', text: "Changez de page s'il y a beaucoup de tâches dans l'historique." },
  { file: 'thist_04_fr.mp3', text: "Vous maîtrisez l'historique. Réutilisez les tâches et maintenez vos favoris à jour quand vous le souhaitez." },
];

// ── /dashboard/tareas-historial — DE ─────────────────────────────────────────
const STEPS_THIST_DE = [
  { file: 'thist_01_de.mp3', text: 'Aufgaben, die Sie bereits in Trainings verwendet haben. Prüfen Sie wann und wie oft Sie sie genutzt haben, öffnen Sie Details und fügen Sie sie zu Favoriten hinzu oder verwenden Sie sie erneut. Wir erklären jeden Teil.' },
  { file: 'thist_02_de.mp3', text: 'Karten mit Bild, Herkunft, Titel, Tags und Datum der letzten Verwendung. Tippen Sie auf eine Karte, um Details anzuzeigen und sie als Favorit zu markieren.' },
  { file: 'thist_03_de.mp3', text: 'Wechseln Sie die Seite, wenn es viele Aufgaben im Verlauf gibt.' },
  { file: 'thist_04_de.mp3', text: 'Sie beherrschen jetzt den Verlauf. Verwenden Sie Aufgaben erneut und halten Sie Ihre Favoriten aktuell.' },
];

// ── /dashboard/tareas-historial — PT ─────────────────────────────────────────
const STEPS_THIST_PT = [
  { file: 'thist_01_pt.mp3', text: 'Tarefas que já utilizou em treinos. Consulte quando e quantas vezes as utilizou, abra os detalhes e adicione-as aos favoritos ou reutilize-as. Explicamos cada parte.' },
  { file: 'thist_02_pt.mp3', text: 'Cartões com imagem, origem, título, etiquetas e data do último uso. Toque num cartão para ver os detalhes e marcá-lo como favorito.' },
  { file: 'thist_03_pt.mp3', text: 'Mude de página se houver muitas tarefas no histórico.' },
  { file: 'thist_04_pt.mp3', text: 'Já domina o histórico. Reutilize tarefas e mantenha os seus favoritos atualizados quando precisar.' },
];

// ── /dashboard/tareas-historial — IT ─────────────────────────────────────────
const STEPS_THIST_IT = [
  { file: 'thist_01_it.mp3', text: 'Compiti che hai già usato negli allenamenti. Controlla quando e quante volte li hai usati, apri i dettagli e aggiungili ai preferiti o riutilizzali. Ti spieghiamo ogni parte.' },
  { file: 'thist_02_it.mp3', text: 'Schede con immagine, origine, titolo, etichette e data ultimo utilizzo. Tocca una scheda per vedere i dettagli e contrassegnarla come preferita.' },
  { file: 'thist_03_it.mp3', text: 'Cambia pagina se ci sono molti compiti nella cronologia.' },
  { file: 'thist_04_it.mp3', text: 'Ora padroneggi la cronologia. Riutilizza i compiti e mantieni i preferiti aggiornati quando ne hai bisogno.' },
];

// ── /dashboard/tareas-favoritas — EN ─────────────────────────────────────────
const STEPS_TFAV_EN = [
  { file: 'tfav_01_en.mp3', text: 'Your tasks marked as favourites. Open them to see full details and remove from favourites if you wish. Let us walk you through it step by step.' },
  { file: 'tfav_02_en.mp3', text: 'Your favourite task cards. Tap one to see description, rules, variants and video link. From the detail you can remove from favourites.' },
  { file: 'tfav_03_en.mp3', text: 'Navigate between pages if you have many favourites.' },
  { file: 'tfav_04_en.mp3', text: "You've mastered favourite tasks. Add more from the catalogue or history whenever you need it." },
];

// ── /dashboard/tareas-favoritas — FR ─────────────────────────────────────────
const STEPS_TFAV_FR = [
  { file: 'tfav_01_fr.mp3', text: "Vos tâches marquées comme favorites. Ouvrez-les pour voir tous les détails et retirez-les des favoris si vous le souhaitez. Nous vous guidons étape par étape." },
  { file: 'tfav_02_fr.mp3', text: "Vos cartes de tâches favorites. Appuyez sur une pour voir la description, les règles, les variantes et le lien vidéo. Depuis les détails vous pouvez retirer des favoris." },
  { file: 'tfav_03_fr.mp3', text: "Naviguez entre les pages si vous avez beaucoup de favoris." },
  { file: 'tfav_04_fr.mp3', text: "Vous maîtrisez les tâches favorites. Ajoutez-en depuis le catalogue ou l'historique quand vous le souhaitez." },
];

// ── /dashboard/tareas-favoritas — DE ─────────────────────────────────────────
const STEPS_TFAV_DE = [
  { file: 'tfav_01_de.mp3', text: 'Ihre als Favoriten markierten Aufgaben. Öffnen Sie sie, um alle Details anzuzeigen und bei Bedarf aus den Favoriten zu entfernen. Wir führen Sie Schritt für Schritt.' },
  { file: 'tfav_02_de.mp3', text: 'Ihre Lieblingsaufgabenkarten. Tippen Sie auf eine, um Beschreibung, Regeln, Varianten und Video-Link anzuzeigen. Von den Details aus können Sie aus Favoriten entfernen.' },
  { file: 'tfav_03_de.mp3', text: 'Navigieren Sie zwischen Seiten, wenn Sie viele Favoriten haben.' },
  { file: 'tfav_04_de.mp3', text: 'Sie beherrschen jetzt die Lieblingsaufgaben. Fügen Sie weitere aus dem Katalog oder Verlauf hinzu, wann immer Sie möchten.' },
];

// ── /dashboard/tareas-favoritas — PT ─────────────────────────────────────────
const STEPS_TFAV_PT = [
  { file: 'tfav_01_pt.mp3', text: 'As suas tarefas marcadas como favoritas. Abra-as para ver todos os detalhes e remova dos favoritos se desejar. Vamos guiá-lo passo a passo.' },
  { file: 'tfav_02_pt.mp3', text: 'Os seus cartões de tarefas favoritas. Toque num para ver a descrição, regras, variantes e link de vídeo. A partir dos detalhes pode remover dos favoritos.' },
  { file: 'tfav_03_pt.mp3', text: 'Navegue entre páginas se tiver muitos favoritos.' },
  { file: 'tfav_04_pt.mp3', text: 'Já domina as tarefas favoritas. Adicione mais do catálogo ou do histórico quando precisar.' },
];

// ── /dashboard/tareas-favoritas — IT ─────────────────────────────────────────
const STEPS_TFAV_IT = [
  { file: 'tfav_01_it.mp3', text: 'I tuoi compiti contrassegnati come preferiti. Aprili per vedere tutti i dettagli e rimuoverli dai preferiti se lo desideri. Ti guidiamo passo dopo passo.' },
  { file: 'tfav_02_it.mp3', text: 'Le tue schede compiti preferiti. Toccane una per vedere descrizione, regole, varianti e link video. Dai dettagli puoi rimuovere dai preferiti.' },
  { file: 'tfav_03_it.mp3', text: 'Naviga tra le pagine se hai molti preferiti.' },
  { file: 'tfav_04_it.mp3', text: 'Ora padroneggi i compiti preferiti. Aggiungine altri dal catalogo o dalla cronologia quando ne hai bisogno.' },
];

// ── /dashboard/tareas-mis — EN ───────────────────────────────────────────────
const STEPS_TMIS_EN = [
  { file: 'tmis_01_en.mp3', text: 'Tasks created by you: from the tactical board or with the form. Create, edit and delete; you can mark them as favourites. Let us explain each part.' },
  { file: 'tmis_02_en.mp3', text: 'Open the form to create a new task. You can use an image from the tactical board or fill in title, strategy, description, rules, variants, time, space, material and video.' },
  { file: 'tmis_03_en.mp3', text: 'Your tasks with image, title and tags. Each card has favourite, edit and delete. Tap the card to see the full detail.' },
  { file: 'tmis_04_en.mp3', text: 'Change page if you have many own tasks.' },
  { file: 'tmis_05_en.mp3', text: "You've mastered My tasks. Create and edit your own tasks to use them in your training sessions whenever you need it." },
];

// ── /dashboard/tareas-mis — FR ───────────────────────────────────────────────
const STEPS_TMIS_FR = [
  { file: 'tmis_01_fr.mp3', text: "Tâches créées par vous : depuis le tableau tactique ou avec le formulaire. Créez, modifiez et supprimez ; vous pouvez les marquer comme favorites. Nous vous expliquons chaque partie." },
  { file: 'tmis_02_fr.mp3', text: "Ouvrez le formulaire pour créer une nouvelle tâche. Vous pouvez utiliser une image du tableau tactique ou remplir le titre, la stratégie, la description, les règles, les variantes, le temps, l'espace, le matériel et la vidéo." },
  { file: 'tmis_03_fr.mp3', text: "Vos tâches avec image, titre et étiquettes. Chaque carte a : favori, modifier et supprimer. Appuyez sur la carte pour voir les détails complets." },
  { file: 'tmis_04_fr.mp3', text: "Changez de page si vous avez beaucoup de tâches personnelles." },
  { file: 'tmis_05_fr.mp3', text: "Vous maîtrisez Mes tâches. Créez et modifiez vos propres tâches pour les utiliser dans vos entraînements quand vous le souhaitez." },
];

// ── /dashboard/tareas-mis — DE ───────────────────────────────────────────────
const STEPS_TMIS_DE = [
  { file: 'tmis_01_de.mp3', text: 'Von Ihnen erstellte Aufgaben: vom Taktikboard oder über das Formular. Erstellen, bearbeiten und löschen Sie; Sie können sie als Favoriten markieren. Wir erklären jeden Teil.' },
  { file: 'tmis_02_de.mp3', text: 'Öffnen Sie das Formular zum Erstellen einer neuen Aufgabe. Sie können ein Bild vom Taktikboard verwenden oder Titel, Strategie, Beschreibung, Regeln, Varianten, Zeit, Raum, Material und Video ausfüllen.' },
  { file: 'tmis_03_de.mp3', text: 'Ihre Aufgaben mit Bild, Titel und Tags. Jede Karte hat: Favorit, Bearbeiten und Löschen. Tippen Sie auf die Karte, um alle Details anzuzeigen.' },
  { file: 'tmis_04_de.mp3', text: 'Wechseln Sie die Seite, wenn Sie viele eigene Aufgaben haben.' },
  { file: 'tmis_05_de.mp3', text: 'Sie beherrschen jetzt Meine Aufgaben. Erstellen und bearbeiten Sie Ihre eigenen Aufgaben, um sie in Ihren Trainings zu verwenden.' },
];

// ── /dashboard/tareas-mis — PT ───────────────────────────────────────────────
const STEPS_TMIS_PT = [
  { file: 'tmis_01_pt.mp3', text: 'Tarefas criadas por si: do quadro tático ou com o formulário. Crie, edite e elimine; pode marcá-las como favoritas. Explicamos cada parte.' },
  { file: 'tmis_02_pt.mp3', text: 'Abra o formulário para criar uma nova tarefa. Pode usar uma imagem do quadro tático ou preencher título, estratégia, descrição, regras, variantes, tempo, espaço, material e vídeo.' },
  { file: 'tmis_03_pt.mp3', text: 'As suas tarefas com imagem, título e etiquetas. Em cada cartão: favorita, editar e eliminar. Toque no cartão para ver todos os detalhes.' },
  { file: 'tmis_04_pt.mp3', text: 'Mude de página se tiver muitas tarefas próprias.' },
  { file: 'tmis_05_pt.mp3', text: 'Já domina As minhas tarefas. Crie e edite as suas próprias tarefas para usá-las nos seus treinos quando precisar.' },
];

// ── /dashboard/tareas-mis — IT ───────────────────────────────────────────────
const STEPS_TMIS_IT = [
  { file: 'tmis_01_it.mp3', text: 'Compiti creati da te: dalla lavagna tattica o con il modulo. Crea, modifica ed elimina; puoi contrassegnarli come preferiti. Ti spieghiamo ogni parte.' },
  { file: 'tmis_02_it.mp3', text: "Apri il modulo per creare un nuovo compito. Puoi usare un'immagine dalla lavagna tattica o compilare titolo, strategia, descrizione, regole, varianti, tempo, spazio, materiale e video." },
  { file: 'tmis_03_it.mp3', text: 'I tuoi compiti con immagine, titolo ed etichette. Ogni scheda ha: preferito, modifica ed elimina. Tocca la scheda per vedere tutti i dettagli.' },
  { file: 'tmis_04_it.mp3', text: 'Cambia pagina se hai molti compiti personali.' },
  { file: 'tmis_05_it.mp3', text: 'Ora padroneggi I miei compiti. Crea e modifica i tuoi compiti per usarli nei tuoi allenamenti quando ne hai bisogno.' },
];

// ── /dashboard/estadisticas_jugadores/:teamId — EN ───────────────────────────
const STEPS_EJ_COACH_EN = [
  { file: 'estjug_01_en.mp3', text: "Statistical analysis of individual performance: table view or chart view with comparisons and goals by player. We'll explain each section." },
  { file: 'estjug_02_en.mp3', text: 'Switch between "View table" (player table with search and pagination) and "View charts" (charts and goals table).' },
  { file: 'estjug_03_en.mp3', text: 'Filter by League, Friendly or Tournament. The displayed data updates according to the active tab.' },
  { file: 'estjug_04_en.mp3', text: 'Card with search by name or position, table with ID, name, position, date of birth, matches played, total minutes, average minutes, goals, assists, G+A, cards, etc. Pagination below.' },
  { file: 'estjug_05_en.mp3', text: 'Selector for chart type (total minutes, goals, assists, matches played, penalty goals, missed penalties, cards) and comparative bar chart.' },
  { file: 'estjug_06_en.mp3', text: 'Player selector (or "View all"), search by scorer/opponent/category and table with goal by, assist by, opponent, minute, date, category, subcategory and option. Pagination below.' },
  { file: 'estjug_07_en.mp3', text: "You've mastered player statistics. Use the table or charts and filter by match type whenever you need." },
];

// ── /dashboard/estadisticas_jugadores/:teamId — FR ───────────────────────────
const STEPS_EJ_COACH_FR = [
  { file: 'estjug_01_fr.mp3', text: "Analyse statistique des performances individuelles : vue tableau ou vue graphiques avec comparaisons et buts par joueur. Nous vous expliquons chaque section." },
  { file: 'estjug_02_fr.mp3', text: 'Alternez entre "Voir tableau" (tableau des joueurs avec recherche et pagination) et "Voir graphiques" (graphiques et tableau des buts).' },
  { file: 'estjug_03_fr.mp3', text: "Filtrez par Ligue, Match amical ou Tournoi. Les données affichées se mettent à jour selon l'onglet actif." },
  { file: 'estjug_04_fr.mp3', text: 'Carte avec recherche par nom ou poste, tableau avec ID, nom, poste, date de naissance, matchs joués, minutes totales, moyenne minutes, buts, passes décisives, G+A, cartons, etc. Pagination en dessous.' },
  { file: 'estjug_05_fr.mp3', text: 'Sélecteur de type de graphique (minutes totales, buts, passes décisives, matchs joués, buts sur penalty, penaltys manqués, cartons) et graphique à barres comparatif.' },
  { file: 'estjug_06_fr.mp3', text: "Sélecteur de joueur (ou \"Voir tous\"), recherche par buteur/adversaire/catégorie et tableau avec but de, passe de, adversaire, minute, date, catégorie, sous-catégorie et option. Pagination en dessous." },
  { file: 'estjug_07_fr.mp3', text: 'Vous maîtrisez les statistiques des joueurs. Utilisez le tableau ou les graphiques et filtrez par type de match quand vous en avez besoin.' },
];

// ── /dashboard/estadisticas_jugadores/:teamId — DE ───────────────────────────
const STEPS_EJ_COACH_DE = [
  { file: 'estjug_01_de.mp3', text: 'Statistische Analyse der Einzelleistungen: Tabellenansicht oder Diagrammansicht mit Vergleichen und Toren je Spieler. Wir erklären jeden Abschnitt.' },
  { file: 'estjug_02_de.mp3', text: 'Wechseln Sie zwischen "Tabelle anzeigen" (Spielertabelle mit Suche und Paginierung) und "Diagramme anzeigen" (Diagramme und Tor-Tabelle).' },
  { file: 'estjug_03_de.mp3', text: 'Filtern Sie nach Liga, Freundschaftsspiel oder Turnier. Die angezeigten Daten aktualisieren sich je nach aktivem Tab.' },
  { file: 'estjug_04_de.mp3', text: 'Karte mit Suche nach Name oder Position, Tabelle mit ID, Name, Position, Geburtsdatum, gespielte Spiele, Gesamtminuten, Durchschnittsminuten, Tore, Assists, G+A, Karten usw. Paginierung unten.' },
  { file: 'estjug_05_de.mp3', text: 'Auswahl des Diagrammtyps (Gesamtminuten, Tore, Assists, gespielte Spiele, Elfmetertore, verfehlte Elfmeter, Karten) und vergleichendes Balkendiagramm.' },
  { file: 'estjug_06_de.mp3', text: 'Spielerauswahl (oder "Alle anzeigen"), Suche nach Torschütze/Gegner/Kategorie und Tabelle mit Tor von, Assist von, Gegner, Minute, Datum, Kategorie, Unterkategorie und Option. Paginierung unten.' },
  { file: 'estjug_07_de.mp3', text: 'Sie beherrschen die Spielerstatistiken. Nutzen Sie Tabelle oder Diagramme und filtern Sie nach Spieltyp, wenn Sie es brauchen.' },
];

// ── /dashboard/estadisticas_jugadores/:teamId — PT ───────────────────────────
const STEPS_EJ_COACH_PT = [
  { file: 'estjug_01_pt.mp3', text: 'Análise estatística do desempenho individual: vista de tabela ou vista de gráficos com comparações e golos por jogador. Explicamos cada secção.' },
  { file: 'estjug_02_pt.mp3', text: 'Alterne entre "Ver tabela" (tabela de jogadores com pesquisa e paginação) e "Ver gráficos" (gráficos e tabela de golos).' },
  { file: 'estjug_03_pt.mp3', text: 'Filtre por Liga, Amigável ou Torneio. Os dados exibidos atualizam-se conforme o separador ativo.' },
  { file: 'estjug_04_pt.mp3', text: 'Cartão com pesquisa por nome ou posição, tabela com ID, nome, posição, data de nascimento, jogos disputados, minutos totais, média minutos, golos, assistências, G+A, cartões, etc. Paginação abaixo.' },
  { file: 'estjug_05_pt.mp3', text: 'Seletor de tipo de gráfico (minutos totais, golos, assistências, jogos disputados, golos de penálti, penáltis falhados, cartões) e gráfico de barras comparativo.' },
  { file: 'estjug_06_pt.mp3', text: 'Seletor de jogador (ou "Ver todos"), pesquisa por goleador/adversário/categoria e tabela com golo de, assistência de, adversário, minuto, data, categoria, subcategoria e opção. Paginação abaixo.' },
  { file: 'estjug_07_pt.mp3', text: 'Já domina as estatísticas de jogadores. Use a tabela ou os gráficos e filtre por tipo de jogo quando precisar.' },
];

// ── /dashboard/estadisticas_jugadores/:teamId — IT ───────────────────────────
const STEPS_EJ_COACH_IT = [
  { file: 'estjug_01_it.mp3', text: 'Analisi statistica delle prestazioni individuali: vista tabella o vista grafici con confronti e gol per giocatore. Spieghiamo ogni sezione.' },
  { file: 'estjug_02_it.mp3', text: 'Alterna tra "Vedi tabella" (tabella giocatori con ricerca e paginazione) e "Vedi grafici" (grafici e tabella gol).' },
  { file: 'estjug_03_it.mp3', text: 'Filtra per Campionato, Amichevole o Torneo. I dati visualizzati si aggiornano in base al tab attivo.' },
  { file: 'estjug_04_it.mp3', text: 'Scheda con ricerca per nome o ruolo, tabella con ID, nome, ruolo, data di nascita, partite giocate, minuti totali, media minuti, gol, assist, G+A, cartellini, ecc. Paginazione in basso.' },
  { file: 'estjug_05_it.mp3', text: 'Selezione del tipo di grafico (minuti totali, gol, assist, partite giocate, gol su rigore, rigori sbagliati, cartellini) e grafico a barre comparativo.' },
  { file: 'estjug_06_it.mp3', text: 'Selezione giocatore (o "Vedi tutti"), ricerca per marcatore/avversario/categoria e tabella con gol di, assist di, avversario, minuto, data, categoria, sottocategoria e opzione. Paginazione in basso.' },
  { file: 'estjug_07_it.mp3', text: "Hai padroneggiato le statistiche dei giocatori. Usa la tabella o i grafici e filtra per tipo di partita quando ne hai bisogno." },
];

// ── /dashboard/clasificacion-resultados/:teamId — EN ─────────────────────────
const STEPS_CR_EN = [
  { file: 'cr_01_en.mp3', text: "Track your league standings and team results. Configure the federation URL if needed and check standings and results by matchday. We'll guide you step by step." },
  { file: 'cr_02_en.mp3', text: 'Switch between the "Standings" tab (team table with position, points, P, W, D, L, GF-GA, form) and "Results" (match cards with score, date and View report button).' },
  { file: 'cr_03_en.mp3', text: 'Matchday selector (if the source allows) and button to refresh data from the federation.' },
  { file: 'cr_04_en.mp3', text: 'Table with position, team, points, matches played, won, drawn, lost, goals and form (last results).' },
  { file: 'cr_05_en.mp3', text: 'Grid of matches with teams, score, date, venue and "View report" button to open the match report in a new tab.' },
  { file: 'cr_06_en.mp3', text: 'Field to enter a new standings URL and "Update URL" button if you want to change the data source.' },
  { file: 'cr_07_en.mp3', text: "You've mastered standings and results. Refresh when needed and check reports from each match." },
];

// ── /dashboard/clasificacion-resultados/:teamId — FR ─────────────────────────
const STEPS_CR_FR = [
  { file: 'cr_01_fr.mp3', text: "Suivez le classement et les résultats de votre équipe. Configurez l'URL de votre fédération si nécessaire et consultez le classement et les résultats par journée. Nous vous guidons étape par étape." },
  { file: 'cr_02_fr.mp3', text: 'Alternez entre l\'onglet "Classement" (tableau des équipes avec position, points, J, V, N, D, BP-BC, forme) et "Résultats" (fiches de matchs avec score, date et bouton Voir le rapport).' },
  { file: 'cr_03_fr.mp3', text: 'Sélecteur de journée (si la source le permet) et bouton pour actualiser les données depuis la fédération.' },
  { file: 'cr_04_fr.mp3', text: 'Tableau avec position, équipe, points, matchs joués, gagnés, nuls, perdus, buts et forme (derniers résultats).' },
  { file: 'cr_05_fr.mp3', text: 'Grille de matchs avec équipes, score, date, terrain et bouton "Voir le rapport" pour ouvrir le rapport dans un nouvel onglet.' },
  { file: 'cr_06_fr.mp3', text: "Champ pour saisir une nouvelle URL de classement et bouton \"Mettre à jour l'URL\" si vous souhaitez changer la source de données." },
  { file: 'cr_07_fr.mp3', text: 'Vous maîtrisez le classement et les résultats. Actualisez quand vous en avez besoin et consultez les rapports depuis chaque match.' },
];

// ── /dashboard/clasificacion-resultados/:teamId — DE ─────────────────────────
const STEPS_CR_DE = [
  { file: 'cr_01_de.mp3', text: 'Verfolgen Sie die Tabelle und Ergebnisse Ihres Teams. Konfigurieren Sie die Verbands-URL falls nötig und prüfen Sie Tabelle und Ergebnisse nach Spieltag. Wir führen Sie Schritt für Schritt.' },
  { file: 'cr_02_de.mp3', text: 'Wechseln Sie zwischen dem Tab "Tabelle" (Mannschaftstabelle mit Platz, Punkte, Sp, G, U, N, Tore, Form) und "Ergebnisse" (Spielkarten mit Ergebnis, Datum und Spielbericht-Button).' },
  { file: 'cr_03_de.mp3', text: 'Spieltag-Auswahl (wenn die Quelle es ermöglicht) und Schaltfläche zum Aktualisieren der Daten vom Verband.' },
  { file: 'cr_04_de.mp3', text: 'Tabelle mit Platz, Mannschaft, Punkte, gespielte Spiele, Siege, Unentschieden, Niederlagen, Tore und Form (letzte Ergebnisse).' },
  { file: 'cr_05_de.mp3', text: 'Raster mit Spielen, Teams, Ergebnis, Datum, Spielstätte und Schaltfläche "Spielbericht" zum Öffnen in einem neuen Tab.' },
  { file: 'cr_06_de.mp3', text: 'Feld zur Eingabe einer neuen Tabellen-URL und Schaltfläche "URL aktualisieren", wenn Sie die Datenquelle ändern möchten.' },
  { file: 'cr_07_de.mp3', text: 'Sie beherrschen Tabelle und Ergebnisse. Aktualisieren Sie bei Bedarf und prüfen Sie die Spielberichte für jedes Spiel.' },
];

// ── /dashboard/clasificacion-resultados/:teamId — PT ─────────────────────────
const STEPS_CR_PT = [
  { file: 'cr_01_pt.mp3', text: 'Acompanhe a classificação e os resultados da sua equipa. Configure o URL da federação se necessário e consulte classificação e resultados por jornada. Vamos guiá-lo passo a passo.' },
  { file: 'cr_02_pt.mp3', text: 'Alterne entre o separador "Classificação" (tabela de equipas com posição, pontos, J, V, E, D, GM-GS, forma) e "Resultados" (cartões de jogos com marcador, data e botão Ver relatório).' },
  { file: 'cr_03_pt.mp3', text: 'Seletor de jornada (se a fonte o permite) e botão para atualizar os dados da federação.' },
  { file: 'cr_04_pt.mp3', text: 'Tabela com posição, equipa, pontos, jogos disputados, ganhos, empatados, perdidos, golos e forma (últimos resultados).' },
  { file: 'cr_05_pt.mp3', text: 'Grelha de jogos com equipas, marcador, data, campo e botão "Ver relatório" para abrir o relatório numa nova aba.' },
  { file: 'cr_06_pt.mp3', text: 'Campo para introduzir um novo URL de classificação e botão "Atualizar URL" se quiser mudar a fonte de dados.' },
  { file: 'cr_07_pt.mp3', text: 'Já domina a classificação e os resultados. Atualize quando precisar e consulte os relatórios de cada jogo.' },
];

// ── /dashboard/clasificacion-resultados/:teamId — IT ─────────────────────────
const STEPS_CR_IT = [
  { file: 'cr_01_it.mp3', text: "Segui la classifica e i risultati della tua squadra. Configura l'URL della federazione se necessario e consulta classifica e risultati per giornata. Ti guidiamo passo dopo passo." },
  { file: 'cr_02_it.mp3', text: 'Alterna tra il tab "Classifica" (tabella squadre con posizione, punti, G, V, P, S, GF-GS, forma) e "Risultati" (schede partite con punteggio, data e bottone Vedi referto).' },
  { file: 'cr_03_it.mp3', text: 'Selezione della giornata (se la fonte lo permette) e pulsante per aggiornare i dati dalla federazione.' },
  { file: 'cr_04_it.mp3', text: 'Tabella con posizione, squadra, punti, partite giocate, vinte, pareggiate, perse, gol e forma (ultimi risultati).' },
  { file: 'cr_05_it.mp3', text: 'Griglia di partite con squadre, punteggio, data, campo e bottone "Vedi referto" per aprire il referto in una nuova scheda.' },
  { file: 'cr_06_it.mp3', text: 'Campo per inserire un nuovo URL di classifica e bottone "Aggiorna URL" se vuoi cambiare la fonte dati.' },
  { file: 'cr_07_it.mp3', text: 'Hai padroneggiato classifica e risultati. Aggiorna quando necessario e consulta i referti di ogni partita.' },
];

// ── /dashboard/partidos-entrevistas/:teamId — EN ─────────────────────────────
const STEPS_PENTE_EN = [
  { file: 'pente_01_en.mp3', text: "Gallery of photos and videos from the team's matches. Select a match in the carousel and browse photos and videos. You can upload new images or add by URL. We'll explain each section." },
  { file: 'pente_02_en.mp3', text: 'Pills showing total photos, videos and available matches.' },
  { file: 'pente_03_en.mp3', text: 'Carousel of matches with letter (W/D/L), opponent name, result and number of photos/videos. Select one to view its gallery.' },
  { file: 'pente_04_en.mp3', text: 'Tabs to view the photos or videos of the selected match.' },
  { file: 'pente_05_en.mp3', text: 'In Photos: "New image" to upload or drag files, or "Add by URL". In Videos: "Add by URL" or "Upload from device" (if the club has a video subscription).' },
  { file: 'pente_06_en.mp3', text: 'Grid of photos or videos. Tap a photo to enlarge it in a lightbox. Each item can be deleted if it belongs to you.' },
  { file: 'pente_07_en.mp3', text: "You've mastered the match gallery. Choose a match, upload content and browse photos and videos whenever you need." },
];

// ── /dashboard/partidos-entrevistas/:teamId — FR ─────────────────────────────
const STEPS_PENTE_FR = [
  { file: 'pente_01_fr.mp3', text: "Galerie de photos et vidéos des matchs de l'équipe. Sélectionnez un match dans le carrousel et parcourez photos et vidéos. Vous pouvez télécharger de nouvelles images ou en ajouter par URL. Nous vous expliquons chaque section." },
  { file: 'pente_02_fr.mp3', text: 'Pastilles affichant le total de photos, vidéos et matchs disponibles.' },
  { file: 'pente_03_fr.mp3', text: "Carrousel de matchs avec lettre (V/N/D), nom de l'adversaire, résultat et nombre de photos/vidéos. Sélectionnez-en un pour voir sa galerie." },
  { file: 'pente_04_fr.mp3', text: 'Onglets pour voir les photos ou les vidéos du match sélectionné.' },
  { file: 'pente_05_fr.mp3', text: "Dans Photos : \"Nouvelle image\" pour télécharger ou glisser des fichiers, ou \"Ajouter par URL\". Dans Vidéos : \"Ajouter par URL\" ou \"Télécharger depuis l'appareil\" (si le club a un abonnement vidéo)." },
  { file: 'pente_06_fr.mp3', text: "Grille de photos ou vidéos. Appuyez sur une photo pour l'agrandir dans une lightbox. Chaque élément peut être supprimé s'il vous appartient." },
  { file: 'pente_07_fr.mp3', text: 'Vous maîtrisez la galerie de matchs. Choisissez un match, téléchargez du contenu et consultez photos et vidéos quand vous en avez besoin.' },
];

// ── /dashboard/partidos-entrevistas/:teamId — DE ─────────────────────────────
const STEPS_PENTE_DE = [
  { file: 'pente_01_de.mp3', text: 'Galerie mit Fotos und Videos der Teamspiele. Wählen Sie ein Spiel im Karussell und durchsuchen Sie Fotos und Videos. Sie können neue Bilder hochladen oder per URL hinzufügen. Wir erklären jeden Abschnitt.' },
  { file: 'pente_02_de.mp3', text: 'Pillen mit Gesamtzahl der Fotos, Videos und verfügbaren Spiele.' },
  { file: 'pente_03_de.mp3', text: 'Spielkarussell mit Buchstabe (S/U/N), Gegnername, Ergebnis und Anzahl Fotos/Videos. Wählen Sie eines aus, um seine Galerie anzuzeigen.' },
  { file: 'pente_04_de.mp3', text: 'Reiter zur Anzeige der Fotos oder Videos des ausgewählten Spiels.' },
  { file: 'pente_05_de.mp3', text: 'In Fotos: "Neues Bild" zum Hochladen oder Ziehen von Dateien, oder "Per URL hinzufügen". In Videos: "Per URL hinzufügen" oder "Vom Gerät hochladen" (wenn der Club ein Video-Abonnement hat).' },
  { file: 'pente_06_de.mp3', text: 'Raster mit Fotos oder Videos. Tippen Sie auf ein Foto, um es in einer Lightbox zu vergrößern. Jedes Element kann gelöscht werden, wenn es Ihnen gehört.' },
  { file: 'pente_07_de.mp3', text: 'Sie beherrschen die Spielgalerie. Wählen Sie ein Spiel, laden Sie Inhalte hoch und durchsuchen Sie Fotos und Videos, wenn Sie es brauchen.' },
];

// ── /dashboard/partidos-entrevistas/:teamId — PT ─────────────────────────────
const STEPS_PENTE_PT = [
  { file: 'pente_01_pt.mp3', text: 'Galeria de fotos e vídeos dos jogos da equipa. Selecione um jogo no carrossel e explore fotos e vídeos. Pode carregar novas imagens ou adicionar por URL. Explicamos cada secção.' },
  { file: 'pente_02_pt.mp3', text: 'Pílulas com total de fotos, vídeos e jogos disponíveis.' },
  { file: 'pente_03_pt.mp3', text: 'Carrossel de jogos com letra (V/E/D), nome do adversário, resultado e número de fotos/vídeos. Selecione um para ver a sua galeria.' },
  { file: 'pente_04_pt.mp3', text: 'Separadores para ver as fotos ou os vídeos do jogo selecionado.' },
  { file: 'pente_05_pt.mp3', text: 'Em Fotos: "Nova imagem" para carregar ou arrastar ficheiros, ou "Adicionar por URL". Em Vídeos: "Adicionar por URL" ou "Carregar do dispositivo" (se o clube tiver subscrição de vídeos).' },
  { file: 'pente_06_pt.mp3', text: 'Grelha de fotos ou vídeos. Toque numa foto para a ampliar numa lightbox. Cada elemento pode ser eliminado se lhe pertencer.' },
  { file: 'pente_07_pt.mp3', text: 'Já domina a galeria de jogos. Escolha um jogo, carregue conteúdo e consulte fotos e vídeos quando precisar.' },
];

// ── /dashboard/partidos-entrevistas/:teamId — IT ─────────────────────────────
const STEPS_PENTE_IT = [
  { file: 'pente_01_it.mp3', text: "Galleria di foto e video delle partite della squadra. Seleziona una partita nel carosello e sfoglia foto e video. Puoi caricare nuove immagini o aggiungerne tramite URL. Spieghiamo ogni sezione." },
  { file: 'pente_02_it.mp3', text: 'Pillole con il totale di foto, video e partite disponibili.' },
  { file: 'pente_03_it.mp3', text: "Carosello di partite con lettera (V/P/S), nome dell'avversario, risultato e numero di foto/video. Selezionane una per vedere la sua galleria." },
  { file: 'pente_04_it.mp3', text: 'Tab per vedere le foto o i video della partita selezionata.' },
  { file: 'pente_05_it.mp3', text: 'In Foto: "Nuova immagine" per caricare o trascinare file, o "Aggiungi tramite URL". In Video: "Aggiungi tramite URL" o "Carica dal dispositivo" (se il club ha un abbonamento video).' },
  { file: 'pente_06_it.mp3', text: 'Griglia di foto o video. Tocca una foto per ingrandirla in una lightbox. Ogni elemento può essere eliminato se ti appartiene.' },
  { file: 'pente_07_it.mp3', text: "Hai padroneggiato la galleria delle partite. Scegli una partita, carica contenuti e sfoglia foto e video quando ne hai bisogno." },
];

// ── /dashboard/jugadores/:teamId — EN ────────────────────────────────────────
const STEPS_JUG_EN = [
  { file: 'jug_01_en.mp3', text: "View all players on the team. You can switch between card and table view, create players, invite, view info, edit, move between teams or delete depending on your role. We'll guide you step by step." },
  { file: 'jug_02_en.mp3', text: 'Opens the modal to add a new player to the team. Only visible for club and coach roles.' },
  { file: 'jug_03_en.mp3', text: 'Switch between card view (profiles with photo, stats and actions) and table view (list with search and Excel export). The table tab is only shown for club and coach roles.' },
  { file: 'jug_04_en.mp3', text: 'Each card shows photo, number, position, rating, name, date of birth and stats (skill, passing, shooting, defense, physical, mentality). Actions: invite, view info, edit, move (club), delete.' },
  { file: 'jug_05_en.mp3', text: 'Search players by name and export the list to Excel. Only visible in the "Table view" tab.' },
  { file: 'jug_06_en.mp3', text: 'Table list with image, name, date, foot, position and all stats (skill, passing, shooting, defense, physical, mentality, keeper). Each row: view info, edit, move, delete.' },
  { file: 'jug_07_en.mp3', text: "You've mastered the player list. Use cards or table as you prefer and the available actions according to your permission whenever you need." },
];

// ── /dashboard/jugadores/:teamId — FR ────────────────────────────────────────
const STEPS_JUG_FR = [
  { file: 'jug_01_fr.mp3', text: "Consultez tous les joueurs de l'équipe. Vous pouvez alterner entre vue cartes et vue tableau, créer des joueurs, inviter, voir les informations, modifier, déplacer entre équipes ou supprimer selon votre rôle. Nous vous guidons étape par étape." },
  { file: 'jug_02_fr.mp3', text: "Ouvre le modal pour ajouter un nouveau joueur à l'équipe. Visible uniquement pour les rôles club et entraîneur." },
  { file: 'jug_03_fr.mp3', text: "Alternez entre la vue cartes (fiches avec photo, statistiques et actions) et la vue tableau (liste avec recherche et export Excel). L'onglet tableau n'est visible que pour le club et l'entraîneur." },
  { file: 'jug_04_fr.mp3', text: "Chaque carte affiche photo, numéro, poste, note, nom, date de naissance et statistiques (habileté, passe, tir, défense, physique, mentalité). Actions : inviter, voir les infos, modifier, déplacer (club), supprimer." },
  { file: 'jug_05_fr.mp3', text: 'Recherchez des joueurs par nom et exportez la liste vers Excel. Visible uniquement dans l\'onglet "Vue tableau".' },
  { file: 'jug_06_fr.mp3', text: "Liste en tableau avec image, nom, date, pied, poste et toutes les statistiques (habileté, passe, tir, défense, physique, mentalité, gardien). Dans chaque ligne : voir les infos, modifier, déplacer, supprimer." },
  { file: 'jug_07_fr.mp3', text: "Vous maîtrisez maintenant la liste des joueurs. Utilisez les cartes ou le tableau selon votre préférence et les actions disponibles selon vos permissions quand vous en avez besoin." },
];

// ── /dashboard/jugadores/:teamId — DE ────────────────────────────────────────
const STEPS_JUG_DE = [
  { file: 'jug_01_de.mp3', text: 'Alle Spieler des Teams einsehen. Sie können zwischen Karten- und Tabellenansicht wechseln, Spieler erstellen, einladen, Informationen anzeigen, bearbeiten, zwischen Teams verschieben oder entsprechend Ihrer Rolle löschen. Wir führen Sie Schritt für Schritt.' },
  { file: 'jug_02_de.mp3', text: 'Öffnet das Modal, um einen neuen Spieler zum Team hinzuzufügen. Nur für Club- und Trainer-Rollen sichtbar.' },
  { file: 'jug_03_de.mp3', text: 'Wechseln Sie zwischen Kartenansicht (Profile mit Foto, Statistiken und Aktionen) und Tabellenansicht (Liste mit Suche und Excel-Export). Der Tabellenreiter ist nur für Club und Trainer sichtbar.' },
  { file: 'jug_04_de.mp3', text: 'Jede Karte zeigt Foto, Nummer, Position, Bewertung, Name, Geburtsdatum und Statistiken (Technik, Pass, Schuss, Abwehr, Physisch, Mentalität). Aktionen: einladen, Info anzeigen, bearbeiten, verschieben (Club), löschen.' },
  { file: 'jug_05_de.mp3', text: 'Spieler nach Name suchen und die Liste nach Excel exportieren. Nur im Reiter "Tabellenansicht" sichtbar.' },
  { file: 'jug_06_de.mp3', text: 'Tabellenliste mit Bild, Name, Datum, Fuß, Position und allen Statistiken (Technik, Pass, Schuss, Abwehr, Physisch, Mentalität, Torwart). In jeder Zeile: Info anzeigen, bearbeiten, verschieben, löschen.' },
  { file: 'jug_07_de.mp3', text: 'Sie beherrschen jetzt die Spielerliste. Nutzen Sie Karten oder Tabelle nach Wunsch und die verfügbaren Aktionen entsprechend Ihrer Berechtigung, wenn Sie sie brauchen.' },
];

// ── /dashboard/jugadores/:teamId — PT ────────────────────────────────────────
const STEPS_JUG_PT = [
  { file: 'jug_01_pt.mp3', text: 'Consulte todos os jogadores da equipa. Pode alternar entre vista de cartões e vista de tabela, criar jogadores, convidar, ver informações, editar, mover entre equipas ou eliminar conforme o seu papel. Vamos guiá-lo passo a passo.' },
  { file: 'jug_02_pt.mp3', text: 'Abre o modal para adicionar um novo jogador à equipa. Apenas visível para as funções de clube e treinador.' },
  { file: 'jug_03_pt.mp3', text: 'Alterne entre a vista de cartões (perfis com foto, estatísticas e ações) e a vista de tabela (lista com pesquisa e exportação Excel). O separador de tabela apenas é mostrado para clube e treinador.' },
  { file: 'jug_04_pt.mp3', text: 'Cada cartão mostra foto, número, posição, avaliação, nome, data de nascimento e estatísticas (habilidade, passe, remate, defesa, físico, mentalidade). Ações: convidar, ver info, editar, mover (clube), eliminar.' },
  { file: 'jug_05_pt.mp3', text: 'Pesquise jogadores por nome e exporte a lista para Excel. Apenas visível no separador "Vista de tabela".' },
  { file: 'jug_06_pt.mp3', text: 'Lista em tabela com imagem, nome, data, pé, posição e todas as estatísticas (habilidade, passe, remate, defesa, físico, mentalidade, guarda-redes). Em cada linha: ver info, editar, mover, eliminar.' },
  { file: 'jug_07_pt.mp3', text: 'Já domina a lista de jogadores. Use os cartões ou a tabela conforme preferir e as ações disponíveis de acordo com a sua permissão quando precisar.' },
];

// ── /dashboard/jugadores/:teamId — IT ────────────────────────────────────────
const STEPS_JUG_IT = [
  { file: 'jug_01_it.mp3', text: 'Consulta tutti i giocatori della squadra. Puoi passare dalla vista schede alla vista tabella, creare giocatori, invitare, visualizzare le informazioni, modificare, spostare tra squadre o eliminare in base al tuo ruolo. Ti guidiamo passo dopo passo.' },
  { file: 'jug_02_it.mp3', text: 'Apre il modal per aggiungere un nuovo giocatore alla squadra. Visibile solo per i ruoli club e allenatore.' },
  { file: 'jug_03_it.mp3', text: "Alterna tra vista schede (profili con foto, statistiche e azioni) e vista tabella (elenco con ricerca ed esportazione Excel). Il tab tabella è visibile solo per club e allenatore." },
  { file: 'jug_04_it.mp3', text: 'Ogni scheda mostra foto, numero, ruolo, valutazione, nome, data di nascita e statistiche (abilità, passaggio, tiro, difesa, fisico, mentalità). Azioni: invitare, vedere info, modificare, spostare (club), eliminare.' },
  { file: 'jug_05_it.mp3', text: 'Cerca giocatori per nome ed esporta l\'elenco in Excel. Visibile solo nella scheda "Vista tabella".' },
  { file: 'jug_06_it.mp3', text: "Elenco in tabella con immagine, nome, data, piede, posizione e tutte le statistiche (abilità, passaggio, tiro, difesa, fisico, mentalità, portiere). In ogni riga: vedere info, modificare, spostare, eliminare." },
  { file: 'jug_07_it.mp3', text: "Hai padroneggiato l'elenco giocatori. Usa le schede o la tabella come preferisci e le azioni disponibili in base alla tua autorizzazione quando ne hai bisogno." },
];

// ── /dashboard/lesiones — EN ─────────────────────────────────────────────────
const STEPS_LES_EN = [
  { file: 'les_00_en.mp3', text: 'Select a team player to view and manage their injuries. You can switch players at any time. The red badge shows how many active injuries each one has.' },
  { file: 'les_01_en.mp3', text: 'Record and track team injuries: body map, timeline and statistics (Pro). Export PDF reports, print and configure notifications. We will guide you step by step.' },
  { file: 'les_02_en.mp3', text: 'Switch between Basic and Pro mode. Pro unlocks statistics, medical notes, RTP phase and Return to Play management.' },
  { file: 'les_03_en.mp3', text: 'Download PDF report, print/export and configure notifications (when to send alerts on creation, status change or RTP progress).' },
  { file: 'les_04_en.mp3', text: 'Body map (front and back with clickable zones), Timeline (injury chronology) and Statistics (Pro: KPIs, trend, severity, zones, types).' },
  { file: 'les_05_en.mp3', text: 'Total injuries, out, recovering and medically cleared.' },
  { file: 'les_06_en.mp3', text: 'Front and back view. Click a zone to register an injury or view details. Severity and status legend. Right panel: new/edit form, detail (documents, evolution notes, RTP), history with filters.' },
  { file: 'les_07_en.mp3', text: 'New/edit injury form (zone, type, severity, dates, mechanism, description, treatment, status, RTP). Detail with medical documents and evolution notes. History list with filters and New button.' },
  { file: 'les_08_en.mp3', text: 'You have mastered injury management. Register injuries on the map, check the history and export reports whenever you need them.' },
];

// ── /dashboard/lesiones — FR ─────────────────────────────────────────────────
const STEPS_LES_FR = [
  { file: 'les_00_fr.mp3', text: "Sélectionnez un joueur de l'équipe pour voir et gérer ses blessures. Vous pouvez changer de joueur à tout moment. Le badge rouge indique combien de blessures actives a chaque joueur." },
  { file: 'les_01_fr.mp3', text: "Enregistrement et suivi des blessures de l'équipe : carte corporelle, chronologie et statistiques (Pro). Exportez des rapports PDF, imprimez et configurez les notifications. Nous vous guidons étape par étape." },
  { file: 'les_02_fr.mp3', text: 'Basculez entre le mode Base et Pro. En Pro, les statistiques, les notes médicales, la phase RTP et la gestion du Return to Play sont débloquées.' },
  { file: 'les_03_fr.mp3', text: "Télécharger le rapport PDF, imprimer/exporter et configurer les notifications (quand envoyer des alertes lors de la création, du changement de statut ou de l'avancement RTP)." },
  { file: 'les_04_fr.mp3', text: 'Carte corporelle (face et dos avec zones cliquables), Chronologie (chronologie des blessures) et Statistiques (Pro : KPIs, tendance, gravité, zones, types).' },
  { file: 'les_05_fr.mp3', text: 'Total des blessures, indisponibles, en réadaptation et aptes médicalement.' },
  { file: 'les_06_fr.mp3', text: "Vue face et dos. Cliquez sur une zone pour enregistrer une blessure ou voir les détails. Légende de gravité et de statut. Panneau droit : formulaire nouveau/modifier, détail (documents, notes d'évolution, RTP), historique avec filtres." },
  { file: 'les_07_fr.mp3', text: "Formulaire nouvelle/modifier blessure (zone, type, gravité, dates, mécanisme, description, traitement, statut, RTP). Détail avec documents médicaux et notes d'évolution. Liste d'historique avec filtres et bouton Nouvelle." },
  { file: 'les_08_fr.mp3', text: "Vous maîtrisez la gestion des blessures. Enregistrez les blessures sur la carte, consultez l'historique et exportez les rapports quand vous en avez besoin." },
];

// ── /dashboard/lesiones — DE ─────────────────────────────────────────────────
const STEPS_LES_DE = [
  { file: 'les_00_de.mp3', text: 'Wählen Sie einen Spieler aus, um seine Verletzungen anzuzeigen und zu verwalten. Sie können jederzeit den Spieler wechseln. Das rote Abzeichen zeigt, wie viele aktive Verletzungen jeder Spieler hat.' },
  { file: 'les_01_de.mp3', text: 'Erfassung und Verfolgung von Mannschaftsverletzungen: Körperkarte, Zeitleiste und Statistiken (Pro). Exportieren Sie PDF-Berichte, drucken Sie und konfigurieren Sie Benachrichtigungen. Wir führen Sie Schritt für Schritt.' },
  { file: 'les_02_de.mp3', text: 'Wechseln Sie zwischen Basis- und Pro-Modus. Im Pro-Modus werden Statistiken, Notizen, RTP-Phase und Return-to-Play-Management freigeschaltet.' },
  { file: 'les_03_de.mp3', text: 'PDF-Bericht herunterladen, drucken/exportieren und Benachrichtigungen konfigurieren (wann Alerts bei Erstellung, Statusänderung oder RTP-Fortschritt senden).' },
  { file: 'les_04_de.mp3', text: 'Körperkarte (Vorder- und Rückseite mit klickbaren Zonen), Zeitleiste (Verletzungschronologie) und Statistiken (Pro: KPIs, Trend, Schwere, Zonen, Typen).' },
  { file: 'les_05_de.mp3', text: 'Gesamtverletzungen, ausgefallen, in Anpassung und medizinisch freigegeben.' },
  { file: 'les_06_de.mp3', text: 'Vorder- und Rückansicht. Klicken Sie auf eine Zone, um eine Verletzung zu erfassen oder Details anzuzeigen. Legende für Schwere und Status. Rechtes Panel: Neues/Bearbeiten-Formular, Detail (Dokumente, Verlaufsnotizen, RTP), Verlauf mit Filtern.' },
  { file: 'les_07_de.mp3', text: 'Neue/Bearbeiten-Verletzungsformular (Zone, Typ, Schwere, Datum, Mechanismus, Beschreibung, Behandlung, Status, RTP). Detail mit Dokumenten und Verlaufsnotizen. Verlaufsliste mit Filtern und Neu-Schaltfläche.' },
  { file: 'les_08_de.mp3', text: 'Sie beherrschen das Verletzungsmanagement. Erfassen Sie Verletzungen auf der Karte, prüfen Sie den Verlauf und exportieren Sie Berichte, wann immer Sie sie benötigen.' },
];

// ── /dashboard/lesiones — PT ─────────────────────────────────────────────────
const STEPS_LES_PT = [
  { file: 'les_00_pt.mp3', text: 'Selecione um jogador da equipa para ver e gerir as suas lesões. Pode mudar de jogador a qualquer momento. O emblema vermelho indica quantas lesões ativas tem cada um.' },
  { file: 'les_01_pt.mp3', text: 'Registo e acompanhamento de lesões da equipa: mapa corporal, linha temporal e estatísticas (Pro). Exporte relatórios PDF, imprima e configure notificações. Guiamo-lo passo a passo.' },
  { file: 'les_02_pt.mp3', text: 'Alterne entre o modo Base e Pro. No Pro ficam disponíveis estatísticas, notas médicas, fase RTP e gestão de Return to Play.' },
  { file: 'les_03_pt.mp3', text: 'Descarregar relatório PDF, imprimir/exportar e configurar notificações (quando enviar alertas ao criar, mudar estado ou avançar RTP).' },
  { file: 'les_04_pt.mp3', text: 'Mapa corporal (frontal e posterior com zonas clicáveis), Linha temporal (cronologia de lesões) e Estatísticas (Pro: KPIs, tendência, gravidade, zonas, tipos).' },
  { file: 'les_05_pt.mp3', text: 'Total de lesões, em baixa, em readaptação e com alta médica.' },
  { file: 'les_06_pt.mp3', text: 'Vista frontal e posterior. Clique numa zona para registar uma lesão ou ver detalhes. Legenda de gravidade e estado. Painel direito: formulário novo/editar, detalhe (documentos, notas de evolução, RTP), histórico com filtros.' },
  { file: 'les_07_pt.mp3', text: 'Formulário de nova/editar lesão (zona, tipo, gravidade, datas, mecanismo, descrição, tratamento, estado, RTP). Detalhe com documentos médicos e notas de evolução. Lista de histórico com filtros e botão Nova.' },
  { file: 'les_08_pt.mp3', text: 'Domina a gestão de lesões. Registe lesões no mapa, consulte o histórico e exporte relatórios quando precisar.' },
];

// ── /dashboard/lesiones — IT ─────────────────────────────────────────────────
const STEPS_LES_IT = [
  { file: 'les_00_it.mp3', text: 'Seleziona un giocatore della squadra per vedere e gestire i suoi infortuni. Puoi cambiare giocatore in qualsiasi momento. Il badge rosso indica quanti infortuni attivi ha ciascuno.' },
  { file: 'les_01_it.mp3', text: 'Registrazione e monitoraggio degli infortuni della squadra: mappa corporea, linea temporale e statistiche (Pro). Esporta report PDF, stampa e configura le notifiche. Ti guidiamo passo dopo passo.' },
  { file: 'les_02_it.mp3', text: 'Alterna tra modalità Base e Pro. In Pro si sbloccano statistiche, note mediche, fase RTP e gestione del Return to Play.' },
  { file: 'les_03_it.mp3', text: 'Scarica report PDF, stampa/esporta e configura le notifiche (quando inviare avvisi alla creazione, cambio stato o avanzamento RTP).' },
  { file: 'les_04_it.mp3', text: 'Mappa corporea (frontale e posteriore con zone cliccabili), Linea temporale (cronologia infortuni) e Statistiche (Pro: KPI, tendenza, gravità, zone, tipi).' },
  { file: 'les_05_it.mp3', text: 'Totale infortuni, fuori gioco, in readattamento e con idoneità medica.' },
  { file: 'les_06_it.mp3', text: 'Vista frontale e posteriore. Clicca su una zona per registrare un infortunio o vedere i dettagli. Legenda di gravità e stato. Pannello destro: modulo nuovo/modifica, dettaglio (documenti, note di evoluzione, RTP), storico con filtri.' },
  { file: 'les_07_it.mp3', text: 'Modulo nuovo/modifica infortunio (zona, tipo, gravità, date, meccanismo, descrizione, trattamento, stato, RTP). Dettaglio con documenti medici e note di evoluzione. Lista storico con filtri e pulsante Nuovo.' },
  { file: 'les_08_it.mp3', text: 'Hai padroneggiato la gestione degli infortuni. Registra gli infortuni sulla mappa, consulta lo storico ed esporta i report quando ne hai bisogno.' },
];

// ── /dashboard/perfil-entrenador — EN ────────────────────────────────────────
const STEPS_PERFE_EN = [
  { file: 'perfe_01_en.mp3', text: 'On this screen you view and update your profile: personal data, identity document, mandatory certificates and documents required by each club. If you are an independent coach you will also see your subscription. We guide you step by step.' },
  { file: 'perfe_02_en.mp3', text: 'Here you see your subscription status: Active, Trial, Expired or No subscription, the expiry date and the button to view plans or manage. Only visible if you are not linked to a club.' },
  { file: 'perfe_03_en.mp3', text: 'Your profile photo (tap to change it), name and buttons to Edit and Upload identity document. Below: email, phone, date of birth, document, address, nationality, federation license, qualification and emergency contact.' },
  { file: 'perfe_04_en.mp3', text: 'When you press Edit you can change name, surnames, email, phone, date of birth, document type and number, address, nationality, license, qualification and emergency contact. Save or cancel when you finish.' },
  { file: 'perfe_05_en.mp3', text: 'Each club can ask you for extra data. In this section you will see dynamic forms that you must fill in according to the club you work for.' },
  { file: 'perfe_06_en.mp3', text: 'Upload images of the front and back of your ID or document. You can change or delete each image from the button or from the image itself.' },
  { file: 'perfe_07_en.mp3', text: 'Sexual offences certificate, criminal record, civil liability insurance and first aid training. For each one you can upload, change, view the file or delete.' },
  { file: 'perfe_08_en.mp3', text: 'For each club you will see the list of documents: those the club shares for download and those you must upload or fill in. Keep everything up to date for each club.' },
  { file: 'perfe_09_en.mp3', text: 'You have mastered your coach profile. Keep data, identity document and certificates up to date for each club whenever you need.' },
];

// ── /dashboard/perfil-entrenador — FR ────────────────────────────────────────
const STEPS_PERFE_FR = [
  { file: 'perfe_01_fr.mp3', text: "Sur cet écran vous consultez et mettez à jour votre profil : données personnelles, pièce d'identité, certificats obligatoires et documents demandés par chaque club. Si vous êtes entraîneur indépendant, vous verrez également votre abonnement. Nous vous guidons étape par étape." },
  { file: 'perfe_02_fr.mp3', text: "Ici vous voyez l'état de votre abonnement : Actif, Essai, Expiré ou Sans abonnement, la date d'expiration et le bouton pour voir les plans ou gérer. Visible uniquement si vous n'êtes pas lié à un club." },
  { file: 'perfe_03_fr.mp3', text: "Votre photo de profil (appuyez pour la changer), nom et boutons pour Modifier et Télécharger la pièce d'identité. Plus bas : email, téléphone, date de naissance, document, adresse, nationalité, licence fédérale, qualification et contact d'urgence." },
  { file: 'perfe_04_fr.mp3', text: "En appuyant sur Modifier vous pouvez changer le nom, prénoms, email, téléphone, date de naissance, type et numéro de document, adresse, nationalité, licence, qualification et contact d'urgence. Enregistrez ou annulez quand vous avez terminé." },
  { file: 'perfe_05_fr.mp3', text: 'Chaque club peut vous demander des données supplémentaires. Dans cette section vous verrez des formulaires dynamiques à remplir selon le club pour lequel vous travaillez.' },
  { file: 'perfe_06_fr.mp3', text: "Téléchargez les images du recto et verso de votre carte d'identité ou document. Vous pouvez changer ou supprimer chaque image depuis le bouton ou depuis l'image elle-même." },
  { file: 'perfe_07_fr.mp3', text: "Certificat d'infractions sexuelles, casier judiciaire, assurance responsabilité civile et formation premiers secours. Pour chacun vous pouvez télécharger, modifier, voir le fichier ou supprimer." },
  { file: 'perfe_08_fr.mp3', text: 'Pour chaque club vous verrez la liste des documents : ceux que le club partage pour télécharger et ceux que vous devez téléverser ou remplir. Gardez tout à jour pour chaque club.' },
  { file: 'perfe_09_fr.mp3', text: "Vous maîtrisez votre profil d'entraîneur. Maintenez les données, la pièce d'identité et les certificats à jour pour chaque club quand vous en avez besoin." },
];

// ── /dashboard/perfil-entrenador — DE ────────────────────────────────────────
const STEPS_PERFE_DE = [
  { file: 'perfe_01_de.mp3', text: 'Auf diesem Bildschirm sehen und aktualisieren Sie Ihr Profil: persönliche Daten, Ausweisdokument, Pflichtzertifikate und von jedem Club geforderte Dokumente. Als freier Trainer sehen Sie auch Ihr Abonnement. Wir führen Sie Schritt für Schritt.' },
  { file: 'perfe_02_de.mp3', text: 'Hier sehen Sie den Status Ihres Abonnements: Aktiv, Test, Abgelaufen oder Ohne Abonnement, das Ablaufdatum und die Schaltfläche, um Pläne anzuzeigen oder zu verwalten. Nur sichtbar, wenn Sie nicht mit einem Club verbunden sind.' },
  { file: 'perfe_03_de.mp3', text: 'Ihr Profilfoto (zum Ändern tippen), Name und Schaltflächen zum Bearbeiten und Hochladen des Ausweisdokuments. Darunter: E-Mail, Telefon, Geburtsdatum, Dokument, Adresse, Nationalität, Verbandslizenz, Qualifikation und Notfallkontakt.' },
  { file: 'perfe_04_de.mp3', text: 'Beim Drücken von Bearbeiten können Sie Name, Vornamen, E-Mail, Telefon, Geburtsdatum, Dokumenttyp und -nummer, Adresse, Nationalität, Lizenz, Qualifikation und Notfallkontakt ändern. Speichern oder abbrechen wenn Sie fertig sind.' },
  { file: 'perfe_05_de.mp3', text: 'Jeder Club kann zusätzliche Daten anfordern. In diesem Abschnitt sehen Sie dynamische Formulare, die Sie je nach Club ausfüllen müssen.' },
  { file: 'perfe_06_de.mp3', text: 'Laden Sie Bilder der Vorder- und Rückseite Ihres Ausweises oder Dokuments hoch. Sie können jedes Bild über die Schaltfläche oder das Bild selbst ändern oder löschen.' },
  { file: 'perfe_07_de.mp3', text: 'Bescheinigung über Sexualstraftaten, polizeiliches Führungszeugnis, Haftpflichtversicherung und Erste-Hilfe-Ausbildung. Für jedes können Sie hochladen, ändern, die Datei ansehen oder löschen.' },
  { file: 'perfe_08_de.mp3', text: 'Für jeden Club sehen Sie die Dokumentenliste: die der Club zum Download teilt und die Sie hochladen oder ausfüllen müssen. Halten Sie alles für jeden Club aktuell.' },
  { file: 'perfe_09_de.mp3', text: 'Sie beherrschen Ihr Trainerprofil. Halten Sie Daten, Ausweisdokument und Zertifikate für jeden Club aktuell, wann immer Sie sie benötigen.' },
];

// ── /dashboard/perfil-entrenador — PT ────────────────────────────────────────
const STEPS_PERFE_PT = [
  { file: 'perfe_01_pt.mp3', text: 'Nesta tela consulta e atualiza o seu perfil: dados pessoais, documento de identidade, certificados obrigatórios e documentos exigidos por cada clube. Se for treinador independente verá também a sua subscrição. Guiamo-lo passo a passo.' },
  { file: 'perfe_02_pt.mp3', text: 'Aqui vê o estado da sua subscrição: Ativa, Teste, Expirada ou Sem subscrição, a data de expiração e o botão para ver planos ou gerir. Apenas visível se não estiver vinculado a um clube.' },
  { file: 'perfe_03_pt.mp3', text: 'A sua foto de perfil (toque para alterar), nome e botões para Editar e Carregar documento de identidade. Abaixo: email, telefone, data de nascimento, documento, morada, nacionalidade, licença federativa, titulação e contacto de emergência.' },
  { file: 'perfe_04_pt.mp3', text: 'Ao premir Editar pode alterar nome, apelidos, email, telefone, data de nascimento, tipo e número de documento, morada, nacionalidade, licença, titulação e contacto de emergência. Guarde ou cancele quando terminar.' },
  { file: 'perfe_05_pt.mp3', text: 'Cada clube pode pedir-lhe dados extra. Nesta secção verá formulários dinâmicos que deve preencher conforme o clube em que trabalha.' },
  { file: 'perfe_06_pt.mp3', text: 'Carregue as imagens da frente e verso do seu BI ou documento. Pode alterar ou eliminar cada imagem através do botão ou da própria imagem.' },
  { file: 'perfe_07_pt.mp3', text: 'Certidão de crimes sexuais, registo criminal, seguro de responsabilidade civil e formação em primeiros socorros. Em cada um pode carregar, alterar, ver o ficheiro ou eliminar.' },
  { file: 'perfe_08_pt.mp3', text: 'Para cada clube verá a lista de documentos: os que o clube partilha para descarregar e os que deve carregar ou preencher. Mantenha tudo em dia para cumprir com cada clube.' },
  { file: 'perfe_09_pt.mp3', text: 'Domina o seu perfil de treinador. Mantenha dados, documento de identidade e certificados atualizados para cada clube quando precisar.' },
];

// ── /dashboard/perfil-entrenador — IT ────────────────────────────────────────
const STEPS_PERFE_IT = [
  { file: 'perfe_01_it.mp3', text: 'In questa schermata consulti e aggiorni il tuo profilo: dati personali, documento di identità, certificati obbligatori e documenti richiesti da ogni club. Se sei un allenatore indipendente vedrai anche il tuo abbonamento. Ti guidiamo passo dopo passo.' },
  { file: 'perfe_02_it.mp3', text: 'Qui vedi lo stato del tuo abbonamento: Attivo, Prova, Scaduto o Senza abbonamento, la data di scadenza e il pulsante per vedere i piani o gestire. Visibile solo se non sei collegato a un club.' },
  { file: 'perfe_03_it.mp3', text: 'La tua foto profilo (tocca per cambiarla), nome e pulsanti per Modificare e Caricare il documento di identità. Sotto: email, telefono, data di nascita, documento, indirizzo, nazionalità, licenza federale, titolo e contatto di emergenza.' },
  { file: 'perfe_04_it.mp3', text: 'Premendo Modifica puoi cambiare nome, cognomi, email, telefono, data di nascita, tipo e numero documento, indirizzo, nazionalità, licenza, titolo e contatto di emergenza. Salva o annulla quando hai finito.' },
  { file: 'perfe_05_it.mp3', text: 'Ogni club può chiederti dati extra. In questa sezione vedrai moduli dinamici da compilare in base al club per cui lavori.' },
  { file: 'perfe_06_it.mp3', text: "Carica le immagini del fronte e retro del tuo documento di identità. Puoi modificare o eliminare ogni immagine dal pulsante o dall'immagine stessa." },
  { file: 'perfe_07_it.mp3', text: 'Certificato reati sessuali, casellario giudiziale, assicurazione responsabilità civile e formazione primo soccorso. Per ognuno puoi caricare, modificare, visualizzare il file o eliminare.' },
  { file: 'perfe_08_it.mp3', text: "Per ogni club vedrai l'elenco dei documenti: quelli che il club condivide per il download e quelli che devi caricare o compilare. Tieni tutto aggiornato per ogni club." },
  { file: 'perfe_09_it.mp3', text: 'Hai padroneggiato il tuo profilo di allenatore. Mantieni dati, documento di identità e certificati aggiornati per ogni club quando ne hai bisogno.' },
];

// ── /dashboard/documentos-entrenador — EN ────────────────────────────────────
const STEPS_DOCE_EN = [
  { file: 'doce_01_en.mp3', text: 'On this screen you see all the documents the club makes available to you and those you must submit. Each card indicates whether you need to download, upload or fill in a form, and whether it is pending or completed. We guide you step by step.' },
  { file: 'doce_02_en.mp3', text: 'Each card shows the document name, description, status (Pending or Completed) and the action: Download for club documents, Upload for those you must submit, or Fill in for custom forms.' },
  { file: 'doce_03_en.mp3', text: 'You have mastered the documents screen. Download what the club shares, upload or fill in what they ask and keep everything up to date.' },
];

// ── /dashboard/documentos-entrenador — FR ────────────────────────────────────
const STEPS_DOCE_FR = [
  { file: 'doce_01_fr.mp3', text: "Sur cet écran vous voyez tous les documents que le club met à votre disposition et ceux que vous devez remettre. Chaque carte indique si vous devez télécharger, téléverser ou remplir un formulaire, et si c'est en attente ou complété. Nous vous guidons étape par étape." },
  { file: 'doce_02_fr.mp3', text: "Chaque carte affiche le nom du document, la description, le statut (En attente ou Complété) et l'action : Télécharger pour les documents du club, Téléverser pour ceux que vous devez soumettre, ou Remplir pour les formulaires personnalisés." },
  { file: 'doce_03_fr.mp3', text: "Vous maîtrisez l'écran des documents. Téléchargez ce que le club partage, téléversez ou remplissez ce qu'on vous demande et maintenez tout à jour." },
];

// ── /dashboard/documentos-entrenador — DE ────────────────────────────────────
const STEPS_DOCE_DE = [
  { file: 'doce_01_de.mp3', text: 'Auf diesem Bildschirm sehen Sie alle Dokumente, die der Club Ihnen zur Verfügung stellt, und die, die Sie einreichen müssen. Jede Karte zeigt ob Sie herunterladen, hochladen oder ein Formular ausfüllen müssen, und ob es ausstehend oder abgeschlossen ist. Wir führen Sie Schritt für Schritt.' },
  { file: 'doce_02_de.mp3', text: 'Jede Karte zeigt den Dokumentnamen, die Beschreibung, den Status (Ausstehend oder Abgeschlossen) und die Aktion: Herunterladen für Club-Dokumente, Hochladen für die, die Sie einreichen müssen, oder Ausfüllen für benutzerdefinierte Formulare.' },
  { file: 'doce_03_de.mp3', text: 'Sie beherrschen den Dokumenten-Bildschirm. Laden Sie herunter was der Club teilt, laden Sie hoch oder füllen Sie aus was verlangt wird und halten Sie alles aktuell.' },
];

// ── /dashboard/documentos-entrenador — PT ────────────────────────────────────
const STEPS_DOCE_PT = [
  { file: 'doce_01_pt.mp3', text: 'Nesta tela vê todos os documentos que o clube coloca à sua disposição e os que deve entregar. Cada cartão indica se deve descarregar, carregar ou preencher um formulário, e se está pendente ou concluído. Guiamo-lo passo a passo.' },
  { file: 'doce_02_pt.mp3', text: 'Cada cartão mostra o nome do documento, a descrição, o estado (Pendente ou Concluído) e a ação: Descarregar para documentos do clube, Carregar para os que deve entregar, ou Preencher para formulários personalizados.' },
  { file: 'doce_03_pt.mp3', text: 'Domina o ecrã de documentos. Descarregue o que o clube partilha, carregue ou preencha o que lhe pedem e mantenha tudo atualizado.' },
];

// ── /dashboard/documentos-entrenador — IT ────────────────────────────────────
const STEPS_DOCE_IT = [
  { file: 'doce_01_it.mp3', text: 'In questa schermata vedi tutti i documenti che il club mette a tua disposizione e quelli che devi consegnare. Ogni scheda indica se devi scaricare, caricare o compilare un modulo, e se è in attesa o completato. Ti guidiamo passo dopo passo.' },
  { file: 'doce_02_it.mp3', text: "Ogni scheda mostra il nome del documento, la descrizione, lo stato (In attesa o Completato) e l'azione: Scarica per i documenti del club, Carica per quelli che devi consegnare, o Compila per i moduli personalizzati." },
  { file: 'doce_03_it.mp3', text: 'Hai padroneggiato la schermata dei documenti. Scarica quello che il club condivide, carica o compila quello che ti chiedono e tieni tutto aggiornato.' },
];

// ── /dashboard/opcionesjugador ────────────────────────────────────────────────
const STEPS_OJ_EN = [
  { file: 'oj_01_en.mp3', text: 'You are in the player menu. From here you access each section using cards: Personal data, Calendar, Pay fees, Documents, Rankings and results, My stats, Gallery, Notifications, Sponsors, Injuries and Kit. We will walk you through each one.' },
  { file: 'oj_02_en.mp3', text: 'The Personal data card opens your profile: view and edit your name, date of birth, position, contact details and the rest of your personal information.' },
  { file: 'oj_03_en.mp3', text: 'The Calendar card shows all your training sessions and matches organised by date. Enter to see the full schedule.' },
  { file: 'oj_04_en.mp3', text: 'Pay fees: here you or your family manage and pay the club fees. Link a card with Sphaira Pay, review mandatory and optional fees, or pay by bank transfer if the club indicates it.' },
  { file: 'oj_05_en.mp3', text: 'Documents: all the files and documents the club requests from you. Download the ones the club shares, upload the ones they ask for, or fill in forms.' },
  { file: 'oj_06_en.mp3', text: "Rankings and results: check your team's position in the competition table and the match history with results." },
  { file: 'oj_07_en.mp3', text: 'My stats: goals, assists, minutes played and other metrics about your personal performance this season.' },
  { file: 'oj_08_en.mp3', text: 'The Gallery shows team photos and moments that you can view and download.' },
  { file: 'oj_09_en.mp3', text: 'Notifications: messages and alerts from the club and the coach addressed to you.' },
  { file: 'oj_10_en.mp3', text: 'Club sponsors: logos, contact information and benefits they offer to players.' },
  { file: 'oj_11_en.mp3', text: 'Injuries: view your injury history and current recovery status if any.' },
  { file: 'oj_12_en.mp3', text: 'Club kit: the equipment catalogue and size selection so the club can manage orders.' },
  { file: 'oj_13_en.mp3', text: 'You have completed the tour. You now know all the player options. Tap any card to enter that section whenever you need it.' },
];
const STEPS_OJ_FR = [
  { file: 'oj_01_fr.mp3', text: "Vous êtes dans le menu du joueur. Depuis ici vous accédez à chaque section via des cartes : Données personnelles, Calendrier, Payer les cotisations, Documentation, Classement et résultats, Mes statistiques, Galerie, Notifications, Sponsors, Blessures et Équipement. Nous vous guidons dans chacune." },
  { file: 'oj_02_fr.mp3', text: "La carte Données personnelles ouvre votre profil : consultez et modifiez votre nom, date de naissance, poste, coordonnées et le reste de vos informations personnelles." },
  { file: 'oj_03_fr.mp3', text: "La carte Calendrier affiche tous vos entraînements et matchs organisés par date. Entrez pour voir le planning complet." },
  { file: 'oj_04_fr.mp3', text: "Payer les cotisations : ici vous ou votre famille gérez et réglez les cotisations du club. Liez une carte avec Sphaira Pay, vérifiez les obligatoires et optionnelles, et payez par virement si le club l'indique." },
  { file: 'oj_05_fr.mp3', text: "Documentation : tous les fichiers et documents que le club vous demande. Téléchargez ceux que le club partage, envoyez ceux qu'il demande ou remplissez des formulaires." },
  { file: 'oj_06_fr.mp3', text: "Classement et résultats : consultez le tableau de votre équipe dans la compétition et l'historique des matchs et résultats." },
  { file: 'oj_07_fr.mp3', text: "Mes statistiques : buts, passes décisives, minutes jouées et autres indicateurs de votre performance personnelle cette saison." },
  { file: 'oj_08_fr.mp3', text: "La Galerie affiche les photos et moments de l'équipe que vous pouvez consulter et télécharger." },
  { file: 'oj_09_fr.mp3', text: "Notifications : messages et avis du club et de l'entraîneur qui vous sont adressés." },
  { file: 'oj_10_fr.mp3', text: "Sponsors du club : logos, coordonnées et avantages qu'ils offrent aux joueurs." },
  { file: 'oj_11_fr.mp3', text: "Blessures : consultez votre historique de blessures et l'état de récupération le cas échéant." },
  { file: 'oj_12_fr.mp3', text: "Équipement du club : catalogue de tenues et sélection des tailles pour que le club gère les commandes." },
  { file: 'oj_13_fr.mp3', text: "Vous avez terminé la visite. Vous connaissez désormais toutes les options du joueur. Appuyez sur n'importe quelle carte pour accéder à cette section quand vous en avez besoin." },
];
const STEPS_OJ_DE = [
  { file: 'oj_01_de.mp3', text: 'Sie befinden sich im Spielermenü. Von hier aus gelangen Sie über Karten zu jedem Bereich: Persönliche Daten, Kalender, Beiträge zahlen, Dokumente, Tabelle und Ergebnisse, Meine Statistiken, Galerie, Benachrichtigungen, Sponsoren, Verletzungen und Ausrüstung. Wir führen Sie durch jeden Bereich.' },
  { file: 'oj_02_de.mp3', text: 'Die Karte Persönliche Daten öffnet Ihr Profil: Sehen und bearbeiten Sie Ihren Namen, Ihr Geburtsdatum, Ihre Position, Ihre Kontaktdaten und Ihre weiteren persönlichen Informationen.' },
  { file: 'oj_03_de.mp3', text: 'Die Kalender-Karte zeigt alle Ihre Trainingseinheiten und Spiele nach Datum geordnet. Betreten Sie diese, um den vollständigen Plan zu sehen.' },
  { file: 'oj_04_de.mp3', text: 'Beiträge zahlen: hier verwalten und bezahlen Sie oder Ihre Familie die Vereinsbeiträge. Verknüpfen Sie eine Karte mit Sphaira Pay, überprüfen Sie Pflicht- und optionale Beiträge oder zahlen Sie per Banküberweisung, wenn der Verein dies angibt.' },
  { file: 'oj_05_de.mp3', text: 'Dokumente: alle Dateien und Unterlagen, die der Verein von Ihnen verlangt. Laden Sie die vom Verein geteilten herunter, laden Sie die angeforderten hoch oder füllen Sie Formulare aus.' },
  { file: 'oj_06_de.mp3', text: 'Tabelle und Ergebnisse: sehen Sie die Tabellenposition Ihres Teams im Wettbewerb und die Spielhistorie mit Ergebnissen.' },
  { file: 'oj_07_de.mp3', text: 'Meine Statistiken: Tore, Vorlagen, gespielte Minuten und andere Kennzahlen Ihrer persönlichen Leistung in dieser Saison.' },
  { file: 'oj_08_de.mp3', text: 'Die Galerie zeigt Mannschaftsfotos und -momente, die Sie ansehen und herunterladen können.' },
  { file: 'oj_09_de.mp3', text: 'Benachrichtigungen: Nachrichten und Hinweise vom Verein und Trainer, die an Sie gerichtet sind.' },
  { file: 'oj_10_de.mp3', text: 'Vereinssponsoren: Logos, Kontaktinformationen und Vorteile, die sie Spielern bieten.' },
  { file: 'oj_11_de.mp3', text: 'Verletzungen: sehen Sie Ihre Verletzungshistorie und den aktuellen Genesungsstand, falls vorhanden.' },
  { file: 'oj_12_de.mp3', text: 'Vereinsausrüstung: Ausrüstungskatalog und Größenauswahl, damit der Verein Bestellungen verwalten kann.' },
  { file: 'oj_13_de.mp3', text: 'Sie haben die Tour abgeschlossen. Sie kennen nun alle Spieleroptionen. Tippen Sie auf eine beliebige Karte, um jederzeit auf den jeweiligen Bereich zuzugreifen.' },
];
const STEPS_OJ_PT = [
  { file: 'oj_01_pt.mp3', text: 'Está no menu do jogador. A partir daqui acede a cada secção através de cartões: Dados pessoais, Calendário, Pagar quotas, Documentação, Classificação e resultados, As minhas estatísticas, Galeria, Notificações, Patrocinadores, Lesões e Equipamento. Explicamos cada uma.' },
  { file: 'oj_02_pt.mp3', text: 'O cartão Dados pessoais abre o seu perfil: consulte e edite o seu nome, data de nascimento, posição, contacto e o restante das suas informações pessoais.' },
  { file: 'oj_03_pt.mp3', text: 'O cartão Calendário mostra todos os seus treinos e jogos organizados por data. Entre para ver o planeamento completo.' },
  { file: 'oj_04_pt.mp3', text: 'Pagar quotas: aqui você ou a sua família gere e paga as quotas do clube. Associe um cartão com o Sphaira Pay, verifique as obrigatórias e opcionais e pague por transferência se o clube o indicar.' },
  { file: 'oj_05_pt.mp3', text: 'Documentação: todos os ficheiros e documentos que o clube lhe solicita. Descarregue os que o clube partilha, carregue os que pedem ou preencha formulários.' },
  { file: 'oj_06_pt.mp3', text: 'Classificação e resultados: consulte a tabela da sua equipa na competição e o histórico de jogos e resultados.' },
  { file: 'oj_07_pt.mp3', text: 'As minhas estatísticas: golos, assistências, minutos jogados e outras métricas do seu desempenho pessoal na temporada.' },
  { file: 'oj_08_pt.mp3', text: 'A Galeria mostra fotos e momentos da equipa que pode ver e descarregar.' },
  { file: 'oj_09_pt.mp3', text: 'Notificações: mensagens e avisos do clube e do treinador dirigidos a si.' },
  { file: 'oj_10_pt.mp3', text: 'Patrocinadores do clube: logótipos, informações de contacto e benefícios que oferecem aos jogadores.' },
  { file: 'oj_11_pt.mp3', text: 'Lesões: consulte o seu historial de lesões e o estado de recuperação, se existir.' },
  { file: 'oj_12_pt.mp3', text: 'Equipamento do clube: catálogo de fardamento e indicação de tamanhos para que o clube gira as encomendas.' },
  { file: 'oj_13_pt.mp3', text: 'Completou a visita. Já conhece todas as opções do jogador. Toque em qualquer cartão para aceder a essa secção quando precisar.' },
];
const STEPS_OJ_IT = [
  { file: 'oj_01_it.mp3', text: 'Sei nel menu del giocatore. Da qui accedi a ogni sezione tramite le schede: Dati personali, Calendario, Pagare le quote, Documentazione, Classifica e risultati, Le mie statistiche, Galleria, Notifiche, Sponsor, Infortuni e Abbigliamento. Ti spieghiamo ciascuna.' },
  { file: 'oj_02_it.mp3', text: 'La scheda Dati personali apre il tuo profilo: consulta e modifica il tuo nome, data di nascita, ruolo, contatto e le restanti informazioni personali.' },
  { file: 'oj_03_it.mp3', text: 'La scheda Calendario mostra tutti gli allenamenti e le partite organizzati per data. Entra per vedere il programma completo.' },
  { file: 'oj_04_it.mp3', text: 'Pagare le quote: qui tu o la tua famiglia gestite e pagate le quote del club. Collega una carta con Sphaira Pay, controlla quelle obbligatorie e facoltative e paga tramite bonifico se il club lo indica.' },
  { file: 'oj_05_it.mp3', text: 'Documentazione: tutti i file e i documenti che il club ti richiede. Scarica quelli che il club condivide, carica quelli che ti chiedono o compila i moduli.' },
  { file: 'oj_06_it.mp3', text: 'Classifica e risultati: consulta la classifica della tua squadra nella competizione e lo storico delle partite e dei risultati.' },
  { file: 'oj_07_it.mp3', text: 'Le mie statistiche: gol, assist, minuti giocati e altre metriche delle tue prestazioni personali nella stagione.' },
  { file: 'oj_08_it.mp3', text: 'La Galleria mostra foto e momenti della squadra che puoi visualizzare e scaricare.' },
  { file: 'oj_09_it.mp3', text: "Notifiche: messaggi e avvisi del club e dell'allenatore indirizzati a te." },
  { file: 'oj_10_it.mp3', text: 'Sponsor del club: loghi, informazioni di contatto e vantaggi che offrono ai giocatori.' },
  { file: 'oj_11_it.mp3', text: 'Infortuni: consulta il tuo storico degli infortuni e lo stato di recupero se presenti.' },
  { file: 'oj_12_it.mp3', text: "Abbigliamento del club: catalogo dell'equipaggiamento e indicazione delle taglie affinché il club gestisca gli ordini." },
  { file: 'oj_13_it.mp3', text: 'Hai completato la visita. Ora conosci tutte le opzioni del giocatore. Tocca una qualsiasi scheda per accedere a quella sezione quando ne hai bisogno.' },
];

// ── /dashboard/jugador/:teamId/:playerId ──────────────────────────────────────
const STEPS_JD_EN = [
  { file: 'jd_01_en.mp3', text: "You are on the player's personal data sheet. Here you can view and edit the photo, personal data, sports information, guardians and bank details. We will guide you step by step." },
  { file: 'jd_02_en.mp3', text: "At the top you have the player's photo. You can upload a new one in JPG or PNG format; when creating a player the photo is uploaded on saving." },
  { file: 'jd_03_en.mp3', text: "The Personal information and Sports information tabs organise the form. In personal you will see name, surname, date of birth, contact, address and guardian and bank data; in sports, position, measurements and skills." },
  { file: 'jd_04_en.mp3', text: "All the player's fields are shown here: name, surname, ID, phone, email, address, nationality and the rest. Fill in or modify whichever you need." },
  { file: 'jd_05_en.mp3', text: "At the bottom you have the ID button to upload or view the player's identity document, and Save to apply all changes. Remember to save after editing." },
  { file: 'jd_06_en.mp3', text: "You have completed the tour. You now know the player's personal data sheet. Keep the information up to date whenever you need to." },
];
const STEPS_JD_FR = [
  { file: 'jd_01_fr.mp3', text: "Vous êtes sur la fiche des données personnelles du joueur. Ici vous pouvez consulter et modifier la photo, les données personnelles, les informations sportives, les tuteurs et les données bancaires. Nous vous guidons pas à pas." },
  { file: 'jd_02_fr.mp3', text: "En haut se trouve la photo du joueur. Vous pouvez en télécharger une nouvelle au format JPG ou PNG ; lors de la création d'un joueur la photo est téléchargée à l'enregistrement." },
  { file: 'jd_03_fr.mp3', text: "Les onglets Informations personnelles et Informations sportives organisent le formulaire. Dans Personnelles vous verrez le nom, prénom, date de naissance, contact, adresse et données des tuteurs et bancaires ; dans Sportives, le poste, les mensurations et les compétences." },
  { file: 'jd_04_fr.mp3', text: "Tous les champs du joueur sont affichés ici : nom, prénom, carte d'identité, téléphone, email, adresse, nationalité et le reste. Remplissez ou modifiez ceux dont vous avez besoin." },
  { file: 'jd_05_fr.mp3', text: "En bas vous avez le bouton Pièce d'identité pour télécharger ou voir le document d'identité du joueur, et Enregistrer pour appliquer toutes les modifications. N'oubliez pas d'enregistrer après avoir édité." },
  { file: 'jd_06_fr.mp3', text: "Vous avez terminé la visite. Vous connaissez désormais la fiche de données personnelles du joueur. Maintenez les informations à jour quand vous en avez besoin." },
];
const STEPS_JD_DE = [
  { file: 'jd_01_de.mp3', text: 'Sie befinden sich auf dem Formular der persönlichen Daten des Spielers. Hier können Sie das Foto, die persönlichen Daten, die sportlichen Informationen, die Erziehungsberechtigten und die Bankdaten einsehen und bearbeiten. Wir führen Sie Schritt für Schritt.' },
  { file: 'jd_02_de.mp3', text: 'Oben befindet sich das Foto des Spielers. Sie können ein neues im JPG- oder PNG-Format hochladen; beim Erstellen eines Spielers wird das Foto beim Speichern hochgeladen.' },
  { file: 'jd_03_de.mp3', text: 'Die Reiter Persönliche Informationen und Sportliche Informationen organisieren das Formular. Im persönlichen Bereich sehen Sie Name, Nachname, Geburtsdatum, Kontakt, Adresse und Daten der Erziehungsberechtigten und Bank; im sportlichen Bereich Position, Maße und Fähigkeiten.' },
  { file: 'jd_04_de.mp3', text: 'Hier werden alle Felder des Spielers angezeigt: Name, Nachname, Ausweis, Telefon, E-Mail, Adresse, Nationalität und der Rest. Füllen Sie aus oder ändern Sie, was Sie benötigen.' },
  { file: 'jd_05_de.mp3', text: 'Unten haben Sie die Schaltfläche Ausweis zum Hochladen oder Ansehen des Ausweisdokuments des Spielers, und Speichern um alle Änderungen zu übernehmen. Denken Sie daran, nach dem Bearbeiten zu speichern.' },
  { file: 'jd_06_de.mp3', text: 'Sie haben die Tour abgeschlossen. Sie kennen nun das Formular der persönlichen Daten des Spielers. Halten Sie die Informationen aktuell, wann immer Sie es brauchen.' },
];
const STEPS_JD_PT = [
  { file: 'jd_01_pt.mp3', text: 'Está na ficha de dados pessoais do jogador. Aqui pode consultar e editar a foto, os dados pessoais, a informação desportiva, os tutores e os dados bancários. Guiamo-lo passo a passo.' },
  { file: 'jd_02_pt.mp3', text: 'No topo tem a foto do jogador. Pode carregar uma nova em formato JPG ou PNG; ao criar um jogador a foto é carregada ao guardar.' },
  { file: 'jd_03_pt.mp3', text: 'Os separadores Informação pessoal e Informação desportiva organizam o formulário. Em pessoal verá nome, apelido, data de nascimento, contacto, morada e dados dos tutores e bancários; em desportivo, posição, medidas e habilidades.' },
  { file: 'jd_04_pt.mp3', text: 'Aqui são mostrados todos os campos do jogador: nome, apelido, BI/CC, telefone, email, morada, nacionalidade e o resto. Preencha ou modifique os que necessitar.' },
  { file: 'jd_05_pt.mp3', text: 'Na parte inferior tem o botão Documento para carregar ou ver o documento de identidade do jogador, e Guardar para aplicar todas as alterações. Lembre-se de guardar após editar.' },
  { file: 'jd_06_pt.mp3', text: 'Completou a visita. Já conhece a ficha de dados pessoais do jogador. Mantenha a informação atualizada sempre que necessário.' },
];
const STEPS_JD_IT = [
  { file: 'jd_01_it.mp3', text: 'Sei nella scheda dei dati personali del giocatore. Qui puoi consultare e modificare la foto, i dati personali, le informazioni sportive, i tutori e i dati bancari. Ti guidiamo passo dopo passo.' },
  { file: 'jd_02_it.mp3', text: 'In alto hai la foto del giocatore. Puoi caricare una nuova in formato JPG o PNG; alla creazione di un giocatore la foto viene caricata al salvataggio.' },
  { file: 'jd_03_it.mp3', text: 'Le schede Informazioni personali e Informazioni sportive organizzano il modulo. Nelle personali vedrai nome, cognome, data di nascita, contatto, indirizzo e dati dei tutori e bancari; nelle sportive, ruolo, misure e abilità.' },
  { file: 'jd_04_it.mp3', text: "Qui sono mostrati tutti i campi del giocatore: nome, cognome, documento d'identità, telefono, email, indirizzo, nazionalità e il resto. Compila o modifica quelli che ti servono." },
  { file: 'jd_05_it.mp3', text: "In fondo hai il pulsante Documento per caricare o visualizzare il documento di identità del giocatore, e Salva per applicare tutte le modifiche. Ricorda di salvare dopo aver modificato." },
  { file: 'jd_06_it.mp3', text: 'Hai completato la visita. Ora conosci la scheda dei dati personali del giocatore. Mantieni le informazioni aggiornate quando ne hai bisogno.' },
];

// ── /dashboard/cuotas jugador (player fees view) — EN ─────────────────────
const STEPS_PCQ_EN = [
  { file: 'cq_01_en.mp3', text: 'You are on the fee payment screen. Here you can check the status of your fees, link a card with Sphaira Pay for automatic charges, view mandatory and optional fees, and access bank transfer details. Let us guide you step by step.' },
  { file: 'cq_02_en.mp3', text: 'At the top you will see the total paid and pending cards. From here you can access Sphaira Pay: link a card, view the linked card, or manage automatic charges.' },
  { file: 'cq_03_en.mp3', text: 'When you select one-time fees, the bar appears showing the total and the Clear and Pay buttons to open the payment modal.' },
  { file: 'cq_04_en.mp3', text: 'Mandatory fees panel: filter by concept, payment type, status, due date, and date. The table shows concept, type, amount, paid, due date, and actions such as linking a card or cancelling.' },
  { file: 'cq_05_en.mp3', text: 'Optional fees: same structure with filters and list. You can select multiple and pay in bulk if available.' },
  { file: 'cq_06_en.mp3', text: 'Club bank details: IBAN, concept, contact, and Bizum. Make the transfer and notify the club when you have paid.' },
  { file: 'cq_07_en.mp3', text: 'You now know the fees screen. Link a card with Sphaira Pay if you use it, select and pay fees, or use bank transfer as indicated by the club.' },
];

// ── /dashboard/cuotas jugador — FR ────────────────────────────────────────
const STEPS_PCQ_FR = [
  { file: 'cq_01_fr.mp3', text: "Vous etes sur l ecran de paiement des cotisations. Ici vous pouvez consulter l etat de vos cotisations, associer une carte avec Sphaira Pay pour les prelevements automatiques, voir les obligatoires et facultatives, et avoir les coordonnees bancaires pour payer par virement. Nous vous guidons pas a pas." },
  { file: 'cq_02_fr.mp3', text: "En haut vous verrez les cartes total paye et en attente. Depuis ici vous accedez a Sphaira Pay : associer une carte, voir la carte associee ou gerer les prelevements automatiques." },
  { file: 'cq_03_fr.mp3', text: "En selectionnant des cotisations ponctuelles, la barre apparait avec le total et les boutons Effacer et Payer pour ouvrir la fenetre de paiement." },
  { file: 'cq_04_fr.mp3', text: "Panneau des cotisations obligatoires : filtres par concept, type de paiement, statut, echeance et date. Le tableau affiche concept, type, montant, paye, echeance et actions comme associer une carte ou annuler." },
  { file: 'cq_05_fr.mp3', text: "Cotisations facultatives : meme structure avec filtres et liste. Vous pouvez en selectionner plusieurs et payer en bloc si disponible." },
  { file: 'cq_06_fr.mp3', text: "Coordonnees bancaires du club : IBAN, concept, contact et Bizum. Effectuez le virement et informez le club une fois le paiement effectue." },
  { file: 'cq_07_fr.mp3', text: "Vous maitrisez maintenant l ecran des cotisations. Associez une carte avec Sphaira Pay si vous l utilisez, selectionnez et payez les cotisations ou utilisez le virement selon les indications du club." },
];

// ── /dashboard/cuotas jugador — DE ────────────────────────────────────────
const STEPS_PCQ_DE = [
  { file: 'cq_01_de.mp3', text: 'Sie befinden sich auf dem Bildschirm zur Beitragszahlung. Hier koennen Sie den Status Ihrer Beitraege pruefen, eine Karte mit Sphaira Pay fuer automatische Abbuchungen verknuepfen, Pflicht- und optionale Beitraege einsehen sowie Bankdaten fuer eine Ueberweisung abrufen. Wir fuehren Sie Schritt fuer Schritt.' },
  { file: 'cq_02_de.mp3', text: 'Oben sehen Sie die Karten mit dem gezahlten Gesamtbetrag und dem ausstehenden Betrag. Von hier aus gelangen Sie zu Sphaira Pay: Karte verknuepfen, verknuepfte Karte anzeigen oder automatische Abbuchungen verwalten.' },
  { file: 'cq_03_de.mp3', text: 'Wenn Sie einmalige Beitraege markieren, erscheint die Leiste mit dem Gesamtbetrag und den Schaltflaechen Leeren und Bezahlen, um das Zahlungsfenster zu oeffnen.' },
  { file: 'cq_04_de.mp3', text: 'Panel fuer Pflichtbeitraege: Filter nach Konzept, Zahlungsart, Status, Faelligkeitsdatum und Datum. Die Tabelle zeigt Konzept, Art, Betrag, Bezahlt, Faelligkeitsdatum und Aktionen wie Karte verknuepfen oder Stornieren.' },
  { file: 'cq_05_de.mp3', text: 'Optionale Beitraege: gleiche Struktur mit Filtern und Liste. Sie koennen mehrere auswaehlen und bei Verfuegbarkeit als Block bezahlen.' },
  { file: 'cq_06_de.mp3', text: 'Bankdaten des Vereins: IBAN, Konzept, Kontakt und Bizum. Fuehren Sie die Ueberweisung durch und benachrichtigen Sie den Verein nach der Zahlung.' },
  { file: 'cq_07_de.mp3', text: 'Sie beherrschen jetzt den Beitragszahlungsbildschirm. Verknuepfen Sie eine Karte mit Sphaira Pay, falls Sie es nutzen, waehlen und bezahlen Sie Beitraege oder nutzen Sie die Ueberweisung, wie vom Verein angegeben.' },
];

// ── /dashboard/cuotas jugador — PT ────────────────────────────────────────
const STEPS_PCQ_PT = [
  { file: 'cq_01_pt.mp3', text: 'Esta no ecra de pagamento de quotas. Aqui pode consultar o estado das suas quotas, associar um cartao com o Sphaira Pay para cobranças automaticas, ver as obrigatorias e opcionais, e ter os dados para pagar por transferencia. Guiamo-lo passo a passo.' },
  { file: 'cq_02_pt.mp3', text: 'No topo vera os cartoes de total pago e pendente. A partir daqui acede ao Sphaira Pay: associar cartao, ver o cartao associado ou gerir cobranças automaticas.' },
  { file: 'cq_03_pt.mp3', text: 'Ao marcar quotas pontuais aparece a barra com o total e os botoes Limpar e Pagar para abrir o modal de pagamento.' },
  { file: 'cq_04_pt.mp3', text: 'Painel de quotas obrigatorias: filtros por conceito, tipo de pagamento, estado, vencimento e data. A tabela mostra conceito, tipo, montante, pago, vencimento e acoes como associar cartao ou cancelar.' },
  { file: 'cq_05_pt.mp3', text: 'Quotas opcionais: mesma estrutura com filtros e lista. Pode selecionar varias e pagar em bloco se disponivel.' },
  { file: 'cq_06_pt.mp3', text: 'Dados bancarios do clube: IBAN, conceito, contacto e Bizum. Efetue a transferencia e notifique o clube apos o pagamento.' },
  { file: 'cq_07_pt.mp3', text: 'Ja conhece o ecra de quotas. Associe um cartao com Sphaira Pay se o utilizar, selecione e pague as quotas ou use transferencia conforme indicado pelo clube.' },
];

// ── /dashboard/cuotas jugador — IT ────────────────────────────────────────
const STEPS_PCQ_IT = [
  { file: 'cq_01_it.mp3', text: 'Sei nella schermata di pagamento delle quote. Qui puoi consultare lo stato delle tue quote, collegare una carta con Sphaira Pay per gli addebiti automatici, vedere quelle obbligatorie e facoltative, e avere i dati per pagare tramite bonifico. Ti guidiamo passo dopo passo.' },
  { file: 'cq_02_it.mp3', text: 'In alto vedrai le schede del totale pagato e in attesa. Da qui accedi a Sphaira Pay: collegare una carta, vedere quella collegata o gestire gli addebiti automatici.' },
  { file: 'cq_03_it.mp3', text: 'Selezionando quote una tantum appare la barra con il totale e i pulsanti Cancella e Paga per aprire il modal di pagamento.' },
  { file: 'cq_04_it.mp3', text: 'Pannello delle quote obbligatorie: filtri per concetto, tipo di pagamento, stato, scadenza e data. La tabella mostra concetto, tipo, importo, pagato, scadenza e azioni come collegare una carta o annullare.' },
  { file: 'cq_05_it.mp3', text: 'Quote facoltative: stessa struttura con filtri e lista. Puoi selezionarne piu e pagare in blocco se disponibile.' },
  { file: 'cq_06_it.mp3', text: 'Coordinate bancarie del club: IBAN, concetto, contatto e Bizum. Effettua il bonifico e notifica il club dopo il pagamento.' },
  { file: 'cq_07_it.mp3', text: 'Ora conosci la schermata delle quote. Collega una carta con Sphaira Pay se lo usi, seleziona e paga le quote oppure usa il bonifico come indicato dal club.' },
];

// ── /dashboard/documentos-jugador — EN ────────────────────────────────────
const STEPS_DJ_EN = [
  { file: 'dj_01_en.mp3', text: 'You are in the documentation your club requests from you. You can download documents shared by the club, upload the ones they ask for, or fill in forms. Each card shows its status: pending or completed. Let us guide you step by step.' },
  { file: 'dj_02_en.mp3', text: 'Use the search field to filter the document list by name.' },
  { file: 'dj_03_en.mp3', text: 'Each card shows name, description, and status: Pending download or Downloaded, Pending upload or Uploaded, Pending completion or Completed. Depending on the type, use the Download, Upload document, or Fill in button.' },
  { file: 'dj_04_en.mp3', text: 'You now know the documentation section. Download, upload, or fill in each document as requested by the club.' },
];

// ── /dashboard/documentos-jugador — FR ────────────────────────────────────
const STEPS_DJ_FR = [
  { file: 'dj_01_fr.mp3', text: "Vous etes dans la documentation que votre club vous demande. Vous pouvez telecharger les documents partages par le club, envoyer ceux qu il vous demande ou remplir des formulaires. Chaque carte affiche son statut : en attente ou complete. Nous vous guidons pas a pas." },
  { file: 'dj_02_fr.mp3', text: "Utilisez le champ de recherche pour filtrer la liste de documents par nom." },
  { file: 'dj_03_fr.mp3', text: "Chaque carte affiche nom, description et statut : Telechargement en attente ou Telecharge, Envoi en attente ou Envoye, A remplir ou Complete. Selon le type, utilisez le bouton Telecharger, Envoyer le document ou Remplir." },
  { file: 'dj_04_fr.mp3', text: "Vous connaissez maintenant la section documentation. Telechargez, envoyez ou remplissez chaque document selon la demande du club." },
];

// ── /dashboard/documentos-jugador — DE ────────────────────────────────────
const STEPS_DJ_DE = [
  { file: 'dj_01_de.mp3', text: 'Sie befinden sich in der Dokumentation, die Ihr Verein von Ihnen anfordert. Sie koennen vom Verein freigegebene Dokumente herunterladen, die angefragten hochladen oder Formulare ausfullen. Jede Karte zeigt den Status: ausstehend oder abgeschlossen. Wir fuehren Sie Schritt fuer Schritt.' },
  { file: 'dj_02_de.mp3', text: 'Verwenden Sie das Suchfeld, um die Dokumentliste nach Namen zu filtern.' },
  { file: 'dj_03_de.mp3', text: 'Jede Karte zeigt Name, Beschreibung und Status: Download ausstehend oder Heruntergeladen, Upload ausstehend oder Hochgeladen, Zum Ausfullen oder Abgeschlossen. Je nach Typ verwenden Sie die Schaltflaeche Herunterladen, Dokument hochladen oder Ausfullen.' },
  { file: 'dj_04_de.mp3', text: 'Sie kennen jetzt den Dokumentationsbereich. Laden Sie herunter, laden Sie hoch oder fullen Sie jedes Dokument gemaess den Anforderungen des Vereins aus.' },
];

// ── /dashboard/documentos-jugador — PT ────────────────────────────────────
const STEPS_DJ_PT = [
  { file: 'dj_01_pt.mp3', text: 'Esta na documentacao que o seu clube lhe solicita. Pode descarregar os documentos partilhados pelo clube, enviar os que lhe pedem ou preencher formularios. Cada cartao mostra o estado: pendente ou concluido. Guiamo-lo passo a passo.' },
  { file: 'dj_02_pt.mp3', text: 'Utilize o campo de pesquisa para filtrar a lista de documentos por nome.' },
  { file: 'dj_03_pt.mp3', text: 'Cada cartao mostra nome, descricao e estado: Download pendente ou Transferido, Upload pendente ou Enviado, Por preencher ou Concluido. Consoante o tipo, utilize o botao Transferir, Enviar documento ou Preencher.' },
  { file: 'dj_04_pt.mp3', text: 'Ja conhece a secao de documentacao. Descarregue, envie ou preencha cada documento conforme solicitado pelo clube.' },
];

// ── /dashboard/documentos-jugador — IT ────────────────────────────────────
const STEPS_SP_EN = [
  { file: 'sp_01_en.mp3', text: 'You are on the player\'s sports profile. Here you will see their photo, data, skills radar, match statistics, charts and training attendance. We\'ll guide you step by step.' },
  { file: 'sp_02_en.mp3', text: 'At the top: avatar, name and pills with position, preferred foot and height. The skills panel shows the radar with ratings if data has been loaded.' },
  { file: 'sp_03_en.mp3', text: 'Sports data: main position, secondary position, preferred foot, height and weight.' },
  { file: 'sp_04_en.mp3', text: 'Match statistics: matches played, starting appearances, minutes, goals, yellow cards and red cards.' },
  { file: 'sp_05_en.mp3', text: 'Matches and Attendance tabs: switch between the statistics chart and the monthly training attendance chart.' },
  { file: 'sp_06_en.mp3', text: 'Attendance table: date, whether the player attended and whether they arrived late at each session.' },
  { file: 'sp_07_en.mp3', text: 'Now you know the player profile. Review data, statistics and attendance whenever you need it.' },
];

const STEPS_SP_FR = [
  { file: 'sp_01_fr.mp3', text: 'Vous etes sur le profil sportif du joueur. Vous y verrez sa photo, ses donnees, son radar de competences, ses statistiques de matchs, ses graphiques et son assiduite aux entrainements. Nous vous guidons pas a pas.' },
  { file: 'sp_02_fr.mp3', text: 'En haut : avatar, nom et pastilles avec poste, pied fort et taille. Le panneau de competences affiche le radar avec les evaluations si les donnees ont ete chargees.' },
  { file: 'sp_03_fr.mp3', text: 'Donnees sportives : poste principal, poste secondaire, pied fort, taille et poids.' },
  { file: 'sp_04_fr.mp3', text: 'Statistiques de matchs : matchs joues, titularisations, minutes, buts, cartons jaunes et cartons rouges.' },
  { file: 'sp_05_fr.mp3', text: 'Onglets Matchs et Presence : basculez entre le graphique des statistiques et celui de la presence mensuelle aux entrainements.' },
  { file: 'sp_06_fr.mp3', text: 'Tableau de presence : date, si le joueur etait present et s il est arrive en retard a chaque seance.' },
  { file: 'sp_07_fr.mp3', text: 'Vous connaissez maintenant le profil du joueur. Consultez ses donnees, statistiques et presences a tout moment.' },
];

const STEPS_SP_DE = [
  { file: 'sp_01_de.mp3', text: 'Sie befinden sich im Sportprofil des Spielers. Hier sehen Sie Foto, Daten, Faehigkeits-Radar, Spielstatistiken, Diagramme und Trainingsanwesenheit. Wir fuehren Sie Schritt fuer Schritt.' },
  { file: 'sp_02_de.mp3', text: 'Oben: Avatar, Name und Chips mit Position, Standbein und Groesse. Das Faehigkeitspanel zeigt den Radar mit den Bewertungen, sofern Daten geladen wurden.' },
  { file: 'sp_03_de.mp3', text: 'Sportliche Daten: Hauptposition, Nebenposition, Standbein, Groesse und Gewicht.' },
  { file: 'sp_04_de.mp3', text: 'Spielstatistiken: gespielte Spiele, Startelfeinsaetze, Minuten, Tore, Gelbe Karten und Rote Karten.' },
  { file: 'sp_05_de.mp3', text: 'Reiter Spiele und Anwesenheit: wechseln Sie zwischen dem Statistikdiagramm und dem monatlichen Trainingsanwesenheitsdiagramm.' },
  { file: 'sp_06_de.mp3', text: 'Anwesenheitstabelle: Datum, ob der Spieler anwesend war und ob er bei jeder Einheit zu spaet gekommen ist.' },
  { file: 'sp_07_de.mp3', text: 'Jetzt kennen Sie das Spielerprofil. Ueberpruefen Sie Daten, Statistiken und Anwesenheit, wann immer Sie es brauchen.' },
];

const STEPS_SP_PT = [
  { file: 'sp_01_pt.mp3', text: 'Esta no perfil desportivo do jogador. Aqui vera a sua foto, dados, radar de competencias, estatisticas de jogos, graficos e assiduidade aos treinos. Guiamo-lo passo a passo.' },
  { file: 'sp_02_pt.mp3', text: 'No topo: avatar, nome e etiquetas com posicao, pe dominante e altura. O painel de competencias mostra o radar com as avaliacoes se os dados estiverem carregados.' },
  { file: 'sp_03_pt.mp3', text: 'Dados desportivos: posicao principal, posicao secundaria, pe dominante, altura e peso.' },
  { file: 'sp_04_pt.mp3', text: 'Estatisticas de jogos: jogos disputados, titularidades, minutos, golos, cartoes amarelos e cartoes vermelhos.' },
  { file: 'sp_05_pt.mp3', text: 'Separadores Jogos e Presenca: alterne entre o grafico de estatisticas e o de presenca mensal nos treinos.' },
  { file: 'sp_06_pt.mp3', text: 'Tabela de presencas: data, se o jogador esteve presente e se chegou atrasado a cada sessao.' },
  { file: 'sp_07_pt.mp3', text: 'Ja conhece o perfil do jogador. Consulte os dados, estatisticas e assiduidade sempre que precisar.' },
];

const STEPS_SP_IT = [
  { file: 'sp_01_it.mp3', text: 'Sei nel profilo sportivo del giocatore. Qui vedrai la sua foto, i dati, il radar delle competenze, le statistiche delle partite, i grafici e la presenza agli allenamenti. Ti guidiamo passo dopo passo.' },
  { file: 'sp_02_it.mp3', text: 'In alto: avatar, nome e etichette con ruolo, piede dominante e altezza. Il pannello delle competenze mostra il radar con le valutazioni se i dati sono stati caricati.' },
  { file: 'sp_03_it.mp3', text: 'Dati sportivi: ruolo principale, ruolo secondario, piede dominante, altezza e peso.' },
  { file: 'sp_04_it.mp3', text: 'Statistiche partite: partite giocate, titolarita, minuti, gol, cartellini gialli e cartellini rossi.' },
  { file: 'sp_05_it.mp3', text: 'Schede Partite e Presenze: passa tra il grafico delle statistiche e quello della presenza mensile agli allenamenti.' },
  { file: 'sp_06_it.mp3', text: 'Tabella presenze: data, se il giocatore era presente e se e arrivato in ritardo a ogni sessione.' },
  { file: 'sp_07_it.mp3', text: 'Ora conosci il profilo del giocatore. Consulta dati, statistiche e presenze ogni volta che ne hai bisogno.' },
];

const STEPS_RJ_EN = [
  { file: 'rj_01_en.mp3', text: 'You are in the team\'s kit catalogue. Select your size for each item; it saves automatically and the club uses these preferences for orders. We\'ll guide you step by step.' },
  { file: 'rj_02_en.mp3', text: 'Each card shows the image, name, description and the size selector. Choose between Not selected or the available sizes; when you choose, it saves instantly and you\'ll see the saving or saved status.' },
  { file: 'rj_03_en.mp3', text: 'Now you know My kit sizes. Keep your preferences up to date for each team item.' },
];

const STEPS_RJ_FR = [
  { file: 'rj_01_fr.mp3', text: 'Vous etes dans le catalogue de tenues de l equipe. Selectionnez votre taille pour chaque article ; cela se sauvegarde automatiquement et le club utilise ces preferences pour les commandes. Nous vous guidons pas a pas.' },
  { file: 'rj_02_fr.mp3', text: 'Chaque carte affiche l image, le nom, la description et le selecteur de taille. Choisissez entre Non selectionne ou les tailles disponibles ; au choix, la sauvegarde est instantanee et vous verrez l etat en cours de sauvegarde ou sauvegarde.' },
  { file: 'rj_03_fr.mp3', text: 'Vous connaissez maintenant Mes tailles de tenue. Maintenez vos preferences a jour pour chaque article de l equipe.' },
];

const STEPS_RJ_DE = [
  { file: 'rj_01_de.mp3', text: 'Sie befinden sich im Kleiderkatalog des Teams. Waehlen Sie Ihre Groesse fuer jedes Kleidungsstueck; es wird automatisch gespeichert und der Verein nutzt diese Praeferenzen fuer Bestellungen. Wir fuehren Sie Schritt fuer Schritt.' },
  { file: 'rj_02_de.mp3', text: 'Jede Karte zeigt Bild, Name, Beschreibung und den Groessenwahler. Waehlen Sie zwischen Nicht ausgewaehlt oder den verfuegbaren Groessen; bei der Auswahl wird sofort gespeichert und Sie sehen den Status Speichern oder Gespeichert.' },
  { file: 'rj_03_de.mp3', text: 'Jetzt kennen Sie Meine Kleidergroessen. Halten Sie Ihre Praeferenzen fuer jedes Teamkleidungsstueck aktuell.' },
];

const STEPS_RJ_PT = [
  { file: 'rj_01_pt.mp3', text: 'Esta no catalogo de roupa da equipa. Selecione o seu tamanho para cada peca; guarda automaticamente e o clube usa estas preferencias para os pedidos. Guiamo-lo passo a passo.' },
  { file: 'rj_02_pt.mp3', text: 'Cada cartao mostra a imagem, nome, descricao e o seletor de tamanho. Escolha entre Nao selecionado ou os tamanhos disponiveis; ao escolher, guarda instantaneamente e vera o estado a guardar ou guardado.' },
  { file: 'rj_03_pt.mp3', text: 'Ja conhece Os meus tamanhos de roupa. Mantenha as suas preferencias atualizadas para cada peca da equipa.' },
];

const STEPS_RJ_IT = [
  { file: 'rj_01_it.mp3', text: 'Sei nel catalogo di abbigliamento della squadra. Seleziona la tua taglia per ogni capo; si salva automaticamente e il club usa queste preferenze per gli ordini. Ti guidiamo passo dopo passo.' },
  { file: 'rj_02_it.mp3', text: 'Ogni scheda mostra l immagine, il nome, la descrizione e il selettore della taglia. Scegli tra Non selezionato o le taglie disponibili; alla scelta si salva istantaneamente e vedrai lo stato salvataggio o salvato.' },
  { file: 'rj_03_it.mp3', text: 'Ora conosci Le mie taglie di abbigliamento. Mantieni le tue preferenze aggiornate per ogni capo della squadra.' },
];

const STEPS_DJ_IT = [
  { file: 'dj_01_it.mp3', text: "Sei nella documentazione che il tuo club ti richiede. Puoi scaricare i documenti condivisi dal club, caricare quelli che ti chiedono o compilare moduli. Ogni scheda mostra lo stato: in attesa o completato. Ti guidiamo passo dopo passo." },
  { file: 'dj_02_it.mp3', text: "Usa il campo di ricerca per filtrare la lista dei documenti per nome." },
  { file: 'dj_03_it.mp3', text: "Ogni scheda mostra nome, descrizione e stato: Download in attesa o Scaricato, Upload in attesa o Caricato, Da compilare o Completato. A seconda del tipo, usa il pulsante Scarica, Carica documento o Compila." },
  { file: 'dj_04_it.mp3', text: "Ora conosci la sezione documentazione. Scarica, carica o compila ogni documento come richiesto dal club." },
];

async function main() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // ── Parámetros de línea de comandos ─────────────────────────────────────────
  // --lang=es   → solo audios en español (por defecto)
  // --lang=en   → solo audios en inglés
  // --lang=all  → genera ambos idiomas
  // --only=xxx  → filtra por prefijo de nombre de archivo
  // --force     → regenera aunque el archivo exista
  const langArg = (process.argv.find(a => a.startsWith('--lang=')) || '--lang=es').split('=')[1];
  const onlyArg = process.argv.find(a => a.startsWith('--only='));
  const prefix  = onlyArg ? onlyArg.split('=')[1] : '';
  const force   = process.argv.includes('--force');

  // Seleccionar el conjunto de pasos y voz según el idioma solicitado
  // Mapa de conjuntos de pasos por sección y idioma
  // Cada entrada: { steps, voiceId, voiceSettings, lang, model }
  const ALL_JOBS = [
    // ── /dashboard/inicio ───────────────────────────────────────────────────────
    { steps: STEPS,    voiceId: VOICE_ID,    voiceSettings: VOICE_SETTINGS,              lang: 'es', model: MODEL_ID              },
    { steps: STEPS_EN, voiceId: VOICE_ID_EN, voiceSettings: VOICE_SETTINGS_EN,           lang: 'en', model: MODEL_ID              },
    { steps: STEPS_FR, voiceId: VOICE_ID_FR, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'fr', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_DE, voiceId: VOICE_ID_DE, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'de', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_PT, voiceId: VOICE_ID_PT, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'pt', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_IT, voiceId: VOICE_ID_IT, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'it', model: MODEL_ID_MULTILINGUAL },
    // ── /dashboard/cuadro-de-mandos ────────────────────────────────────────────
    { steps: STEPS_CUADRO_EN, voiceId: VOICE_ID_EN, voiceSettings: VOICE_SETTINGS_EN,           lang: 'en', model: MODEL_ID              },
    { steps: STEPS_CUADRO_FR, voiceId: VOICE_ID_FR, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'fr', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_CUADRO_DE, voiceId: VOICE_ID_DE, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'de', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_CUADRO_PT, voiceId: VOICE_ID_PT, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'pt', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_CUADRO_IT, voiceId: VOICE_ID_IT, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'it', model: MODEL_ID_MULTILINGUAL },
    // ── /dashboard/estadisticas_jugadores/:teamId (coach) ────────────────────
    { steps: STEPS_EJ_COACH_EN, voiceId: VOICE_ID_EN, voiceSettings: VOICE_SETTINGS_EN,           lang: 'en', model: MODEL_ID              },
    { steps: STEPS_EJ_COACH_FR, voiceId: VOICE_ID_FR, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'fr', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_EJ_COACH_DE, voiceId: VOICE_ID_DE, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'de', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_EJ_COACH_PT, voiceId: VOICE_ID_PT, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'pt', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_EJ_COACH_IT, voiceId: VOICE_ID_IT, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'it', model: MODEL_ID_MULTILINGUAL },
    // ── /dashboard/clasificacion-resultados/:teamId ───────────────────────────
    { steps: STEPS_CR_EN, voiceId: VOICE_ID_EN, voiceSettings: VOICE_SETTINGS_EN,           lang: 'en', model: MODEL_ID              },
    { steps: STEPS_CR_FR, voiceId: VOICE_ID_FR, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'fr', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_CR_DE, voiceId: VOICE_ID_DE, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'de', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_CR_PT, voiceId: VOICE_ID_PT, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'pt', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_CR_IT, voiceId: VOICE_ID_IT, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'it', model: MODEL_ID_MULTILINGUAL },
    // ── /dashboard/partidos-entrevistas/:teamId ───────────────────────────────
    { steps: STEPS_PENTE_EN, voiceId: VOICE_ID_EN, voiceSettings: VOICE_SETTINGS_EN,           lang: 'en', model: MODEL_ID              },
    { steps: STEPS_PENTE_FR, voiceId: VOICE_ID_FR, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'fr', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_PENTE_DE, voiceId: VOICE_ID_DE, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'de', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_PENTE_PT, voiceId: VOICE_ID_PT, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'pt', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_PENTE_IT, voiceId: VOICE_ID_IT, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'it', model: MODEL_ID_MULTILINGUAL },
    // ── /dashboard/jugadores/:teamId ───────────────────────────────────────────
    { steps: STEPS_JUG_EN, voiceId: VOICE_ID_EN, voiceSettings: VOICE_SETTINGS_EN,           lang: 'en', model: MODEL_ID              },
    { steps: STEPS_JUG_FR, voiceId: VOICE_ID_FR, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'fr', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_JUG_DE, voiceId: VOICE_ID_DE, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'de', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_JUG_PT, voiceId: VOICE_ID_PT, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'pt', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_JUG_IT, voiceId: VOICE_ID_IT, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'it', model: MODEL_ID_MULTILINGUAL },
    // ── /dashboard/info-jugadores ──────────────────────────────────────────────
    { steps: STEPS_IJ_EN, voiceId: VOICE_ID_EN, voiceSettings: VOICE_SETTINGS_EN,           lang: 'en', model: MODEL_ID              },
    { steps: STEPS_IJ_FR, voiceId: VOICE_ID_FR, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'fr', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_IJ_DE, voiceId: VOICE_ID_DE, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'de', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_IJ_PT, voiceId: VOICE_ID_PT, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'pt', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_IJ_IT, voiceId: VOICE_ID_IT, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'it', model: MODEL_ID_MULTILINGUAL },
    // ── /dashboard/estadisticas-jugadores-club ────────────────────────────────
    { steps: STEPS_EJ_EN, voiceId: VOICE_ID_EN, voiceSettings: VOICE_SETTINGS_EN,           lang: 'en', model: MODEL_ID              },
    { steps: STEPS_EJ_FR, voiceId: VOICE_ID_FR, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'fr', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_EJ_DE, voiceId: VOICE_ID_DE, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'de', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_EJ_PT, voiceId: VOICE_ID_PT, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'pt', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_EJ_IT, voiceId: VOICE_ID_IT, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'it', model: MODEL_ID_MULTILINGUAL },
    // ── /dashboard/info-entrenadores ──────────────────────────────────────────
    { steps: STEPS_IE_EN, voiceId: VOICE_ID_EN, voiceSettings: VOICE_SETTINGS_EN,           lang: 'en', model: MODEL_ID              },
    { steps: STEPS_IE_FR, voiceId: VOICE_ID_FR, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'fr', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_IE_DE, voiceId: VOICE_ID_DE, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'de', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_IE_PT, voiceId: VOICE_ID_PT, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'pt', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_IE_IT, voiceId: VOICE_ID_IT, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'it', model: MODEL_ID_MULTILINGUAL },
    // ── /dashboard/ropa ──────────────────────────────────────────────────────
    { steps: STEPS_ROPA_EN,    voiceId: VOICE_ID_EN, voiceSettings: VOICE_SETTINGS_EN,           lang: 'en', model: MODEL_ID              },
    { steps: STEPS_ROPA_FR,    voiceId: VOICE_ID_FR, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'fr', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_ROPA_DE,    voiceId: VOICE_ID_DE, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'de', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_ROPA_PT,    voiceId: VOICE_ID_PT, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'pt', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_ROPA_IT,    voiceId: VOICE_ID_IT, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'it', model: MODEL_ID_MULTILINGUAL },
    // ── /dashboard/patrocinadores (club) ─────────────────────────────────────
    { steps: STEPS_PATRO_EN,   voiceId: VOICE_ID_EN, voiceSettings: VOICE_SETTINGS_EN,           lang: 'en', model: MODEL_ID              },
    { steps: STEPS_PATRO_FR,   voiceId: VOICE_ID_FR, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'fr', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_PATRO_DE,   voiceId: VOICE_ID_DE, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'de', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_PATRO_PT,   voiceId: VOICE_ID_PT, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'pt', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_PATRO_IT,   voiceId: VOICE_ID_IT, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'it', model: MODEL_ID_MULTILINGUAL },
    // ── /dashboard/patrocinadores (usuario) ──────────────────────────────────
    { steps: STEPS_PATROU_EN,  voiceId: VOICE_ID_EN, voiceSettings: VOICE_SETTINGS_EN,           lang: 'en', model: MODEL_ID              },
    { steps: STEPS_PATROU_FR,  voiceId: VOICE_ID_FR, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'fr', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_PATROU_DE,  voiceId: VOICE_ID_DE, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'de', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_PATROU_PT,  voiceId: VOICE_ID_PT, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'pt', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_PATROU_IT,  voiceId: VOICE_ID_IT, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'it', model: MODEL_ID_MULTILINGUAL },
    // ── /dashboard/documentos-club ───────────────────────────────────────────
    { steps: STEPS_DOCS_EN, voiceId: VOICE_ID_EN, voiceSettings: VOICE_SETTINGS_EN,           lang: 'en', model: MODEL_ID              },
    { steps: STEPS_DOCS_FR, voiceId: VOICE_ID_FR, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'fr', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_DOCS_DE, voiceId: VOICE_ID_DE, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'de', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_DOCS_PT, voiceId: VOICE_ID_PT, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'pt', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_DOCS_IT, voiceId: VOICE_ID_IT, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'it', model: MODEL_ID_MULTILINGUAL },
    // ── /dashboard/new-cuotas ─────────────────────────────────────────────────
    { steps: STEPS_CQ_EN, voiceId: VOICE_ID_EN, voiceSettings: VOICE_SETTINGS_EN,           lang: 'en', model: MODEL_ID              },
    { steps: STEPS_CQ_FR, voiceId: VOICE_ID_FR, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'fr', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_CQ_DE, voiceId: VOICE_ID_DE, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'de', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_CQ_PT, voiceId: VOICE_ID_PT, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'pt', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_CQ_IT, voiceId: VOICE_ID_IT, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'it', model: MODEL_ID_MULTILINGUAL },
    // ── /dashboard/equipos ────────────────────────────────────────────────────
    { steps: STEPS_EQ_EN, voiceId: VOICE_ID_EN, voiceSettings: VOICE_SETTINGS_EN,           lang: 'en', model: MODEL_ID              },
    { steps: STEPS_EQ_FR, voiceId: VOICE_ID_FR, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'fr', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_EQ_DE, voiceId: VOICE_ID_DE, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'de', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_EQ_PT, voiceId: VOICE_ID_PT, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'pt', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_EQ_IT, voiceId: VOICE_ID_IT, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'it', model: MODEL_ID_MULTILINGUAL },
    // ── /dashboard/menu-club ──────────────────────────────────────────────────
    { steps: STEPS_MC_EN, voiceId: VOICE_ID_EN, voiceSettings: VOICE_SETTINGS_EN,           lang: 'en', model: MODEL_ID              },
    { steps: STEPS_MC_FR, voiceId: VOICE_ID_FR, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'fr', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_MC_DE, voiceId: VOICE_ID_DE, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'de', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_MC_PT, voiceId: VOICE_ID_PT, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'pt', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_MC_IT, voiceId: VOICE_ID_IT, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'it', model: MODEL_ID_MULTILINGUAL },
    // ── /dashboard/estadisticas-equipos-club ─────────────────────────────────
    { steps: STEPS_EE_EN, voiceId: VOICE_ID_EN, voiceSettings: VOICE_SETTINGS_EN,           lang: 'en', model: MODEL_ID              },
    { steps: STEPS_EE_FR, voiceId: VOICE_ID_FR, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'fr', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_EE_DE, voiceId: VOICE_ID_DE, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'de', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_EE_PT, voiceId: VOICE_ID_PT, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'pt', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_EE_IT, voiceId: VOICE_ID_IT, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'it', model: MODEL_ID_MULTILINGUAL },
    // ── /dashboard/calendario-club ────────────────────────────────────────────
    { steps: STEPS_CAL_EN, voiceId: VOICE_ID_EN, voiceSettings: VOICE_SETTINGS_EN,           lang: 'en', model: MODEL_ID              },
    { steps: STEPS_CAL_FR, voiceId: VOICE_ID_FR, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'fr', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_CAL_DE, voiceId: VOICE_ID_DE, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'de', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_CAL_PT, voiceId: VOICE_ID_PT, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'pt', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_CAL_IT, voiceId: VOICE_ID_IT, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'it', model: MODEL_ID_MULTILINGUAL },
    // ── /dashboard/notificaciones ─────────────────────────────────────────────
    { steps: STEPS_NOTIF_EN,  voiceId: VOICE_ID_EN, voiceSettings: VOICE_SETTINGS_EN,           lang: 'en', model: MODEL_ID              },
    { steps: STEPS_NOTIF_FR,  voiceId: VOICE_ID_FR, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'fr', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_NOTIF_DE,  voiceId: VOICE_ID_DE, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'de', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_NOTIF_PT,  voiceId: VOICE_ID_PT, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'pt', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_NOTIF_IT,  voiceId: VOICE_ID_IT, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'it', model: MODEL_ID_MULTILINGUAL },
    // ── /dashboard/staff-club ─────────────────────────────────────────────────
    { steps: STEPS_STAFF_EN,  voiceId: VOICE_ID_EN, voiceSettings: VOICE_SETTINGS_EN,           lang: 'en', model: MODEL_ID              },
    { steps: STEPS_STAFF_FR,  voiceId: VOICE_ID_FR, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'fr', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_STAFF_DE,  voiceId: VOICE_ID_DE, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'de', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_STAFF_PT,  voiceId: VOICE_ID_PT, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'pt', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_STAFF_IT,  voiceId: VOICE_ID_IT, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'it', model: MODEL_ID_MULTILINGUAL },
    // ── /demo-role ────────────────────────────────────────────────────────────
    { steps: STEPS_DR_ES,  voiceId: VOICE_ID,    voiceSettings: VOICE_SETTINGS,              lang: 'es', model: MODEL_ID              },
    { steps: STEPS_DR_EN,  voiceId: VOICE_ID_EN, voiceSettings: VOICE_SETTINGS_EN,           lang: 'en', model: MODEL_ID              },
    { steps: STEPS_DR_FR,  voiceId: VOICE_ID_FR, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'fr', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_DR_DE,  voiceId: VOICE_ID_DE, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'de', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_DR_PT,  voiceId: VOICE_ID_PT, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'pt', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_DR_IT,  voiceId: VOICE_ID_IT, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'it', model: MODEL_ID_MULTILINGUAL },
    // ── /dashboard/video-analysis ────────────────────────────────────────────
    { steps: STEPS_VA_EN, voiceId: VOICE_ID_EN, voiceSettings: VOICE_SETTINGS_EN,           lang: 'en', model: MODEL_ID              },
    { steps: STEPS_VA_FR, voiceId: VOICE_ID_FR, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'fr', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_VA_DE, voiceId: VOICE_ID_DE, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'de', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_VA_PT, voiceId: VOICE_ID_PT, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'pt', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_VA_IT, voiceId: VOICE_ID_IT, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'it', model: MODEL_ID_MULTILINGUAL },
    // ── /dashboard/asistente-ia ──────────────────────────────────────────────
    { steps: STEPS_ASISTENTE_EN, voiceId: VOICE_ID_EN, voiceSettings: VOICE_SETTINGS_EN,           lang: 'en', model: MODEL_ID              },
    { steps: STEPS_ASISTENTE_FR, voiceId: VOICE_ID_FR, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'fr', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_ASISTENTE_DE, voiceId: VOICE_ID_DE, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'de', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_ASISTENTE_PT, voiceId: VOICE_ID_PT, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'pt', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_ASISTENTE_IT, voiceId: VOICE_ID_IT, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'it', model: MODEL_ID_MULTILINGUAL },
    // ── /dashboard/scouting-club ─────────────────────────────────────────────
    { steps: STEPS_SCOUT_EN,  voiceId: VOICE_ID_EN, voiceSettings: VOICE_SETTINGS_EN,           lang: 'en', model: MODEL_ID              },
    { steps: STEPS_SCOUT_FR,  voiceId: VOICE_ID_FR, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'fr', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_SCOUT_DE,  voiceId: VOICE_ID_DE, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'de', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_SCOUT_PT,  voiceId: VOICE_ID_PT, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'pt', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_SCOUT_IT,  voiceId: VOICE_ID_IT, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'it', model: MODEL_ID_MULTILINGUAL },
    // ── /dashboard/club-videos ────────────────────────────────────────────────
    { steps: STEPS_VIDEOS_EN, voiceId: VOICE_ID_EN, voiceSettings: VOICE_SETTINGS_EN,           lang: 'en', model: MODEL_ID              },
    { steps: STEPS_VIDEOS_FR, voiceId: VOICE_ID_FR, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'fr', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_VIDEOS_DE, voiceId: VOICE_ID_DE, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'de', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_VIDEOS_PT, voiceId: VOICE_ID_PT, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'pt', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_VIDEOS_IT, voiceId: VOICE_ID_IT, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'it', model: MODEL_ID_MULTILINGUAL },
    // ── /dashboard/menu-entrenador ────────────────────────────────────────────
    { steps: STEPS_ME_EN, voiceId: VOICE_ID_EN, voiceSettings: VOICE_SETTINGS_EN,           lang: 'en', model: MODEL_ID              },
    { steps: STEPS_ME_FR, voiceId: VOICE_ID_FR, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'fr', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_ME_DE, voiceId: VOICE_ID_DE, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'de', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_ME_PT, voiceId: VOICE_ID_PT, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'pt', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_ME_IT, voiceId: VOICE_ID_IT, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'it', model: MODEL_ID_MULTILINGUAL },

    // ── /dashboard/informacion-equipo ────────────────────────────────────
    { steps: STEPS_INFOEQ_EN, voiceId: VOICE_ID_EN, voiceSettings: VOICE_SETTINGS_EN,           lang: 'en', model: MODEL_ID              },
    { steps: STEPS_INFOEQ_FR, voiceId: VOICE_ID_FR, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'fr', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_INFOEQ_DE, voiceId: VOICE_ID_DE, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'de', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_INFOEQ_PT, voiceId: VOICE_ID_PT, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'pt', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_INFOEQ_IT, voiceId: VOICE_ID_IT, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'it', model: MODEL_ID_MULTILINGUAL },

    // ── /dashboard/estadisticas-equipo ───────────────────────────────────
    { steps: STEPS_STATEQ_EN, voiceId: VOICE_ID_EN, voiceSettings: VOICE_SETTINGS_EN,           lang: 'en', model: MODEL_ID              },
    { steps: STEPS_STATEQ_FR, voiceId: VOICE_ID_FR, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'fr', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_STATEQ_DE, voiceId: VOICE_ID_DE, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'de', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_STATEQ_PT, voiceId: VOICE_ID_PT, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'pt', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_STATEQ_IT, voiceId: VOICE_ID_IT, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'it', model: MODEL_ID_MULTILINGUAL },

    // ── /dashboard/calendario ─────────────────────────────────────────────
    { steps: STEPS_CALEQ_EN, voiceId: VOICE_ID_EN, voiceSettings: VOICE_SETTINGS_EN, lang: 'en', model: MODEL_ID },
    { steps: STEPS_CALEQ_FR, voiceId: VOICE_ID_FR, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'fr', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_CALEQ_DE, voiceId: VOICE_ID_DE, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'de', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_CALEQ_PT, voiceId: VOICE_ID_PT, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'pt', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_CALEQ_IT, voiceId: VOICE_ID_IT, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'it', model: MODEL_ID_MULTILINGUAL },

    // ── /dashboard/tareas ─────────────────────────────────────────────────
    { steps: STEPS_TAREAS_EN, voiceId: VOICE_ID_EN, voiceSettings: VOICE_SETTINGS_EN, lang: 'en', model: MODEL_ID },
    { steps: STEPS_TAREAS_FR, voiceId: VOICE_ID_FR, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'fr', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_TAREAS_DE, voiceId: VOICE_ID_DE, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'de', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_TAREAS_PT, voiceId: VOICE_ID_PT, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'pt', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_TAREAS_IT, voiceId: VOICE_ID_IT, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'it', model: MODEL_ID_MULTILINGUAL },

    // ── /dashboard/tactical-board ─────────────────────────────────────────
    { steps: STEPS_TBOARD_EN, voiceId: VOICE_ID_EN, voiceSettings: VOICE_SETTINGS_EN, lang: 'en', model: MODEL_ID },
    { steps: STEPS_TBOARD_FR, voiceId: VOICE_ID_FR, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'fr', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_TBOARD_DE, voiceId: VOICE_ID_DE, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'de', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_TBOARD_PT, voiceId: VOICE_ID_PT, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'pt', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_TBOARD_IT, voiceId: VOICE_ID_IT, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'it', model: MODEL_ID_MULTILINGUAL },

    // ── /dashboard/tareas-catalog ─────────────────────────────────────────
    { steps: STEPS_TC_EN, voiceId: VOICE_ID_EN, voiceSettings: VOICE_SETTINGS_EN, lang: 'en', model: MODEL_ID },
    { steps: STEPS_TC_FR, voiceId: VOICE_ID_FR, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'fr', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_TC_DE, voiceId: VOICE_ID_DE, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'de', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_TC_PT, voiceId: VOICE_ID_PT, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'pt', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_TC_IT, voiceId: VOICE_ID_IT, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'it', model: MODEL_ID_MULTILINGUAL },

    // ── /dashboard/tareas-historial ───────────────────────────────────────
    { steps: STEPS_THIST_EN, voiceId: VOICE_ID_EN, voiceSettings: VOICE_SETTINGS_EN, lang: 'en', model: MODEL_ID },
    { steps: STEPS_THIST_FR, voiceId: VOICE_ID_FR, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'fr', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_THIST_DE, voiceId: VOICE_ID_DE, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'de', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_THIST_PT, voiceId: VOICE_ID_PT, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'pt', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_THIST_IT, voiceId: VOICE_ID_IT, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'it', model: MODEL_ID_MULTILINGUAL },

    // ── /dashboard/tareas-favoritas ───────────────────────────────────────
    { steps: STEPS_TFAV_EN, voiceId: VOICE_ID_EN, voiceSettings: VOICE_SETTINGS_EN, lang: 'en', model: MODEL_ID },
    { steps: STEPS_TFAV_FR, voiceId: VOICE_ID_FR, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'fr', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_TFAV_DE, voiceId: VOICE_ID_DE, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'de', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_TFAV_PT, voiceId: VOICE_ID_PT, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'pt', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_TFAV_IT, voiceId: VOICE_ID_IT, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'it', model: MODEL_ID_MULTILINGUAL },

    // ── /dashboard/tareas-mis ─────────────────────────────────────────────
    { steps: STEPS_TMIS_EN, voiceId: VOICE_ID_EN, voiceSettings: VOICE_SETTINGS_EN, lang: 'en', model: MODEL_ID },
    { steps: STEPS_TMIS_FR, voiceId: VOICE_ID_FR, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'fr', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_TMIS_DE, voiceId: VOICE_ID_DE, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'de', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_TMIS_PT, voiceId: VOICE_ID_PT, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'pt', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_TMIS_IT, voiceId: VOICE_ID_IT, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'it', model: MODEL_ID_MULTILINGUAL },

    // ── /dashboard/lesiones ───────────────────────────────────────────────
    { steps: STEPS_LES_EN, voiceId: VOICE_ID_EN, voiceSettings: VOICE_SETTINGS_EN,           lang: 'en', model: MODEL_ID              },
    { steps: STEPS_LES_FR, voiceId: VOICE_ID_FR, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'fr', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_LES_DE, voiceId: VOICE_ID_DE, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'de', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_LES_PT, voiceId: VOICE_ID_PT, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'pt', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_LES_IT, voiceId: VOICE_ID_IT, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'it', model: MODEL_ID_MULTILINGUAL },

    // ── /dashboard/perfil-entrenador ─────────────────────────────────────
    { steps: STEPS_PERFE_EN, voiceId: VOICE_ID_EN, voiceSettings: VOICE_SETTINGS_EN,           lang: 'en', model: MODEL_ID              },
    { steps: STEPS_PERFE_FR, voiceId: VOICE_ID_FR, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'fr', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_PERFE_DE, voiceId: VOICE_ID_DE, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'de', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_PERFE_PT, voiceId: VOICE_ID_PT, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'pt', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_PERFE_IT, voiceId: VOICE_ID_IT, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'it', model: MODEL_ID_MULTILINGUAL },

    // ── /dashboard/documentos-entrenador ─────────────────────────────────
    { steps: STEPS_DOCE_EN, voiceId: VOICE_ID_EN, voiceSettings: VOICE_SETTINGS_EN,           lang: 'en', model: MODEL_ID              },
    { steps: STEPS_DOCE_FR, voiceId: VOICE_ID_FR, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'fr', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_DOCE_DE, voiceId: VOICE_ID_DE, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'de', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_DOCE_PT, voiceId: VOICE_ID_PT, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'pt', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_DOCE_IT, voiceId: VOICE_ID_IT, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'it', model: MODEL_ID_MULTILINGUAL },

    // ── /dashboard/opcionesjugador ────────────────────────────────────────
    { steps: STEPS_OJ_EN, voiceId: VOICE_ID_EN, voiceSettings: VOICE_SETTINGS_EN,           lang: 'en', model: MODEL_ID              },
    { steps: STEPS_OJ_FR, voiceId: VOICE_ID_FR, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'fr', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_OJ_DE, voiceId: VOICE_ID_DE, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'de', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_OJ_PT, voiceId: VOICE_ID_PT, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'pt', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_OJ_IT, voiceId: VOICE_ID_IT, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'it', model: MODEL_ID_MULTILINGUAL },

    // ── /dashboard/jugador/:teamId/:playerId ──────────────────────────────
    { steps: STEPS_JD_EN, voiceId: VOICE_ID_EN, voiceSettings: VOICE_SETTINGS_EN,           lang: 'en', model: MODEL_ID              },
    { steps: STEPS_JD_FR, voiceId: VOICE_ID_FR, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'fr', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_JD_DE, voiceId: VOICE_ID_DE, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'de', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_JD_PT, voiceId: VOICE_ID_PT, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'pt', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_JD_IT, voiceId: VOICE_ID_IT, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'it', model: MODEL_ID_MULTILINGUAL },

    // ── /dashboard/cuotas (pagar cuotas jugador) ──────────────────────────
    { steps: STEPS_PCQ_EN, voiceId: VOICE_ID_EN, voiceSettings: VOICE_SETTINGS_EN,           lang: 'en', model: MODEL_ID              },
    { steps: STEPS_PCQ_FR, voiceId: VOICE_ID_FR, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'fr', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_PCQ_DE, voiceId: VOICE_ID_DE, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'de', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_PCQ_PT, voiceId: VOICE_ID_PT, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'pt', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_PCQ_IT, voiceId: VOICE_ID_IT, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'it', model: MODEL_ID_MULTILINGUAL },

    // ── /dashboard/documentos-jugador ────────────────────────────────────
    { steps: STEPS_DJ_EN, voiceId: VOICE_ID_EN, voiceSettings: VOICE_SETTINGS_EN,           lang: 'en', model: MODEL_ID              },
    { steps: STEPS_DJ_FR, voiceId: VOICE_ID_FR, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'fr', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_DJ_DE, voiceId: VOICE_ID_DE, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'de', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_DJ_PT, voiceId: VOICE_ID_PT, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'pt', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_DJ_IT, voiceId: VOICE_ID_IT, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'it', model: MODEL_ID_MULTILINGUAL },

    // ── /dashboard/scouting-player ────────────────────────────────────────
    { steps: STEPS_SP_EN, voiceId: VOICE_ID_EN, voiceSettings: VOICE_SETTINGS_EN,           lang: 'en', model: MODEL_ID              },
    { steps: STEPS_SP_FR, voiceId: VOICE_ID_FR, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'fr', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_SP_DE, voiceId: VOICE_ID_DE, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'de', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_SP_PT, voiceId: VOICE_ID_PT, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'pt', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_SP_IT, voiceId: VOICE_ID_IT, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'it', model: MODEL_ID_MULTILINGUAL },

    // ── /dashboard/ropa-jugador ───────────────────────────────────────────
    { steps: STEPS_RJ_EN, voiceId: VOICE_ID_EN, voiceSettings: VOICE_SETTINGS_EN,           lang: 'en', model: MODEL_ID              },
    { steps: STEPS_RJ_FR, voiceId: VOICE_ID_FR, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'fr', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_RJ_DE, voiceId: VOICE_ID_DE, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'de', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_RJ_PT, voiceId: VOICE_ID_PT, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'pt', model: MODEL_ID_MULTILINGUAL },
    { steps: STEPS_RJ_IT, voiceId: VOICE_ID_IT, voiceSettings: VOICE_SETTINGS_MULTILINGUAL, lang: 'it', model: MODEL_ID_MULTILINGUAL },
  ];

  const SUPPORTED = ALL_JOBS.map(j => j.lang).join(', ');
  const jobs = langArg === 'all'
    ? ALL_JOBS
    : ALL_JOBS.filter(j => j.lang === langArg);

  if (jobs.length === 0) {
    console.error(`❌  Idioma no soportado: "${langArg}". Opciones: ${SUPPORTED} o all`);
    process.exit(1);
  }

  let totalSuccess = 0;
  let totalSkipped = 0;
  let totalErrors  = 0;

  for (const job of jobs) {
    const steps = prefix ? job.steps.filter(s => s.file.startsWith(prefix)) : job.steps;

    console.log(`\n🎙️  [${job.lang.toUpperCase()}] Generando ${steps.length} archivos de audio`);
    if (prefix) console.log(`   Solo archivos: ${prefix}*`);
    if (force)  console.log(`   Modo: --force (regenerar aunque existan)`);
    console.log(`   Voz: ${job.voiceId}  |  Modelo: ${MODEL_ID}`);
    console.log(`   Destino: ${OUTPUT_DIR}\n`);

    for (const step of steps) {
      const outputPath = path.join(OUTPUT_DIR, step.file);

      if (!force && fs.existsSync(outputPath)) {
        console.log(`   ⏭️  ${step.file}  (ya existe, usa --force para reemplazar)`);
        totalSkipped++;
        continue;
      }

      try {
        process.stdout.write(`   ⏳  ${step.file}  …`);
        await generateAudio(step.text, outputPath, job.voiceId, job.voiceSettings, job.model);
        const size = Math.round(fs.statSync(outputPath).size / 1024);
        console.log(` ✅  (${size} KB)`);
        totalSuccess++;
        // Pequeña pausa entre peticiones para respetar el rate-limit
        await new Promise(r => setTimeout(r, 300));
      } catch (err) {
        console.log(` ❌  ${err.message}`);
        totalErrors++;
      }
    }
  }

  console.log(`\n📊  Resultado: ${totalSuccess} generados, ${totalSkipped} omitidos, ${totalErrors} errores`);
  if (totalErrors === 0) {
    console.log('✅  ¡Todos los audios generados correctamente!\n');
  } else {
    console.log('⚠️   Algunos audios fallaron. Vuelve a ejecutar el script para reintentarlos.\n');
  }
}

main().catch(err => {
  console.error('Error fatal:', err);
  process.exit(1);
});
