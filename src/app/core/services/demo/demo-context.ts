/**
 * Genera un bloque de contexto compacto con los datos hardcodeados del Club Demo
 * para inyectarlo como contexto en el chatbot del endpoint público /demo/chat.
 *
 * El backend (DemoChatService.java) lo añade al system prompt para que la IA
 * pueda responder preguntas específicas sobre jugadores, equipos, partidos, etc.
 */

// ── Datos internos duplicados (sin depender del servicio inyectable) ─────────

const FIRST_NAMES = ['Carlos', 'Miguel', 'Antonio', 'David', 'Pablo', 'Javier', 'Sergio', 'Álvaro', 'Diego', 'Daniel', 'Adrián', 'Marcos', 'Raúl', 'Iván', 'Roberto', 'Fernando', 'Andrés', 'Luis'];
const LAST_NAMES  = ['García', 'López', 'Ruiz', 'Martín', 'Sánchez', 'Pérez', 'González', 'Rodríguez', 'Fernández', 'Martínez', 'Jiménez', 'Gómez', 'Díaz', 'Moreno', 'Álvarez', 'Romero', 'Torres', 'Ramírez', 'Vargas', 'Castro', 'Reyes', 'Mora', 'Herrera', 'Medina', 'Silva', 'Ríos', 'Cabrera', 'Fuentes'];
const POSITIONS   = ['Portero','Portero','Defensa','Defensa','Defensa','Defensa','Lateral','Lateral','Centrocampista','Centrocampista','Centrocampista','Centrocampista','Centrocampista','Delantero','Delantero','Delantero','Delantero','Delantero'];

const TEAMS = [
  { teamId: 9001, name: 'Senior Demo',       category: 'Senior',      league: 'SuperLiga',        days: 'L/M/V', pts: 28 },
  { teamId: 9002, name: 'Juvenil Demo',       category: 'Juvenil',     league: 'SuperLiga',        days: 'M/J',   pts: 25 },
  { teamId: 9003, name: 'Cadete Demo',        category: 'Cadete',      league: 'Liga Cadete',      days: 'L/M',   pts: 22 },
  { teamId: 9004, name: 'Infantil Demo',      category: 'Infantil',    league: 'Liga Infantil',    days: 'M/J/S', pts: 19 },
  { teamId: 9005, name: 'Alevin Demo',        category: 'Alevín',      league: 'SuperLiga',        days: 'L/V',   pts: 17 },
  { teamId: 9006, name: 'Benjamín Demo',      category: 'Benjamín',    league: 'Liga Benjamín',    days: 'M/S',   pts: 15 },
  { teamId: 9007, name: 'Prebenjamín Demo',   category: 'Prebenjamín', league: 'Liga Prebenjamín', days: 'J/S',   pts: 12 },
  { teamId: 9008, name: 'Femenino Demo',      category: 'Femenino',    league: 'Liga Femenina',    days: 'L/M/V', pts: 10 },
];

const TRAINERS = ['Juan', 'María', 'Pedro', 'Laura', 'Francisco', 'Elena', 'Ricardo', 'Carmen'];

function buildPlayers(teamIndex: number): { dorsal: number; nombre: string; apellido: string; pos: string; pj: number; goles: number; asist: number }[] {
  const result = [];
  for (let p = 0; p < 18; p++) {
    const i     = teamIndex * 18 + p;
    const pos   = POSITIONS[p];
    const pj    = 14 + (p % 5);
    const goles = pos === 'Portero' ? 0 : pos === 'Delantero' ? 4 + (p % 8) : pos === 'Centrocampista' ? 1 + (p % 4) : (p % 2);
    const asist = pos === 'Portero' ? 0 : pos === 'Centrocampista' ? 3 + (p % 6) : pos === 'Delantero' ? (p % 4) : (p % 2);
    result.push({ dorsal: p + 1, nombre: FIRST_NAMES[i % FIRST_NAMES.length], apellido: LAST_NAMES[i % LAST_NAMES.length], pos, pj, goles, asist });
  }
  return result;
}

// ── Función pública ──────────────────────────────────────────────────────────

/**
 * Devuelve una cadena de texto compacta con los datos del club demo.
 * @param role   'club' | 'coach' | 'player'
 * @param teamId ID del equipo activo del entrenador (si role='coach')
 */
