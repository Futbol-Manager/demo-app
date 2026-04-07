import { Injectable } from '@angular/core';

/**
 * Datos hardcodeados para el modo demo (rama demo-app).
 * Cada método devuelve la misma estructura que el endpoint real para que las pantallas
 * funcionen sin llamar a la API.
 */
/** Nombres y apellidos para generar 144 deportistas (8 equipos x 18). */
const DEMO_FIRST_NAMES = ['Carlos', 'Miguel', 'Antonio', 'David', 'Pablo', 'Javier', 'Sergio', '\u00c1lvaro', 'Diego', 'Daniel', 'Adri\u00e1n', 'Marcos', 'Ra\u00fal', 'Iv\u00e1n', 'Roberto', 'Fernando', 'Andr\u00e9s', 'Luis'];
const DEMO_LAST_NAMES = ['Garc\u00eda', 'L\u00f3pez', 'Ruiz', 'Mart\u00edn', 'S\u00e1nchez', 'P\u00e9rez', 'Gonz\u00e1lez', 'Rodr\u00edguez', 'Fern\u00e1ndez', 'Mart\u00ednez', 'Jim\u00e9nez', 'G\u00f3mez', 'D\u00edaz', 'Moreno', '\u00c1lvarez', 'Romero', 'Torres', 'Ram\u00edrez', 'Vargas', 'Castro', 'Reyes', 'Mora', 'Herrera', 'Medina', 'Silva', 'R\u00edos', 'Cabrera', 'Fuentes'];
/** Posiciones f\u00fatbol: 2 PT, 4 DEF, 2 LAT, 5 MED, 5 DEL */
const DEMO_POSITIONS_FOOTBALL = ['Portero', 'Portero', 'Defensa', 'Defensa', 'Defensa', 'Defensa', 'Lateral', 'Lateral', 'Centrocampista', 'Centrocampista', 'Centrocampista', 'Centrocampista', 'Centrocampista', 'Delantero', 'Delantero', 'Delantero', 'Delantero', 'Delantero'];
/** Posiciones baloncesto: 3 Bases, 4 Escoltas, 4 Aleros, 3 Ala-p\u00edvots, 4 P\u00edvots */
const DEMO_POSITIONS_BASKETBALL = ['Base', 'Base', 'Base', 'Escolta', 'Escolta', 'Escolta', 'Escolta', 'Alero', 'Alero', 'Alero', 'Alero', 'Ala-p\u00edvot', 'Ala-p\u00edvot', 'Ala-p\u00edvot', 'P\u00edvot', 'P\u00edvot', 'P\u00edvot', 'P\u00edvot'];
/** Posiciones atletismo (especialidades) */
const DEMO_POSITIONS_ATHLETICS = ['Velocidad 100m', 'Velocidad 100m', 'Velocidad 200m', 'Velocidad 200m', 'Velocidad 400m', 'Velocidad 400m', 'Medio fondo 800m', 'Medio fondo 1500m', 'Fondo 5000m', 'Fondo 10000m', 'Salto de altura', 'Salto de longitud', 'Salto con p\u00e9rtiga', 'Lanzamiento de peso', 'Lanzamiento de disco', 'Lanzamiento de jabalina', 'Triple salto', 'Marcha atlética'];
/** Posiciones para equipos femeninos (f\u00fatbol) */
const DEMO_POSITIONS_FEMALE = DEMO_POSITIONS_FOOTBALL;
/** Pierna/mano natural */
const DEMO_PIERNA = ['Derecha', 'Izquierda', 'Derecha', 'Izquierda', 'Ambidiestro', 'Derecha', 'Izquierda', 'Derecha', 'Izquierda', 'Derecha', 'Ambidiestro', 'Izquierda', 'Derecha', 'Izquierda', 'Derecha', 'Izquierda', 'Derecha', 'Ambidiestro'];

/** Equipos del Club Deportivo Sphaira — club multideportivo con f\u00fatbol, baloncesto y atletismo */
const DEMO_TEAMS_META: { teamId: number; name: string; category: string; levelLeague: string; trainingDays: string; sport: string }[] = [
  { teamId: 9001, name: 'F\u00fatbol Senior', category: 'Senior', levelLeague: '3\u00aa Divisi\u00f3n Auton\u00f3mica', trainingDays: 'L:18:00-20:00,X:18:00-20:00,V:18:00-20:00', sport: 'futbol' },
  { teamId: 9002, name: 'F\u00fatbol Juvenil A', category: 'Juvenil', levelLeague: 'Divisi\u00f3n de Honor Juvenil', trainingDays: 'M:17:00-18:30,J:17:00-18:30,S:10:00-11:30', sport: 'futbol' },
  { teamId: 9003, name: 'F\u00fatbol Cadete A', category: 'Cadete', levelLeague: 'Liga Cadete Preferente', trainingDays: 'L:17:30-19:00,X:17:30-19:00,S:10:00-11:30', sport: 'futbol' },
  { teamId: 9004, name: 'F\u00fatbol Infantil A', category: 'Infantil', levelLeague: 'Liga Infantil 1\u00aa Divisi\u00f3n', trainingDays: 'M:17:30-19:00,J:17:30-19:00,S:10:00-11:00', sport: 'futbol' },
  { teamId: 9005, name: 'Baloncesto Senior', category: 'Senior', levelLeague: 'Liga EBA', trainingDays: 'L:19:00-21:00,X:19:00-21:00,V:19:00-21:00', sport: 'baloncesto' },
  { teamId: 9006, name: 'Baloncesto Sub-18', category: 'Sub-18', levelLeague: 'Liga Nacional Junior', trainingDays: 'M:18:00-19:30,J:18:00-19:30,S:11:00-12:30', sport: 'baloncesto' },
  { teamId: 9007, name: 'Atletismo Absoluta', category: 'Absoluta', levelLeague: 'Liga Auton\u00f3mica de Atletismo', trainingDays: 'M:17:00-19:00,J:17:00-19:00,S:09:00-11:00', sport: 'atletismo' },
  { teamId: 9008, name: 'F\u00fatbol Femenino', category: 'Femenino Senior', levelLeague: '1\u00aa Auton\u00f3mica Femenina', trainingDays: 'L:20:00-21:30,X:20:00-21:30,V:20:00-21:30', sport: 'futbol' },
];

/** Devuelve las posiciones correspondientes al deporte del equipo */
function getDemoPositionsByTeam(teamIndex: number): string[] {
  const sport = DEMO_TEAMS_META[teamIndex]?.sport ?? 'futbol';
  if (sport === 'baloncesto') return DEMO_POSITIONS_BASKETBALL;
  if (sport === 'atletismo') return DEMO_POSITIONS_ATHLETICS;
  return DEMO_POSITIONS_FOOTBALL;
}

const PLAYERS_PER_TEAM = 18;
const TEAMS_COUNT = 8;

function demoPlayerId(teamIndex: number, playerIndex: number): number {
  return 8001 + teamIndex * PLAYERS_PER_TEAM + playerIndex;
}

/** Obtiene un jugador demo por su playerId (8001..8144) o null si no existe */
function getDemoPlayerById(playerId: number): any | null {
  const base = 8001;
  const idx = playerId - base;
  if (idx < 0 || idx >= TEAMS_COUNT * PLAYERS_PER_TEAM) return null;
  const teamIndex = Math.floor(idx / PLAYERS_PER_TEAM);
  const meta = DEMO_TEAMS_META[teamIndex];
  const players = buildDemoPlayersForTeam(meta.teamId, teamIndex, meta.name);
  return players[idx % PLAYERS_PER_TEAM] || null;
}

function buildDemoPlayersForTeam(teamId: number, teamIndex: number, nameTeam: string): any[] {
  const players: any[] = [];
  const positions = getDemoPositionsByTeam(teamIndex);
  for (let p = 0; p < PLAYERS_PER_TEAM; p++) {
    const playerId = demoPlayerId(teamIndex, p);
    const i = teamIndex * PLAYERS_PER_TEAM + p;
    const nombre = DEMO_FIRST_NAMES[i % DEMO_FIRST_NAMES.length];
    const apellido = DEMO_LAST_NAMES[i % DEMO_LAST_NAMES.length];
    const pos = positions[p];
    const dorsal = p + 1;
    const añoNac = 1990 + (i % 18);
    const mesNac = 1 + (i % 12);
    const diaNac = 1 + (i % 28);
    const fechaDeNacimiento = `${añoNac}-${String(mesNac).padStart(2, '0')}-${String(diaNac).padStart(2, '0')}`;
    const piernaNatural = DEMO_PIERNA[p];
    const partidosJugados = 14 + (p % 5);
    const goles = pos === 'Portero' ? 0 : pos === 'Delantero' ? 4 + (p % 8) : pos === 'Centrocampista' ? 1 + (p % 4) : (p % 2);
    const asistencias = pos === 'Portero' ? 0 : pos === 'Centrocampista' ? 3 + (p % 6) : pos === 'Delantero' ? (p % 4) : (p % 2);
    const minutos = partidosJugados * (75 + (p % 15));
    const porteroVal = pos === 'Portero' ? 75 + (p % 15) : 0;
    const tiroVal = pos === 'Delantero' ? 78 + (p % 15) : pos === 'Centrocampista' ? 65 + (p % 15) : 45 + (p % 20);
    const paseVal = pos === 'Centrocampista' ? 82 + (p % 12) : pos === 'Lateral' ? 72 + (p % 12) : 60 + (p % 20);
    const defensaVal = (pos === 'Defensa' || pos === 'Lateral') ? 75 + (p % 15) : 40 + (p % 25);
    players.push({
      playerId,
      firstName: nombre,
      secondName: apellido,
      nombre,
      apellido,
      dorsal,
      position: pos,
      posicion: pos,
      fechaDeNacimiento,
      piernaNatural,
      nameTeam,
      teamId,
      telefono: '600' + String(100000 + playerId).slice(-6),
      email: `${nombre.toLowerCase()}.${apellido.toLowerCase()}@demo.com`,
      dni: String(10000000 + playerId) + 'A',
      emailPadre: `padre${playerId}@demo.com`,
      habilidadConBalon: Math.min(90, 55 + (playerId % 35)),
      pase: paseVal,
      tiro: tiroVal,
      defensa: defensaVal,
      fisico: 70 + (p % 20),
      mentalidad: 72 + (p % 18),
      portero: porteroVal,
      partidosJugados,
      goles,
      asistencias,
      minutos,
      picturePlayer: 'demo-player-' + (1 + (playerId % 4)) + '.jpg',
    });
  }
  return players;
}

@Injectable({
  providedIn: 'root'
})
export class DemoDataService {

  /** Lista de equipos demo para el dashboard / inicio (response.data.teams) — 8 equipos con logo del club */
  static getDemoTeams(): any[] {
    return DEMO_TEAMS_META.map((t) => ({
      teamId: t.teamId,
      name: t.name,
      levelLeague: t.levelLeague,
      trainingDays: t.trainingDays,
      category: t.category,
      sport: t.sport,
      jugadoresPorEquipo: PLAYERS_PER_TEAM,
      userId: 1,
      imgClub: 'demo-club-logo.png',
    }));
  }

  /** Objeto data completo para getTeams (data.teams + data.picture) */
  static getDemoTeamsResponseData(): any {
    return {
      teams: DemoDataService.getDemoTeams(),
      picture: 'demo-club-logo.png'
    };
  }

  /** Un solo equipo por ID (getTeamById). Incluye clubId y logo del club. */
  static getDemoTeamById(teamId?: string): any {
    const id = teamId ? parseInt(teamId, 10) : 9001;
    const meta = DEMO_TEAMS_META.find(t => t.teamId === id) || DEMO_TEAMS_META[0];
    return {
      teamId: meta.teamId,
      name: meta.name,
      nameCompleteTeam: meta.name,
      levelLeague: meta.levelLeague,
      trainingDays: meta.trainingDays,
      category: meta.category,
      sport: meta.sport,
      objectiveTeam: 'Competir en la liga y formar jugadores.',
      opinionTeam: 'Grupo muy comprometido.',
      categoryTypeId: 1,
      categoryType: { categoryTypeId: 1, year: 0, categoryName: meta.category },
      clubId: 9001,
      userId: 1,
      temporada: '2024-2025',
      dateCreate: '2024-09-01',
      dateUpdate: '2025-01-15',
      logoUrl: 'demo-club-logo.png',
      imgClub: 'demo-club-logo.png',
      jugadoresPorEquipo: PLAYERS_PER_TEAM,
    };
  }

  /** Datos de club demo (logo, nombre, etc.) */
  static getDemoClub(): any {
    return {
      clubId: 9001,
      name: 'CD Sphaira',
      fullName: 'Club Deportivo Sphaira Multideportivo',
      city: 'Valencia',
      provincia: 'Valencia',
      founded: '1987',
      sport: 'F\u00fatbol | Baloncesto | Atletismo',
      pictureClub: 'demo-club-logo.png',
      noPicture: false,
    };
  }

