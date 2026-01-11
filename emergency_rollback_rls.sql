-- =====================================================
-- EMERGENCY ROLLBACK: RESTORE ORIGINAL RLS POLICIES
-- =====================================================
-- This script restores the original RLS policies structure
-- if the consolidated policies are blocking data access
-- =====================================================

-- =====================================================
-- RESTORE SPLIT POLICIES (Admin + User separate)
-- =====================================================

-- ==================== BANK_ACCOUNTS ====================
-- Restore original Admin policy (FOR ALL)
DROP POLICY IF EXISTS "Admins can manage all bank_accounts" ON public.bank_accounts;
CREATE POLICY "Admins can manage all bank_accounts" ON public.bank_accounts
  AS PERMISSIVE FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Restore original User policies (separate per action)
DROP POLICY IF EXISTS "Users can view own bank_accounts" ON public.bank_accounts;
CREATE POLICY "Users can view own bank_accounts" ON public.bank_accounts
  AS PERMISSIVE FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own bank_accounts" ON public.bank_accounts;
CREATE POLICY "Users can insert own bank_accounts" ON public.bank_accounts
  AS PERMISSIVE FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own bank_accounts" ON public.bank_accounts;
CREATE POLICY "Users can update own bank_accounts" ON public.bank_accounts
  AS PERMISSIVE FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own bank_accounts" ON public.bank_accounts;
CREATE POLICY "Users can delete own bank_accounts" ON public.bank_accounts
  AS PERMISSIVE FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ==================== CATEGORIES ====================
DROP POLICY IF EXISTS "Admins can manage all categories" ON public.categories;
CREATE POLICY "Admins can manage all categories" ON public.categories
  AS PERMISSIVE FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Users can view own categories" ON public.categories;
CREATE POLICY "Users can view own categories" ON public.categories
  AS PERMISSIVE FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own categories" ON public.categories;
CREATE POLICY "Users can insert own categories" ON public.categories
  AS PERMISSIVE FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own categories" ON public.categories;
CREATE POLICY "Users can update own categories" ON public.categories
  AS PERMISSIVE FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own categories" ON public.categories;
CREATE POLICY "Users can delete own categories" ON public.categories
  AS PERMISSIVE FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ==================== SETTINGS ====================
DROP POLICY IF EXISTS "Admins can manage all settings" ON public.settings;
CREATE POLICY "Admins can manage all settings" ON public.settings
  AS PERMISSIVE FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Users can view own settings" ON public.settings;
CREATE POLICY "Users can view own settings" ON public.settings
  AS PERMISSIVE FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own settings" ON public.settings;
CREATE POLICY "Users can insert own settings" ON public.settings
  AS PERMISSIVE FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own settings" ON public.settings;
CREATE POLICY "Users can update own settings" ON public.settings
  AS PERMISSIVE FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- ==================== TRANSACTIONS ====================
DROP POLICY IF EXISTS "Admins can manage all transactions" ON public.transactions;
CREATE POLICY "Admins can manage all transactions" ON public.transactions
  AS PERMISSIVE FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Users can view own transactions" ON public.transactions;
CREATE POLICY "Users can view own transactions" ON public.transactions
  AS PERMISSIVE FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own transactions" ON public.transactions;
CREATE POLICY "Users can insert own transactions" ON public.transactions
  AS PERMISSIVE FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own transactions" ON public.transactions;
CREATE POLICY "Users can update own transactions" ON public.transactions
  AS PERMISSIVE FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own transactions" ON public.transactions;
CREATE POLICY "Users can delete own transactions" ON public.transactions
  AS PERMISSIVE FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ==================== SUBSCRIPTIONS ====================
DROP POLICY IF EXISTS "Admins can manage all subscriptions" ON public.subscriptions;
CREATE POLICY "Admins can manage all subscriptions" ON public.subscriptions
  AS PERMISSIVE FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Users can view own subscriptions" ON public.subscriptions;
CREATE POLICY "Users can view own subscriptions" ON public.subscriptions
  AS PERMISSIVE FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own subscriptions" ON public.subscriptions;
CREATE POLICY "Users can insert own subscriptions" ON public.subscriptions
  AS PERMISSIVE FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own subscriptions" ON public.subscriptions;
CREATE POLICY "Users can update own subscriptions" ON public.subscriptions
  AS PERMISSIVE FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own subscriptions" ON public.subscriptions;
CREATE POLICY "Users can delete own subscriptions" ON public.subscriptions
  AS PERMISSIVE FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ==================== SUBSCRIPTION_CHARGES ====================
DROP POLICY IF EXISTS "Admins can manage all subscription_charges" ON public.subscription_charges;
CREATE POLICY "Admins can manage all subscription_charges" ON public.subscription_charges
  AS PERMISSIVE FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Users can view own subscription_charges" ON public.subscription_charges;
CREATE POLICY "Users can view own subscription_charges" ON public.subscription_charges
  AS PERMISSIVE FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own subscription_charges" ON public.subscription_charges;
CREATE POLICY "Users can insert own subscription_charges" ON public.subscription_charges
  AS PERMISSIVE FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ==================== TRANSFERS ====================
DROP POLICY IF EXISTS "Admins can manage all transfers" ON public.transfers;
CREATE POLICY "Admins can manage all transfers" ON public.transfers
  AS PERMISSIVE FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Users can view own transfers" ON public.transfers;
CREATE POLICY "Users can view own transfers" ON public.transfers
  AS PERMISSIVE FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own transfers" ON public.transfers;
CREATE POLICY "Users can insert own transfers" ON public.transfers
  AS PERMISSIVE FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own transfers" ON public.transfers;
CREATE POLICY "Users can update own transfers" ON public.transfers
  AS PERMISSIVE FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own transfers" ON public.transfers;
CREATE POLICY "Users can delete own transfers" ON public.transfers
  AS PERMISSIVE FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ==================== USER_ROLES ====================
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
CREATE POLICY "Admins can manage all roles" ON public.user_roles
  AS PERMISSIVE FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles" ON public.user_roles
  AS PERMISSIVE FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- ==================== FX_RATES ====================
DROP POLICY IF EXISTS "Admins can manage fx_rates" ON public.fx_rates;
CREATE POLICY "Admins can manage fx_rates" ON public.fx_rates
  AS PERMISSIVE FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Anyone can view fx_rates" ON public.fx_rates;
CREATE POLICY "Anyone can view fx_rates" ON public.fx_rates
  AS PERMISSIVE FOR SELECT
  USING (true);

-- =====================================================
-- VERIFICATION QUERY
-- =====================================================
-- Verify that data is visible now
SELECT 'bank_accounts' as table_name, count(*) as row_count FROM public.bank_accounts
UNION ALL
SELECT 'categories', count(*) FROM public.categories
UNION ALL
SELECT 'transactions', count(*) FROM public.transactions;