export function buildDemoClubContext(role: string, teamId = 9001): string {
  const lines: string[] = [];

  // Cabecera
  lines.push('=== DATOS REALES DEL CLUB DEMO (temporada 2024-2025) ===');
  lines.push('Club: Club Demo | clubId: 9001 | Temporada: 2024-2025');
  lines.push('');

  // Equipos + clasificación
  lines.push('EQUIPOS Y CLASIFICACIÓN (12 PJ por equipo):');
  TEAMS.forEach((t, i) => {
    const trainer = TRAINERS[i];
    lines.push(`  ${i + 1}º ${t.name} | ${t.league} | Entrenador: ${trainer} | Entrena: ${t.days} | ${t.pts} pts`);
  });
  lines.push('');

  // Plantilla detallada del equipo activo
  const activeTeamIndex = Math.max(0, TEAMS.findIndex(t => t.teamId === teamId));
  const activeTeam = TEAMS[activeTeamIndex];
  const players = buildPlayers(activeTeamIndex);

  lines.push(`PLANTILLA COMPLETA — ${activeTeam.name} (18 jugadores):`);
  lines.push('  Dorsal | Nombre | Posición | PJ | G | A');
  players.forEach(pl => {
    lines.push(`  #${pl.dorsal} ${pl.nombre} ${pl.apellido} | ${pl.pos} | PJ:${pl.pj} G:${pl.goles} A:${pl.asist}`);
  });
  lines.push('');

  // Si es club, añadir resumen de otros equipos (solo goleadores top)
  if (role === 'club') {
    lines.push('GOLEADORES DESTACADOS (otros equipos):');
    TEAMS.forEach((t, i) => {
      if (t.teamId === teamId) return;
      const ps = buildPlayers(i);
      const top = [...ps].sort((a, b) => b.goles - a.goles).slice(0, 2);
      top.forEach(p => lines.push(`  ${t.name}: ${p.nombre} ${p.apellido} ${p.goles} goles`));
    });
    lines.push('');
  }

  // Lesiones activas
  lines.push('LESIONES ACTIVAS (club completo):');
  lines.push('  - Carlos García (#1, Portero, Senior Demo) — Esguince tobillo grado I — BAJA');
  lines.push('  - David Martín (Juvenil Demo) — Sobrecarga en gemelo — EN RECUPERACIÓN');
  lines.push('  - Javier Sánchez (Cadete Demo) — Contractura isquiotibial — ALTA (recuperado)');
  lines.push('  - Miguel López (#2, Portero, Senior Demo) — Contusión muscular muslo — ALTA (recuperado)');
  lines.push('');

  // Próximos partidos
  const today = new Date();
  const fmtDate = (offset: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + offset);
    return d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  };
  lines.push('PRÓXIMOS PARTIDOS:');
  lines.push(`  - ${activeTeam.name} vs Club Norte | ${fmtDate(5)} 18:00 | Local | Liga`);
  lines.push(`  - ${activeTeam.name} vs Escuela Sur | ${fmtDate(12)} 11:00 | Visitante | Copa`);
  lines.push('');

  // Últimos resultados
  lines.push(`ÚLTIMOS RESULTADOS — ${activeTeam.name}:`);
  lines.push('  - VICTORIA 2-1 vs Club Norte (local) — Liga');
  lines.push('  - EMPATE 1-1 vs Escuela Sur (visitante) — Liga');
  lines.push('  - DERROTA 1-3 vs Atlético Este (visitante) — Liga');
  lines.push('  - VICTORIA 3-0 vs Deportivo Centro (local) — Liga');
  lines.push('  - VICTORIA 2-1 vs Rival Oeste (local) — Liga');
  lines.push('');

  // Próximos entrenamientos
  lines.push('PRÓXIMOS ENTRENAMIENTOS:');
  lines.push(`  - ${fmtDate(2)} 10:00-11:30 | Campo 1 | Objetivo: Técnica`);
  lines.push(`  - ${fmtDate(4)} 18:00-19:30 | Campo 1 | Objetivo: Táctica`);
  lines.push('');

  // Staff
  lines.push('STAFF DEL CLUB:');
  lines.push('  - Laura Coordinadora (activa) — gestión jugadores, pagos, documentos');
  lines.push('  - Pedro Marketing (activo) — patrocinadores, notificaciones, vídeo');
  lines.push('  - Marta Administración (inactiva) — equipos, pagos, ERP');
  lines.push('');

  // Cuotas
  lines.push('PAGOS Y CUOTAS (temporada 2024-2025):');
  lines.push('  Cuota mensual: 45 €/jugador | Inscripción: 120 € | Equipación: 65 €');
  lines.push('  Estado: ~65% de jugadores al corriente de pago, 25% pendiente, 10% completado');
  lines.push('');

  lines.push('=== FIN DATOS DEL CLUB ===');

  return lines.join('\n');
}
