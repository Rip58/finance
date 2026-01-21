-- Script para limpiar el historial de movimientos
-- Los importes de las cuentas provienen de initial_balance, así que borramos todo el historial
-- Esto resetea la app para empezar con movimientos reales desde hoy

-- 1. Eliminar todas las transacciones bancarias (income/expense)
DELETE FROM transactions WHERE user_id IN (SELECT id FROM auth.users);

-- 2. Eliminar todas las transacciones de activos (crypto)
DELETE FROM asset_transactions WHERE user_id IN (SELECT id FROM auth.users);

-- 3. Eliminar todas las transferencias entre cuentas
DELETE FROM transfers WHERE user_id IN (SELECT id FROM auth.users);

-- Los balances actuales quedarán como están en initial_balance de cada cuenta
-- A partir de ahora, solo se registrarán movimientos reales

-- Verificación de resultados
SELECT 'Transacciones eliminadas' as tabla, COUNT(*) as total FROM transactions;
SELECT 'Transacciones de activos eliminadas' as tabla, COUNT(*) as total FROM asset_transactions;
SELECT 'Transferencias eliminadas' as tabla, COUNT(*) as total FROM transfers;
SELECT 'Cuentas activas' as tabla, COUNT(*) as total FROM bank_accounts WHERE is_archived = false;
