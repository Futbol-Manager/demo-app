import { APIURLPROD, APIURLLOCAL, ApiEnvironments, APIURLPROD2, APIURLDEMO, ImageEnvironments } from "src/app/core/models/master/masters.enum";

/** Entorno para la app demo en LOCAL/desarrollo: login solo con email, leads se envían a la API que indiques (por defecto producción). */
export const demoenvironment = {
  production: false,
  demo: true,
  apiUrl: `${APIURLLOCAL}${ApiEnvironments.LOCAL}`,
  /** En desarrollo local los leads pueden ir a producción; para desplegar en demo.sphairatech.com usa la config "demo-deploy". */
  demoLeadApiUrl: `${APIURLPROD2}${ApiEnvironments.PRO}`.replace(/\/$/, ''),
  prospectorApiUrl: 'http://localhost:8100/api/',
  /** Ruta absoluta para que el logo del club y demás imágenes carguen bien desde cualquier ruta (ej. /dashboard/equipos). */
  images: '/assets/images/',
  stripePublicKey: 'pk_test_51PIUivHzMBDrutQnxB3X6RlNQ2DR65e3hoDglo8Vo8zU23tmRuviJcQWGrLLUqFP4LK9RPa6czfJSh2w6V3eW7iL008i311mCU',
  stripePrices: {
    clubMonthly: 'price_1QC6W3HzMBDrutQnKitrxLpV',
    clubAnnual: 'price_1QC6VpHzMBDrutQnbCKNmItj',
    clubFree: 'price_1QkkOTHzMBDrutQnAQ8zchAz',
    scoutingMonthly: 'price_1QCzwDHzMBDrutQnzNPTj1G9',
    scoutingAnnual: 'price_1QCzw9HzMBDrutQnYz3ctq3A',
    coachMonthly: 'price_1Q5x7MHzMBDrutQnaF1WOHLm',
    coachAnnual: 'price_1Q5x7uHzMBDrutQnCnc54UjO'
  },
  /** ElevenLabs TTS para voces del tutorial demo. Voice ID: cambia en elevenlabs.io si quieres otra voz. */
  elevenLabsApiKey: 'sk_f7c4288883b554c1650b4bd1aec01f082aaca09258796c52',
  elevenLabsVoiceId: '21m00Tcm4TlvDq8ikWAM' // Rachel (multilingual). Puedes usar otro voice_id desde tu cuenta ElevenLabs.
};

/** Para desplegar en demo.sphairatech.com: leads a API dedicada (APIURLDEMO), que debe usar una BD distinta a producción. */
export const demoenvironmentDeploy = {
  ...demoenvironment,
  production: true,
  /** API de demo: base de datos separada de producción. Configurar APIURLDEMO en masters.enum. */
  demoLeadApiUrl: `${APIURLDEMO}/api/rest`.replace(/\/\/+/g, '/'),
};

/** Igual que demoenvironment pero envía el lead a la API local (api-futbol-manager en :8081). Para verificar envío. */
export const demoenvironmentLocal = {
  ...demoenvironment,
  demoLeadApiUrl: 'http://localhost:8081/api/rest',
};

export const localenvironment = {
  production: false,
  demo: false,
  //para apuntar a la api local
  apiUrl: `${APIURLLOCAL}${ApiEnvironments.LOCAL}`,
  prospectorApiUrl: 'http://localhost:8100/api/',
  images: `${APIURLPROD2}${ImageEnvironments.DESA}/`,
  // BD cualquiera en local -> clave TEST (el backend hace fallback si el cliente es live)
  stripePublicKey: 'pk_test_51PIUivHzMBDrutQnxB3X6RlNQ2DR65e3hoDglo8Vo8zU23tmRuviJcQWGrLLUqFP4LK9RPa6czfJSh2w6V3eW7iL008i311mCU',
  // Produccion -> clave LIVE
  //stripePublicKey: 'pk_live_51PIUivHzMBDrutQn6OvgtO0aQ3ixFWwxRdsvdGfFlUVNH3nErHwoqXMhJ5lEfxF42Bdm9xplEuYOwAb8Iz1hVWTM00HKWC1CkL',
  stripePrices: {
    clubMonthly: 'price_1QC6W3HzMBDrutQnKitrxLpV',
    clubAnnual: 'price_1QC6VpHzMBDrutQnbCKNmItj',
    clubFree: 'price_1QkkOTHzMBDrutQnAQ8zchAz',
    scoutingMonthly: 'price_1QCzwDHzMBDrutQnzNPTj1G9',
    scoutingAnnual: 'price_1QCzw9HzMBDrutQnYz3ctq3A',
    coachMonthly: 'price_1Q5x7MHzMBDrutQnaF1WOHLm',
    coachAnnual: 'price_1Q5x7uHzMBDrutQnCnc54UjO'
  },

  //para apuntar a la api local y la bbdd de desa
  /*apiUrl: `${APIURLLOCAL}${ApiEnvironments.LOCAL}`,
  images: `${APIURLPROD2}${ImageEnvironments.DESA}/`,*/

  //para apuntar a la api local y a la bbdd de pro
  /*apiUrl: `${APIURLLOCAL}${ApiEnvironments.LOCAL}`,
  images: `${APIURLPROD2}${ImageEnvironments.DESA}/`,*/

  //para apuntar a la api-desa (requiere CORS actualizado en backend de desarrollo)
  /*apiUrl: `${APIURLPROD2}${ApiEnvironments.DESA}`,
  images: `${APIURLPROD2}${ImageEnvironments.DESA}/`,*/

  elevenLabsApiKey: undefined as string | undefined,
  elevenLabsVoiceId: undefined as string | undefined
}

export const prodenvironment = {
  production: true,
  demo: false,
  apiUrl: `${APIURLPROD2}${ApiEnvironments.PRO}`,
  prospectorApiUrl: 'http://localhost:8001/api/',
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
  },

  //para apuntar a la api-desa
  /*apiUrl: `${APIURLPROD2}${ApiEnvironments.DESA}`,
  images: `${APIURLPROD2}${ImageEnvironments.DESA}/`,*/

  elevenLabsApiKey: undefined as string | undefined,
  elevenLabsVoiceId: undefined as string | undefined
}

