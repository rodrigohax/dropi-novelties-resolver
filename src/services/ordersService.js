// services/ordersService.js
const config = require('../config');
const { fetchWithRetry } = require('./httpClient');

function cleanPhone(raw) {
  if (!raw) return '';
  return String(raw).replace(/\D/g, '');
}

function parseOrder(raw) {
  return {
    order_id: raw.id ?? raw.order_id ?? null,
    direccionConfirma: raw.dir ?? raw.direccion ?? raw.address ?? raw.direccionEnvio ?? '',
    dirNumero: raw.dirNumero ?? raw.addressNumber ?? '',
    telefonoBaseConfirma: cleanPhone(raw.telefono ?? raw.phone ?? raw.telefonoBase ?? ''),
    distribution_company_id: raw.distribution_company_id ?? raw.distribution_company?.id ?? null,
  };
}

async function fetchPage(start) {
  const today = new Date().toISOString().split('T')[0];
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const params = new URLSearchParams({
    orderBy: 'id',
    orderDirection: 'desc',
    result_number: String(config.PAGE_SIZE),
    start: String(start),
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
  const data = await fetchWithRetry(url, { method: 'GET' });

  const items =
    data?.orders ?? data?.data ?? data?.results ?? data?.objects ??
    (Array.isArray(data) ? data : []);

  return {
    items,
    total: data?.total ?? data?.totalCount ?? data?.count ?? items.length,
  };
}

async function getAllIncidenceOrders() {
  console.log('[Orders] Obteniendo pedidos con incidencias...');

  const firstPage = await fetchPage(0);
  const total = firstPage.total;
  let allRaw = [...firstPage.items];

  console.log(`[Orders] Total reportado: ${total}. Primera página: ${firstPage.items.length} pedidos.`);

  if (total > config.PAGE_SIZE) {
    const pages = Math.ceil(total / config.PAGE_SIZE);
    const promises = [];
    for (let page = 1; page < pages; page++) {
      promises.push(fetchPage(page * config.PAGE_SIZE));
    }
    const results = await Promise.all(promises);
    results.forEach((r) => allRaw.push(...r.items));
  }

  const orders = allRaw
    .filter((o) => o != null)
    .map(parseOrder)
    .filter((o) => o.order_id != null);

  console.log(`[Orders] ${orders.length} pedidos listos para procesar.`);
  return orders;
}

module.exports = { getAllIncidenceOrders };