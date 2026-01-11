-- Optimizing RLS Policies to use (select auth.uid()) for caching
-- This fixes 'auth_rls_initplan' performance warnings.

-- 1. asset_transactions
DROP POLICY IF EXISTS "Users can view their own asset transactions" ON public.asset_transactions;
CREATE POLICY "Users can view their own asset transactions" ON public.asset_transactions FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own asset transactions" ON public.asset_transactions;
CREATE POLICY "Users can insert their own asset transactions" ON public.asset_transactions FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own asset transactions" ON public.asset_transactions;
CREATE POLICY "Users can update their own asset transactions" ON public.asset_transactions FOR UPDATE TO authenticated USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete their own asset transactions" ON public.asset_transactions;
CREATE POLICY "Users can delete their own asset transactions" ON public.asset_transactions FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);


-- 2. cash_transactions
DROP POLICY IF EXISTS "Users can view their own cash transactions" ON public.cash_transactions;
CREATE POLICY "Users can view their own cash transactions" ON public.cash_transactions FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own cash transactions" ON public.cash_transactions;
CREATE POLICY "Users can insert their own cash transactions" ON public.cash_transactions FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own cash transactions" ON public.cash_transactions;
CREATE POLICY "Users can update their own cash transactions" ON public.cash_transactions FOR UPDATE TO authenticated USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete their own cash transactions" ON public.cash_transactions;
CREATE POLICY "Users can delete their own cash transactions" ON public.cash_transactions FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);


-- 3. user_roles
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
-- Admin policy (assuming check based on email or role lookup, optimization might be trickier without recursion, keeping as is or simple uid check if applicable)
-- But user_roles usually has "Admins can manage all roles". We'll skip admin optimization for now if complex, but fix user one.


-- 4. settings
DROP POLICY IF EXISTS "Users can view own settings" ON public.settings;
CREATE POLICY "Users can view own settings" ON public.settings FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own settings" ON public.settings;
CREATE POLICY "Users can insert own settings" ON public.settings FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own settings" ON public.settings;
CREATE POLICY "Users can update own settings" ON public.settings FOR UPDATE TO authenticated USING ((select auth.uid()) = user_id);

-- 5. categories
DROP POLICY IF EXISTS "Users can view own categories" ON public.categories;
CREATE POLICY "Users can view own categories" ON public.categories FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own categories" ON public.categories;
CREATE POLICY "Users can insert own categories" ON public.categories FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own categories" ON public.categories;
CREATE POLICY "Users can update own categories" ON public.categories FOR UPDATE TO authenticated USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own categories" ON public.categories;
CREATE POLICY "Users can delete own categories" ON public.categories FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);


-- 6. bank_accounts
DROP POLICY IF EXISTS "Users can view own bank_accounts" ON public.bank_accounts;
CREATE POLICY "Users can view own bank_accounts" ON public.bank_accounts FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own bank_accounts" ON public.bank_accounts;
CREATE POLICY "Users can insert own bank_accounts" ON public.bank_accounts FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own bank_accounts" ON public.bank_accounts;
CREATE POLICY "Users can update own bank_accounts" ON public.bank_accounts FOR UPDATE TO authenticated USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own bank_accounts" ON public.bank_accounts;
CREATE POLICY "Users can delete own bank_accounts" ON public.bank_accounts FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);


-- 7. transactions
DROP POLICY IF EXISTS "Users can view own transactions" ON public.transactions;
CREATE POLICY "Users can view own transactions" ON public.transactions FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own transactions" ON public.transactions;
CREATE POLICY "Users can insert own transactions" ON public.transactions FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own transactions" ON public.transactions;
CREATE POLICY "Users can update own transactions" ON public.transactions FOR UPDATE TO authenticated USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own transactions" ON public.transactions;
CREATE POLICY "Users can delete own transactions" ON public.transactions FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);


-- 8. subscriptions
DROP POLICY IF EXISTS "Users can view own subscriptions" ON public.subscriptions;
CREATE POLICY "Users can view own subscriptions" ON public.subscriptions FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own subscriptions" ON public.subscriptions;
CREATE POLICY "Users can insert own subscriptions" ON public.subscriptions FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own subscriptions" ON public.subscriptions;
CREATE POLICY "Users can update own subscriptions" ON public.subscriptions FOR UPDATE TO authenticated USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own subscriptions" ON public.subscriptions;
CREATE POLICY "Users can delete own subscriptions" ON public.subscriptions FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);


