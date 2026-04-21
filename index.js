#!/usr/bin/env node
// index.js - Punto de entrada

require('dotenv').config();
const config = require('./src/config');
const { run } = require('./src/runner');

(async () => {
  // Validar que haya alguna forma de autenticarse
  const hasToken = !!config.TOKEN;
  const hasCredentials = process.env.DROPI_EMAIL && process.env.DROPI_PASSWORD;

  if (!hasToken && !hasCredentials) {
    console.error('[Init] ❌ No hay credenciales configuradas.');
    console.error('       Opción A (recomendada): agrega al .env:');
    console.error('         DROPI_EMAIL=tu@email.com');
    console.error('         DROPI_PASSWORD=tupassword');
    console.error('       Opción B: agrega DROPI_TOKEN=tu_token_aqui');
    process.exit(1);
  }

  await run();

  if (config.SCHEDULE_MINUTES > 0) {
    const intervalMs = config.SCHEDULE_MINUTES * 60 * 1000;
    console.log(`[Scheduler] Próxima ejecución en ${config.SCHEDULE_MINUTES} minutos.`);
    setInterval(async () => {
      await run();
      console.log(`[Scheduler] Próxima ejecución en ${config.SCHEDULE_MINUTES} minutos.`);
    }, intervalMs);
  }
})();