  /** Jugadores demo por equipo — 18 jugadores con posición y datos deportivos */
  static getDemoPlayersByTeam(teamId: number): any[] {
    const teamIndex = DEMO_TEAMS_META.findIndex(t => t.teamId === teamId);
    const idx = teamIndex >= 0 ? teamIndex : 0;
    const meta = DEMO_TEAMS_META[idx];
    const full = buildDemoPlayersForTeam(meta.teamId, idx, meta.name);
    return full.map(({ playerId, firstName, secondName, dorsal, position }) => ({ playerId, firstName, secondName, dorsal, position }));
  }

  /** Jugadores por equipo para pantalla Jugadores (getPlayers). 18 jugadores con habilidades para radar/scouting. */
  static getDemoPlayersByTeamForCoach(teamId?: string): any[] {
    const id = teamId ? parseInt(teamId, 10) : 9001;
    const teamIndex = DEMO_TEAMS_META.findIndex(t => t.teamId === id);
    const idx = teamIndex >= 0 ? teamIndex : 0;
    const meta = DEMO_TEAMS_META[idx];
    return buildDemoPlayersForTeam(meta.teamId, idx, meta.name).map(p => ({
      playerId: p.playerId, nombre: p.nombre, apellido: p.apellido, dorsal: p.dorsal, numero: p.dorsal, position: p.position, posicion: p.posicion,
      fechaDeNacimiento: p.fechaDeNacimiento, piernaNatural: p.piernaNatural,
      telefono: p.telefono, email: p.email, habilidadConBalon: p.habilidadConBalon, pase: p.pase, tiro: p.tiro, defensa: p.defensa,
      fisico: p.fisico, mentalidad: p.mentalidad, portero: p.portero, picturePlayer: p.picturePlayer,
    }));
  }

  /** Lista de usuarios/entrenadores del equipo (getUserListByTeam). response.data = array */
  static getDemoUserListByTeam(): any[] {
    return [
      { userId: 1, firstName: 'Juan', secondName: 'Demo', mail: 'entrenador@demo.com', profileType: { profileId: 2, profileName: 'Entrenador' } },
      { userId: 2, firstName: 'Ana', secondName: 'Ayudante', mail: 'ana@demo.com', profileType: { profileId: 2, profileName: 'Entrenador' } },
    ];
  }

  /** Jugador vinculado para inicio Player (getTeamByPlayer). response.data = array de hijos con teamId, playerId, nombre, apellido, dorsal, etc. */
  static getDemoTeamByPlayer(): any[] {
    const player = getDemoPlayerById(8001);
    return [
      {
        teamId: 9001,
        playerId: 8001,
        nombre: player?.nombre ?? 'Carlos',
        apellido: player?.apellido ?? 'García',
        dorsal: player?.dorsal ?? 1,
        picturePlayer: player?.picturePlayer ?? 'demo-player-1.jpg',
      },
    ];
  }

  /** Próximo partido para inicio Player (getListProximosPartidos). response.data = array, se usa el primero. */
  static getDemoProximosPartidos(): any[] {
    return [
      { name: 'Equipo Demo Senior vs Club Norte — Sábado 15 Mar 2025, 18:00', fecha: '2025-03-15', hora: '18:00', rivalName: 'Club Norte' },
    ];
  }

  /** Respuesta estándar para listados (misma forma que la API) */
  static response(data: any, status = 200): any {
    return { data, status, error: null };
  }

  /** Cuadro de mandos: 8 equipos (formato "Nombre de HH:MM a HH:MM"), \u00faltimos y pr\u00f3ximos partidos */
  static getDemoCuadroMandos(): any {
    const hours = ['18:00 a 20:00', '17:00 a 18:30', '17:30 a 19:00', '17:30 a 19:00', '19:00 a 21:00', '18:00 a 19:30', '17:00 a 19:00', '20:00 a 21:30'];
    return {
      teams: DEMO_TEAMS_META.map((t, i) => `${t.name} de ${hours[i]}`),
      ultimos: [
        'V : F\u00fatbol Senior - CD Norte de Valencia 2 - 1 CD Norte de Valencia el Domingo 30 de marzo de 2025',
        'E : Baloncesto Senior - CB Este Valencia 72 - 72 CB Este Valencia el S\u00e1bado 29 de marzo de 2025',
        'V : F\u00fatbol Juvenil A - UD Sur Valencia 3 - 0 UD Sur Valencia el S\u00e1bado 29 de marzo de 2025',
        'D : F\u00fatbol Femenino - CF Oeste Valencia 1 - 2 CF Oeste Valencia el Domingo 30 de marzo de 2025',
      ],
      proximos: [
        'F\u00fatbol Senior - CF L\u00e9vante B el S\u00e1bado 5 de abril de 2025 de 18:00',
        'Baloncesto Senior - CB Paiporta el S\u00e1bado 5 de abril de 2025 de 19:00',
        'F\u00fatbol Juvenil A - CF Mestalla Juvenil el Domingo 6 de abril de 2025 de 11:00',
        'F\u00fatbol Femenino - Valencia CF Femenino B el S\u00e1bado 5 de abril de 2025 de 12:00',
      ],
    };
  }

  /** Info jugadores: listado por equipos (response.data.teams) — 8 equipos, 18 jugadores cada uno */
  static getDemoListJugadoresByClub(): any {
    const teams = DEMO_TEAMS_META.map((meta, teamIndex) => {
      const players = buildDemoPlayersForTeam(meta.teamId, teamIndex, meta.name);
      return {
        teamId: meta.teamId,
        nameTeam: meta.name,
        players: players.map(p => ({
          playerId: p.playerId, nombre: p.nombre, apellido: p.apellido, dorsal: p.dorsal, numero: p.dorsal, nameTeam: meta.name,
          fechaDeNacimiento: p.fechaDeNacimiento, piernaNatural: p.piernaNatural,
          telefono: p.telefono, dni: p.dni, emailPadre: p.emailPadre,
          picturePlayer: p.picturePlayer,
        })),
      };
    });
    return { teams };
  }

  /** Entrenamientos creados: gráfica (response.data.data y response.data.label) */
  static getDemoEntrenamientosCreados(): any {
    return {
      data: [12, 8, 15, 10, 14, 9, 11],
      label: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
    };
  }

  /** Estadísticas jugadores por equipo (estadisticas-jugadores). response.data = { listDto: PlayerEstadistica[], matchs: number }. Solo jugadores del teamId indicado, con campos para tabla y gráficas. */
  static getDemoListPlayersStadistics(teamId?: number, _tipoPartido?: string): any {
    const teamIndex = teamId != null && teamId >= 9001 && teamId <= 9008
      ? teamId - 9001
      : 0;
    const meta = DEMO_TEAMS_META[teamIndex] ?? DEMO_TEAMS_META[0];
    const players = buildDemoPlayersForTeam(meta.teamId, teamIndex, meta.name);
    const listDto: any[] = players.map(p => {
      const pj = p.partidosJugados ?? 0;
      const g = p.goles ?? 0;
      const a = p.asistencias ?? 0;
      const min = p.minutos ?? 0;
      const mediaMin = pj > 0 ? Math.round(min / pj) : 0;
      const golesPenalti = p.posicion === 'Delantero' ? (p.goles > 0 ? Math.min(1, p.goles) : 0) : 0;
      const penaltisFallados = p.posicion === 'Delantero' ? (p.playerId % 3 === 0 ? 1 : 0) : 0;
      const tarAmarilla = 1 + (p.playerId % 3);
      const tarRojas = p.playerId % 5 === 0 ? 1 : 0;
      const golesFalta = p.posicion === 'Delantero' && p.playerId % 4 === 0 ? 1 : 0;
      const gMasA = g + a;
      const mediaG = pj > 0 ? (g / pj).toFixed(2) : '0';
      const mediaA = pj > 0 ? (a / pj).toFixed(2) : '0';
      const mediaGA = pj > 0 ? (gMasA / pj).toFixed(2) : '0';
      return {
        playerId: p.playerId,
        nombre: (p.nombre || '') + ' ' + (p.apellido || ''),
        posicion: p.posicion || p.position,
        fecha: p.fechaDeNacimiento || '',
        partidosJugados: String(pj),
        minTotales: min,
        mediaMinPorPartido: String(mediaMin),
        goles: g,
        asistencias: a,
        golesAsistencias: String(gMasA),
        mediaGolesPorPartido: mediaG,
        MediaAsistPorPartido: mediaA,
        mediaAsistPorPartido: mediaA,
        mediaGolesAsistenciasPorPartido: mediaGA,
        golesPenalti: String(golesPenalti),
        golesFalta: String(golesFalta),
        penaltisFallados: String(penaltisFallados),
        tarAmarilla: String(tarAmarilla),
        tarRojas: String(tarRojas),
      };
    });
    return { listDto, matchs: 18 };
  }

  /** Puntuación equipos (response.data.data y .label) — 8 equipos */
  static getDemoPuntuacion(): any {
    const points = [28, 25, 22, 19, 17, 15, 12, 10];
    return {
      data: points,
      label: DEMO_TEAMS_META.map(t => t.name),
    };
  }

  /** Cuotas club (response.data.label y .data) */
  static getDemoCuotasClub(): any {
    return {
      label: ['Al corriente', 'Pendiente', 'Completado'],
      data: [65, 25, 10],
    };
  }

  /** Estadísticas equipos club (response.data array) — 8 equipos con partidos y matchPreparation para el modal. */
  static getDemoListTeamsStadistics(): any {
    const partido = (r: string, gf: number, gc: number, rival: string, local: string, tipo: string) => ({
      resultado: r, golesAFavor: gf, golesEnContra: gc,
      matchPreparation: { rivalName: rival, terreno: local, tipoPartido: tipo, matchDate: '2025-03-01' },
    });
    const partidosBase = [
      partido('V', 2, 1, 'Rival A', 'local', 'Liga'),
      partido('E', 1, 1, 'Rival B', 'visitante', 'Liga'),
      partido('V', 3, 0, 'Rival C', 'local', 'Copa'),
      partido('D', 1, 2, 'Rival D', 'visitante', 'Liga'),
      partido('V', 2, 1, 'Rival E', 'local', 'Amistoso'),
    ];
    return DEMO_TEAMS_META.map(t => ({ teamId: t.teamId, nameTeam: t.name, partidos: [...partidosBase] }));
  }

  /** Horarios equipos por club (response.data) — 8 equipos. */
  static getDemoHorariosByClub(): any[] {
    // Horarios basados en los d\u00edas de entrenamiento reales de cada equipo (DEMO_TEAMS_META.trainingDays)
    const slots: { [k: string]: any }[] = [
      // F\u00fatbol Senior: L/X/V 18-20
      { lunes: 1, lunesInicio: '18:00', lunesFin: '20:00', miercoles: 1, miercolesInicio: '18:00', miercolesFin: '20:00', viernes: 1, viernesInicio: '18:00', viernesFin: '20:00' },
      // F\u00fatbol Juvenil A: M/J/S 17-18:30
      { martes: 1, martesInicio: '17:00', martesFin: '18:30', jueves: 1, juevesInicio: '17:00', juevesFin: '18:30', sabado: 1, sabadoInicio: '10:00', sabadoFin: '11:30' },
      // F\u00fatbol Cadete A: L/X/S 17:30-19
      { lunes: 1, lunesInicio: '17:30', lunesFin: '19:00', miercoles: 1, miercolesInicio: '17:30', miercolesFin: '19:00', sabado: 1, sabadoInicio: '10:00', sabadoFin: '11:30' },
      // F\u00fatbol Infantil A: M/J/S 17:30-19
      { martes: 1, martesInicio: '17:30', martesFin: '19:00', jueves: 1, juevesInicio: '17:30', juevesFin: '19:00', sabado: 1, sabadoInicio: '10:00', sabadoFin: '11:00' },
      // Baloncesto Senior: L/X/V 19-21
      { lunes: 1, lunesInicio: '19:00', lunesFin: '21:00', miercoles: 1, miercolesInicio: '19:00', miercolesFin: '21:00', viernes: 1, viernesInicio: '19:00', viernesFin: '21:00' },
      // Baloncesto Sub-18: M/J/S 18-19:30
      { martes: 1, martesInicio: '18:00', martesFin: '19:30', jueves: 1, juevesInicio: '18:00', juevesFin: '19:30', sabado: 1, sabadoInicio: '11:00', sabadoFin: '12:30' },
      // Atletismo: M/J/S 17-19 y 9-11
      { martes: 1, martesInicio: '17:00', martesFin: '19:00', jueves: 1, juevesInicio: '17:00', juevesFin: '19:00', sabado: 1, sabadoInicio: '09:00', sabadoFin: '11:00' },
      // F\u00fatbol Femenino: L/X/V 20-21:30
      { lunes: 1, lunesInicio: '20:00', lunesFin: '21:30', miercoles: 1, miercolesInicio: '20:00', miercolesFin: '21:30', viernes: 1, viernesInicio: '20:00', viernesFin: '21:30' },
    ];
    return DEMO_TEAMS_META.map((t, i) => ({
      teamId: t.teamId,
      team: { name: t.name, levelLeague: t.levelLeague, categoryType: { categoryName: t.category } },
      ...slots[i % slots.length],
    }));
  }

