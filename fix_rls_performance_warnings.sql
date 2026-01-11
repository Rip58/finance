-- =====================================================
-- FIX SUPABASE RLS PERFORMANCE WARNINGS
-- =====================================================
-- This script addresses 38 RLS performance warnings:
-- 1. auth_rls_initplan: Optimize auth function calls
-- 2. multiple_permissive_policies: Consolidate duplicate policies
-- =====================================================

-- =====================================================
-- PART 1: FIX AUTH RLS INITPLAN (9 tables)
-- Replace auth.uid() with (select auth.uid()) for caching
-- =====================================================

-- Fix: user_roles
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
CREATE POLICY "Admins can manage all roles" ON public.user_roles
  AS PERMISSIVE FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = (select auth.uid())
      AND role = 'admin'
    )
  );

-- Fix: settings
DROP POLICY IF EXISTS "Admins can manage all settings" ON public.settings;
CREATE POLICY "Admins can manage all settings" ON public.settings
  AS PERMISSIVE FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = (select auth.uid())
      AND role = 'admin'
    )
  );

-- Fix: categories
DROP POLICY IF EXISTS "Admins can manage all categories" ON public.categories;
CREATE POLICY "Admins can manage all categories" ON public.categories
  AS PERMISSIVE FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = (select auth.uid())
      AND role = 'admin'
    )
  );

-- Fix: bank_accounts
DROP POLICY IF EXISTS "Admins can manage all bank_accounts" ON public.bank_accounts;
CREATE POLICY "Admins can manage all bank_accounts" ON public.bank_accounts
  AS PERMISSIVE FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = (select auth.uid())
      AND role = 'admin'
    )
  );

-- Fix: transactions
DROP POLICY IF EXISTS "Admins can manage all transactions" ON public.transactions;
CREATE POLICY "Admins can manage all transactions" ON public.transactions
  AS PERMISSIVE FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = (select auth.uid())
      AND role = 'admin'
    )
  );

-- Fix: subscriptions
DROP POLICY IF EXISTS "Admins can manage all subscriptions" ON public.subscriptions;
CREATE POLICY "Admins can manage all subscriptions" ON public.subscriptions
  AS PERMISSIVE FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = (select auth.uid())
      AND role = 'admin'
    )
  );

-- Fix: subscription_charges
DROP POLICY IF EXISTS "Admins can manage all subscription_charges" ON public.subscription_charges;
CREATE POLICY "Admins can manage all subscription_charges" ON public.subscription_charges
  AS PERMISSIVE FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = (select auth.uid())
      AND role = 'admin'
    )
  );

-- Fix: transfers
DROP POLICY IF EXISTS "Admins can manage all transfers" ON public.transfers;
CREATE POLICY "Admins can manage all transfers" ON public.transfers
  AS PERMISSIVE FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = (select auth.uid())
      AND role = 'admin'
    )
  );

-- Fix: fx_rates
DROP POLICY IF EXISTS "Admins can manage fx_rates" ON public.fx_rates;
CREATE POLICY "Admins can manage fx_rates" ON public.fx_rates
  AS PERMISSIVE FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = (select auth.uid())
      AND role = 'admin'
    )
  );

-- =====================================================
-- PART 2: CONSOLIDATE MULTIPLE PERMISSIVE POLICIES
-- Combine "admin" + "user own data" policies using OR
-- =====================================================

-- ==================== BANK_ACCOUNTS ====================
-- SELECT: Consolidate admin + view own
DROP POLICY IF EXISTS "Users can view own bank_accounts" ON public.bank_accounts;
CREATE POLICY "Users can view own bank_accounts" ON public.bank_accounts
  AS PERMISSIVE FOR SELECT
  TO authenticated
  USING (
    user_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = (select auth.uid()) AND role = 'admin'
    )
  );

-- INSERT: Consolidate admin + insert own
DROP POLICY IF EXISTS "Users can insert own bank_accounts" ON public.bank_accounts;
CREATE POLICY "Users can insert own bank_accounts" ON public.bank_accounts
  AS PERMISSIVE FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = (select auth.uid()) AND role = 'admin'
    )
  );

-- UPDATE: Consolidate admin + update own
DROP POLICY IF EXISTS "Users can update own bank_accounts" ON public.bank_accounts;
CREATE POLICY "Users can update own bank_accounts" ON public.bank_accounts
  AS PERMISSIVE FOR UPDATE
  TO authenticated
  USING (
    user_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = (select auth.uid()) AND role = 'admin'
    )
  );

-- DELETE: Consolidate admin + delete own
DROP POLICY IF EXISTS "Users can delete own bank_accounts" ON public.bank_accounts;
CREATE POLICY "Users can delete own bank_accounts" ON public.bank_accounts
  AS PERMISSIVE FOR DELETE
  TO authenticated
  USING (
    user_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = (select auth.uid()) AND role = 'admin'
    )
  );

