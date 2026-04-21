# dropi-novelties-resolver

Resuelve automáticamente las incidencias pendientes de Dropi usando la API oficial con una sesión de navegador autenticada.

## Cómo funciona

1. Abre Chromium en modo headless y hace login en `app.dropi.cl` con tus credenciales.
2. Extrae el JWT del `localStorage` del navegador para autenticar las requests a la API.
3. Obtiene todos los pedidos con incidencias en estado `EN PROCESAMIENTO` del último mes.
4. Resuelve cada incidencia con la acción `Sacar a Reparto`, procesando de a 5 pedidos en paralelo.
5. Repite automáticamente cada 10 minutos.

## Estructura del proyecto

```
dropi-automation/
├── index.js                   ← Punto de entrada + scheduler
├── src/
│   ├── config.js              ← Configuración central
│   ├── runner.js              ← Orquestador principal
│   └── services/
│       ├── browserSession.js  ← Login con Playwright + requests autenticadas
│       ├── httpClient.js      ← HTTP con reintentos automáticos
│       ├── ordersService.js   ← Obtener pedidos con incidencias
│       └── resolverService.js ← Resolver incidencias en paralelo
├── .env.example
└── package.json
```

## Requisitos

- Node.js 18 o superior

## Instalación

```bash
npm install
npx playwright install chromium
```

## Configuración

Copia `.env.example` a `.env` y completa tus credenciales:

```bash
cp .env.example .env
```

```env
DROPI_EMAIL="tu@email.com"
DROPI_PASSWORD="tu_password"
```

## Uso

```bash
# Producción
npm start

# Desarrollo (reinicia al guardar cambios)
npm run dev
```

## Comportamiento

- Al iniciar resuelve todas las incidencias pendientes de inmediato.
- Luego repite cada **10 minutos** de forma automática.
- La sesión del navegador se renueva automáticamente si el JWT expira (dura ~4 horas).
- Si una request falla, reintenta hasta **3 veces** con backoff exponencial.

## Parámetros configurables

Edita `src/config.js` para ajustar:

| Parámetro | Default | Descripción |
|---|---|---|
| `CONCURRENCY` | 5 | Pedidos que se resuelven en paralelo |
| `SCHEDULE_MINUTES` | 10 | Minutos entre cada ciclo (0 = desactivado) |
| `MAX_RETRIES` | 3 | Reintentos por request fallida |
| `RETRY_DELAY_MS` | 1000 | Delay base del backoff (ms) |
| `BATCH_DELAY_MS` | 500 | Pausa entre lotes para no sobrecargar la API |

## Salida esperada

```
============================================================
[Runner] Inicio: 2024-01-15T10:00:00.000Z
============================================================
[Auth] Iniciando sesión de navegador...
[Auth] ✅ Sesión lista. Válida hasta: 13:30:00
[Orders] Obteniendo pedidos con incidencias...
[Orders] Total reportado: 120. Primera página: 50 pedidos.
[Orders] 120 pedidos listos para procesar.
[Resolver] Lote 1/24 — procesando 5 pedidos...
  ✅ Pedido #10234 resuelto
  ✅ Pedido #10235 resuelto
  ❌ Pedido #10236 falló: [HTTP] Error 422: ...
...
────────────────────────────────────────────────────────────
[Runner] Resumen (18.4s):
  ✅ Resueltos: 118
  ❌ Fallidos:  2
────────────────────────────────────────────────────────────
```