  /** Calendario team order (response.data string de teamIds) — 8 equipos */
  static getDemoCalendarioTeamOrder(): string {
    return DEMO_TEAMS_META.map(t => t.teamId).join(',');
  }

  /** Equipos para combo (calendario / selects) — 8 equipos */
  static getDemoTeamsByClubForCombo(): any[] {
    return DEMO_TEAMS_META.map(t => ({ value: t.teamId, teamId: t.teamId, name: t.name, teamName: t.name }));
  }

  /** Lesiones por club — muestra de jugadores de distintos equipos. */
  static getDemoInjuriesByClub(): any[] {
    const teams = DEMO_TEAMS_META;
    const injuries = [
      { playerId: 8001, playerName: 'Carlos G.', teamId: 9001, teamName: teams[0].name, type: 'Esguince', status: 'baja', severity: 'moderada', zone: 'tobillo', zoneLabel: 'Tobillo', description: 'Esguince grado I' },
      { playerId: 8002, playerName: 'Miguel L.', teamId: 9001, teamName: teams[0].name, type: 'Contusión', status: 'alta', severity: 'leve', zone: 'muslo', zoneLabel: 'Muslo', description: 'Contusión muscular' },
      { playerId: 8019, playerName: 'David M.', teamId: 9002, teamName: teams[1].name, type: 'Sobrecarga', status: 'recuperacion', severity: 'leve', zone: 'gemelo', zoneLabel: 'Gemelo', description: 'Sobrecarga en trabajo de velocidad' },
      { playerId: 8037, playerName: 'Javier P.', teamId: 9003, teamName: teams[2].name, type: 'Contractura', status: 'alta', severity: 'leve', zone: 'isquio', zoneLabel: 'Isquiotibial', description: 'Contractura en entrenamiento' },
    ];
    return injuries.map((inj, i) => ({ id: i + 1, injuryId: i + 1, ...inj, clubId: 9001, dateInjury: '2025-02-20', createdBy: 'Demo' }));
  }

  /** Entrenadores por club (response.data.teams con .trainers) — 8 equipos, entrenadores reales. */
  static getDemoListEntrenadoresByClub(): any {
    const trainerData = [
      { nombre: 'Alejandro', apellido: 'Mart\u00ednez Ruiz', telefono: '655 123 456', licencia: 'UEFA B', titulacion: 'T\u00e9cnico Deportivo Superior', certDelitos: 'Aportado', seguro: 'Aportado', primerAuxilio: 'S\u00ed' },
      { nombre: 'Laura', apellido: 'Garc\u00eda P\u00e9rez', telefono: '677 234 567', licencia: 'UEFA C', titulacion: 'T\u00e9cnico Deportivo Nivel 1', certDelitos: 'Aportado', seguro: 'Aportado', primerAuxilio: 'S\u00ed' },
      { nombre: 'Pedro', apellido: 'S\u00e1nchez G\u00f3mez', telefono: '611 345 678', licencia: 'UEFA C', titulacion: 'T\u00e9cnico Deportivo Nivel 1', certDelitos: 'Aportado', seguro: 'Pendiente', primerAuxilio: 'No' },
      { nombre: 'Elena', apellido: 'Fern\u00e1ndez Castro', telefono: '699 456 789', licencia: 'UEFA C', titulacion: 'T\u00e9cnico Deportivo Nivel 1', certDelitos: 'Aportado', seguro: 'Aportado', primerAuxilio: 'S\u00ed' },
      { nombre: 'Francisco', apellido: 'L\u00f3pez Torres', telefono: '622 567 890', licencia: 'Nivel II FEB', titulacion: 'T\u00e9cnico Deportivo Superior', certDelitos: 'Aportado', seguro: 'Aportado', primerAuxilio: 'S\u00ed' },
      { nombre: 'Mar\u00eda', apellido: 'Jim\u00e9nez Vargas', telefono: '644 678 901', licencia: 'Nivel I FEB', titulacion: 'T\u00e9cnico Deportivo Nivel 1', certDelitos: 'Aportado', seguro: 'Aportado', primerAuxilio: 'S\u00ed' },
      { nombre: 'Ricardo', apellido: 'Moreno Silva', telefono: '666 789 012', licencia: 'Entrenador Nacional Atletismo', titulacion: 'T\u00e9cnico Deportivo Superior', certDelitos: 'Aportado', seguro: 'Aportado', primerAuxilio: 'S\u00ed' },
      { nombre: 'Carmen', apellido: '\u00c1lvarez Herrera', telefono: '688 890 123', licencia: 'UEFA C', titulacion: 'T\u00e9cnico Deportivo Nivel 1', certDelitos: 'Aportado', seguro: 'Aportado', primerAuxilio: 'S\u00ed' },
    ];
    return {
      teams: DEMO_TEAMS_META.map((t, i) => {
        const tr = trainerData[i];
        return {
          teamId: t.teamId,
          nameTeam: t.name,
          trainers: [{
            trainerId: 7001 + i, userId: 7001 + i,
            nombre: tr.nombre, apellido: tr.apellido,
            dni: String(11111111 + i) + 'A',
            nameTeam: t.name, teamId: t.teamId,
            email: `${tr.nombre.toLowerCase()}.${tr.apellido.split(' ')[0].toLowerCase()}@cdsphaira.es`,
            telefono: tr.telefono,
            fechaDeNacimiento: `${1975 + i}-${String(1 + (i % 12)).padStart(2, '0')}-15`,
            licenciaFederativa: tr.licencia,
            titulacionDeportiva: tr.titulacion,
            certDelitosSexuales: tr.certDelitos,
            seguroResponsabilidad: tr.seguro,
            formacionPrimerosAuxilios: tr.primerAuxilio,
            picturePlayer: '',
          }],
        };
      }),
    };
  }

  /** Perfiles entrenadores (response.data array) — datos completos para los 8 entrenadores demo. */
  static getDemoPerfilesEntrenadores(): any[] {
    return DEMO_TEAMS_META.map((_, i) => ({
      userId: 7001 + i,
      documentoIdentidad: String(11111111 + i) + 'A',
      tipoDocumento: 'DNI',
      direccion: `Calle de la Constituci\u00f3n ${i + 1}, Valencia`,
      nacionalidad: 'Espa\u00f1ola',
      licenciaFederativa: i < 4 ? (i < 2 ? 'UEFA B' : 'UEFA C') : i < 6 ? (i === 4 ? 'Nivel II FEB' : 'Nivel I FEB') : 'Entrenador Nacional',
      titulacionDeportiva: 'T\u00e9cnico Deportivo',
      certDelitosSexuales: 'Aportado',
      certAntecedentesPenales: 'Aportado',
      seguroResponsabilidad: i < 6 || i === 7 ? 'Aportado' : 'Pendiente',
      formacionPrimerosAuxilios: i !== 2 ? 'S\u00ed' : 'No',
      contactoEmergenciaNombre: `Familiar ${i + 1}`,
      contactoEmergenciaTelefono: `600 ${String(111111 + i * 11111).slice(0, 6)}`,
    }));
  }

  /** Entrenamientos por equipo para el calendario — genera ~8 sesiones repartidas en el mes actual y el siguiente */
  static getDemoTrainingSessions(teamId: string): any[] {
    const id = parseInt(teamId, 10) || 9001;
    const teamIndex = DEMO_TEAMS_META.findIndex(t => t.teamId === id);
    const meta = DEMO_TEAMS_META[teamIndex >= 0 ? teamIndex : 0];
    const sport = meta.sport ?? 'futbol';

    const objetivos: Record<string, string[]> = {
      futbol: ['T\u00e9cnica individual', 'Trabajo t\u00e1ctico', 'Pressing y repliegue', 'Juego de posici\u00f3n', 'Velocidad y agilidad', 'Preparaci\u00f3n de partido', 'Pelota parada', 'Recuperaci\u00f3n f\u00edsica'],
      baloncesto: ['Tiro libre y triples', 'Defensa individual', 'Bloqueos directos', 'Transici\u00f3n ofensiva', 'Pick and roll', 'Preparaci\u00f3n de partido', 'Pases y mec\u00e1nica', 'Resistencia c\u00edclica'],
      atletismo: ['Series de velocidad', 'Trabajo de fuerza', 'Pr\u00e1ctica de saltos', 'Lanzamientos', 'Fondo y resistencia', 'T\u00e9cnica espec\u00edfica', 'Preparaci\u00f3n competici\u00f3n', 'Evaluaci\u00f3n y tests'],
    };
    const calentamientos: Record<string, string[]> = {
      futbol: ['Carrera suave 10 min', 'Rondos peque\u00f1os grupos', 'Estiramientos din\u00e1micos', 'Movilidad articular', 'Activaci\u00f3n con bal\u00f3n', 'Pases cortos y calentamiento'],
      baloncesto: ['Carrera lateral y cruce', 'Tiro libre par\u00e9ja', 'Movilidad art. hombros', 'Bote con cambio direcci\u00f3n', 'Bandeja suave', 'Pases ritmo suave'],
      atletismo: ['Trote suave 10 min', 'Movilidad articular general', 'Progresiones 60m', 'Activaci\u00f3n neuromuscular', 'Estiramientos din\u00e1micos', 'Skipping y tobilleos'],
    };
    const objs = objetivos[sport] ?? objetivos['futbol'];
    const cals = calentamientos[sport] ?? calentamientos['futbol'];

    const sessions: any[] = [];
    const now = new Date();
    let sid = (teamIndex + 1) * 100;

    // Días de entrenamiento semanales para este equipo (L=1, M=2, X=3, J=4, V=5, S=6, D=0)
    const dayMap: Record<string, number> = { L: 1, M: 2, X: 3, J: 4, V: 5, S: 6, D: 0 };
    const hoursMap: Record<string, { start: string; end: string }> = {};
    const trDaysStr = meta.trainingDays ?? '';
    const tdRegex = /([LMXJVSD]):(\d{2}:\d{2})-(\d{2}:\d{2})/g;
    let m: RegExpExecArray | null;
    while ((m = tdRegex.exec(trDaysStr)) !== null) {
      hoursMap[m[1]] = { start: m[2], end: m[3] };
    }
    const trainingWeekDays = Object.keys(hoursMap);

    // Generar 6 semanas a partir del lunes de esta semana
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    monday.setHours(0, 0, 0, 0);

    for (let week = 0; week < 6; week++) {
      for (const dayKey of trainingWeekDays) {
        const dayNum = dayMap[dayKey];
        const sessionDate = new Date(monday);
        sessionDate.setDate(monday.getDate() + week * 7 + ((dayNum - 1 + 7) % 7));
        const dateStr = sessionDate.toISOString().slice(0, 10);
        const hours = hoursMap[dayKey];
        const objIdx = (sid + week) % objs.length;
        const calIdx = (sid + week) % cals.length;
        sessions.push({
          trainingSessionId: sid++,
          daySession: dateStr,
          addressSession: sport === 'futbol' ? 'Campo Municipal Norte' : sport === 'baloncesto' ? 'Pab. Cubierto Sphaira' : 'Pista de Atletismo',
          startTime: hours.start,
          endTime: hours.end,
          objectiveSession: objs[objIdx],
          warmUp: cals[calIdx],
          visible: true,
        });
      }
    }
    return sessions;
  }

