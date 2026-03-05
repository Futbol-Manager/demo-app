import { environment } from 'src/environments/environment';

/**
 * Devuelve true si la app está en modo demo: por build (environment.demo)
 * o por URL (dominio demo.sphairatech.com o *.demo.*).
 * Así el mismo build desplegado en demo.sphairatech.com puede usar login sin contraseña y datos demo.
 */
export function isDemoMode(): boolean {
  if (typeof window === 'undefined') return !!(environment as { demo?: boolean }).demo;
  const h = window.location.hostname.toLowerCase();
  return !!(environment as { demo?: boolean }).demo || h === 'demo.sphairatech.com' || h.startsWith('demo.');
}
