// services/resolverService.js
// Resuelve incidencias vía API con paralelismo controlado

const config = require('../config');
const { fetchWithRetry } = require('./httpClient');

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

// Datos reales del endpoint /distribution-companies (sin request extra).
// incidence_solution_method "URL" = resoluble vía API; "FTP" = no soportado aún.
const CARRIERS = {
  1: { name: 'BLUE',    method: 'FTP', resolvable: false },
  2: { name: 'VELOCES', method: 'FTP', resolvable: false },
  5: { name: 'STARKEN', method: 'URL', resolvable: true  },
  6: { name: 'WIILOG',  method: 'URL', resolvable: false }, // URL pero aún no habilitado
};

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

  // Filtrar por transportadoras resolvibles y loguear las omitidas
  const skipped = orders.filter((o) => !CARRIERS[o.distribution_company_id]?.resolvable);
  const toResolve = orders.filter((o) => CARRIERS[o.distribution_company_id]?.resolvable);

  if (skipped.length) {
    const summary = skipped.reduce((acc, o) => {
      const name = CARRIERS[o.distribution_company_id]?.name ?? `id:${o.distribution_company_id}`;
      acc[name] = (acc[name] ?? 0) + 1;
      return acc;
    }, {});
    console.log(`[Resolver] Omitidos ${skipped.length} pedidos (no soportados aún):`);
    Object.entries(summary).forEach(([name, count]) => {
      const carrier = Object.values(CARRIERS).find((c) => c.name === name);
      console.log(`  - ${name} (method: ${carrier?.method ?? '?'}): ${count} pedidos`);
    });
  }

  console.log(`[Resolver] Procesando ${toResolve.length} pedidos STARKEN...`);

  // Dividir en lotes de CONCURRENCY
  for (let i = 0; i < toResolve.length; i += config.CONCURRENCY) {
    const batch = toResolve.slice(i, i + config.CONCURRENCY);
    const batchNum = Math.floor(i / config.CONCURRENCY) + 1;
    const totalBatches = Math.ceil(toResolve.length / config.CONCURRENCY);

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
    if (i + config.CONCURRENCY < toResolve.length) {
      await sleep(config.BATCH_DELAY_MS);
    }
  }

  return { success, failed };
}

module.exports = { resolveAll };
