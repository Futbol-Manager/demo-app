import { getCurrentSeasonYear } from './season.utils';

/**
 * Utilidades de fechas para el modo demo.
 *
 * Los datos de ejemplo se escribieron para la temporada 2024/2025. Sin estas
 * funciones, un visitante que entra hoy ve cuotas y partidos de hace años y
 * percibe la plataforma como abandonada. Todas las fechas visibles de la demo
 * se desplazan a la temporada en curso, de modo que nunca vuelva a caducar.
 */

/** Año de inicio de la temporada con la que se escribieron los datos demo. */
const DEMO_BASE_SEASON_YEAR = 2024;

/** Nombres de mes en español para los títulos de cuotas y pagos. */
const MONTH_NAMES_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

/** Días de la semana en español, empezando en domingo (índice de Date.getDay()). */
const WEEKDAY_NAMES_ES = [
  'Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado',
];

/** Años que hay que sumar a los datos base para caer en la temporada en curso. */
export function demoYearShift(): number {
  return getCurrentSeasonYear() - DEMO_BASE_SEASON_YEAR;
}

/**
 * Desplaza una fecha ISO de los datos base a la temporada en curso.
 * Acepta 'YYYY-MM-DD' y 'YYYY-MM-DDTHH:mm:ss', y conserva el formato de entrada.
 * Si el día no existe en el año destino (29 de febrero), cae al último día del mes.
 */
export function demoDate(iso: string): string {
  if (!iso) return iso;
  const match = /^(\d{4})-(\d{2})-(\d{2})(.*)$/.exec(iso);
  if (!match) return iso;

  const [, yearRaw, monthRaw, dayRaw, rest] = match;
  const year = parseInt(yearRaw, 10) + demoYearShift();
  const month = parseInt(monthRaw, 10);
  const day = parseInt(dayRaw, 10);

  const lastDayOfMonth = new Date(year, month, 0).getDate();
  const safeDay = Math.min(day, lastDayOfMonth);

  return `${year}-${pad(month)}-${pad(safeDay)}${rest ?? ''}`;
}

/** Desplaza un plazo con formato 'YYYY-MM' (usado en las cuotas del jugador). */
export function demoPeriod(period: string): string {
  if (!period) return period;
  const match = /^(\d{4})-(\d{2})$/.exec(period);
  if (!match) return period;
  return `${parseInt(match[1], 10) + demoYearShift()}-${match[2]}`;
}

/** Desplaza un año suelto ('2025' → '2026'). */
export function demoYear(year: number | string): string {
  const parsed = typeof year === 'number' ? year : parseInt(year, 10);
  if (isNaN(parsed)) return String(year);
  return String(parsed + demoYearShift());
}

/** Temporada en curso con el separador indicado: '2026-2027' o '2026/2027'. */
export function demoSeasonLabel(separator: '-' | '/' = '-'): string {
  const start = getCurrentSeasonYear();
  return `${start}${separator}${start + 1}`;
}

/** Temporada en curso en formato corto: '2026/27'. */
export function demoSeasonShort(): string {
  const start = getCurrentSeasonYear();
  return `${start}/${String(start + 1).slice(-2)}`;
}

/** Etiqueta 'Mes Año' de una fecha base ya desplazada: '2025-03-01' → 'Marzo 2026'. */
export function demoMonthYearLabel(iso: string): string {
  return monthYearLabel(demoDate(iso));
}

/** Etiqueta 'Mes Año' de una fecha ISO tal cual: '2026-03-01' → 'Marzo 2026'. */
export function monthYearLabel(iso: string): string {
  const match = /^(\d{4})-(\d{2})/.exec(iso || '');
  if (!match) return iso;
  const monthName = MONTH_NAMES_ES[parseInt(match[2], 10) - 1] ?? '';
  return `${monthName} ${match[1]}`.trim();
}

/**
 * Primer día del mes actual desplazado en los meses indicados.
 * `demoMonthStart(0)` = mes en curso, `demoMonthStart(-1)` = mes anterior.
 */
export function demoMonthStart(offsetMonths = 0): string {
  const date = new Date();
  date.setDate(1);
  date.setMonth(date.getMonth() + offsetMonths);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-01`;
}

/** Fecha ISO del inicio de la temporada en curso (1 de septiembre). */
export function demoSeasonStart(): string {
  return `${getCurrentSeasonYear()}-09-01`;
}

/** Plazo 'YYYY-MM' del mes actual desplazado en los meses indicados. */
export function demoMonthPeriod(offsetMonths = 0): string {
  return demoMonthStart(offsetMonths).slice(0, 7);
}

/**
 * Año de la temporada en curso como string ('2026'), tal y como lo espera el
 * backend en los campos `temporada`.
 */
export function demoSeasonYear(): string {
  return String(getCurrentSeasonYear());
}

/** Fecha ISO de hoy desplazada en los días indicados (positivo = futuro). */
export function demoDateFromToday(offsetDays: number): string {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Fecha ISO del próximo sábado (para que el "próximo partido" siempre sea futuro). */
export function nextSaturdayIso(): string {
  const date = new Date();
  const daysUntilSaturday = (6 - date.getDay() + 7) % 7 || 7;
  date.setDate(date.getDate() + daysUntilSaturday);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Etiqueta legible de un día de partido: 'Sábado 15 mar 2026'. */
export function formatMatchDayLabel(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
  if (!match) return iso;
  const [, year, month, day] = match;
  const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
  const weekday = WEEKDAY_NAMES_ES[date.getDay()] ?? '';
  const monthShort = MONTH_NAMES_ES[parseInt(month, 10) - 1]?.slice(0, 3).toLowerCase() ?? '';
  return `${weekday} ${parseInt(day, 10)} ${monthShort} ${year}`.trim();
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}