-- ==================== CATEGORIES ====================
DROP POLICY IF EXISTS "Users can view own categories" ON public.categories;
CREATE POLICY "Users can view own categories" ON public.categories
  AS PERMISSIVE FOR SELECT
  TO authenticated
  USING (
    user_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = (select auth.uid()) AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Users can insert own categories" ON public.categories;
CREATE POLICY "Users can insert own categories" ON public.categories
  AS PERMISSIVE FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = (select auth.uid()) AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Users can update own categories" ON public.categories;
CREATE POLICY "Users can update own categories" ON public.categories
  AS PERMISSIVE FOR UPDATE
  TO authenticated
  USING (
    user_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = (select auth.uid()) AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Users can delete own categories" ON public.categories;
CREATE POLICY "Users can delete own categories" ON public.categories
  AS PERMISSIVE FOR DELETE
  TO authenticated
  USING (
    user_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = (select auth.uid()) AND role = 'admin'
    )
  );

-- ==================== SETTINGS ====================
DROP POLICY IF EXISTS "Users can view own settings" ON public.settings;
CREATE POLICY "Users can view own settings" ON public.settings
  AS PERMISSIVE FOR SELECT
  TO authenticated
  USING (
    user_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = (select auth.uid()) AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Users can insert own settings" ON public.settings;
CREATE POLICY "Users can insert own settings" ON public.settings
  AS PERMISSIVE FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = (select auth.uid()) AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Users can update own settings" ON public.settings;
CREATE POLICY "Users can update own settings" ON public.settings
  AS PERMISSIVE FOR UPDATE
  TO authenticated
  USING (
    user_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = (select auth.uid()) AND role = 'admin'
    )
  );

-- ==================== SUBSCRIPTION_CHARGES ====================
DROP POLICY IF EXISTS "Users can view own subscription_charges" ON public.subscription_charges;
CREATE POLICY "Users can view own subscription_charges" ON public.subscription_charges
  AS PERMISSIVE FOR SELECT
  TO authenticated
  USING (
    user_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = (select auth.uid()) AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Users can insert own subscription_charges" ON public.subscription_charges;
CREATE POLICY "Users can insert own subscription_charges" ON public.subscription_charges
  AS PERMISSIVE FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = (select auth.uid()) AND role = 'admin'
    )
  );

-- ==================== SUBSCRIPTIONS ====================
DROP POLICY IF EXISTS "Users can view own subscriptions" ON public.subscriptions;
CREATE POLICY "Users can view own subscriptions" ON public.subscriptions
  AS PERMISSIVE FOR SELECT
  TO authenticated
  USING (
    user_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = (select auth.uid()) AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Users can insert own subscriptions" ON public.subscriptions;
CREATE POLICY "Users can insert own subscriptions" ON public.subscriptions
  AS PERMISSIVE FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = (select auth.uid()) AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Users can update own subscriptions" ON public.subscriptions;
CREATE POLICY "Users can update own subscriptions" ON public.subscriptions
  AS PERMISSIVE FOR UPDATE
  TO authenticated
  USING (
    user_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = (select auth.uid()) AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Users can delete own subscriptions" ON public.subscriptions;
CREATE POLICY "Users can delete own subscriptions" ON public.subscriptions
  AS PERMISSIVE FOR DELETE
  TO authenticated
  USING (
    user_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = (select auth.uid()) AND role = 'admin'
    )
  );

-- ==================== TRANSACTIONS ====================
DROP POLICY IF EXISTS "Users can view own transactions" ON public.transactions;
CREATE POLICY "Users can view own transactions" ON public.transactions
  AS PERMISSIVE FOR SELECT
  TO authenticated
  USING (
    user_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = (select auth.uid()) AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Users can insert own transactions" ON public.transactions;
CREATE POLICY "Users can insert own transactions" ON public.transactions
  AS PERMISSIVE FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = (select auth.uid()) AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Users can update own transactions" ON public.transactions;
CREATE POLICY "Users can update own transactions" ON public.transactions
  AS PERMISSIVE FOR UPDATE
  TO authenticated
  USING (
    user_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = (select auth.uid()) AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Users can delete own transactions" ON public.transactions;
CREATE POLICY "Users can delete own transactions" ON public.transactions
  AS PERMISSIVE FOR DELETE
  TO authenticated
  USING (
    user_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = (select auth.uid()) AND role = 'admin'
    )
  );

-- ==================== TRANSFERS ====================
DROP POLICY IF EXISTS "Users can view own transfers" ON public.transfers;
CREATE POLICY "Users can view own transfers" ON public.transfers
  AS PERMISSIVE FOR SELECT
  TO authenticated
  USING (
    user_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = (select auth.uid()) AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Users can insert own transfers" ON public.transfers;
CREATE POLICY "Users can insert own transfers" ON public.transfers
  AS PERMISSIVE FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = (select auth.uid()) AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Users can update own transfers" ON public.transfers;
CREATE POLICY "Users can update own transfers" ON public.transfers
  AS PERMISSIVE FOR UPDATE
  TO authenticated
  USING (
    user_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = (select auth.uid()) AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Users can delete own transfers" ON public.transfers;
CREATE POLICY "Users can delete own transfers" ON public.transfers
  AS PERMISSIVE FOR DELETE
  TO authenticated
  USING (
    user_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = (select auth.uid()) AND role = 'admin'
    )
  );

-- ==================== USER_ROLES ====================
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles" ON public.user_roles
  AS PERMISSIVE FOR SELECT
  TO authenticated
  USING (
    user_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = (select auth.uid()) AND role = 'admin'
    )
  );

-- ==================== FX_RATES ====================
-- Special case: fx_rates has "Anyone can view" + "Admin can manage"
-- We keep the public read policy separate, but consolidate admin properly
DROP POLICY IF EXISTS "Anyone can view fx_rates" ON public.fx_rates;
CREATE POLICY "Anyone can view fx_rates" ON public.fx_rates
  AS PERMISSIVE FOR SELECT
  USING (true); -- Public read access

-- Admin write policies are already handled above with "Admins can manage fx_rates"

-- =====================================================
-- VERIFICATION QUERY (optional, run after to check)
-- =====================================================
-- SELECT
--   schemaname,
--   tablename,
--   policyname,
--   permissive,
--   roles,
--   cmd
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename, cmd, policyname;
