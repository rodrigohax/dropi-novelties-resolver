// runner.js
const { getAllIncidenceOrders } = require('./services/ordersService');
const { resolveAll } = require('./services/resolverService');
const { closeSession } = require('./services/browserSession');

async function run() {
  const startTime = Date.now();
  console.log(`\n${'='.repeat(60)}`);
  console.log(`[Runner] Inicio: ${new Date().toISOString()}`);
  console.log(`${'='.repeat(60)}`);

  try {
    const orders = await getAllIncidenceOrders();

    if (orders.length === 0) {
      console.log('[Runner] No hay incidencias pendientes. ✨');
      return;
    }

    const { success, failed } = await resolveAll(orders);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`[Runner] Resumen (${elapsed}s):`);
    console.log(`  ✅ Resueltos: ${success.length}`);
    console.log(`  ❌ Fallidos:  ${failed.length}`);

    if (failed.length > 0) {
      console.log('\n[Runner] Pedidos con error:');
      failed.forEach(({ order_id, error }) =>
        console.log(`  • #${order_id}: ${error}`)
      );
    }
    console.log(`${'─'.repeat(60)}\n`);
  } catch (err) {
    console.error(`\n[Runner] ❗ Error crítico: ${err.message}`);
    if (err.message.includes('[AUTH]')) {
      await closeSession();
      console.error('[Runner] Sesión cerrada. Se renovará en el próximo ciclo.');
      // No hacer process.exit — dejar que el scheduler reintente
    }
  }
}

module.exports = { run };