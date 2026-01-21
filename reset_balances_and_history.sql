-- ========================================
-- SCRIPT PARA RESETEAR BALANCES Y HISTORIAL
-- ========================================
-- Este script actualiza los initial_balance a los valores actuales
-- y limpia todo el historial de transacciones para empezar desde cero

-- PASO 1: Actualizar initial_balance de cada cuenta a su balance actual
-- ========================================

-- Cuentas USDT/USD
UPDATE bank_accounts 
SET initial_balance = 4357.34
WHERE name = 'QUANTFURY' AND user_id IN (SELECT id FROM auth.users);

UPDATE bank_accounts 
SET initial_balance = 1283.23
WHERE name = 'TANGEM' AND user_id IN (SELECT id FROM auth.users);

UPDATE bank_accounts 
SET initial_balance = 420.13
WHERE name = 'BINANCE' AND user_id IN (SELECT id FROM auth.users);

-- Cuentas EUR
UPDATE bank_accounts 
SET initial_balance = 100.00
WHERE name = 'ANDBANK' AND user_id IN (SELECT id FROM auth.users)
AND category_id IN (SELECT id FROM categories WHERE name LIKE '%Ahorro%');

UPDATE bank_accounts 
SET initial_balance = 50.96
WHERE name LIKE 'ANDBANK%' AND user_id IN (SELECT id FROM auth.users)
AND category_id IN (SELECT id FROM categories WHERE name LIKE '%Inver%');

UPDATE bank_accounts 
SET initial_balance = 3001.00
WHERE name = 'MORABANC' AND user_id IN (SELECT id FROM auth.users);

UPDATE bank_accounts 
SET initial_balance = 400.00
WHERE name = 'WISE' AND user_id IN (SELECT id FROM auth.users);


-- PASO 2: Limpiar todo el historial
-- ========================================

-- Eliminar todas las transacciones bancarias
DELETE FROM transactions WHERE user_id IN (SELECT id FROM auth.users);

-- Eliminar todas las transacciones de activos (crypto/DCA)
DELETE FROM asset_transactions WHERE user_id IN (SELECT id FROM auth.users);

-- Eliminar todas las transferencias
DELETE FROM transfers WHERE user_id IN (SELECT id FROM auth.users);


-- PASO 3: Verificación
-- ========================================

-- Ver los nuevos balances iniciales
SELECT 
    name,
    initial_balance,
    currency,
    is_archived
FROM bank_accounts
WHERE user_id IN (SELECT id FROM auth.users)
  AND is_archived = false
ORDER BY name;

-- Verificar que no queden transacciones
SELECT 
    'Transacciones' as tabla, 
    COUNT(*) as registros 
FROM transactions 
WHERE user_id IN (SELECT id FROM auth.users)
UNION ALL
SELECT 
    'Asset Transactions' as tabla, 
    COUNT(*) as registros 
FROM asset_transactions 
WHERE user_id IN (SELECT id FROM auth.users)
UNION ALL
SELECT 
    'Transferencias' as tabla, 
    COUNT(*) as registros 
FROM transfers 
WHERE user_id IN (SELECT id FROM auth.users);
