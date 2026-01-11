-- =====================================================
-- ROLLBACK COMPLETO Y SIMPLIFICADO
-- =====================================================
-- Restaura TODAS las políticas al estado funcional
-- SIN optimizaciones que causan 500 errors
-- =====================================================

-- TRANSACTIONS
DROP POLICY IF EXISTS "Admins can manage all transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can view own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can insert own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can update own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can delete own transactions" ON public.transactions;

CREATE POLICY "Users can view own transactions" ON public.transactions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own transactions" ON public.transactions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own transactions" ON public.transactions FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own transactions" ON public.transactions FOR DELETE USING (user_id = auth.uid());

-- TRANSFERS
DROP POLICY IF EXISTS "Admins can manage all transfers" ON public.transfers;
DROP POLICY IF EXISTS "Users can view own transfers" ON public.transfers;
DROP POLICY IF EXISTS "Users can insert own transfers" ON public.transfers;
DROP POLICY IF EXISTS "Users can update own transfers" ON public.transfers;
DROP POLICY IF EXISTS "Users can delete own transfers" ON public.transfers;

CREATE POLICY "Users can view own transfers" ON public.transfers FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own transfers" ON public.transfers FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own transfers" ON public.transfers FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own transfers" ON public.transfers FOR DELETE USING (user_id = auth.uid());

-- SUBSCRIPTIONS
DROP POLICY IF EXISTS "Admins can manage all subscriptions" ON public.subscriptions;  
DROP POLICY IF EXISTS "Users can view own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can insert own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can update own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can delete own subscriptions" ON public.subscriptions;

CREATE POLICY "Users can view own subscriptions" ON public.subscriptions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own subscriptions" ON public.subscriptions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own subscriptions" ON public.subscriptions FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own subscriptions" ON public.subscriptions FOR DELETE USING (user_id = auth.uid());

-- SUBSCRIPTION_CHARGES
DROP POLICY IF EXISTS "Admins can manage all subscription_charges" ON public.subscription_charges;
DROP POLICY IF EXISTS "Users can view own subscription_charges" ON public.subscription_charges;
DROP POLICY IF EXISTS "Users can insert own subscription_charges" ON public.subscription_charges;

CREATE POLICY "Users can view own subscription_charges" ON public.subscription_charges FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own subscription_charges" ON public.subscription_charges FOR INSERT WITH CHECK (user_id = auth.uid());

-- SETTINGS (ya debería estar bien, pero por si acaso)
DROP POLICY IF EXISTS "Admins can manage all settings" ON public.settings;
DROP POLICY IF EXISTS "Users can view own settings" ON public.settings;
DROP POLICY IF EXISTS "Users can insert own settings" ON public.settings;
DROP POLICY IF EXISTS "Users can update own settings" ON public.settings;

CREATE POLICY "Users can view own settings" ON public.settings FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own settings" ON public.settings FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own settings" ON public.settings FOR UPDATE USING (user_id = auth.uid());

-- FX_RATES (public read)
DROP POLICY IF EXISTS "Admins can manage fx_rates" ON public.fx_rates;
DROP POLICY IF EXISTS "Anyone can view fx_rates" ON public.fx_rates;

CREATE POLICY "Anyone can view fx_rates" ON public.fx_rates FOR SELECT USING (true);

-- USER_ROLES  
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;

CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING (user_id = auth.uid());

-- Verificación
SELECT 'Rollback completado' as status;
