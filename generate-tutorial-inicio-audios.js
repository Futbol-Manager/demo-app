// Script para generar audios de tutorial de inicio (Redes Sociales + Tienda)
// Uso: node generate-tutorial-inicio-audios.js
const https = require('https');
const fs = require('fs');
const path = require('path');

const API_KEY = '267900036aa376c204e321eb8e3d3c6d858379ecba36d6b671c5983fde3566d1';
const MODEL_ID = 'eleven_multilingual_v2';
const OUTPUT_DIR = path.join(__dirname, 'src', 'assets', 'audio', 'tutorial');

const VOICES = {
  es: 'RwzBDEn5f6FIgpAjH9YN', // Mateo
  en: 'JBFqnCBsd6RMkjVDRZzb', // George
  fr: 'onwK4e9ZLuTAKqWW03F9', // Daniel
  de: 'onwK4e9ZLuTAKqWW03F9', // Daniel
  pt: 'onwK4e9ZLuTAKqWW03F9', // Daniel
  it: 'onwK4e9ZLuTAKqWW03F9', // Daniel
};

const AUDIOS = [
  // --- REDES SOCIALES ---
  {
    file: 'inicio_redes.mp3',
    lang: 'es',
    text: 'Redes Sociales. Gestiona la presencia digital de tu club desde aqu\u00ed. Puedes ver todas las publicaciones en Facebook, Instagram y Twitter, programar nuevo contenido y consultar cu\u00e1ntas personas interact\u00faan con cada post. Tu comunidad, siempre informada y conectada.',
  },
  {
    file: 'inicio_redes_en.mp3',
    lang: 'en',
    text: "Social Media. Manage your club's digital presence all in one place. View posts across Facebook, Instagram and Twitter, schedule new content, and check how each publication is performing. Keep your community informed and engaged.",
  },
  {
    file: 'inicio_redes_fr.mp3',
    lang: 'fr',
    text: "R\u00e9seaux Sociaux. G\u00e9rez la pr\u00e9sence digitale de votre club depuis cet espace. Consultez les publications sur Facebook, Instagram et Twitter, programmez du nouveau contenu et suivez les performances de chaque post. Votre communaut\u00e9, toujours inform\u00e9e et connect\u00e9e.",
  },
  {
    file: 'inicio_redes_de.mp3',
    lang: 'de',
    text: 'Soziale Medien. Verwalten Sie hier die digitale Pr\u00e4senz Ihres Vereins. Sehen Sie die Beitr\u00e4ge auf Facebook, Instagram und Twitter ein, planen Sie neue Inhalte und verfolgen Sie die Leistung jedes Beitrags. Ihre Community stets informiert und vernetzt.',
  },
  {
    file: 'inicio_redes_pt.mp3',
    lang: 'pt',
    text: 'Redes Sociais. Gira a presen\u00e7a digital do seu clube a partir daqui. Consulte as publica\u00e7\u00f5es no Facebook, Instagram e Twitter, programe novo conte\u00fado e veja o desempenho de cada publica\u00e7\u00e3o. A sua comunidade sempre informada e ligada.',
  },
  {
    file: 'inicio_redes_it.mp3',
    lang: 'it',
    text: 'Social Media. Gestisci la presenza digitale del tuo club da qui. Consulta le pubblicazioni su Facebook, Instagram e Twitter, programma nuovi contenuti e monitora le performance di ogni post. La tua community sempre informata e connessa.',
  },
  // --- TIENDA DEL CLUB ---
  {
    file: 'inicio_tienda.mp3',
    lang: 'es',
    text: 'Tienda del Club. El espacio oficial de merchandising de tu club. Publica camisetas, ch\u00e1ndales, bufandas y todo tipo de art\u00edculos oficiales para que los socios y las familias los vean y los pidan directamente. Un cat\u00e1logo digital con precios, im\u00e1genes y gesti\u00f3n de pedidos, todo en uno.',
  },
  {
    file: 'inicio_tienda_en.mp3',
    lang: 'en',
    text: "Club Shop. Your club's official merchandise space. List shirts, tracksuits, scarves and any official item so supporters and families can browse and order directly. A digital catalogue with prices, photos and order management, all in one place.",
  },
  {
    file: 'inicio_tienda_fr.mp3',
    lang: 'fr',
    text: "Boutique du Club. L'espace officiel de merchandising de votre club. Publiez maillots, surv\u00eatements, \u00e9charpes et tout article officiel pour que supporters et familles les consultent et commandent directement. Un catalogue digital avec prix, photos et gestion des commandes int\u00e9gr\u00e9e.",
  },
  {
    file: 'inicio_tienda_de.mp3',
    lang: 'de',
    text: 'Vereins-Shop. Der offizielle Merchandise-Bereich Ihres Vereins. Ver\u00f6ffentlichen Sie Trikots, Trainingsanz\u00fcge, Schals und alle offiziellen Artikel, damit Mitglieder und Familien sie ansehen und direkt bestellen k\u00f6nnen. Ein digitaler Katalog mit Preisen, Bildern und Bestellverwaltung in einem.',
  },
  {
    file: 'inicio_tienda_pt.mp3',
    lang: 'pt',
    text: 'Loja do Clube. O espa\u00e7o oficial de merchandising do seu clube. Publique camisolas, fatos de treino, cachec\u00f3is e qualquer artigo oficial para que adeptos e fam\u00edlias os consultem e encomendem diretamente. Um cat\u00e1logo digital com pre\u00e7os, fotos e gest\u00e3o de encomendas integrada.',
  },
  {
    file: 'inicio_tienda_it.mp3',
    lang: 'it',
    text: "Negozio del Club. Lo spazio ufficiale di merchandising del tuo club. Pubblica maglie, tute, sciarpe e qualsiasi articolo ufficiale affinch\u00e9 tifosi e famiglie li consultino e ordinino direttamente. Un catalogo digitale con prezzi, foto e gestione degli ordini integrata.",
  },
];

function generateAudio(item) {
  return new Promise((resolve, reject) => {
    const voiceId = VOICES[item.lang];
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
    const body = JSON.stringify({
      text: item.text,
      model_id: MODEL_ID,
      voice_settings: { stability: 0.5, similarity_boost: 0.75 }
    });

    const options = {
      method: 'POST',
      headers: {
        'xi-api-key': API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg',
        'Content-Length': Buffer.byteLength(body)
      }
    };

    const req = https.request(url, options, (res) => {
      if (res.statusCode !== 200) {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => reject(new Error(`HTTP ${res.statusCode}: ${data}`)));
        return;
      }
      const filePath = path.join(OUTPUT_DIR, item.file);
      const fileStream = fs.createWriteStream(filePath);
      res.pipe(fileStream);
      fileStream.on('finish', () => {
        const stats = fs.statSync(filePath);
        console.log(`OK  ${item.file}  (${Math.round(stats.size / 1024)} KB)`);
        resolve();
      });
      fileStream.on('error', reject);
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  console.log(`Generando ${AUDIOS.length} audios en: ${OUTPUT_DIR}\n`);
  for (const item of AUDIOS) {
    try {
      await generateAudio(item);
      await new Promise(r => setTimeout(r, 600));
    } catch (err) {
      console.error(`ERR ${item.file}: ${err.message}`);
    }
  }
  console.log('\nGeneracion completada.');
}

main();
