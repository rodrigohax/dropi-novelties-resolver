#!/usr/bin/env node
// debug-incidencias.js — inspecciona la respuesta cruda del endpoint de incidencias
// Uso: node debug-incidencias.js [página]

require('dotenv').config();
const { browserFetch, closeSession } = require('./src/services/browserSession');
const config = require('./src/config');

const PAGE_ARG = parseInt(process.argv[2] ?? '0', 10);
const START = PAGE_ARG * config.PAGE_SIZE;

function val(v) {
  if (v === null || v === undefined) return '(null)';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

function printOrder(o, index) {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  PEDIDO #${index + 1} — id: ${o.id}`);
  console.log('═'.repeat(60));

  // Identificación
  console.log('\n── Identificación ─────────────────────────────────────────');
  console.log(`  id                        : ${val(o.id)}`);
  console.log(`  type                      : ${val(o.type)}`);
  console.log(`  status                    : ${val(o.status)}`);
  console.log(`  shop_order_id             : ${val(o.shop_order_id)}`);
  console.log(`  shop_order_number         : ${val(o.shop_order_number)}`);
  console.log(`  created_at                : ${val(o.created_at)}`);

  // Destinatario
  console.log('\n── Destinatario ───────────────────────────────────────────');
  console.log(`  name                      : ${val(o.name)}`);
  console.log(`  surname                   : ${val(o.surname)}`);
  console.log(`  phone                     : ${val(o.phone)}`);
  console.log(`  notes                     : ${val(o.notes)}`);

  // Dirección
  console.log('\n── Dirección ──────────────────────────────────────────────');
  console.log(`  dir                       : ${val(o.dir)}`);
  console.log(`  city                      : ${val(o.city)}`);
  console.log(`  state                     : ${val(o.state)}`);
  console.log(`  colonia                   : ${val(o.colonia)}`);
  console.log(`  zip_code                  : ${val(o.zip_code)}`);
  console.log(`  coordinates               : ${val(o.coordinates)}`);

  // Envío
  console.log('\n── Envío ──────────────────────────────────────────────────');
  console.log(`  shipping_company          : ${val(o.shipping_company)}`);
  console.log(`  shipping_guide            : ${val(o.shipping_guide)}`);
  console.log(`  sticker                   : ${val(o.sticker)}`);
  console.log(`  guia_urls3                : ${val(o.guia_urls3)}`);
  console.log(`  guide_was_downloaded      : ${val(o.guide_was_downloaded)}`);
  console.log(`  distribution_company_id   : ${val(o.distribution_company_id)}`);
  console.log(`  distribution_company      : ${val(o.distribution_company?.name)}`);

  // Incidencia
  console.log('\n── Incidencia ─────────────────────────────────────────────');
  console.log(`  novedad_servientrega      : ${val(o.novedad_servientrega)}`);
  console.log(`  issue_solved_by_operator  : ${val(o.issue_solved_by_operator)}`);
  console.log(`  issue_solved_by_parent_order: ${val(o.issue_solved_by_parent_order)}`);
  console.log(`  managed_devolution_app    : ${val(o.managed_devolution_app)}`);

  // Historial movimientos
  console.log('\n── Movimientos (servientrega_movements) ───────────────────');
  if (Array.isArray(o.servientrega_movements) && o.servientrega_movements.length) {
    o.servientrega_movements.forEach((m) => {
      console.log(`  [${m.created_at}] ${m.nom_mov}${m.image_evidence ? ' 📷 ' + m.image_evidence : ''}`);
    });
  } else {
    console.log('  (sin movimientos)');
  }

  // Historial novedades
  console.log('\n── Historial novedades (history_new_orders) ───────────────');
  if (Array.isArray(o.history_new_orders) && o.history_new_orders.length) {
    o.history_new_orders.forEach((h) => {
      console.log(`  [${h.created_at}] id: ${h.id}`);
    });
  } else {
    console.log('  (sin historial)');
  }

  // Financiero
  console.log('\n── Financiero ─────────────────────────────────────────────');
  console.log(`  total_order               : ${val(o.total_order)}`);
  console.log(`  rate_type                 : ${val(o.rate_type)}`);
  console.log(`  invoiced                  : ${val(o.invoiced)}`);
  console.log(`  invoice_id                : ${val(o.invoice_id)}`);
  console.log(`  warranty                  : ${val(o.warranty)}`);
  console.log(`  warranty_type             : ${val(o.warranty_type)}`);
  console.log(`  indemnized                : ${val(o.indemnized)}`);

  // Relaciones
  console.log('\n── Relaciones ─────────────────────────────────────────────');
  console.log(`  user_id                   : ${val(o.user_id)}`);
  console.log(`  supplier_id               : ${val(o.supplier_id)}`);
  console.log(`  shop_id                   : ${val(o.shop_id)}`);
  console.log(`  warehouse_id              : ${val(o.warehouse_id)}`);
  console.log(`  shop.name                 : ${val(o.shop?.name)}`);
  console.log(`  shop.type                 : ${val(o.shop?.type)}`);
  console.log(`  warehouse.name            : ${val(o.warehouse?.name)}`);
  console.log(`  warehouse.city.name       : ${val(o.warehouse?.city?.name)}`);

  // Productos
  console.log('\n── Productos (orderdetails) ───────────────────────────────');
  if (Array.isArray(o.orderdetails) && o.orderdetails.length) {
    o.orderdetails.forEach((d, i) => {
      const p = d.product;
      console.log(`  [${i}] product_id: ${d.product_id} | sku: ${p?.sku} | nombre: ${p?.name}`);
      console.log(`       sale_price: ${p?.sale_price} | suggested_price: ${p?.suggested_price}`);
      console.log(`       variation_id: ${val(d.variation_id)}`);
    });
  } else {
    console.log('  (sin productos)');
  }

  // Flags varios
  console.log('\n── Flags ──────────────────────────────────────────────────');
  console.log(`  is_validated              : ${val(o.is_validated)}`);
  console.log(`  has_aggregation           : ${val(o.has_aggregation)}`);
  console.log(`  has_validated_historial   : ${val(o.has_validated_historial)}`);
  console.log(`  tags                      : ${JSON.stringify(o.tags)}`);

  // Campos extra no mapeados
  const mapped = new Set([
    'id','type','status','shop_order_id','shop_order_number','created_at',
    'name','surname','phone','notes',
    'dir','city','state','colonia','zip_code','coordinates',
    'shipping_company','shipping_guide','sticker','guia_urls3','guide_was_downloaded',
    'distribution_company_id','distribution_company',
    'novedad_servientrega','issue_solved_by_operator','issue_solved_by_parent_order','managed_devolution_app',
    'servientrega_movements','history_new_orders',
    'total_order','rate_type','invoiced','invoice_id','warranty','warranty_type','indemnized',
    'user_id','supplier_id','shop_id','warehouse_id','shop','warehouse','user','supplier',
    'orderdetails',
    'is_validated','has_aggregation','has_validated_historial','tags',
  ]);
  const extra = Object.keys(o).filter((k) => !mapped.has(k));
  if (extra.length) {
    console.log('\n── Campos extra (no mapeados) ─────────────────────────────');
    extra.forEach((k) => console.log(`  ${k.padEnd(26)}: ${val(o[k])}`));
  }
}

async function main() {
  const today = new Date().toISOString().split('T')[0];
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const params = new URLSearchParams({
    orderBy: 'id',
    orderDirection: 'desc',
    result_number: String(config.PAGE_SIZE),
    start: String(START),
    textToSearch: '',
    status: 'EN PROCESAMIENTO',
    supplier_id: 'null',
    user_id: 'null',
    from_date_last_incidence: monthAgo,
    until_date_last_incidence: today,
    haveIncidenceProcesamiento: 'true',
    issue_solved_by_parent_order: 'false',
  });

  const url = `${config.BASE_URL}/orders/myorders/v2?${params}`;

  console.log('\n══════════════════════════════════════════');
  console.log(`  DEBUG INCIDENCIAS — página ${PAGE_ARG} (start=${START})`);
  console.log('══════════════════════════════════════════');
  console.log(`\nURL: ${url}\n`);

  let raw;
  try {
    raw = await browserFetch(url, { method: 'GET' });
  } catch (err) {
    console.error('❌ Error al hacer la request:', err.message);
    process.exit(1);
  }

  console.log('── Claves raíz de la respuesta ─────────────');
  console.log(Object.keys(raw));

  const total = raw?.total ?? raw?.totalCount ?? raw?.count ?? '(no encontrado)';
  console.log(`\nTotal reportado por la API: ${total}`);

  const items =
    raw?.orders ?? raw?.data ?? raw?.results ?? raw?.objects ??
    (Array.isArray(raw) ? raw : null);

  if (!items) {
    console.warn('\n⚠️  No se encontró el array de pedidos. Respuesta completa:');
    console.log(JSON.stringify(raw, null, 2));
    return;
  }

  console.log(`Items en esta página: ${items.length}`);

  if (items.length === 0) {
    console.log('(lista vacía)');
    return;
  }

  items.forEach((o, i) => printOrder(o, i));

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  TOTAL ITEMS: ${items.length}`);
  console.log('═'.repeat(60));
}

main()
  .catch((err) => {
    console.error('\n❌ Error inesperado:', err);
    process.exit(1);
  })
  .finally(() => closeSession());