-- 9. subscription_charges
DROP POLICY IF EXISTS "Users can view own subscription_charges" ON public.subscription_charges;
CREATE POLICY "Users can view own subscription_charges" ON public.subscription_charges FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own subscription_charges" ON public.subscription_charges;
CREATE POLICY "Users can insert own subscription_charges" ON public.subscription_charges FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);


-- 10. transfers
DROP POLICY IF EXISTS "Users can view own transfers" ON public.transfers;
CREATE POLICY "Users can view own transfers" ON public.transfers FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own transfers" ON public.transfers;
CREATE POLICY "Users can insert own transfers" ON public.transfers FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own transfers" ON public.transfers;
CREATE POLICY "Users can update own transfers" ON public.transfers FOR UPDATE TO authenticated USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own transfers" ON public.transfers;
CREATE POLICY "Users can delete own transfers" ON public.transfers FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);


-- 11. crypto_assets
DROP POLICY IF EXISTS "Users can view own crypto assets" ON public.crypto_assets;
CREATE POLICY "Users can view own crypto assets" ON public.crypto_assets FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own crypto assets" ON public.crypto_assets;
CREATE POLICY "Users can insert own crypto assets" ON public.crypto_assets FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own crypto assets" ON public.crypto_assets;
CREATE POLICY "Users can update own crypto assets" ON public.crypto_assets FOR UPDATE TO authenticated USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own crypto assets" ON public.crypto_assets;
CREATE POLICY "Users can delete own crypto assets" ON public.crypto_assets FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);


-- 12. dca_portfolios
DROP POLICY IF EXISTS "Users can view their own DCA portfolios" ON public.dca_portfolios;
CREATE POLICY "Users can view their own DCA portfolios" ON public.dca_portfolios FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own DCA portfolios" ON public.dca_portfolios;
CREATE POLICY "Users can insert their own DCA portfolios" ON public.dca_portfolios FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own DCA portfolios" ON public.dca_portfolios;
CREATE POLICY "Users can update their own DCA portfolios" ON public.dca_portfolios FOR UPDATE TO authenticated USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete their own DCA portfolios" ON public.dca_portfolios;
CREATE POLICY "Users can delete their own DCA portfolios" ON public.dca_portfolios FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);


-- 13. account_holdings
DROP POLICY IF EXISTS "Users can view own account_holdings" ON public.account_holdings;
CREATE POLICY "Users can view own account_holdings" ON public.account_holdings FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own account_holdings" ON public.account_holdings;
CREATE POLICY "Users can insert own account_holdings" ON public.account_holdings FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own account_holdings" ON public.account_holdings;
CREATE POLICY "Users can update own account_holdings" ON public.account_holdings FOR UPDATE TO authenticated USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own account_holdings" ON public.account_holdings;
CREATE POLICY "Users can delete own account_holdings" ON public.account_holdings FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);


-- 14. recurring_transactions
DROP POLICY IF EXISTS "Users can view own recurring_transactions" ON public.recurring_transactions;
CREATE POLICY "Users can view own recurring_transactions" ON public.recurring_transactions FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own recurring_transactions" ON public.recurring_transactions;
CREATE POLICY "Users can insert own recurring_transactions" ON public.recurring_transactions FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own recurring_transactions" ON public.recurring_transactions;
CREATE POLICY "Users can update own recurring_transactions" ON public.recurring_transactions FOR UPDATE TO authenticated USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own recurring_transactions" ON public.recurring_transactions;
CREATE POLICY "Users can delete own recurring_transactions" ON public.recurring_transactions FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);


-- 15. recurring_confirmations
DROP POLICY IF EXISTS "Users can view own recurring_confirmations" ON public.recurring_confirmations;
CREATE POLICY "Users can view own recurring_confirmations" ON public.recurring_confirmations FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own recurring_confirmations" ON public.recurring_confirmations;
CREATE POLICY "Users can insert own recurring_confirmations" ON public.recurring_confirmations FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own recurring_confirmations" ON public.recurring_confirmations;
CREATE POLICY "Users can delete own recurring_confirmations" ON public.recurring_confirmations FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);


NOTIFY pgrst, 'reload schema';
