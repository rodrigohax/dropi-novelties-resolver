// services/browserSession.js
// Mantiene una sesión de navegador autenticada y ejecuta requests desde ella

const { chromium } = require('playwright');

let browser = null;
let context = null;
let page = null;
let sessionExpiry = 0;

async function ensureSession() {
  const email = process.env.DROPI_EMAIL;
  const password = process.env.DROPI_PASSWORD;
  if (!email || !password) throw new Error('[AUTH] Faltan DROPI_EMAIL o DROPI_PASSWORD.');

  const now = Date.now();
  if (page && !page.isClosed() && now < sessionExpiry) return;

  // Cerrar sesión anterior si existe
  if (browser) {
    try { await browser.close(); } catch {}
  }

  console.log('[Auth] Iniciando sesión de navegador...');
  browser = await chromium.launch({ headless: true });
  context = await browser.newContext();
  page = await context.newPage();

  await page.goto('https://app.dropi.cl/auth/login');
  await page.getByRole('textbox', { name: 'Username' }).fill(email);
  await page.getByRole('textbox', { name: 'Username' }).press('Tab');
  await page.getByRole('textbox', { name: 'Password' }).fill(password);
  await page.getByRole('button', { name: 'Log in' }).click();

  try {
    await page.getByRole('button', { name: 'Accept' }).waitFor({ timeout: 5000 });
    await page.getByRole('button', { name: 'Accept' }).click();
  } catch {}

  await page.waitForURL('**/dashboard/**', { timeout: 20000 });

  // Sesión válida por 3.5 horas (el JWT dura 4h)
  sessionExpiry = now + 3.5 * 60 * 60 * 1000;
  console.log(`[Auth] ✅ Sesión lista. Válida hasta: ${new Date(sessionExpiry).toLocaleTimeString()}`);
}

/**
 * Ejecuta una request GET desde el navegador autenticado.
 */
async function browserFetch(url, options = {}) {
  await ensureSession();

  const result = await page.evaluate(async ({ url, options }) => {
    const token = JSON.parse(localStorage.getItem('DROPI_token') || 'null');
    const res = await fetch(url, {
      method: options.method || 'GET',
      headers: {
        'accept': 'application/json, text/plain, */*',
        'content-type': 'application/json',
        'x-authorization': 'Bearer ' + token,
        'x-captcha-token': '',
        'referer': 'https://app.dropi.cl/',
        ...(options.headers || {}),
      },
      body: options.body || undefined,
    });
    const text = await res.text();
    return { status: res.status, body: text };
  }, { url, options });

  if (result.status === 401 || result.status === 403) {
    // Sesión expirada — reiniciar y reintentar una vez
    console.warn(`[Browser] Sesión expirada (${result.status}), reiniciando...`);
    sessionExpiry = 0;
    await ensureSession();
    return browserFetch(url, options);
  }

  if (!String(result.status).startsWith('2')) {
    throw new Error(`[HTTP] Error ${result.status}: ${result.body}`);
  }

  try {
    return JSON.parse(result.body);
  } catch {
    throw new Error(`[HTTP] Respuesta no es JSON: ${result.body.substring(0, 200)}`);
  }
}

async function closeSession() {
  if (browser) {
    try { await browser.close(); } catch {}
    browser = null; context = null; page = null;
  }
}

module.exports = { browserFetch, closeSession };