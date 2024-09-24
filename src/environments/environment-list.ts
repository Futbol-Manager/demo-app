import { APIURLPROD, APIURLLOCAL, ApiEnvironments, APIURLPROD2 } from "src/app/core/models/master/masters.enum";

export const localenvironment = {
  production: false,
  apiUrl: `${APIURLLOCAL}${ApiEnvironments.LOCAL}`
}

export const prodenvironment = {
  production: true,
  apiUrl: `${APIURLPROD2}${ApiEnvironments.PRO}`
}