  /** Partidos por equipo para el calendario — genera partidos realistas en los pr\u00f3ximos 3 meses */
  static getDemoMatchPreparations(teamId: string): any[] {
    const id = parseInt(teamId, 10) || 9001;
    const teamIndex = DEMO_TEAMS_META.findIndex(t => t.teamId === id);
    const meta = DEMO_TEAMS_META[teamIndex >= 0 ? teamIndex : 0];
    const sport = meta.sport ?? 'futbol';

    const rivalesFoot = ['CD Norte Valencia', 'UD Levante B', 'CF Mestalla', 'Paterna CF', 'Valencia CF B', 'CD Saguntino', 'Benaguasil CF', 'Atletic Llombai', 'CD Burjassot', 'CF Gandia'];
    const rivalesBask = ['CB Este Valencia', 'CB Paiporta', 'Cl\u00ednica Baviera Valencia', 'CB L\'Alcudia', 'CB Alzira', 'CB Algemesi', 'CB Torrent'];
    const rivalesAthl = ['CA Valencia', 'Playas de Castell\u00f3n', 'Atletisme Alacant', 'CA Elx', 'CA Gandia'];

    const rivals = sport === 'futbol' ? rivalesFoot : sport === 'baloncesto' ? rivalesBask : rivalesAthl;
    const tiposPartido = sport === 'atletismo' ? ['Competici\u00f3n', 'Meeting', 'Control Federativo'] : ['Liga', 'Liga', 'Liga', 'Copa', 'Amistoso'];
    const lugares = sport === 'futbol'
      ? ['Campo Municipal Norte', 'Estadio Antonio Puchades', 'Ciudad Deportiva Valencia', 'Campo El Turia', 'Instalaciones Rivales']
      : sport === 'baloncesto'
      ? ['Pab. Cubierto Sphaira', 'Palacio de los Deportes', 'Pabellon Municipal Este', 'Pabellón La Rambleta']
      : ['Pista Atletismo Sphaira', 'Estadio Municipal de Atletismo', 'Pista Cubierta Valencia'];

    const matches: any[] = [];
    const now = new Date();
    let mid = (teamIndex + 1) * 200;

    // ~2 partidos por mes durante 3 meses
    for (let i = 0; i < 6; i++) {
      const matchDate = new Date(now);
      matchDate.setDate(now.getDate() + (i * 14) + 4 + (teamIndex % 3));
      const isHome = (mid + i) % 2 === 0;
      const rival = rivals[(mid + i) % rivals.length];
      const tipo = tiposPartido[(mid + i) % tiposPartido.length];
      const lugar = isHome ? lugares[0] : lugares[1 + (i % (lugares.length - 1))];
      const hora = sport === 'football' ? (i % 2 === 0 ? 18 : 11) : sport === 'basketball' ? (i % 2 === 0 ? 19 : 12) : 10;
      const minutos = 0;
      const horaE = hora - 1;
      const minutosE = 30;
      matches.push({
        matchPreparationId: mid + i,
        matchDate: matchDate.toISOString().slice(0, 10),
        hora,
        minutos,
        horaEmpieza: horaE,
        minutosEmpieza: minutosE,
        rivalName: rival,
        terreno: isHome ? 'local' : 'visitante',
        tipoPartido: tipo,
        lugar,
        visible: true,
      });
    }
    return matches;
  }

  /** Equipos por club (pantalla Equipos con perfil Club). response.data para getTeamByClub */
  static getDemoTeamByClubResponse(): any {
    const club = DemoDataService.getDemoClub();
    return {
      club: { clubId: club.clubId, picture: club.pictureClub },
      teams: DemoDataService.getDemoTeams(),
    };
  }

  /** Documentos del club (jugadores). response.data: array o { documentos, totalPadres, subidosPorDocumento } */
  static getDemoDocumentosByClub(): any {
    const docs = [
      { docClubesId: 1, nombre: 'Autorización de imagen', descripcion: 'Documento para uso de imagen en redes', tipo: 'PDF', visible: 1, requiere: 1, destinatario: 0, totalSubidos: 12, totalPadres: 18 },
      { docClubesId: 2, nombre: 'Ficha médica', descripcion: 'Ficha médica actualizada', tipo: 'PDF', visible: 1, requiere: 1, destinatario: 0, totalSubidos: 15, totalPadres: 18 },
      { docClubesId: 3, nombre: 'Normativa del club', descripcion: 'Normas de convivencia y régimen interno', tipo: 'PDF', visible: 1, requiere: 0, destinatario: 0, totalSubidos: 18, totalPadres: 18 },
    ];
    return {
      documentos: docs,
      totalPadres: 18,
      subidosPorDocumento: { 1: { totalSubidos: 12, totalEsperados: 18 }, 2: { totalSubidos: 15, totalEsperados: 18 }, 3: { totalSubidos: 18, totalEsperados: 18 } },
    };
  }

  /** Documentos del club (entrenadores). Misma estructura, destinatario 1 */
  static getDemoDocumentosEntrenadoresByClub(): any {
    const docs = [
      { docClubesId: 10, nombre: 'Licencia federativa', descripcion: 'Copia de la licencia en vigor', tipo: 'PDF', visible: 1, requiere: 1, destinatario: 1, totalSubidos: 2, totalPadres: 2 },
      { docClubesId: 11, nombre: 'Seguro de responsabilidad civil', descripcion: 'Póliza vigente', tipo: 'PDF', visible: 1, requiere: 1, destinatario: 1, totalSubidos: 2, totalPadres: 2 },
    ];
    return {
      documentos: docs,
      totalEntrenadores: 2,
      subidosPorDocumento: { 10: { totalSubidos: 2, totalEsperados: 2 }, 11: { totalSubidos: 2, totalEsperados: 2 } },
    };
  }

  /** Detalle de completados por documento (modal Documentos). response.data = array de { nombre, apellido, completado, fechaSubida }. */
  static getDemoDocCompletionDetail(docClubesId: number, tipo: string): any[] {
    if (tipo === 'entrenadores') {
      const segundoCompletado = docClubesId === 10;
      return [
        { nombre: 'Juan', apellido: 'Demo', completado: true, fechaSubida: '2025-01-15' },
        { nombre: 'Ana', apellido: 'Ayudante', completado: segundoCompletado, fechaSubida: segundoCompletado ? '2025-01-18' : null },
      ];
    }
    const meta = DEMO_TEAMS_META[0];
    const players = buildDemoPlayersForTeam(meta.teamId, 0, meta.name);
    const totalCompletados = docClubesId === 1 ? 12 : docClubesId === 2 ? 15 : 18;
    return players.map((p, i) => ({
      nombre: p.nombre,
      apellido: p.apellido,
      completado: i < totalCompletados,
      fechaSubida: i < totalCompletados ? `2025-0${1 + (i % 3)}-${String(10 + (i % 18)).padStart(2, '0')}` : null,
    }));
  }

  /** Cobros Sphaira Pay programados por cuota (modal Cuotas). response.data = array de cuotas con players. */
  static getDemoSphairaPayScheduled(_temporada: string): any[] {
    const meta1 = DEMO_TEAMS_META[0];
    const meta2 = DEMO_TEAMS_META[1];
    const players1 = buildDemoPlayersForTeam(meta1.teamId, 0, meta1.name);
    const players2 = buildDemoPlayersForTeam(meta2.teamId, 1, meta2.name);
    const baseDate = new Date();
    baseDate.setDate(baseDate.getDate() + 5);
    const fechaCobro = baseDate.toISOString().slice(0, 10);
    const toPlayer = (p: any, teamName: string, tieneTarjeta: boolean, cobrado: boolean) => ({
      playerId: p.playerId,
      playerName: `${p.nombre} ${p.apellido}`,
      teamName,
      tieneTarjeta,
      cardLast4: tieneTarjeta ? String(1000 + (p.playerId % 9000)).slice(-4) : null,
      cardBrand: tieneTarjeta ? 'Visa' : null,
      cobrado,
      ultimoPago: cobrado ? '2025-02-01 10:30:00' : null,
      facturaId: cobrado ? 'in_demo' : null,
      receiptUrl: cobrado ? 'https://demo.example.com/receipt' : null,
      importe: cobrado ? '45,00' : null,
    });
    const cuota1Players = players1.slice(0, 6).map((p, i) => {
      const tieneTarjeta = i < 4;
      const cobrado = i < 2;
      return toPlayer(p, meta1.name, tieneTarjeta, cobrado);
    });
    const cuota2Players = players2.slice(0, 5).map((p, i) => {
      const tieneTarjeta = i < 3;
      const cobrado = i < 1;
      return toPlayer(p, meta2.name, tieneTarjeta, cobrado);
    });
    return [
      {
        pagoClubId: 101,
        titulo: 'Cuota marzo 2025',
        descripcion: 'Cuota mensual temporada 2024-2025',
        importe: '45,00',
        importeTotal: '45,00',
        comisionClub: 1.5,
        fechaCobro,
        tipoCobro: 3,
        totalJugadores: 6,
        conTarjeta: 4,
        sinTarjeta: 2,
        cobrados: 2,
        players: cuota1Players,
      },
      {
        pagoClubId: 102,
        titulo: 'Cuota abril 2025',
        descripcion: 'Segunda cuota del trimestre',
        importe: '45,00',
        importeTotal: '45,00',
        comisionClub: 1.5,
        fechaCobro: baseDate.toISOString().slice(0, 8) + '15',
        tipoCobro: 3,
        totalJugadores: 5,
        conTarjeta: 3,
        sinTarjeta: 2,
        cobrados: 1,
        players: cuota2Players,
      },
    ];
  }

  /** Post-partidos para galería (partidos-entrevistas). response.data = array con id, letra, name, resultado, totalFotos, totalVideos, etc. */
  static getDemoPostPartidosForGalery(): any[] {
    return [
      { id: 101, matchDate: '2025-03-02', rivalName: 'Club Norte', name: 'vs Club Norte', letra: 'V', resultado: '2-1', totalFotos: 12, totalVideos: 2 },
      { id: 102, matchDate: '2025-02-28', rivalName: 'Escuela Sur', name: 'vs Escuela Sur', letra: 'E', resultado: '0-0', totalFotos: 8, totalVideos: 1 },
      { id: 103, matchDate: '2025-02-20', rivalName: 'Atlético Este', name: 'vs Atlético Este', letra: 'D', resultado: '1-3', totalFotos: 5, totalVideos: 0 },
    ];
  }

  /** Detalle de un post-partido (getPostPartidoByPostPartido). response.data para modal estadísticas equipo */
  static getDemoPostPartidoDetail(_postPartidoId?: string): any {
    return {
      postPartidoId: 1,
      golesAFavor: 2,
      golesEnContra: 1,
      resultado: 'V',
      matchPreparation: { rivalName: 'Club Norte', terreno: 'local', matchDate: '2025-03-02', tipoPartido: 'Liga', lugar: 'Campo Municipal' },
    };
  }

  /** Post-partidos por equipo y tipo (estadisticas-equipo). response.data = array con postPartidoId, resultado, golesAFavor, matchPreparation y estadísticas para tabla y gráficas. */
  static getDemoListPostPartidoByTeam(_teamId?: number, _tipo?: string): any[] {
    const base = [
      { postPartidoId: 1, resultado: 'V', golesAFavor: 2, golesEnContra: 1, matchPreparation: { rivalName: 'Club Norte', terreno: 'Local', matchDate: '2025-03-02', tipoPartido: 'Liga' }, disparosAFavor: 14, disparosEnContra: 8, faltasRecibidas: 10, faltasCometidas: 12, cornersAFavor: 5, cornersEnContra: 3, recuperaciones: 22, perdidas: 15, tarjetasAmarillas: 2, tarjetasRojas: 0, llegadasPeligroAFavor: 6, llegadasPeligroEnContra: 3, penaltisAFavor: 1, penaltisEnContra: 0 },
      { postPartidoId: 2, resultado: 'E', golesAFavor: 1, golesEnContra: 1, matchPreparation: { rivalName: 'Escuela Sur', terreno: 'Visitante', matchDate: '2025-02-28', tipoPartido: 'Liga' }, disparosAFavor: 9, disparosEnContra: 11, faltasRecibidas: 8, faltasCometidas: 9, cornersAFavor: 4, cornersEnContra: 5, recuperaciones: 18, perdidas: 20, tarjetasAmarillas: 1, tarjetasRojas: 0, llegadasPeligroAFavor: 4, llegadasPeligroEnContra: 5, penaltisAFavor: 0, penaltisEnContra: 0 },
      { postPartidoId: 3, resultado: 'D', golesAFavor: 1, golesEnContra: 3, matchPreparation: { rivalName: 'Atlético Este', terreno: 'Visitante', matchDate: '2025-02-20', tipoPartido: 'Liga' }, disparosAFavor: 7, disparosEnContra: 16, faltasRecibidas: 14, faltasCometidas: 11, cornersAFavor: 2, cornersEnContra: 7, recuperaciones: 14, perdidas: 25, tarjetasAmarillas: 3, tarjetasRojas: 1, llegadasPeligroAFavor: 2, llegadasPeligroEnContra: 8, penaltisAFavor: 0, penaltisEnContra: 1 },
      { postPartidoId: 4, resultado: 'V', golesAFavor: 3, golesEnContra: 0, matchPreparation: { rivalName: 'Deportivo Centro', terreno: 'Local', matchDate: '2025-02-15', tipoPartido: 'Liga' }, disparosAFavor: 18, disparosEnContra: 5, faltasRecibidas: 6, faltasCometidas: 8, cornersAFavor: 8, cornersEnContra: 2, recuperaciones: 28, perdidas: 10, tarjetasAmarillas: 0, tarjetasRojas: 0, llegadasPeligroAFavor: 9, llegadasPeligroEnContra: 1, penaltisAFavor: 0, penaltisEnContra: 0 },
      { postPartidoId: 5, resultado: 'V', golesAFavor: 2, golesEnContra: 1, matchPreparation: { rivalName: 'Rival Oeste', terreno: 'Local', matchDate: '2025-02-08', tipoPartido: 'Liga' }, disparosAFavor: 12, disparosEnContra: 9, faltasRecibidas: 9, faltasCometidas: 7, cornersAFavor: 6, cornersEnContra: 4, recuperaciones: 20, perdidas: 16, tarjetasAmarillas: 1, tarjetasRojas: 0, llegadasPeligroAFavor: 5, llegadasPeligroEnContra: 4, penaltisAFavor: 1, penaltisEnContra: 0 },
    ];
    return base;
  }

