export type AppLangCode =
  | 'es' | 'en' | 'fr' | 'de' | 'it' | 'pt';

export const APP_SUPPORTED_LANG_CODES: readonly AppLangCode[] = [
  'es', 'en', 'fr', 'de', 'it', 'pt',
] as const;

export function isAppLangCode(code: string | null | undefined): code is AppLangCode {
  return !!code && (APP_SUPPORTED_LANG_CODES as readonly string[]).includes(code);
}

export interface AppLanguageOption {
  code: AppLangCode;
  label: string;
  flagEmoji: string;
}

export const APP_LANGUAGE_OPTIONS: readonly AppLanguageOption[] = [
  { code: 'es', label: 'Espa\u00f1ol',   flagEmoji: '\uD83C\uDDEA\uD83C\uDDF8' },
  { code: 'en', label: 'English',        flagEmoji: '\uD83C\uDDEC\uD83C\uDDE7' },
  { code: 'fr', label: 'Fran\u00e7ais',  flagEmoji: '\uD83C\uDDEB\uD83C\uDDF7' },
  { code: 'de', label: 'Deutsch',        flagEmoji: '\uD83C\uDDE9\uD83C\uDDEA' },
  { code: 'it', label: 'Italiano',       flagEmoji: '\uD83C\uDDEE\uD83C\uDDF9' },
  { code: 'pt', label: 'Portugu\u00eas', flagEmoji: '\uD83C\uDDF5\uD83C\uDDF9' },
];
