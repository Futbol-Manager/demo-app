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
// Voz: Mateo — castellano de España, claro y profesional (ElevenLabs voice library)
// Fallback: Antoni multilingüe si Mateo no está disponible en la cuenta.
// Para obtener IDs propios: GET https://api.elevenlabs.io/v1/voices
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || 'RwzBDEn5f6FIgpAjH9YN'; // Voz seleccionada por el usuario — español España
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
  // ── Dashboard inicio ──────────────────────────────────────────────────────
  {
    file: 'inicio_01.mp3',
    text: 'Bienvenido a tu panel de gestión. Desde aquí tienes acceso a todos los módulos del club, equipos, documentos, pagos, equipación y mucho más. En los próximos pasos te explicamos qué hace cada sección.'
  },
  {
    file: 'inicio_02.mp3',
    text: 'Empecemos por el Cuadro de mando, tu centro de control del club. Aquí encuentras el resumen de equipos, jugadores y entrenadores, los próximos partidos y entrenamientos, y alertas sobre pagos pendientes, lesiones o documentos sin entregar. Pulsa en cualquier elemento para ver su detalle.'
  },
  {
    file: 'inicio_03.mp3',
    text: 'Continuamos con Equipos. Gestiona toda la estructura deportiva del club: crea equipos por categoría, asigna jugadores y entrenadores, y accede al detalle completo de cada uno con estadísticas, calendario y plantilla.'
  },
  {
    file: 'inicio_04.mp3',
    text: 'Ahora, Documentos. Centraliza toda la documentación del club, autorizaciones, contratos, fichas médicas y formularios personalizados. Publica documentos para que los jugadores los firmen y haz seguimiento de quién ha entregado cada uno.'
  },
  {
    file: 'inicio_05.mp3',
    text: 'Pasamos a Pagos y cuotas. Gestiona todas las cuotas del club desde un único lugar: consulta quién está al día y quién tiene pagos pendientes, configura los importes y acepta pagos online de forma sencilla.'
  },
  {
    file: 'inicio_06.mp3',
    text: 'Seguimos con Ropa y Equipación. Los padres pueden indicar las tallas de sus hijos directamente desde la app, y el club las recibe al instante. Además, puedes subir imágenes de la ropa para que las familias la vean antes de hacer el pedido.'
  },
  {
    file: 'inicio_07.mp3',
    text: 'Y hablemos de Patrocinadores. Registra cada patrocinador con nombre, importe, logotipo y fechas de contrato, y dale visibilidad mostrándolo a todos los usuarios del club.'
  },
  {
    file: 'inicio_08.mp3',
    text: 'Siguiente, Notificaciones. Comunícate de forma directa con todos o con un equipo concreto: redacta mensajes, adjunta archivos y programa el momento exacto en que quieres que se entreguen.'
  },
  {
    file: 'inicio_09.mp3',
    text: 'Pasamos a Gestión de Staff. Define quién tiene acceso a cada parte del panel: añade miembros, asígnales permisos por módulo —pagos, documentos, estadísticas, calendario— y gestiona sus roles con total precisión.'
  },
  {
    file: 'inicio_10.mp3',
    text: 'Ahora, Scouting. Organiza tu proceso de captación de talento: añade jugadores a tu lista de observación y sigue su evolución desde el primer vistazo hasta el contacto formal con el club.'
  },
  {
    file: 'inicio_11.mp3',
    text: 'Continuamos con la Biblioteca de vídeos, tu videoteca deportiva en la nube. Sube grabaciones, enlaza vídeos de YouTube o Vimeo, y organízalos en carpetas por equipo o temporada.'
  },
  {
    file: 'inicio_12.mp3',
    text: 'Y si quieres ir más allá, tienes el Análisis de vídeo. Crea sesiones tácticas sobre tus grabaciones, añade anotaciones, dibuja sobre el campo y extrae clips clave para compartir con el cuerpo técnico.'
  },
  {
    file: 'inicio_13.mp3',
    text: 'Y para terminar, el Asistente de IA, siempre disponible en todas las pantallas. Hazle preguntas, pídele informes, sesiones de entrenamiento o convocatorias. Lo tienes en el botón circular de la esquina inferior derecha.'
  },
  {
    file: 'inicio_14.mp3',
    text: '¡Ya conoces todo lo que Sphaira tiene para ti! Navega por cualquier módulo desde el menú lateral. Si en algún momento necesitas orientación, el botón de ayuda en cada pantalla está para cuando lo necesites.'
  },

  // ── Cuadro de mandos ───────────────────────────────────────────────────────
  {
    file: 'cuadro_01.mp3',
    text: 'Bienvenido al centro de control de tu club. A la izquierda tienes acceso rápido a jugadores, entrenadores, estadísticas y calendario. A la derecha, un resumen en tiempo real de resultados, entrenamientos del día y próximos partidos.'
  },
  {
    file: 'cuadro_02.mp3',
    text: 'Antes de empezar, fíjate en este botón. Cuando quieras volver al panel principal del club, pulsa aquí y accederás al resto de módulos.'
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
  },

  // ── Dashboard inicio — Entrenador (coach) ─────────────────────────────────
  { file: 'coach_01.mp3', text: 'Esta es tu pantalla principal como entrenador. Aquí ves todos los equipos que tienes asignados en la temporada seleccionada. Pulsa en una tarjeta para entrar al menú de ese equipo.' },
  { file: 'coach_02.mp3', text: 'Fíjate en el selector de temporada. Cámbialo para ver los equipos asignados en otro curso; el listado se actualiza al instante.' },
  { file: 'coach_03.mp3', text: 'Aquí tienes tus equipos. Cada tarjeta muestra categoría, nombre, liga, horario de entrenamiento y número de jugadores. Pulsa en una para acceder al calendario, tareas, jugadores, estadísticas, notificaciones y mucho más.' },
  { file: 'coach_04.mp3', text: 'Si aún no tienes equipos asignados en esta temporada, verás un mensaje orientativo y el botón para ir a la gestión de equipos del club.' },
  { file: 'coach_05.mp3', text: 'Ya conoces tu panel de entrenador. Elige un equipo y accede a su calendario, tareas, jugadores y el resto de opciones cuando quieras.' },

  // ── Dashboard inicio — Padre/Jugador (player) ─────────────────────────────
  { file: 'player_01.mp3', text: 'Esta es tu pantalla principal. Aquí ves los jugadores vinculados a tu cuenta en la temporada seleccionada. Pulsa en una tarjeta para acceder a las opciones de ese jugador: calendario, cuotas, documentación, estadísticas, galería y mucho más.' },
  { file: 'player_02.mp3', text: 'Fíjate en el selector de temporada. Cámbialo para ver los jugadores y equipos de otro curso; el listado se actualiza al instante.' },
  { file: 'player_03.mp3', text: 'Aquí ves tus jugadores. Cada tarjeta muestra nombre, equipo, horario de entrenamiento y próximo partido. Pulsa en una tarjeta o en Ver jugador para acceder a todas sus opciones.' },
  { file: 'player_04.mp3', text: 'Y si no tienes jugadores vinculados en esta temporada, verás un mensaje orientativo. Contacta con tu club para dar de alta a los jugadores.' },
  { file: 'player_05.mp3', text: 'Ya conoces tu panel. Pulsa en un jugador para ver su calendario, cuotas, documentación y el resto de opciones cuando quieras.' },

  // ── Equipos ───────────────────────────────────────────────────────────────
  { file: 'equipos_01.mp3', text: 'En esta pantalla gestionas todos los equipos de la temporada: categorías, jugadores por equipo, horarios de entrenamiento y acceso rápido al calendario de cada equipo.' },
  { file: 'equipos_02.mp3', text: 'Antes de explorar las opciones, este botón te lleva de vuelta al inicio del dashboard del club cuando lo necesites.' },
  { file: 'equipos_03.mp3', text: 'Empecemos por las acciones superiores. Puedes importar un listado de jugadores desde Excel: descarga la plantilla, rellena los datos y súbela para dar de alta a varios jugadores a la vez.' },
  { file: 'equipos_04.mp3', text: 'También puedes invitar jugadores generando un enlace de registro. Compártelo por WhatsApp o correo y los jugadores se asignarán al club directamente.' },
  { file: 'equipos_05.mp3', text: 'Para crear un nuevo equipo, pulsa aquí: elige categoría, nivel y letra. Si la categoría no existe, puedes crearla en el momento.' },
  { file: 'equipos_06.mp3', text: 'Si quieres ver los equipos de otro curso, cambia la temporada desde este selector. El listado y las estadísticas se actualizan al instante.' },
  { file: 'equipos_07.mp3', text: 'Y aquí tienes el listado de todos los equipos. Cada tarjeta muestra el escudo, nombre, horario de entrenamientos y número de jugadores. Pulsa en una para abrir el calendario y el detalle.' },
  { file: 'equipos_08.mp3', text: 'Ya conoces la pantalla de equipos. Usa las acciones superiores para importar, invitar o crear equipos, y pulsa en cualquier tarjeta para ver su calendario.' },

  // ── Documentos del club ───────────────────────────────────────────────────
  { file: 'docs_01.mp3', text: 'Aquí almacenas y organizas toda la documentación del club: autorizaciones, fichas médicas, contratos y formularios personalizados. Puedes subir documentos, solicitarlos y hacer seguimiento de las entregas.' },
  { file: 'docs_02.mp3', text: 'Antes de continuar, recuerda que este botón te devuelve al inicio del dashboard cuando lo necesites.' },
  { file: 'docs_03.mp3', text: 'La pantalla tiene dos pestañas. Cambia entre la documentación de jugadores y la de entrenadores; cada una muestra los documentos y el estado de entrega correspondiente.' },
  { file: 'docs_04.mp3', text: 'En la parte superior tienes las tres acciones disponibles. Subir documento añade un archivo al club, Solicitar documento exige la entrega a jugadores o entrenadores, y Crear formulario diseña un formulario personalizado con campos a rellenar.' },
  { file: 'docs_05.mp3', text: 'También puedes buscar documentos por nombre o descripción y filtrar por equipo. El contador muestra cuántos documentos hay en la lista actual.' },
  { file: 'docs_06.mp3', text: 'Y aquí ves la tabla completa. Cada fila muestra el estado de completado, equipos asignados, nombre, descripción y fecha. Desde las acciones puedes ver visibilidad, solicitar subida, editar, abrir el archivo o eliminar.' },
  { file: 'docs_07.mp3', text: 'Ya conoces la pantalla de documentos. Usa las acciones superiores para subir, solicitar o crear formularios, y la tabla para revisar y gestionar cada documento.' },

  // ── Gestión de Cuotas ─────────────────────────────────────────────────────
  { file: 'cuotas_01.mp3', text: 'En esta pantalla gestionas todos los pagos y cuotas del club: configuración de pagos, Stripe, historial, Sphaira Pay, cuenta bancaria y notificaciones. Tendrás el resumen de cobros y el listado completo de jugadores con su estado de pago.' },
  { file: 'cuotas_02.mp3', text: 'Antes de continuar, recuerda que este botón te devuelve al inicio del dashboard cuando lo necesites.' },
  { file: 'cuotas_03.mp3', text: 'Empecemos por las acciones rápidas. Pagos configura las cuotas del club, Stripe conecta tu cuenta para cobros online, Historial muestra todos los movimientos, y también tienes Sphaira Pay, datos de Banco y Notificaciones de pago.' },
  { file: 'cuotas_04.mp3', text: 'A continuación tienes el resumen. Las tarjetas muestran el total de jugadores, el importe a cobrar, lo ya cobrado con su barra de progreso y el importe pendiente. Te dan una visión rápida del estado de las cuotas.' },
  { file: 'cuotas_05.mp3', text: 'Para encontrar un jugador concreto, busca por nombre o filtra por tipo de cuota. El filtro permite ver solo los jugadores de una o varias cuotas específicas.' },
  { file: 'cuotas_06.mp3', text: 'Y aquí tienes el listado completo. Cada fila muestra nombre, equipo, estado, total a pagar, pagado, restante y progreso por cuota. Desde las acciones puedes editar, registrar un pago o ver el historial del jugador.' },
  { file: 'cuotas_07.mp3', text: 'Ya conoces la gestión de cuotas. Usa la barra superior para configurar pagos y Stripe, y la tabla para revisar y registrar cobros por jugador.' },

  // ── Gestión de Ropa ───────────────────────────────────────────────────────
  { file: 'ropa_01.mp3', text: 'Aquí gestionas la equipación del club: el catálogo de prendas, las tallas disponibles y la tabla de tallas por jugador. Los padres pueden indicar las tallas de sus hijos y el club recibe esa información directamente aquí.' },
  { file: 'ropa_02.mp3', text: 'Antes de continuar, recuerda que este botón te devuelve al inicio del dashboard cuando lo necesites.' },
  { file: 'ropa_03.mp3', text: 'Fíjate en el selector de temporada. Cámbialo para ver y editar las tallas del catálogo y de los jugadores del curso correspondiente.' },
  { file: 'ropa_04.mp3', text: 'La pantalla tiene tres pestañas. Tallas catálogo gestiona las tallas disponibles, Catálogo de prendas define las prendas del club con sus imágenes, y Tallas jugadores muestra la tabla clásica con las tallas de cada jugador.' },
  { file: 'ropa_05.mp3', text: 'En la primera pestaña ves la tabla de tallas del catálogo: cada prenda con las tallas disponibles. Puedes editar las tallas y gestionar el contenido que verán los jugadores desde la app.' },
  { file: 'ropa_06.mp3', text: 'Si pulsas en la segunda pestaña, accedes al catálogo de prendas: define las prendas disponibles y sube las imágenes de cada una para que los jugadores y padres las vean directamente en la app.' },
  { file: 'ropa_07.mp3', text: 'En cada pestaña puedes exportar el contenido a Excel y personalizar las columnas visibles según lo que necesites consultar.' },
  { file: 'ropa_08.mp3', text: 'Ya conoces la gestión de ropa. Cambia de pestaña para trabajar con el catálogo, subir imágenes de las prendas o revisar las tallas de los jugadores.' },

  // ── Patrocinadores ────────────────────────────────────────────────────────
  { file: 'patro_01.mp3', text: 'En esta pantalla gestionas los patrocinadores del club. Añade el logo, nombre, descripción y datos de contacto de cada uno para que todos los miembros del club los vean y puedas darles la visibilidad que merecen.' },
  { file: 'patro_02.mp3', text: 'Antes de continuar, recuerda que este botón te devuelve al inicio del dashboard cuando lo necesites.' },
  { file: 'patro_03.mp3', text: 'Empecemos por el carrusel de logos. Los patrocinadores con visibilidad activada aparecen aquí. Cualquier usuario del club puede hacer clic en un logo para ver la ficha completa del patrocinador.' },
  { file: 'patro_04.mp3', text: 'Para añadir un nuevo patrocinador, pulsa aquí. Sube el logo, rellena nombre, descripción, web, email y teléfono para que los miembros del club puedan conocerlo. Después podrás activar o desactivar su aparición en el carrusel.' },
  { file: 'patro_05.mp3', text: 'Y aquí ves las fichas de todos los patrocinadores registrados. Cada tarjeta muestra logo, nombre, descripción, contacto y beneficios. Puedes ver la ficha completa, controlar su visibilidad o eliminarlo.' },
  { file: 'patro_06.mp3', text: 'Ya conoces la pantalla de patrocinadores. Usa el botón Nuevo para añadir patrocinadores y las tarjetas para editar o gestionar su visibilidad.' },

  // ── Notificaciones ────────────────────────────────────────────────────────
  { file: 'notif_01.mp3', text: 'Desde aquí envías y gestionas las notificaciones del club. Tienes bandeja de entrada, enviados y mensajes programados. Puedes redactar mensajes a jugadores, entrenadores o equipos completos, y programar envíos para más tarde.' },
  { file: 'notif_02.mp3', text: 'Antes de continuar, recuerda que este botón te devuelve al inicio del dashboard cuando lo necesites.' },
  { file: 'notif_03.mp3', text: 'Empecemos por el botón principal: Redactar. Abre el formulario para escribir una nueva notificación; elige destinatarios, asunto y cuerpo, y decide si envías al momento o programas el envío.' },
  { file: 'notif_04.mp3', text: 'A la izquierda tienes las tres bandejas. Entrada muestra los mensajes recibidos con el contador de no leídos, Enviados los que ya has mandado, y Programados los que tienen un envío futuro planificado.' },
  { file: 'notif_05.mp3', text: 'En la parte superior puedes buscar mensajes por remitente, asunto o contenido. Si tienes mensajes sin leer, el botón Marcar todo como leído los marca de una sola vez.' },
  { file: 'notif_06.mp3', text: 'Además puedes filtrar los mensajes de entrada por Todos, Leídos o No leídos. Muy útil para localizar rápidamente los pendientes de leer.' },
  { file: 'notif_07.mp3', text: 'Y aquí ves la lista de mensajes. Cada fila muestra remitente, asunto y fecha; los no leídos tienen un indicador visual. Pulsa en uno para abrirlo en el panel de lectura.' },
  { file: 'notif_08.mp3', text: 'Al seleccionar un mensaje verás aquí el asunto, remitente, fecha y el cuerpo completo. En móvil puedes volver atrás para ver de nuevo la lista.' },
  { file: 'notif_09.mp3', text: 'Ya conoces la gestión de notificaciones. Usa Redactar para enviar mensajes, cambia de bandeja en el menú lateral y aprovecha la búsqueda y los filtros para encontrar lo que necesitas.' },

  // ── Gestión de Staff ──────────────────────────────────────────────────────
  { file: 'staff_01.mp3', text: 'Aquí creas y gestionas los usuarios con acceso al panel del club. Cada usuario Staff tiene permisos por módulo: jugadores, estadísticas, calendario, documentos, pagos y más. Puedes habilitar o deshabilitar el acceso y editar los permisos en cualquier momento.' },
  { file: 'staff_02.mp3', text: 'Antes de continuar, recuerda que este botón te devuelve al inicio del dashboard cuando lo necesites.' },
  { file: 'staff_03.mp3', text: 'En la parte superior ves el número de usuarios Staff y el botón Nuevo Staff para crear uno nuevo. Al crearlo indicarás nombre, apellidos, email, contraseña y los módulos a los que tendrá acceso.' },
  { file: 'staff_04.mp3', text: 'Y aquí ves las tarjetas de todos los usuarios Staff. Cada una muestra identidad, estado Activo o Inhabilitado, el interruptor de acceso y los permisos asignados. Desde las acciones puedes editar permisos o eliminar al usuario.' },
  { file: 'staff_05.mp3', text: 'Fíjate en cada tarjeta: verás nombre, email y el badge de estado. El interruptor Acceso habilita o deshabilita el panel con confirmación, y los chips muestran los módulos a los que tiene acceso ese usuario.' },
  { file: 'staff_06.mp3', text: 'Ya conoces la gestión de Staff. Crea usuarios con Nuevo Staff, asigna solo los módulos que necesiten y usa el interruptor de acceso para activar o desactivar sin borrar al usuario.' },

  // ── Scouting del club ─────────────────────────────────────────────────────
  { file: 'scout_01.mp3', text: 'Aquí gestionas la lista de jugadores en observación: tu watchlist, el pipeline por estados y la opción de comparar jugadores. Puedes añadir jugadores externos, evaluarlos y generar informes con IA.' },
  { file: 'scout_02.mp3', text: 'Antes de continuar, recuerda que este botón te devuelve al inicio del dashboard cuando lo necesites.' },
  { file: 'scout_03.mp3', text: 'Empecemos por la configuración del módulo. Desde aquí activas o desactivas el Pipeline, los informes y la comparativa de jugadores. Los cambios se aplican al guardar.' },
  { file: 'scout_04.mp3', text: 'La pantalla tiene dos vistas. La lista de seguimiento muestra todos los jugadores en observación con filtros y búsqueda, y el Pipeline presenta una vista por columnas para mover jugadores entre fases.' },
  { file: 'scout_05.mp3', text: 'En la lista de seguimiento puedes buscar por nombre, filtrar por estado del pipeline, añadir jugadores externos con Añadir externo, y activar el modo comparación para elegir hasta cuatro jugadores y compararlos.' },
  { file: 'scout_06.mp3', text: 'Aquí ves a todos los jugadores en observación. Cada fila muestra nombre, edad, posición, equipo, estado, valoración media y acciones para ver la ficha, añadir una evaluación o quitar de la lista.' },
  { file: 'scout_07.mp3', text: 'Y si tienes el pipeline activado, verás columnas por estado: Identificado, Observado, Evaluado, Contactado y más. Arrastra o usa las flechas para mover jugadores entre fases. Los descartados se agrupan en una sección separada y puedes restaurarlos.' },
  { file: 'scout_08.mp3', text: 'Ya conoces el módulo de Scouting. Usa la watchlist para evaluar jugadores, el pipeline para organizar por fase y la comparativa para analizar varios a la vez.' },

  // ── Biblioteca de Vídeos ──────────────────────────────────────────────────
  { file: 'videos_01.mp3', text: 'Aquí gestionas todos los vídeos del club: sube archivos desde tu equipo, importa desde Google Drive, añade enlaces de YouTube o Vimeo y organízalos en carpetas por temporada.' },
  { file: 'videos_02.mp3', text: 'Antes de continuar, recuerda que este botón te devuelve al dashboard del club cuando lo necesites.' },
  { file: 'videos_03.mp3', text: 'Empecemos por las acciones del header. Gestionar plan o Contratar almacenamiento abre los planes disponibles. Subir vídeo sube un archivo desde tu equipo, Importar desde Drive trae vídeos de Google Drive, y Añadir enlace agrega una URL de YouTube o Vimeo sin consumir espacio.' },
  { file: 'videos_04.mp3', text: 'Justo debajo ves el estado de tu almacenamiento: plan activo, espacio usado y límite total. Si no tienes plan, aparecerá un banner para contratar almacenamiento.' },
  { file: 'videos_05.mp3', text: 'A la izquierda tienes el organizador de carpetas. Puedes ver todos los vídeos, los que no tienen carpeta, o las carpetas que hayas creado. El botón de personas sincroniza carpetas por equipo y el de carpeta más crea una nueva.' },
  { file: 'videos_06.mp3', text: 'Para encontrar un vídeo concreto, busca por título, jugador o etiqueta. Si tienes una carpeta seleccionada, aparece un breadcrumb que puedes quitar para ver todos los vídeos de nuevo.' },
  { file: 'videos_07.mp3', text: 'Y aquí tienes todos tus vídeos. Cada tarjeta muestra miniatura, título, jugador, carpeta, etiquetas y fecha. Desde las acciones puedes reproducir, exportar a Drive, analizar el vídeo, moverlo de carpeta o eliminarlo.' },
  { file: 'videos_08.mp3', text: 'Ya conoces la Biblioteca de Vídeos. Sube o enlaza vídeos, organízalos en carpetas y usa Analizar vídeo para etiquetar jugadas en el módulo de Análisis de Vídeo.' },

  // ── Análisis de Vídeo ─────────────────────────────────────────────────────
  { file: 'va_01.mp3', text: 'Desde aquí creas y gestionas proyectos de etiquetado de vídeo. Subes un archivo local, eliges una plantilla de categorías, etiquetas jugadas y creas playlists que puedes compartir con el equipo.' },
  { file: 'va_02.mp3', text: 'Antes de continuar, recuerda que este botón te devuelve al dashboard cuando lo necesites.' },
  { file: 'va_03.mp3', text: 'Empecemos por las acciones rápidas. Plantillas gestiona las categorías de etiquetado, Playlists crea y comparte listas de clips, y Biblioteca enlaza con la Biblioteca de Vídeos del club.' },
  { file: 'va_04.mp3', text: 'Las tarjetas de estado te permiten filtrar la lista de proyectos. Pulsa en Total, En progreso, Completados o Borradores para ver solo los análisis en ese estado.' },
  { file: 'va_05.mp3', text: 'En la barra de proyectos tienes el contador de análisis, la búsqueda por título y el botón Nuevo análisis para crear un proyecto: título, descripción, archivo de vídeo local y plantilla.' },
  { file: 'va_06.mp3', text: 'Y aquí ves todos tus proyectos de análisis. Cada tarjeta muestra el estado, título, descripción, origen del vídeo y fecha. Pulsa en una tarjeta para abrir el workspace de etiquetado.' },
  { file: 'va_07.mp3', text: 'Crea tu primer análisis con Nuevo análisis, configura tus plantillas si hace falta, y abre un proyecto para etiquetar jugadas y crear clips.' },

  // ── Asistente IA ──────────────────────────────────────────────────────────
  { file: 'asistente_01.mp3', text: 'Este es el chat de inteligencia artificial del club. Haz preguntas, pide resúmenes o que ejecute acciones como consultar datos o crear elementos. Cada mensaje consume créditos; el saldo se muestra en la cabecera.' },
  { file: 'asistente_02.mp3', text: 'Antes de continuar, recuerda que este botón te devuelve al dashboard cuando lo necesites.' },
  { file: 'asistente_03.mp3', text: 'A la izquierda tienes el historial de conversaciones anteriores. El botón más inicia una nueva conversación; pulsa en una entrada para cargarla, y la papelera la elimina.' },
  { file: 'asistente_04.mp3', text: 'Este botón abre o cierra el panel del historial para ganar espacio en pantalla cuando lo necesites.' },
  { file: 'asistente_05.mp3', text: 'En la cabecera del chat ves el título del asistente, el indicador de estado y los créditos disponibles. Pulsa en los créditos para ver detalles o comprar más.' },
  { file: 'asistente_06.mp3', text: 'Aquí se van mostrando tus mensajes y las respuestas del asistente. Las respuestas pueden incluir acciones que debes confirmar o cancelar. El asistente mostrará un indicador mientras genera la respuesta.' },
  { file: 'asistente_07.mp3', text: 'Para empezar rápido, al iniciar una conversación verás chips de sugerencias con preguntas o tareas frecuentes. Pulsa en uno para enviarlo directamente y obtener una respuesta inmediata.' },
  { file: 'asistente_08.mp3', text: 'Y para escribir tu consulta, usa el área de texto y pulsa Enviar o Intro. Si admite voz, el micrófono te permite dictar. Durante la respuesta puedes cancelar con el botón X.' },
  { file: 'asistente_09.mp3', text: 'Ya conoces el Asistente IA. Usa las sugerencias o escribe libremente, revisa tus créditos y confirma las acciones que el asistente te proponga.' },

  // ── Info Jugadores ────────────────────────────────────────────────────────
  { file: 'ij_01.mp3', text: 'Aquí consultas y gestionas el perfil de cada jugador del club: datos personales, padre o madre, DNI, documentos y equipo asignado. Puedes mover jugadores de equipo, cambiar temporada, exportar a Excel y personalizar columnas.' },
  { file: 'ij_02.mp3', text: 'Antes de continuar, recuerda que este botón te devuelve al cuadro de mandos del club.' },
  { file: 'ij_03.mp3', text: 'Puedes también consultar el Asistente IA sobre el listado de jugadores con datos anonimizados: distribución por posición, por equipo, posiciones con déficit, jugadores sin dorsal y mucho más.' },
  { file: 'ij_04.mp3', text: 'En la barra superior tienes los controles. Busca por nombre o datos, filtra por equipo, exporta la tabla a Excel y personaliza los campos visibles con Campos personalizados.' },
  { file: 'ij_05.mp3', text: 'Y aquí ves la tabla completa de jugadores. Cada fila muestra foto, nombre, equipo con opciones de mover o cambiar temporada, fecha de nacimiento, teléfono, DNI, documentos, datos del padre o madre e IBAN.' },
  { file: 'ij_06.mp3', text: 'Al hacer clic en el nombre de un jugador se abre su ficha completa: información personal, datos financieros si aplica, documentos, DNI y campos personalizados.' },
  { file: 'ij_07.mp3', text: 'El panel del Asistente IA incluye sugerencias rápidas, historial de mensajes y un área de consulta. Pulsa Intro para enviar y Shift más Intro para añadir una nueva línea.' },
  { file: 'ij_08.mp3', text: 'Ya conoces Info Jugadores. Usa la búsqueda y los filtros, exporta a Excel, personaliza columnas y haz clic en cualquier nombre para ver la ficha completa.' },

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
  { file: 'ee_01.mp3', text: 'Aquí ves las métricas de rendimiento de todos los equipos del club: posición, partidos jugados, puntos, victorias, empates, derrotas, goles a favor y en contra y últimos resultados. Pulsa en un equipo para ver el detalle de sus partidos.' },
  { file: 'ee_02.mp3', text: 'Antes de continuar, recuerda que este botón te devuelve al cuadro de mandos del club.' },
  { file: 'ee_03.mp3', text: 'Para análisis más profundos, abre el panel IA y pregunta por el equipo con más victorias, la gráfica de puntos, el rendimiento general o la comparativa de goles entre equipos.' },
  { file: 'ee_04.mp3', text: 'En la cabecera tienes el número total de equipos y la leyenda de colores que indica Victoria, Empate o Derrota, para interpretar la columna de últimos resultados de cada equipo.' },
  { file: 'ee_05.mp3', text: 'Y aquí ves la tabla completa de equipos. Verás posición, categoría, partidos jugados, puntos, victorias, empates, derrotas, goles a favor, goles en contra, diferencia y última racha. Las tres primeras posiciones destacan con estilo podio.' },
  { file: 'ee_06.mp3', text: 'El panel del Asistente IA incluye sugerencias sobre estadísticas de equipos y un área de consulta para preguntas más específicas sobre el rendimiento del club.' },
  { file: 'ee_07.mp3', text: 'Ya conoces las estadísticas de equipos. Haz clic en cualquier equipo para ver el detalle de sus partidos en el modal.' },

  // ── Calendario Club ───────────────────────────────────────────────────────
  { file: 'cal_01.mp3', text: 'Aquí tienes la vista mensual de partidos y entrenamientos de todos los equipos del club. Filtra por equipo con los chips, navega entre meses y pulsa en un día o en un evento para ver el detalle.' },
  { file: 'cal_02.mp3', text: 'Antes de continuar, recuerda que este botón te devuelve al cuadro de mandos del club.' },
  { file: 'cal_03.mp3', text: 'Empecemos por el filtro de equipos. Cada chip corresponde a un equipo; el color y el icono de ojo indican si está visible. Pulsa en un chip para mostrarlo u ocultarlo, o usa los botones de mostrar y ocultar todos.' },
  { file: 'cal_04.mp3', text: 'Para navegar entre meses usa las flechas de anterior y siguiente. El botón Hoy te lleva directamente al mes actual.' },
  { file: 'cal_05.mp3', text: 'Y aquí tienes el calendario en sí. Los puntos de color indican eventos; los de forma de pesa son entrenamientos y los de forma de balón son partidos. Pulsa en una celda para abrir el panel del día.' },
  { file: 'cal_06.mp3', text: 'Al pulsar en cualquier día se abre el panel lateral con todos los eventos de ese día agrupados por equipo. Cada evento puede abrirse para ver sus detalles completos.' },
  { file: 'cal_07.mp3', text: 'Ya conoces el Calendario del club. Filtra los equipos que quieras ver, navega entre meses y pulsa en cualquier día o evento para acceder a todos los detalles.' },

  // ── Menú del equipo (club) ────────────────────────────────────────────────
  { file: 'mc_01.mp3', text: 'Desde aquí accedes a todas las secciones del equipo. Cada tarjeta te lleva a una pantalla distinta con información y herramientas específicas.' },
  { file: 'mc_02.mp3', text: 'Si en algún momento quieres volver atrás, este botón te lleva a la pantalla anterior.' },
  { file: 'mc_03.mp3', text: 'Empecemos por el Calendario: aquí ves todos los partidos y entrenamientos del equipo organizados por fecha.' },
  { file: 'mc_04.mp3', text: 'Continuamos con Jugadores, donde tienes el listado completo con la información de cada jugador del equipo.' },
  { file: 'mc_05.mp3', text: 'Después tienes las Estadísticas de jugadores: goles, asistencias, minutos y mucho más para analizar el rendimiento individual.' },
  { file: 'mc_06.mp3', text: 'Y también las Estadísticas del equipo, con los puntos acumulados, victorias, empates, derrotas y goles a favor y en contra.' },
  { file: 'mc_07.mp3', text: 'Pasamos a Ranking y resultados, donde consultas la clasificación actual y el historial de partidos del equipo.' },
  { file: 'mc_08.mp3', text: 'Siguiente, la Galería: fotos y momentos del equipo que puedes compartir con jugadores y familias.' },
  { file: 'mc_09.mp3', text: 'También tienes Info del equipo, con toda la información general: nombre, categoría, liga y horarios.' },
  { file: 'mc_10.mp3', text: 'Y para cerrar el menú, Lesiones: registra y haz seguimiento del estado de recuperación de los jugadores lesionados.' },
  { file: 'mc_11.mp3', text: 'Ya conoces todas las opciones del menú del equipo. Pulsa en cualquier tarjeta para entrar en esa sección cuando lo necesites.' },

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
  { file: 'me_18.mp3', text: 'Ya conoces todas las opciones del menú del entrenador. Tienes todo lo que necesitas para gestionar tu equipo en un solo lugar.' },

  // ── Opciones del jugador ──────────────────────────────────────────────────
  { file: 'oj_01.mp3', text: 'Desde aquí el jugador accede a todo lo que necesita: datos personales, calendario, cuotas, documentación, clasificación, estadísticas, galería, notificaciones, patrocinadores, lesiones y ropa.' },
  { file: 'oj_02.mp3', text: 'Si en algún momento quieres volver atrás, este botón te lleva a la pantalla anterior.' },
  { file: 'oj_03.mp3', text: 'Empecemos por los Datos personales: aquí el jugador consulta y edita su información personal como nombre, fecha de nacimiento, posición y contacto.' },
  { file: 'oj_04.mp3', text: 'Continuamos con el Calendario: el jugador ve todos sus entrenamientos y partidos organizados por fecha.' },
  { file: 'oj_05.mp3', text: 'Pasamos a Pagar cuotas, donde el jugador o la familia gestiona y abona las cuotas del club de forma segura.' },
  { file: 'oj_06.mp3', text: 'Siguiente, la Documentación: todos los archivos y documentos del jugador que el club puede solicitar.' },
  { file: 'oj_07.mp3', text: 'También tienes Clasificación y resultados: el jugador sigue la tabla de su equipo en la competición y consulta los últimos resultados.' },
  { file: 'oj_08.mp3', text: 'Pasamos a Mis estadísticas: goles, asistencias, minutos y otras métricas de rendimiento personal del jugador.' },
  { file: 'oj_09.mp3', text: 'Después, la Galería: fotos y momentos del equipo que el jugador puede ver y descargar.' },
  { file: 'oj_10.mp3', text: 'Seguimos con Notificaciones: mensajes y avisos del club y del entrenador dirigidos al jugador.' },
  { file: 'oj_11.mp3', text: 'También puedes ver los Patrocinadores del club: logos, información de contacto y beneficios que ofrecen a los jugadores.' },
  { file: 'oj_12.mp3', text: 'Y el registro de Lesiones: el jugador puede consultar su historial de lesiones y el estado de su recuperación.' },
  { file: 'oj_13.mp3', text: 'Y para cerrar, la Ropa del club: el catálogo de equipación y la opción de indicar las tallas para que el club lo gestione desde el panel.' },
  { file: 'oj_14.mp3', text: 'Ya conoces todas las opciones disponibles para el jugador. Todo lo que necesitas está a un solo toque de distancia.' }
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
