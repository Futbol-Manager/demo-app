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
// Voz: hombre, castellano de España (Mateo por defecto). Se usa para todos los audios,
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
  { file: 'coach_05.mp3', text: 'Ya conoces tu panel de entrenador. Elige un equipo cuando quieras y entra a su calendario, tareas, jugadores y el resto de opciones. ¡A dirigir desde la banda!' },

  // ── Dashboard inicio — Padre/Jugador (player), vista "Mis hijos" ────────────
  { file: 'player_01.mp3', text: 'Esta es tu pantalla principal como padre o jugador. Aquí ves los deportistas vinculados a tu cuenta en la temporada elegida. Cada tarjeta te lleva a su mundo: calendario, cuotas, documentación, estadísticas y galería. Te contamos en un momento qué ver en cada parte.' },
  { file: 'player_02.mp3', text: 'Arriba tienes el selector de temporada. Cámbialo para ver los jugadores y equipos de otro curso; el listado se actualiza al instante. Así puedes cambiar de temporada sin salir de esta pantalla.' },
  { file: 'player_03.mp3', text: 'Aquí están tus jugadores. Cada tarjeta muestra nombre, equipo, horario de entrenamiento y próximo partido. Pulsa en una tarjeta o en Ver jugador para acceder a todas las opciones de ese jugador: calendario, cuotas, documentos y más.' },
  { file: 'player_04.mp3', text: 'Si no tienes jugadores vinculados en esta temporada, verás un mensaje orientativo. Contacta con tu club para dar de alta a los jugadores; cuando estén dados de alta, aparecerán aquí.' },
  { file: 'player_05.mp3', text: 'Ya conoces tu panel. Pulsa en cualquier jugador cuando quieras para ver su calendario, cuotas, documentación y el resto de opciones. ¡Todo a un toque!' },

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
  { file: 'cal_03.mp3', text: 'Empecemos por el filtro de equipos. Cada chip corresponde a un equipo; el color y el icono de ojo indican si está visible. Pulsa en un chip para mostrarlo u ocultarlo, o usa los botones de mostrar y ocultar todos.' },
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
  { file: 'caleq_02.mp3', text: 'Cambia entre vista por año (grid de meses), por mes (tabla) o por semana (7 días). Cada vista muestra entrenamientos y partidos.' },
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

  const onlyPrefix = process.argv.find(a => a.startsWith('--only='));
  const prefix = onlyPrefix ? onlyPrefix.split('=')[1] : '';
  const force = process.argv.includes('--force');
  const steps = prefix ? STEPS.filter(s => s.file.startsWith(prefix)) : STEPS;

  console.log(`\n🎙️  Generando ${steps.length} archivos de audio para el tutorial de Sphaira`);
  if (prefix) console.log(`   Solo archivos: ${prefix}*`);
  if (force) console.log(`   Modo: --force (regenerar aunque existan)`);
  console.log(`   Voz: ${VOICE_ID}  |  Modelo: ${MODEL_ID}`);
  console.log(`   Destino: ${OUTPUT_DIR}\n`);

  let success = 0;
  let skipped = 0;
  let errors = 0;

  for (const step of steps) {
    const outputPath = path.join(OUTPUT_DIR, step.file);

    if (!force && fs.existsSync(outputPath)) {
      console.log(`   ⏭️  ${step.file}  (ya existe, usa --force para reemplazar)`);
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
