import { demoenvironmentDeploy } from './environment-list';

/**
 * Usar esta configuración al desplegar en demo.sphairatech.com.
 * Los leads se envían a la API de demo (APIURLDEMO), que debe usar una base de datos distinta a producción.
 */
export const environment = demoenvironmentDeploy;
