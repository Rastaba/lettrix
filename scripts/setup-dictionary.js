const https = require('https');
const fs = require('fs');
const path = require('path');

const DICT_DIR = path.join(__dirname, '..', 'server', 'data');

const DICTS = [
  {
    lang: 'en',
    file: 'dictionary-en.txt',
    urls: [
      'https://raw.githubusercontent.com/dwyl/english-words/master/words_alpha.txt',
    ],
  },
  {
    lang: 'fr',
    file: 'dictionary-fr.txt',
    urls: [
      'https://raw.githubusercontent.com/Thecoolsim/French-Scrabble-ODS8/main/French%20ODS%20dictionary.txt', // open-source French word list
      'https://raw.githubusercontent.com/lorenbrichter/Words/master/Words/fr.txt',
    ],
  },
];

function download(url) {
  return new Promise((resolve, reject) => {
    const get = (u) => {
      https.get(u, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          get(res.headers.location);
          return;
        }
        if (res.statusCode !== 200) { reject(new Error(`HTTP ${res.statusCode}`)); return; }
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => resolve(data));
        res.on('error', reject);
      }).on('error', reject);
    };
    get(url);
  });
}

async function downloadDict({ lang, file, urls }) {
  const dest = path.join(DICT_DIR, file);
  if (fs.existsSync(dest)) {
    console.log(`[${lang}] Already exists: ${file}`);
    return;
  }

  for (const url of urls) {
    try {
      console.log(`[${lang}] Downloading from ${url} ...`);
      const data = await download(url);
      const words = data
        .split(/\r?\n/)
        .map((w) => w.trim().toUpperCase())
        .filter((w) => w.length >= 2 && w.length <= 15 && /^[A-Z]+$/.test(w));
      fs.writeFileSync(dest, words.join('\n'));
      console.log(`[${lang}] Done: ${words.length} words -> ${file}`);
      return;
    } catch (e) {
      console.warn(`[${lang}] Failed from ${url}: ${e.message}`);
    }
  }
  console.error(`[${lang}] Could not download dictionary.`);
}

async function main() {
  if (!fs.existsSync(DICT_DIR)) fs.mkdirSync(DICT_DIR, { recursive: true });
  for (const d of DICTS) await downloadDict(d);
}

main();