  /** Goles avanzados por equipo (estadisticas-equipo y estadisticas-jugadores). response.data = { golesAFavor: [], golesEnContra: [] }. Incluye postPartido para tabla de goles por jugador. */
  static getDemoGolesAvanzadoByTeamId(_teamId?: number): { golesAFavor: any[]; golesEnContra: any[] } {
    const teamId = _teamId ?? 9001;
    const teamIndex = teamId >= 9001 && teamId <= 9008 ? teamId - 9001 : 0;
    const baseId = 8001 + teamIndex * PLAYERS_PER_TEAM;
    const rivales = ['Club Norte', 'Escuela Sur', 'Atlético Este', 'Deportivo Centro', 'Rival Oeste'];
    const fechas = ['2025-03-02', '2025-02-28', '2025-02-20', '2025-02-15', '2025-02-08'];
    const golesAFavor = [
      { golPostPartidoId: 1, category: 'Jugada combinativa', subCategory: 'Dentro del área', option: 'Tiro a portería', minuto: 23, playerId: baseId + 9, asistencia: baseId + 2, teamId, postPartido: { matchPreparation: { rivalName: rivales[0], matchDate: fechas[0] } } },
      { golPostPartidoId: 2, category: 'Jugada combinativa', subCategory: 'Dentro del área', option: 'Remate de cabeza', minuto: 67, playerId: baseId + 10, asistencia: baseId + 5, teamId, postPartido: { matchPreparation: { rivalName: rivales[0], matchDate: fechas[0] } } },
      { golPostPartidoId: 3, category: 'Jugada combinativa', subCategory: 'Banda Derecha', option: 'Tiro a portería', minuto: 45, playerId: baseId + 11, asistencia: baseId + 1, teamId, postPartido: { matchPreparation: { rivalName: rivales[1], matchDate: fechas[1] } } },
      { golPostPartidoId: 4, category: 'Córner', subCategory: 'Izquierda', option: 'Primer palo', minuto: 78, playerId: baseId + 12, asistencia: 0, teamId, postPartido: { matchPreparation: { rivalName: rivales[1], matchDate: fechas[1] } } },
      { golPostPartidoId: 5, category: 'Pérdida/Recuperación', subCategory: 'Zona interior', option: 'Tiro a portería', minuto: 12, playerId: baseId + 13, asistencia: baseId + 4, teamId, postPartido: { matchPreparation: { rivalName: rivales[2], matchDate: fechas[2] } } },
      { golPostPartidoId: 6, category: 'Falta', subCategory: 'Fuera del área', option: 'Tiro a portería', minuto: 89, playerId: baseId + 9, asistencia: 0, teamId, postPartido: { matchPreparation: { rivalName: rivales[2], matchDate: fechas[2] } } },
      { golPostPartidoId: 7, category: 'Jugada combinativa', subCategory: 'Fuera del área', option: 'Tiro a portería', minuto: 55, playerId: baseId + 14, asistencia: baseId + 6, teamId, postPartido: { matchPreparation: { rivalName: rivales[3], matchDate: fechas[3] } } },
      { golPostPartidoId: 8, category: 'Penalti', subCategory: '', option: '', minuto: 34, playerId: baseId + 10, asistencia: 0, teamId, postPartido: { matchPreparation: { rivalName: rivales[4], matchDate: fechas[4] } } },
    ];
    const golesEnContra = [
      { golPostPartidoId: 101, category: 'Jugada combinativa', subCategory: 'Dentro del área', option: 'Tiro a portería', minuto: 15, playerId: 0, asistencia: 0, teamId, postPartido: { matchPreparation: { rivalName: rivales[0], matchDate: fechas[0] } } },
      { golPostPartidoId: 102, category: 'Córner', subCategory: 'Derecha', option: 'Segundo palo', minuto: 61, playerId: 0, asistencia: 0, teamId, postPartido: { matchPreparation: { rivalName: rivales[1], matchDate: fechas[1] } } },
      { golPostPartidoId: 103, category: 'Jugada combinativa', subCategory: 'Banda Izquierda', option: 'Remate de cabeza', minuto: 72, playerId: 0, asistencia: 0, teamId, postPartido: { matchPreparation: { rivalName: rivales[2], matchDate: fechas[2] } } },
      { golPostPartidoId: 104, category: 'En propia', subCategory: '', option: '', minuto: 40, playerId: 0, asistencia: 0, teamId, postPartido: { matchPreparation: { rivalName: rivales[3], matchDate: fechas[3] } } },
    ];
    return { golesAFavor, golesEnContra };
  }

  /** Galería de un partido (fotos y vídeos). response.data = array de { galeriaPartidoId, tipo: 0|1, urlImg, isExternal?, ... }. Solo imágenes que cargan bien. */
  static getDemoGaleriaPartidos(_postpartidoId: number): any[] {
    const fotosReales: string[] = [
      'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800',
      'https://images.unsplash.com/photo-1543326727-cf6c39e8f84c?w=800',
      'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=800',
    ];
    const descripciones = ['Celebración de gol', 'Acción de juego en el área', 'Vista del estadio'];
    return [
      ...fotosReales.map((urlImg, i) => ({
        galeriaPartidoId: 200 + i,
        tipo: 0,
        urlImg,
        isExternal: true,
        descripcion: descripciones[i] || 'Foto del partido',
      })),
      { galeriaPartidoId: 205, tipo: 1, urlImg: 'KQ6zr6kCPj8', link: 'KQ6zr6kCPj8', descripcion: 'Resumen del partido' },
    ];
  }

  /** Clasificación y resultados (getTodo). response.data — 8 equipos demo en clasificación */
  static getDemoClasificacionTodo(jornada: string): any {
    const j = parseInt(jornada || '1', 10);
    const puntos = [28, 25, 22, 19, 17, 15, 12, 10];
    const rivals = ['Atlético Norte', 'Escuela Sur FC', 'Deportivo Este', 'Club Oeste',
                    'Real Bahía', 'Sporting Centro', 'Unión Montaña', 'FC Ribera'];
    const partidos: any[] = [];
    const teams = DEMO_TEAMS_META;
    for (let i = 0; i < teams.length && i < rivals.length; i++) {
      const gl = (i % 3 === 0) ? 2 : (i % 3 === 1) ? 1 : 0;
      const gv = (i % 3 === 0) ? 0 : (i % 3 === 1) ? 1 : 1;
      const jDate = new Date('2025-09-01');
      jDate.setDate(jDate.getDate() + (j - 1) * 7 + i);
      partidos.push({
        jornada: j,
        local: teams[i % teams.length].name,
        visitante: rivals[i],
        golesLocal: gl,
        golesVisitante: gv,
        fecha: jDate.toISOString().split('T')[0],
        hora: `${17 + (i % 4)}:00h`,
        estadio: `Campo Municipal ${i + 1}`,
        codActa: `ACTA-${j}-${i + 1}`,
      });
    }
    const now = new Date();
    now.setMinutes(0, 0, 0);
    return {
      clasificacion: DEMO_TEAMS_META.map((t, i) => ({
        posicion: i + 1,
        nombre: t.name,
        nombreEquipo: t.name,
        puntos: puntos[i] ?? 5,
        jugados: 12,
        ganados: Math.floor((puntos[i] ?? 5) / 3),
        empatados: (puntos[i] ?? 5) % 3,
        perdidos: 12 - Math.floor((puntos[i] ?? 5) / 3) - ((puntos[i] ?? 5) % 3),
        golesFavor: 20 + (i * 2),
        golesContra: 15 - i,
        golesAFavor: 20 + (i * 2),
        golesEnContra: 15 - i,
        forma: ['G', 'G', 'E', 'P', 'G'].slice(0, 5).join(''),
        datos: {
          'Pts': puntos[i] ?? 5,
          'J':   12,
          'G':   Math.floor((puntos[i] ?? 5) / 3),
          'E':   (puntos[i] ?? 5) % 3,
          'P':   12 - Math.floor((puntos[i] ?? 5) / 3) - ((puntos[i] ?? 5) % 3),
          'GF':  20 + (i * 2),
          'GC':  15 - i,
        },
      })),
      partidos,
      totalJornadas: 22,
      columnas: ['goles', 'forma'],
      headers: ['Pts', 'J', 'G', 'E', 'P', 'GF', 'GC', 'Forma'],
      jornadaNavegable: true,
      lastUpdated: now.toISOString(),
    };
  }

  /** Historial de debriefs (entrenamiento y partido) para el entrenador */
  static getDemoDebriefHistory(): any[] {
    const d = (daysAgo: number) => {
      const d2 = new Date();
      d2.setDate(d2.getDate() - daysAgo);
      return d2.toISOString().slice(0, 10);
    };
    return [
      { debriefId: 1, type: 'training', date: d(2), status: 'completed', rivalName: undefined, summary: '7 respuestas' },
      { debriefId: 2, type: 'match', date: d(5), status: 'completed', rivalName: 'Club Norte', summary: '8 respuestas' },
      { debriefId: 3, type: 'training', date: d(7), status: 'draft', rivalName: undefined, summary: '3 respuestas' },
    ];
  }

  /** Tareas de una sesión de entrenamiento (getTasksByTraining). response.data = array de Task */
  static getDemoTasksByTraining(_trainingId?: string): any[] {
    return [
      { taskId: 501, slogans: 'Rondo 4+2', estrategia: 'Posesión', intencion: 'Conservar', description: 'Rondo en espacio reducido.', rules: '2 toques máx.', variants: 'Aumentar jugadores', worktime: '10 min', space: '20x20', material: 'Conos, petos', imagenBoard: null, collapsed: false },
      { taskId: 502, slogans: 'Finalización en área', estrategia: 'Situaciones Reducidas', intencion: 'Finalizar', description: 'Entrada desde banda y remate.', rules: 'Pase en profundidad.', variants: 'Con oposición', worktime: '15 min', space: 'Área', material: 'Balones', imagenBoard: null, collapsed: false },
    ];
  }

  /** Tareas del historial del entrenador (coach-task-history) */
  static getDemoCoachTaskHistory(): any[] {
    return [
      { taskId: 501, slogans: 'Rondo 4+2', estrategia: 'Posesión', intencion: 'Conservar', fecCreate: '2025-02-28' },
      { taskId: 502, slogans: 'Finalización en área', estrategia: 'Situaciones Reducidas', intencion: 'Finalizar', fecCreate: '2025-02-25' },
    ];
  }

  /** Tareas favoritas del entrenador */
  static getDemoCoachTaskFavorites(): any[] {
    return [
      { taskId: 501, tasksShopId: 101, slogans: 'Rondo 4+2', estrategia: 'Posesión', intencion: 'Conservar' },
    ];
  }

  /** Tareas propias del entrenador (mis tareas) */
  static getDemoCoachOwnTasks(): any[] {
    return [
      { coachTaskId: 1, slogans: 'Calentamiento específico', description: 'Carrera continua y estiramientos', fecCreate: '2025-02-20' },
    ];
  }

  /** Catálogo de tareas (filterTaskShopByOptions). response.data = array para tareas-catalog */
  static getDemoTaskShopCatalog(): any[] {
    return [
      { taskId: 101, tasksShopId: 101, slogans: 'Rondo 4+2', description: 'Rondo en espacio reducido. Máximo 2 toques.', estrategia: 'Posesión', intencion: 'Conservar', worktime: '10 min', space: '20x20', material: 'Conos, petos', imagenBoard: 'rondo-4-2.svg' },
      { taskId: 102, tasksShopId: 102, slogans: 'Finalización en área', description: 'Entrada desde banda y remate a portería.', estrategia: 'Situaciones Reducidas', intencion: 'Finalizar', worktime: '15 min', space: 'Área', material: 'Balones', imagenBoard: 'finalizacion-area.svg' },
      { taskId: 103, tasksShopId: 103, slogans: 'Posesión 5v5', description: 'Mantener la posesión en espacio delimitado.', estrategia: 'Posesión', intencion: 'Conservar', worktime: '12 min', space: '30x30', material: 'Petos, conos', imagenBoard: 'posesion-5v5.svg' },
      { taskId: 104, tasksShopId: 104, slogans: 'Transición defensiva', description: 'Recuperar balón y salir rápido.', estrategia: 'Transición Defensiva', intencion: 'Recuperar', worktime: '8 min', space: 'Medio campo', material: 'Balones, petos', imagenBoard: 'transicion-defensiva.svg' },
      { taskId: 105, tasksShopId: 105, slogans: 'Acción a balón parado', description: 'Ejecución de corner y estrategia de remate.', estrategia: 'Acciones a Balón Parado', intencion: 'ABP Ofensiva', worktime: '10 min', space: 'Área', material: 'Balones', imagenBoard: 'accion-balon-parado.svg' },
    ];
  }

