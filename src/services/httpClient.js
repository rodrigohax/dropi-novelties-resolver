// services/httpClient.js
const { browserFetch } = require('./browserSession');
const config = require('../config');

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

async function fetchWithRetry(url, options = {}, attempt = 1) {
  try {
    return await browserFetch(url, options);
  } catch (err) {
    if (attempt <= config.MAX_RETRIES && !err.message.includes('[AUTH]')) {
      const delay = config.RETRY_DELAY_MS * Math.pow(2, attempt - 1);
      console.warn(`[HTTP] Error en intento ${attempt}/${config.MAX_RETRIES}. Reintentando en ${delay}ms...`);
      await sleep(delay);
      return fetchWithRetry(url, options, attempt + 1);
    }
    throw err;
  }
}

module.exports = { fetchWithRetry };