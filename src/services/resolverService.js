// services/resolverService.js
// Resuelve incidencias vía API con paralelismo controlado

const config = require('../config');
const { fetchWithRetry } = require('./httpClient');

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

/**
 * Construye el payload para resolver una incidencia.
 */
function buildPayload(order) {
  return {
    data: [
      {
        order_id: order.order_id,
        direccionConfirma: order.direccionConfirma,
        datosAdicionalDir: '',
        solution: 'Sacar a Reparto',
        essolucion: 1,
        tipocategoria: 0,
        dirNumero: order.dirNumero,
        dirComuna: '',
        location_url: null,
        nombreConfirma: '',
        telefonoBaseConfirma: order.telefonoBaseConfirma,
      },
    ],
  };
}

/**
 * Resuelve la incidencia de UN pedido.
 * @returns {{ order_id, success, error? }}
 */
async function resolveOne(order) {
  try {
    await fetchWithRetry(`${config.BASE_URL}/orders/saveincidencesolution`, {
      method: 'POST',
      body: JSON.stringify(buildPayload(order)),
    });
    return { order_id: order.order_id, success: true };
  } catch (err) {
    return { order_id: order.order_id, success: false, error: err.message };
  }
}

/**
 * Procesa una lista de pedidos en lotes paralelos con rate limiting.
 * @param {Array} orders
 * @returns {Promise<{ success: Array, failed: Array }>}
 */
async function resolveAll(orders) {
  const success = [];
  const failed = [];

  // Dividir en lotes de CONCURRENCY
  for (let i = 0; i < orders.length; i += config.CONCURRENCY) {
    const batch = orders.slice(i, i + config.CONCURRENCY);
    const batchNum = Math.floor(i / config.CONCURRENCY) + 1;
    const totalBatches = Math.ceil(orders.length / config.CONCURRENCY);

    console.log(`[Resolver] Lote ${batchNum}/${totalBatches} — procesando ${batch.length} pedidos...`);

    const results = await Promise.all(batch.map(resolveOne));

    results.forEach((r) => {
      if (r.success) {
        console.log(`  ✅ Pedido #${r.order_id} resuelto`);
        success.push(r.order_id);
      } else {
        console.error(`  ❌ Pedido #${r.order_id} falló: ${r.error}`);
        failed.push({ order_id: r.order_id, error: r.error });
      }
    });

    // Rate limiting: esperar entre lotes (excepto el último)
    if (i + config.CONCURRENCY < orders.length) {
      await sleep(config.BATCH_DELAY_MS);
    }
  }

  return { success, failed };
}

module.exports = { resolveAll };
