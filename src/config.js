// config.js - Configuración central
module.exports = {
  BASE_URL: 'https://api.dropi.cl/api',
  TOKEN: process.env.DROPI_TOKEN || '',

  // Paginación
  PAGE_SIZE: 50,

  // Paralelismo: cuántos pedidos resolver a la vez
  CONCURRENCY: 5,

  // Retries automáticos por request fallida
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 1000, // delay base (se multiplica exponencialmente)

  // Rate limiting: ms entre lotes
  BATCH_DELAY_MS: 500,

  // Scheduler: cada cuántos minutos corre automáticamente (0 = no scheduler)
  SCHEDULE_MINUTES: 10,
};