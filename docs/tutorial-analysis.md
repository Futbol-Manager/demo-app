# Análisis de tutoriales por rol (Club, Coach, Player)

## Resumen

- **Todos los componentes** usados por Club, Coach y Player tienen un tutorial registrado en `TutorialService` y un `currentTutorialScreenId` en el header.
- **Lo que faltaba**: varios tutoriales tenían pasos **sin `audioFile`** y aún incluían el paso **"Volver"**. En este análisis se identifican y se completan.

## Estado por rol

### Club
| Pantalla | Tutorial | Pasos con audio | Acción |
|----------|----------|------------------|--------|
| cuadro-de-mandos | ✅ | ✅ | OK |
| equipos, documentos-club, new-cuotas, ropa, patrocinadores | ✅ | ✅ | OK |
| notificaciones, staff-club, scouting-club, club-videos | ✅ | ✅ | OK |
| video-analysis, asistente-ia | ✅ | ✅ | OK |
| info-jugadores, info-entrenadores | ✅ | ✅ | OK |
| estadisticas-jugadores-club, estadisticas-equipos-club | ✅ | ✅ | OK |
| calendario-club, menu-club | ✅ | ✅ | OK |
| **contabilidad** | ✅ | ✅ | Completado |
| **historial-pagos-club** | ✅ | ✅ | Completado |
| **abonados** | ✅ | ✅ | Completado |
| **suscripcion-club** | ✅ | ✅ | Completado |
| **suscripcion-club-wizard** | ✅ | ✅ | Completado |
| **sugerencias-club** | ✅ | ✅ | Completado |
| **listado-clubes** | ✅ | ✅ | Completado |
| **erp** | ✅ | ✅ | Completado |
| **menu-fisio** | ✅ | ✅ | Completado (fisio = club) |

### Coach
| Pantalla | Tutorial | Pasos con audio | Acción |
|----------|----------|------------------|--------|
| menu-entrenador, calendario, tareas, tactical-board | ✅ | ✅ | OK |
| tareas-catalog, tareas-historial, tareas-favoritas, tareas-mis | ✅ | ✅ | OK |
| jugadores, informacion-equipo, estadisticas-equipo/jugadores | ✅ | ✅ | OK |
| clasificacion-resultados, partidos-entrevistas, lesiones | ✅ | ✅ | OK |
| asistente-ia-coach, debrief-history | ✅ | ✅ | OK |
| perfil-entrenador, documentos-entrenador | ✅ | ✅ | OK |
| **entrenadores** | ✅ | ✅ | Completado |
| **asistencia** | ✅ | ✅ | Completado |
| **debrief-templates** | ✅ | ✅ | Completado |
| **debrief-training** | ✅ | ✅ | Completado |
| **debrief-match** | ✅ | ✅ | Completado |
| **debrief-report** | ✅ | ✅ | Completado |
| **individual-training** | ✅ | ✅ | Completado |
| **suscripcion-coach** | ✅ | ✅ | Completado |
| **coach-suscripcion-success** | ✅ | ✅ | Completado |

### Player
| Pantalla | Tutorial | Pasos con audio | Acción |
|----------|----------|------------------|--------|
| opcionesjugador, cuotas, documentos-jugador | ✅ | ✅ | OK |
| scouting-player, patrocinadores-usuario, ropa-jugador | ✅ | ✅ | OK |
| **suscripcion** | ✅ | ✅ | Completado |
| **inicio-deportes** | ✅ | ✅ | Completado |

## Rutas sin tutorial propio (uso de otro)

- **cuadro-de-mandos/entrenamientos, goleadores, puntuaciones, cuotas, horario-equipos, estadisticas-entrenadores-club, lesiones-club**: el header asigna `calendario-club`, `estadisticas-*`, etc. o `dashboard-inicio`; no requieren tutorial específico adicional.
- **notificaciones-usuario**: usa el mismo componente que notificaciones; se puede reutilizar el mismo tutorial o añadir `notificaciones-usuario` si se desea texto distinto.

## Carpeta de audios

Todos los archivos de voz se generan y almacenan en:

```
rep-futbol/src/assets/audio/tutorial/
```

Se generan con el script `npm run generate-tutorial-audio` (ElevenLabs, voz masculina español).
