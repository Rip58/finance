-- Query para revisar los balances iniciales de las cuentas
SELECT 
    name,
    initial_balance,
    currency,
    is_archived,
    created_at
FROM bank_accounts
WHERE user_id IN (SELECT id FROM auth.users)
ORDER BY name;
