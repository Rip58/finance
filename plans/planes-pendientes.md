# Planes Pendientes

## Objetivo 1 - Ojo que oculta valores en todo el Home
- Centralizar el estado `hide/show` en `src/pages/HomePage.tsx` para que sea la fuente unica.
- Convertir `src/components/mobile/BalanceCard.tsx` a componente controlado con props `hidden` y `onToggleHidden`.
- Aplicar el estado `hidden` en:
  - `src/components/mobile/SortableAccountList.tsx` (saldos por cuenta).
  - Seccion DCA y cualquier KPI/total del Home.
  - `src/components/home/PatrimonyEvolution.tsx` (tarjetas de metricas, PnL, porcentajes y tabla de movimientos).
- Verificar que el ojo del panel superior controle todos los valores.

## Objetivo 2 - Modo demo con datos falsos (lectura/escritura local)
- Crear un store demo en memoria con persistencia en `sessionStorage`:
  - `src/demo/demoData.ts`: datos semilla (cuentas, transacciones, activos, DCA, etc).
  - `src/demo/demoStore.ts`: CRUD local y utilidades de reset; limpiar datos al salir del modo demo o cerrar pestana.
- Crear proveedor y hook:
  - `src/components/providers/DemoModeProvider.tsx` + `useDemoMode()` con `enterDemo/exitDemo` y `isDemo`.
  - Definir `demoUser` fijo para usar en el flujo de la app.
- Agregar boton "Probar demo" en `src/components/AuthForm.tsx` que active `enterDemo`.
- Ajustar `src/App.tsx` para:
  - Saltar Supabase cuando `isDemo`.
  - Usar `demoUser` como usuario activo.
  - Desactivar consultas Supabase en modo demo.
- Adaptar hooks para devolver datos demo y mutaciones locales:
  - `useDashboardMetrics`, `useTransactions`, `useBankAccounts`, `useCategories`,
    `useTransfers`, `useAssetTransactions`, `useAccountHoldings`, `useDCAPortfolios`,
    `useCryptoAssets`, `useCurrentPrices`, `useCryptoMarketData`, `useFxRates`,
    `useRecurringTransactions`, `useLoans`, `useSubscriptions`.
- Bloquear flujos Supabase-only en demo (p. ej. `src/components/settings/BackupTab.tsx`) con toasts informativos.
- Asegurar que al salir del modo demo se limpien los datos y se vuelva a la pantalla de login.

## Notas de ejecucion
- Demo: lectura/escritura local con limpieza al cerrar pestana o al salir del modo demo.
- No se persisten datos en Supabase en modo demo.
