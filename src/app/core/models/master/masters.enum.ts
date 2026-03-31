export const APIURLPROD:string = 'https://sphairatech.com'
export const APIURLPROD2:string = 'https://appsphairatech.com'
/** API para la demo desplegada. Misma base que el front (https://demo.sphairatech.com); los leads van a /api/rest. */
export const APIURLDEMO:string = 'https://demo.sphairatech.com'
export const APIURLLOCAL:string = 'http://localhost:8081'
export const IMAGESASSETS:string = '/assets/images/'

/**
 * Entornos de la api
 */
export enum ApiEnvironments{
    LOCAL = '/api/rest/',
    PRO = '/api/rest/',
    DESA = '/api-desa/rest/'
}

/**
 * Carpetas de las imágenes según el entorno en el que nos encontremos
 */
export enum ImageEnvironments{
    DESA = '/images',
    PRO = '/images',
}


