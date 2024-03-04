import { APIURLPROD, APIURLLOCAL, ApiEnvironments } from "src/app/core/models/master/masters.enum";

export const localenvironment = {
  production: false,
  apiUrl: `${APIURLLOCAL}${ApiEnvironments.LOCAL}`
}

export const prodenvironment = {
  production: true,
  apiUrl: `${APIURLPROD}${ApiEnvironments.PRO}`
}

