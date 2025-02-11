import { APIURLPROD, APIURLLOCAL, ApiEnvironments, APIURLPROD2, ImageEnvironments } from "src/app/core/models/master/masters.enum";

export const localenvironment = {
  production: false,
  //pasa apuntar al api que apunta a PRO
  apiUrl: `${APIURLLOCAL}${ApiEnvironments.LOCAL}`,
  images: `${APIURLPROD2}${ImageEnvironments.PRO}/`,
  
  //para apuntar a la api local y la bbdd de desa
  /*apiUrl: `${APIURLLOCAL}${ApiEnvironments.LOCAL}`,
  images: `${APIURLPROD2}${ImageEnvironments.DESA}/`,*/
  
  //para apuntar a la api local y a la bbdd de pro
  /*apiUrl: `${APIURLLOCAL}${ApiEnvironments.LOCAL}`,
  images: `${APIURLPROD2}${ImageEnvironments.DESA}/`,*/

  //para apuntar a la api-desa
  /*apiUrl: `${APIURLPROD2}${ApiEnvironments.DESA}`,
  images: `${APIURLPROD2}${ImageEnvironments.DESA}/`,*/
}

export const prodenvironment = {
  production: true,
  apiUrl: `${APIURLPROD2}${ApiEnvironments.PRO}`,
  images: `${APIURLPROD2}${ImageEnvironments.PRO}/`,
  
  //para apuntar a la api-desa
  /*apiUrl: `${APIURLPROD2}${ApiEnvironments.DESA}`,
  images: `${APIURLPROD2}${ImageEnvironments.DESA}/`,*/
}