  /** Perfil del entrenador (getPerfilEntrenador). response.data */
  static getDemoEntrenadorPerfil(): any {
    return {
      entrenadorPerfilId: 1,
      userId: 1,
      nombre: 'Juan',
      apellido: 'Demo',
      email: 'entrenador@demo.com',
      telefono: '600123456',
      fechaNacimiento: '1985-05-15',
      documentoIdentidad: '12345678A',
      tipoDocumento: 'Identificación Nacional',
      direccion: 'Calle Demo 1',
      nacionalidad: 'España',
      picture: null,
      imgDocFrontal: null,
      imgDocTrasera: null,
      licenciaFederativa: 'UEFA B',
      titulacionDeportiva: 'Monitor',
      certDelitosSexuales: null,
      certAntecedentesPenales: null,
      seguroResponsabilidad: null,
      formacionPrimerosAuxilios: null,
      contactoEmergenciaNombre: 'María Demo',
      contactoEmergenciaTelefono: '600987654',
    };
  }

  /** Clubs del entrenador (getAllClubsForEntrenador). response.data = array */
  static getDemoClubsForEntrenador(): any[] {
    return [
      { clubId: 9001, clubName: 'Club Demo', clubPicture: null },
    ];
  }

  /** Documentos requeridos al entrenador por club (getListDocumentosEntrenador). response.data = array */
  static getDemoDocumentosEntrenador(): any[] {
    return [
      { docClubesId: 10, nombre: 'Licencia federativa', requiere: 1, subido: true, fileClub: 'demo-licencia.pdf', descargado: 0 },
      { docClubesId: 11, nombre: 'Seguro de responsabilidad civil', requiere: 1, subido: true, fileClub: 'demo-seguro.pdf', descargado: 0 },
    ];
  }

  /** Historial de pagos del club (lista para HistorialPagosClubComponent) */
  static getDemoHistorialPagos(): any[] {
    return [
      { name: 'Carlos García', descripcionPago: 'Cuota mensual marzo', titulo: 'Cuota Marzo 2025', importe: 45.00, metodo: 'Tarjeta', tipo: 'Cuota', fecha: '2025-03-01' },
      { name: 'Miguel López', descripcionPago: 'Cuota mensual marzo', titulo: 'Cuota Marzo 2025', importe: 45.00, metodo: 'Tarjeta', tipo: 'Cuota', fecha: '2025-03-02' },
      { name: 'Antonio Ruiz', descripcionPago: 'Inscripción temporada', titulo: 'Inscripción 2024/25', importe: 120.00, metodo: 'Transferencia', tipo: 'Inscripción', fecha: '2025-02-15' },
      { name: 'David Martín', descripcionPago: 'Cuota mensual febrero', titulo: 'Cuota Febrero 2025', importe: 45.00, metodo: 'Tarjeta', tipo: 'Cuota', fecha: '2025-02-10' },
      { name: 'Pablo Sánchez', descripcionPago: 'Material deportivo', titulo: 'Equipación', importe: 65.00, metodo: 'Efectivo', tipo: 'Material', fecha: '2025-02-20' },
    ];
  }

  /** Lista jugadores con pagos (NewCuotasComponent) — 8 equipos x 18 jugadores con totalAPagar, estado, pagadas. */
  static getDemoListPlayersPagosClub(): any[] {
    const list: any[] = [];
    DEMO_TEAMS_META.forEach((meta, teamIndex) => {
      const players = buildDemoPlayersForTeam(meta.teamId, teamIndex, meta.name);
      players.forEach((p, i) => {
        const estado = (teamIndex * 18 + i) % 3 === 0 ? 1 : 0;
        const pagadasNum = estado === 1 ? 2 : (i % 2 === 0 ? 1 : 0);
        const totalPagado = pagadasNum * 45;
        const totalAPagar = 165;
        list.push({
          playerId: p.playerId, nombre: p.nombre, apellido: p.apellido, nameTeam: meta.name, teamId: meta.teamId,
          email: p.email, totalAPagar: String(totalAPagar), totalPagado: String(totalPagado), restante: String(totalAPagar - totalPagado),
          estado, pagadas: `${pagadasNum}/2`,
        });
      });
    });
    return list;
  }

  /** Lista de cuotas/pagos del club (chips y filtros en NewCuotasComponent) */
  static getDemoListPagosClub(): any[] {
    return [
      { pagoClubId: 1, titulo: 'Cuota Marzo 2025', importe: 45, tipo: 'Cuota' },
      { pagoClubId: 2, titulo: 'Inscripción 2024/25', importe: 120, tipo: 'Inscripción' },
      { pagoClubId: 3, titulo: 'Equipación', importe: 65, tipo: 'Material' },
    ];
  }

  /** Pagos por jugador (detalle en NewCuotasComponent) */
  static getDemoListPagosClubForPlayer(_clubId: number, _temporada: string, _playerId: number): any[] {
    return [
      { pagoClubId: 1, titulo: 'Cuota Marzo 2025', importe: 45, estado: 'pagado', fecha: '2025-03-01' },
      { pagoClubId: 2, titulo: 'Inscripción 2024/25', importe: 120, estado: 'pagado', fecha: '2025-02-15' },
    ];
  }

  /** Historial de pagos por jugador */
  static getDemoListHistoryPagosByPlayer(_clubId: number, _temporada: string, _playerId: number): any[] {
    return [
      { fecha: '2025-03-01', descripcion: 'Cuota Marzo 2025', importe: 45, metodo: 'Tarjeta' },
      { fecha: '2025-02-15', descripcion: 'Inscripción temporada', importe: 120, metodo: 'Transferencia' },
    ];
  }

  // ─── Ropa (RopaComponent) ───────────────────────────────────────────────────
  /** Configuración de prendas del club (0 = columna visible). response.data */
  static getDemoRopaClub(): any {
    return {
      ropaclubId: 1,
      clubId: 9001,
      temporada: '2025',
      camisetaJuego: 0,
      pantalonJuego: 0,
      medias: 0,
      camisetaJuegoDos: 0,
      pantalonJuegoDos: 0,
      mediasDos: 0,
      camisetaEntreno: 0,
      pantalonEntreno: 0,
      mediasTres: 0,
      sudaderaEntreno: 0,
      chaquetaChandal: 0,
      pantalonChandal: 0,
      poloPaseo: 0,
      pantalonPaseo: 0,
      abrigo: 0,
      chubasquero: 0,
      mochila: 0,
    };
  }

  /** Jugadores con tallas de ropa. response.data (array) — 8 equipos x 18 jugadores */
  static getDemoRopaJugadoresByClub(): any[] {
    const tallas = ['S', 'M', 'L'];
    let ropaId = 7000;
    const result: any[] = [];
    DEMO_TEAMS_META.forEach((meta, teamIndex) => {
      const players = buildDemoPlayersForTeam(meta.teamId, teamIndex, meta.name);
      const teamRef = { teamId: meta.teamId, name: meta.name };
      players.forEach((p) => {
        result.push({
          ropaJugadorId: ++ropaId,
          player: { playerId: p.playerId, firstName: p.nombre, secondName: p.apellido, dorsal: p.dorsal },
          team: teamRef,
          clubId: 9001,
          temporada: '2025',
          camisetaJuego: tallas[p.dorsal % 3],
          pantalonJuego: 'M',
          medias: 'M',
          camisetaJuegoDos: 'L',
          pantalonJuegoDos: 'L',
          mediasDos: 'L',
          camisetaEntreno: 'M',
          pantalonEntreno: 'M',
          mediasTres: 'M',
          sudaderaEntreno: 'L',
          chaquetaChandal: 'L',
          pantalonChandal: 'M',
          poloPaseo: 'M',
          pantalonPaseo: 'M',
          abrigo: 'M',
          chubasquero: 'L',
          mochila: '1',
          camisetaJuegoOk: 1,
          pantalonJuegoOk: 1,
          camisetaEntrenoOk: 1,
          pantalonEntrenoOk: 1,
          sudaderaEntrenoOk: 1,
          chaquetaChandalOk: 1,
          pantalonChandalOk: 1,
          poloPaseoOk: 1,
          pantalonPaseoOk: 1,
          mediasOk: 1,
          mediasDosOk: 1,
          mediasTresOk: 1,
          abrigoOk: 1,
          chubasqueroOk: 1,
          mochilaOk: 1,
          camisetaJuegoDosOk: 1,
          pantalonJuegoDosOk: 1,
          estado: '1',
        });
      });
    });
    return result;
  }

  // ─── Patrocinadores ─────────────────────────────────────────────────────────
  /** Lista de patrocinadores del club o usuario. response.data. Con imagen y oculto=1 para carrusel. Logo SphairaTech repetido. */
  static getDemoPatrocinadores(): any[] {
    const sphairaLogo = '../Logo_SphairaTech1.png';
    const base = { clubId: 9001, descripcion: 'Plataforma de gestión deportiva', imagen: sphairaLogo, estado: 1, oculto: 1, web: 'https://sphairatech.com', beneficios: 'Gestión integral del club', telefono: '', mail: 'info@sphairatech.com', federacionId: 0 };
    return [
      { patrocinadorId: 1, ...base, nombre: 'SphairaTech', fechaCreate: '2025-01-15' },
      { patrocinadorId: 2, ...base, nombre: 'SphairaTech', fechaCreate: '2025-01-15' },
      { patrocinadorId: 3, ...base, nombre: 'SphairaTech', fechaCreate: '2025-01-15' },
      { patrocinadorId: 4, ...base, nombre: 'SphairaTech', fechaCreate: '2025-01-15' },
      { patrocinadorId: 5, ...base, nombre: 'SphairaTech', fechaCreate: '2025-01-15' },
      { patrocinadorId: 6, ...base, nombre: 'SphairaTech', fechaCreate: '2025-01-15' },
    ];
  }

  // ─── Notificaciones / Correos ───────────────────────────────────────────────
  /** Avatares reales por mensaje (assets/images/user/notif-avatar-N.jpg). 16 avatares para rotar. */
  private static readonly DEMO_NOTIF_AVATARS = 16;

