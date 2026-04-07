import { TranslateService } from '@ngx-translate/core';

function slugifyI18nKey(s: string): string {
  return (s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

/** Etiqueta de posición (valor en español del config ? i18n SPORT_POS.<sport>.<slug>). */
export function sportPositionLabel(
  translate: TranslateService,
  sportKey: string,
  rawSpanishLabel: string
): string {
  const k = `SPORT_POS.${sportKey}.${slugifyI18nKey(rawSpanishLabel)}`;
  const v = translate.instant(k);
  return v !== k ? v : rawSpanishLabel;
}

/** Etiqueta de competición / nivel (SPORT_LEAGUES.<sport>.<slug>). */
export function sportLeagueLabel(
  translate: TranslateService,
  sportKey: string,
  rawLabel: string
): string {
  const k = `SPORT_LEAGUES.${sportKey}.${slugifyI18nKey(rawLabel)}`;
  const v = translate.instant(k);
  return v !== k ? v : rawLabel;
}

/** Plural de la metrica de anotacion segun deporte (Goles, Puntos, Carreras...). */
export function sportScoringPlural(
  translate: TranslateService,
  sportKey: string,
  fallback: string
): string {
  const k = `SPORT_UI.SCORING_PLURAL.${sportKey}`;
  const v = translate.instant(k);
  return v !== k ? v : fallback;
}

/** Titulo de seccion tipo "En el campo / En la cancha" por deporte. */
export function sportSectionOnField(
  translate: TranslateService,
  sportKey: string,
  fallbackTitle: string
): string {
  const k = `SPORT_UI.SECTION_ON_FIELD.${sportKey}`;
  const v = translate.instant(k);
  return v !== k ? v : fallbackTitle;
}
