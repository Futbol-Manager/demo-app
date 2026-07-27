import { demoenvironmentDeploy } from './environment-list';

/**
 * Usar esta configuración al desplegar en demo.sphairatech.com.
 * Los leads se envían a la API de appsphairatech.com, que es la que alimenta el panel
 * de administración de leads. En demo.sphairatech.com no hay ninguna API desplegada.
 */
export const environment = demoenvironmentDeploy;