  /** Correos (enviados y recibidos). response.data: { enviados, recibidos }. 15+ notificaciones con avatar real por mensaje. */
  static getDemoCorreos(): any {
    const now = new Date();
    const ayer = new Date(now);
    ayer.setDate(ayer.getDate() - 1);
    const anteayer = new Date(now);
    anteayer.setDate(anteayer.getDate() - 2);

    // Avatares confirmados por screenshot: M=3,5,7 | F=1,2,4,6,8
    // Avatares asumidos (impares=M, pares=F): M=9,11,13,15 | F=10,12,14,16
    // Hay 9 nombres masculinos y 7 femeninos → se usan los 7 avatares M para los más visibles
    // Francisco Martín y Daniel Torres (posiciones 14 y 16, menos visibles) usan avatar 1 y 6 (F) inevitablemente
    const recibidosBase = [
      { remitente: 'Carlos García',   asunto: 'Consulta sobre horarios',         body: '<p>Buenos días, quisiera consultar los horarios de la próxima semana.</p>',                         fecha: now,      leido: 0, avatar: 'notif-avatar-3.jpg'  }, // M ✓
      { remitente: 'Miguel López',    asunto: 'Documentación actualizada',        body: '<p>Adjunto la documentación solicitada.</p>',                                                        fecha: ayer,     leido: 1, avatar: 'notif-avatar-5.jpg'  }, // M ✓
      { remitente: 'Ana Martínez',    asunto: 'Confirmación convocatoria',        body: '<p>Confirmo mi asistencia al partido del sábado. Gracias.</p>',                                     fecha: now,      leido: 0, avatar: 'notif-avatar-2.jpg'  }, // F ✓
      { remitente: 'David Sánchez',   asunto: 'Duda sobre equipación',            body: '<p>¿Podéis indicar dónde recoger la equipación nueva? Gracias.</p>',                                fecha: ayer,     leido: 1, avatar: 'notif-avatar-7.jpg'  }, // M ✓
      { remitente: 'Laura Fernández', asunto: 'Re: Entrenamiento de porteros',    body: '<p>El entrenamiento de porteros queda confirmado para el jueves a las 18:00.</p>',                  fecha: now,      leido: 0, avatar: 'notif-avatar-4.jpg'  }, // F ✓
      { remitente: 'Pablo Ruiz',      asunto: 'Baja por lesión',                  body: '<p>Comunico que no podré asistir esta semana por una pequeña lesión. Os mantendré informados.</p>', fecha: anteayer, leido: 1, avatar: 'notif-avatar-9.jpg'  }, // M ✓
      { remitente: 'Elena Gómez',     asunto: 'Horario de la próxima jornada',    body: '<p>¿A qué hora es la concentración del próximo partido?</p>',                                      fecha: now,      leido: 0, avatar: 'notif-avatar-8.jpg'  }, // F ✓
      { remitente: 'Javier Pérez',    asunto: 'Cuota de temporada',               body: '<p>He realizado el pago de la cuota. ¿Podéis confirmar que ha llegado?</p>',                       fecha: ayer,     leido: 1, avatar: 'notif-avatar-11.jpg' }, // M ✓
      { remitente: 'Sara Díaz',       asunto: 'Felicidades por el resultado',     body: '<p>Enhorabuena por la victoria del domingo. ¡Seguimos así!</p>',                                    fecha: now,      leido: 0, avatar: 'notif-avatar-10.jpg' }, // F ✓
      { remitente: 'Roberto Moreno',  asunto: 'Cambio de dorsal',                 body: '<p>Solicito cambio de dorsal para la próxima temporada si es posible.</p>',                         fecha: ayer,     leido: 1, avatar: 'notif-avatar-13.jpg' }, // M ✓
      { remitente: 'Carmen López',    asunto: 'Reunión de padres',                body: '<p>¿La reunión de padres sigue siendo el viernes a las 19:00?</p>',                                fecha: now,      leido: 0, avatar: 'notif-avatar-12.jpg' }, // F ✓
      { remitente: 'Antonio González',asunto: 'Material de entrenamiento',        body: '<p>¿Necesitamos llevar algo especial al entrenamiento de mañana?</p>',                             fecha: anteayer, leido: 1, avatar: 'notif-avatar-15.jpg' }, // M ✓
      { remitente: 'Isabel Rodríguez',asunto: 'Cumpleaños del equipo',            body: '<p>Propongo organizar una merienda para el cumple del equipo. ¿Qué os parece?</p>',                fecha: now,      leido: 0, avatar: 'notif-avatar-14.jpg' }, // F ✓
      { remitente: 'Francisco Martín',asunto: 'Acta del último partido',          body: '<p>Cuando podáis, ¿me enviáis el acta del último partido? Gracias.</p>',                           fecha: ayer,     leido: 1, avatar: 'notif-avatar-1.jpg'  }, // (M sin avatar M disponible)
      { remitente: 'Patricia Jiménez',asunto: 'Vacaciones del entrenador',        body: '<p>¿Quién cubre los entrenamientos la próxima semana?</p>',                                        fecha: now,      leido: 0, avatar: 'notif-avatar-16.jpg' }, // F ✓
      { remitente: 'Daniel Torres',   asunto: 'Inscripción torneo verano',        body: '<p>¿El club va a inscribir equipos en el torneo de verano? Estaríamos interesados.</p>',           fecha: ayer,     leido: 1, avatar: 'notif-avatar-6.jpg'  }, // (M sin avatar M disponible)
    ];

    const enviadosBase = [
      { asunto: 'Recordatorio: entrenamiento de mañana', destinatario: 'Equipo Demo Senior',  body: '<p>Hola, os recordamos el entrenamiento de mañana a las 18:00.</p>',           fecha: ayer     },
      { asunto: 'Convocatoria partido domingo',          destinatario: 'Equipo Demo Juvenil', body: '<p>Convocatoria para el partido del domingo. Confirmar asistencia.</p>',        fecha: now      },
      { asunto: 'Cambio de horario entrenamiento',       destinatario: 'Equipo Cadete Demo',  body: '<p>Os informamos del cambio de horario del miércoles a las 18:30.</p>',        fecha: now      },
      { asunto: 'Documentación obligatoria',             destinatario: 'Todos los equipos',   body: '<p>Recordatorio: enviar documentación actualizada antes del 15.</p>',          fecha: anteayer },
      { asunto: 'Fotos oficiales',                       destinatario: 'Equipo Infantil Demo',body: '<p>Las fotos oficiales serán el sábado a las 10:00 en las instalaciones.</p>', fecha: ayer     },
    ];

    const recibidos = recibidosBase.map((r, i) => ({
      correoRecibidoId: i + 1,
      asunto: r.asunto,
      remitente: r.remitente,
      destinatario: 'Club Demo',
      body: btoa(unescape(encodeURIComponent(r.body))),
      fechaCreate: r.fecha.toISOString(),
      leido: r.leido,
      remitentePhotoUrl: r.avatar,
    }));

    const enviados = enviadosBase.map((e, i) => ({
      correoEnviadoId: i + 1,
      asunto: e.asunto,
      remitente: 'Club Demo',
      destinatario: e.destinatario,
      body: btoa(unescape(encodeURIComponent(e.body))),
      fechaCreate: e.fecha.toISOString(),
      leido: 1,
    }));

    return { enviados, recibidos };
  }

  /** Correos programados. response.data (array). Fechas relativas a hoy para que siempre sean futuras. */
  static getDemoCorreosProgramados(): any[] {
    const now = new Date();

    const future = (days: number, hour: number, min = 0): string => {
      const d = new Date(now);
      d.setDate(d.getDate() + days);
      d.setHours(hour, min, 0, 0);
      return d.toISOString();
    };

    const body = (html: string) => btoa(unescape(encodeURIComponent(html)));

    return [
      {
        correoEnviadoId: 9001,
        asunto: 'Convocatoria partido del sábado',
        destinatario: 'Equipo Senior Demo',
        body: body('<p>Hola a todos,</p><p>Os convocamos para el partido del sábado a las <strong>10:00 h</strong> en el campo municipal. Confirmad asistencia antes del viernes.</p><p>¡Ánimo!</p>'),
        scheduledAt: future(1, 9, 0),
        leido: 0,
      },
      {
        correoEnviadoId: 9002,
        asunto: 'Recordatorio: pago de cuotas de marzo',
        destinatario: 'Todos los equipos',
        body: body('<p>Estimados miembros,</p><p>Os recordamos que el plazo de pago de la cuota de marzo finaliza el próximo <strong>día 31</strong>. Por favor, realizad el ingreso con antelación para evitar incidencias.</p><p>Gracias por vuestra colaboración.</p>'),
        scheduledAt: future(3, 8, 30),
        leido: 0,
      },
      {
        correoEnviadoId: 9003,
        asunto: 'Fotos oficiales de la temporada',
        destinatario: 'Equipo Juvenil Demo',
        body: body('<p>Buenos días,</p><p>Las fotos oficiales de equipo se realizarán el <strong>próximo sábado a las 11:00 h</strong> en las instalaciones del club.</p><p>Rogamos acudáis con la equipación completa (camiseta, pantalón y medias). La puntualidad es imprescindible.</p>'),
        scheduledAt: future(5, 11, 0),
        leido: 0,
      },
      {
        correoEnviadoId: 9004,
        asunto: 'Reunión de padres — fin de temporada',
        destinatario: 'Familias Equipo Infantil',
        body: body('<p>Estimadas familias,</p><p>Os convocamos a la reunión de fin de temporada el <strong>próximo martes a las 19:30 h</strong> en el salón de actos del club.</p><p>Trataremos los temas de inscripciones para la temporada 2025/26 y la gala de entrega de trofeos.</p><p>Vuestra asistencia es muy importante.</p>'),
        scheduledAt: future(7, 19, 30),
        leido: 0,
      },
    ];
  }

  // ─── Scouting (ScoutingClubComponent) ───────────────────────────────────────
  /** Config scouting. response.data */
  static getDemoScoutingConfig(): any {
    return { pipelineEnabled: 1, reportsEnabled: 1, compareEnabled: 1 };
  }

  /** Watchlist scouting. response.data (array) */
  static getDemoScoutingWatchlist(): any[] {
    return [
      { watchlist: { id: 1, status: 'IDENTIFIED', externalPlayerName: 'Jugador Demo A', externalPlayerPosition: 'Delantero Centro', externalPlayerTeam: 'Club Rival', externalPlayerAge: 22 }, scoutingProfile: null, evaluations: [] },
      { watchlist: { id: 2, status: 'OBSERVED', externalPlayerName: 'Jugador Demo B', externalPlayerPosition: 'Mediocentro', externalPlayerTeam: 'Otro Club', externalPlayerAge: 20 }, scoutingProfile: null, evaluations: [{ overallRating: 7, technicalScore: 7, tacticalScore: 7, physicalScore: 8, evaluationDate: '2025-02-20' }] },
    ];
  }

  /** Proyectos de análisis de vídeo (video-analysis). response.data = array */
  static getDemoVideoProjects(): any[] {
    return [
      { id: 1, clubId: 9001, templateId: 1, title: 'Análisis Partido vs Club Norte', description: 'Análisis táctico del partido de liga', status: 'COMPLETED', createdBy: 1, createdAt: '2025-02-28T10:00:00', updatedAt: '2025-03-01T12:00:00', eventCount: 12, videoTitle: 'Partido Liga Jornada 22' },
      { id: 2, clubId: 9001, templateId: 1, title: 'Entrenamiento Técnica', description: 'Sesión de posesión y transiciones', status: 'IN_PROGRESS', createdBy: 1, createdAt: '2025-03-02T09:00:00', updatedAt: '2025-03-02T09:00:00', eventCount: 5 },
    ];
  }

  /** Plantillas de análisis de vídeo. response.data = array */
  static getDemoVideoTemplates(): any[] {
    return [
      { id: 1, name: 'Análisis táctico partido', description: 'Plantilla estándar para partidos', isSystem: true, isDefault: true, createdAt: '2025-01-01' },
      { id: 2, name: 'Análisis entrenamiento', description: 'Plantilla para sesiones de entrenamiento', isSystem: true, isDefault: false, createdAt: '2025-01-01' },
    ];
  }

  /** Pipeline scouting. response.data: { IDENTIFIED, OBSERVED, ... } */
  static getDemoScoutingPipeline(): any {
    const wl = DemoDataService.getDemoScoutingWatchlist();
    return {
      IDENTIFIED: [wl[0]],
      OBSERVED: [wl[1]],
      EVALUATED: [],
      SHORTLISTED: [],
      CONTACTED: [],
      DISCARDED: [],
    };
  }

  // ─── Biblioteca de vídeos (ClubVideoLibraryComponent) ───────────────────────
  /** Plan de vídeos. response.data (incluye usedPercent, storageUsedHuman, storageLimitHuman para la UI) */
  static getDemoClubVideoPlan(): any {
    return {
      hasPlan: true,
      status: 'ACTIVE',
      planName: 'Plan Demo',
      planKey: 'STARTER_1TB',
      usedPercent: 25,
      storageUsedHuman: '250 GB',
      storageLimitHuman: '1 TB',
    };
  }

  /** Lista de vídeos del club. response.data */
  static getDemoClubVideos(): any[] {
    return [
      { id: 1, title: 'Resumen partido vs Norte', duration: 120, createdAt: '2025-02-28', folderId: null },
      { id: 2, title: 'Entrenamiento táctico', duration: 90, createdAt: '2025-02-25', folderId: 1 },
    ];
  }

  /** Carpetas de vídeos. response.data */
  static getDemoClubFolders(): any[] {
    return [
      { id: 1, name: 'Partidos', color: '#31b270' },
      { id: 2, name: 'Entrenamientos', color: '#002c40' },
    ];
  }

  // ─── Ropa Catálogo (RopaCatalogoService: prendas, tabla, documentos) ────────
  /** Prendas del catálogo por club. response.data (array) */
  static getDemoPrendasByClub(): any[] {
    return [
      { prendaId: 1, clubId: 9001, teamId: null, nombre: 'Camiseta titular', descripcion: 'Camiseta oficial', categoria: 'Juego', temporada: '2025', imagenUrl: '', imagenNombre: 'demo-prenda-camiseta.png', activo: 1, createdAt: '2025-01-01', tallas: [{ tallaId: 1, prendaId: 1, nombreTalla: 'S', orden: 1 }, { tallaId: 2, prendaId: 1, nombreTalla: 'M', orden: 2 }, { tallaId: 3, prendaId: 1, nombreTalla: 'L', orden: 3 }] },
      { prendaId: 2, clubId: 9001, teamId: null, nombre: 'Pantalón entreno', descripcion: 'Pantalón técnico', categoria: 'Entreno', temporada: '2025', imagenUrl: '', imagenNombre: 'demo-prenda-pantalon.png', activo: 1, createdAt: '2025-01-01', tallas: [{ tallaId: 4, prendaId: 2, nombreTalla: 'S', orden: 1 }, { tallaId: 5, prendaId: 2, nombreTalla: 'M', orden: 2 }] },
    ];
  }

