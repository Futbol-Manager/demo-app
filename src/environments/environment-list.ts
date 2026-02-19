import { APIURLPROD, APIURLLOCAL, ApiEnvironments, APIURLPROD2, ImageEnvironments } from "src/app/core/models/master/masters.enum";

export const localenvironment = {
  production: false,
  //para apuntar a la api local
  apiUrl: `${APIURLLOCAL}${ApiEnvironments.LOCAL}`,
  images: `${APIURLPROD2}${ImageEnvironments.DESA}/`,
  stripePublicKey: 'pk_test_51PIUivHzMBDrutQnxB3X6RlNQ2DR65e3hoDglo8Vo8zU23tmRuviJcQWGrLLUqFP4LK9RPa6czfJSh2w6V3eW7iL008i311mCU',
  //stripePublicKey: 'pk_live_51PIUivHzMBDrutQn6OvgtO0aQ3ixFWwxRdsvdGfFlUVNH3nErHwoqXMhJ5lEfxF42Bdm9xplEuYOwAb8Iz1hVWTM00HKWC1CkL'
  stripePrices: {
    clubMonthly: 'price_1QC6W3HzMBDrutQnKitrxLpV',
    clubAnnual: 'price_1QC6VpHzMBDrutQnbCKNmItj',
    clubFree: 'price_1QkkOTHzMBDrutQnAQ8zchAz',
    scoutingMonthly: 'price_1QCzwDHzMBDrutQnzNPTj1G9',
    scoutingAnnual: 'price_1QCzw9HzMBDrutQnYz3ctq3A',
    coachMonthly: 'price_1Q5x7MHzMBDrutQnaF1WOHLm',
    coachAnnual: 'price_1Q5x7uHzMBDrutQnCnc54UjO'
  }

  //para apuntar a la api local y la bbdd de desa
  /*apiUrl: `${APIURLLOCAL}${ApiEnvironments.LOCAL}`,
  images: `${APIURLPROD2}${ImageEnvironments.DESA}/`,*/

  //para apuntar a la api local y a la bbdd de pro
  /*apiUrl: `${APIURLLOCAL}${ApiEnvironments.LOCAL}`,
  images: `${APIURLPROD2}${ImageEnvironments.DESA}/`,*/

  //para apuntar a la api-desa (requiere CORS actualizado en backend de desarrollo)
  /*apiUrl: `${APIURLPROD2}${ApiEnvironments.DESA}`,
  images: `${APIURLPROD2}${ImageEnvironments.DESA}/`,*/
}

export const prodenvironment = {
  production: true,
  apiUrl: `${APIURLPROD2}${ApiEnvironments.PRO}`,
  images: `${APIURLPROD2}${ImageEnvironments.PRO}/`,
  stripePublicKey: 'pk_live_51PIUivHzMBDrutQn6OvgtO0aQ3ixFWwxRdsvdGfFlUVNH3nErHwoqXMhJ5lEfxF42Bdm9xplEuYOwAb8Iz1hVWTM00HKWC1CkL',
  stripePrices: {
    clubMonthly: 'price_1QC6W3HzMBDrutQnKitrxLpV',
    clubAnnual: 'price_1QC6VpHzMBDrutQnbCKNmItj',
    clubFree: 'price_1QkkOTHzMBDrutQnAQ8zchAz',
    scoutingMonthly: 'price_1QCzwDHzMBDrutQnzNPTj1G9',
    scoutingAnnual: 'price_1QCzw9HzMBDrutQnYz3ctq3A',
    coachMonthly: 'price_1QCzwDHzMBDrutQnzNPTj1G9',
    coachAnnual: 'price_1QCzw9HzMBDrutQnYz3ctq3A'
  }

  //para apuntar a la api-desa
  /*apiUrl: `${APIURLPROD2}${ApiEnvironments.DESA}`,
  images: `${APIURLPROD2}${ImageEnvironments.DESA}/`,*/
}

