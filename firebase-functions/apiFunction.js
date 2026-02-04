const functions = require('firebase-functions');
const axios = require('axios');

const RAWG_API_KEY = functions.config().rawg?.key || process.env.RAWG_API_KEY;
const FACTIONY_KEY = 'FACTIONY_KEY_35d39805f838ac70aa9dca01e4e3ff0764e638dd341728f4';

const allowedOrigins = [
  'https://factiony.com',
  'https://www.factiony.com',
];

function isOriginAllowed(origin) {
  if (!origin) return false;

  if (allowedOrigins.includes(origin)) {
    return true;
  }

  if (origin.endsWith('.webcontainer-api.io') || origin.endsWith('.local-credentialless.webcontainer-api.io')) {
    return true;
  }

  if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
    return true;
  }

  return false;
}

function setCorsHeaders(res, origin) {
  if (isOriginAllowed(origin)) {
    res.set('Access-Control-Allow-Origin', origin);
    res.set('Vary', 'Origin');
  }

  res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'x-factiony-key, content-type, authorization');
  res.set('Access-Control-Max-Age', '86400');
}

exports.apiFunction = functions.https.onRequest(async (req, res) => {
  const origin = req.headers.origin || '';

  if (req.method === 'OPTIONS') {
    setCorsHeaders(res, origin);
    res.status(204).send('');
    return;
  }

  setCorsHeaders(res, origin);

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const factionyKey = req.headers['x-factiony-key'];
  if (factionyKey !== FACTIONY_KEY) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const path = req.path.replace('/apiFunction', '');
    const queryString = new URLSearchParams(req.query).toString();
    const rawgUrl = `https://api.rawg.io/api${path}?key=${RAWG_API_KEY}&${queryString}`;

    const response = await axios.get(rawgUrl, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Factiony/1.0'
      }
    });

    res.status(200).json(response.data);
  } catch (error) {
    console.error('RAWG API Error:', error.message);

    if (error.response) {
      res.status(error.response.status).json({
        error: 'RAWG API error',
        message: error.response.data?.error || error.message
      });
    } else if (error.code === 'ECONNABORTED') {
      res.status(504).json({ error: 'Request timeout' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});