  /** Tabla tallas por equipo. response.data: { prendas, jugadores (18), selecciones } */
  static getDemoTablaByTeam(): any {
    const players = buildDemoPlayersForTeam(9001, 0, DEMO_TEAMS_META[0].name);
    return {
      prendas: DemoDataService.getDemoPrendasByClub(),
      jugadores: players.map(p => ({ playerId: p.playerId, nombre: p.nombre, apellido: p.apellido, nick: '', picturePlayer: p.picturePlayer || ('demo-player-' + (1 + (p.playerId % 4)) + '.jpg'), teamId: 9001, teamName: DEMO_TEAMS_META[0].name })),
      selecciones: [],
    };
  }

  /** Documentos del catálogo. response.data (array) */
  static getDemoDocumentosRopaByClub(): any[] {
    return [
      { documentoId: 1, clubId: 9001, teamId: null, nombre: 'Guía de tallas', descripcion: 'Guía oficial', temporada: '2025', archivoUrl: '', archivoNombre: '', tipoMime: 'application/pdf', activo: 1, createdAt: '2025-01-01' },
    ];
  }

  /** Selecciones por prenda. response.data (array) */
  static getDemoSeleccionesByPrenda(): any[] {
    return [];
  }

  /** Selecciones por jugador. response.data (array) - para ropa-jugador */
  static getDemoSeleccionesPlayer(): any[] {
    return [
      { seleccionId: 1, playerId: 8001, prendaId: 1, tallaId: 2, estado: 'CONFIRMADA', updatedAt: '2025-02-01', nombreTalla: 'M', nombrePrenda: 'Camiseta titular' },
      { seleccionId: 2, playerId: 8001, prendaId: 2, tallaId: 5, estado: 'CONFIRMADA', updatedAt: '2025-02-01', nombreTalla: 'M', nombrePrenda: 'Pantalón entreno' },
    ];
  }

  // ─── Documentos jugador (DocumentosJugadorComponent) ───────────────────────
  /** Documentos solicitados al jugador. response.data (array) */
  static getDemoDocumentosPlayer(): any[] {
    return [
      { docPadresId: 1, docClubesId: 1, nombre: 'Ficha federativa', descripcion: 'Documento obligatorio para la competición', requiere: 0, fileClub: 'demo-ficha.pdf', descargado: 1, subido: 0, clubId: 9001, playerId: 8001 },
      { docPadresId: 2, docClubesId: 1, nombre: 'Certificado médico', descripcion: 'Certificado médico actualizado', requiere: 1, fileClub: null, descargado: 0, subido: 1, clubId: 9001, playerId: 8001 },
      { docPadresId: 3, docClubesId: 1, nombre: 'Autorización imagen', descripcion: 'Autorización uso de imagen', requiere: 2, fileClub: null, descargado: 0, subido: 0, clubId: 9001, playerId: 8001 },
    ];
  }

  // ─── Cuotas jugador (CuotasComponent) ───────────────────────────────────────
  /** Respuesta getPagoCuotasPlayer: historyCuotasPlayer con obligatorios, noObligatorios, totalPagado, pendiente, etc. */
  static getDemoHistoryCuotasPlayer(_teamId?: number, _playerId?: number): any {
    return {
      totalPagado: '90',
      pendiente: '75',
      obligatorios: [
        { pagoClubId: 1, nombre: 'Cuota Marzo 2025', importe: '45', pagado: '45', plazo: '2025-03', fechaPago: '2025-03-01', stripe: 1, tipoCobro: 1, desistido: 0, stripePriceId: 'price_demo_1', comisionClub: 0 },
        { pagoClubId: 2, nombre: 'Cuota Abril 2025', importe: '45', pagado: '45', plazo: '2025-04', fechaPago: '2025-04-02', stripe: 1, tipoCobro: 1, desistido: 0, stripePriceId: 'price_demo_2', comisionClub: 0 },
        { pagoClubId: 3, nombre: 'Cuota Mayo 2025', importe: '45', pagado: '0', plazo: '2025-05', fechaPago: 'Pendiente', stripe: 1, tipoCobro: 1, desistido: 0, stripePriceId: 'price_demo_3', comisionClub: 0 },
      ],
      noObligatorios: [
        { pagoClubId: 4, nombre: 'Equipación temporada', importe: '65', pagado: '0', plazo: '2025-06', fechaPago: 'Pendiente', stripe: 2, tipoCobro: 0, desistido: 0, comisionClub: 0 },
      ],
      stripeId: 'acct_demo_123',
      banco: 'Demo Bank',
      nameClub: 'Club Demo',
      clubId: 9001,
      asunto: 'Cuotas Club Demo',
      contacto: 'cuotas@clubdemo.com',
      bizum: 0,
      terminos: btoa('<p>Condiciones de pago demo. Sin cargo real.</p>'),
    };
  }

  /** Lista de cuotas para modal Stripe (getListPagosClubForStripe). response.data = array */
  static getDemoListPagosClubForStripe(): any[] {
    return [
      { pagoClubId: 1, nombre: 'Cuota Marzo 2025', importe: '45', stripePriceId: 'price_demo_1', tipoCobro: 1, stripe: 1 },
      { pagoClubId: 2, nombre: 'Cuota Abril 2025', importe: '45', stripePriceId: 'price_demo_2', tipoCobro: 1, stripe: 1 },
      { pagoClubId: 3, nombre: 'Cuota Mayo 2025', importe: '45', stripePriceId: 'price_demo_3', tipoCobro: 1, stripe: 1 },
    ];
  }

  // ─── Scouting jugador (ScoutingPlayerComponent) ─────────────────────────────
  /** Perfil scouting del jugador. response.data — usa datos del jugador demo si existe */
  static getDemoScoutingPlayer(playerId: number): any {
    const p = getDemoPlayerById(playerId);
    const nombre = p ? p.nombre + ' ' + p.apellido : 'Jugador Demo';
    const posicion = p ? p.position : 'Delantero';
    const partidos = p ? p.partidosJugados : 18;
    const goles = p ? p.goles : 8;
    const asistencias = p ? p.asistencias : 5;
    return {
      scoutingPlayerId: 1,
      playerId,
      nombre,
      imagenPerfil: '',
      fechaDeNacimiento: '2005-03-15',
      paisResidencia: 'España',
      provinciaResidencia: 'Madrid',
      nacionalidad: 'Española',
      altura: '178',
      peso: '72',
      piernaNatural: 'Derecha',
      posicionPrincipal: posicion,
      posicionesSecundarias: posicion === 'Delantero' ? 'Extremo' : posicion === 'Centrocampista' ? 'Medio' : '',
      mailContacto: p ? p.email : 'jugador@demo.com',
      telefonoContacto: p ? p.telefono : '600000000',
      clubesAnteriores: 'Escuela local',
      ultimosPartidos: partidos,
      goles,
      asistencias,
      torneosImportantes: 'Liga Regional',
      premiosIndividuales: '',
      convocatoriasSelecciones: '',
      lesionesRecientes: 'Ninguna',
      historialMedico: '',
      estadoActual: 'Disponible',
      videoHighlights: '',
      descripcionVideo: '',
      disponibilidadPruebas: 'Sí',
      disponibilidadMudarse: 'No',
      expectativasContractuales: '',
      entrenadoresAnteriores: '',
      fortalezas: 'Velocidad y definición',
      areasMejora: 'Juego aéreo',
      estudiaTrabaja: 'Estudiante',
      descripcion: `${posicion} con buen rendimiento.`,
      estadoEstudios: 'Bachillerato',
      esPublico: 1,
      dateCreate: '2025-01-01',
      dateEdit: '2025-02-01',
    };
  }

  /** Datos deportivos del jugador (getDatosPlayer). response.data — partidos, goles, asistencias del jugador demo */
  static getDemoDatosPlayer(playerId?: number): any {
    const p = playerId != null ? getDemoPlayerById(playerId) : null;
    return {
      partidosJugados: p ? p.partidosJugados : 18,
      minutosJugados: p ? p.minutos : 1245,
      goles: p ? p.goles : 8,
      tarAmarillas: 2,
      tarRojas: 0,
      numTitulares: 15,
    };
  }

  /** Asistencia por equipo (getListsAsistenciaByTeam). response.data = { players, asistMultasPlayers, asistenciaTotales } */
  static getDemoListAsistenciaByTeam(teamId?: number): any {
    const id = teamId || 9001;
    const teamIndex = DEMO_TEAMS_META.findIndex(t => t.teamId === id);
    const idx = teamIndex >= 0 ? teamIndex : 0;
    const meta = DEMO_TEAMS_META[idx];
    const allPlayers = buildDemoPlayersForTeam(meta.teamId, idx, meta.name);
    const players = allPlayers.map(p => `${p.nombre} ${p.apellido}`);

    // Generar 10 sesiones de entrenamiento en los \u00faltimos 5 semanas
    const sessions: any[] = [];
    const base = new Date('2025-03-03');
    for (let week = 0; week < 5; week++) {
      const days = [1, 3, 5]; // L,X,V
      for (const d of days) {
        const date = new Date(base);
        date.setDate(base.getDate() + week * 7 + (d - 1));
        const dateStr = date.toISOString().split('T')[0];
        const asistencia = players.map((_, pi) => {
          const seed = (pi + week + d) % 10;
          return seed < 1 ? 0 : 1;
        });
        const multas = asistencia.map(a => (a === 0 ? 1 : 0));
        const multaPagada = multas.map((m, mi) => (m === 1 && (mi + week) % 3 === 0 ? 1 : 0));
        sessions.push({
          fecha: dateStr,
          asistencia,
          multas,
          multaPagada,
          idsPk: players.map((_, pi) => 70000 + idx * 500 + week * 30 + d * 10 + pi)
        });
      }
    }

    // Totales de asistencia por jugador
    const asistenciaTotales = players.map((nombre, pi) => {
      const totalSessions = sessions.length;
      const attended = sessions.filter(s => s.asistencia[pi] === 1).length;
      const absent = totalSessions - attended;
      const pct = Math.round((attended / totalSessions) * 100);
      return { nombre, totalSessions, attended, absent, pct };
    });

    return { players, asistMultasPlayers: sessions, asistenciaTotales };
  }

  /** Asistencia por jugador (getListsAsistenciaByTeamYPlayer). response.data = array. Campos: fecha, asistencia (0/1), tipo. */
  static getDemoListAsistenciaByPlayer(): any[] {
    return [
      { fecha: '2025-02-03', asistencia: 1, tipo: 'Entrenamiento' },
      { fecha: '2025-02-05', asistencia: 1, tipo: 'Entrenamiento' },
      { fecha: '2025-02-07', asistencia: 0, tipo: 'Partido' },
      { fecha: '2025-02-10', asistencia: 1, tipo: 'Entrenamiento' },
      { fecha: '2025-02-12', asistencia: 1, tipo: 'Entrenamiento' },
      { fecha: '2025-02-14', asistencia: 1, tipo: 'Partido' },
      { fecha: '2025-02-17', asistencia: 1, tipo: 'Entrenamiento' },
      { fecha: '2025-02-19', asistencia: 1, tipo: 'Entrenamiento' },
      { fecha: '2025-02-21', asistencia: 1, tipo: 'Partido' },
    ];
  }

  // ─── Staff Club (StaffClubComponent) ────────────────────────────────────────
  /** Lista demo de usuarios de staff del club (mismo shape que API). */
  static getDemoStaffList(): any[] {
    return [
      {
        userId: 9101,
        firstName: 'Laura',
        secondName: 'Coordinadora',
        mail: 'laura.coordinadora@clubdemo.com',
        clubId: 9001,
        permissions: [
          'DASHBOARD_PLAYERS',
          'DASHBOARD_STATS_PLR',
          'TEAMS',
          'DOCUMENTS',
          'PAYMENTS',
          'CLOTHING',
        ],
        enabled: true,
      },
      {
        userId: 9102,
        firstName: 'Pedro',
        secondName: 'Marketing',
        mail: 'pedro.marketing@clubdemo.com',
        clubId: 9001,
        permissions: [
          'SPONSORS',
          'NOTIFICATIONS',
          'VIDEO_LIBRARY',
          'SCOUTING',
        ],
        enabled: true,
      },
      {
        userId: 9103,
        firstName: 'Marta',
        secondName: 'Administración',
        mail: 'marta.admin@clubdemo.com',
        clubId: 9001,
        permissions: [
          'TEAMS',
          'PAYMENTS',
          'ERP',
        ],
        enabled: false,
      },
    ];
  }
}
