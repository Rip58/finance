-- =====================================================
-- FIX REMAINING SUPABASE WARNINGS (3 total)
-- =====================================================
-- 1. Function Search Path Mutable (2 functions)
-- 2. Password Protection (manual enable in Dashboard)
-- =====================================================

-- =====================================================
-- FIX 1: Function Search Path Mutable
-- Add SECURITY DEFINER and SET search_path
-- =====================================================

-- Fix: update_settings_updated_at
CREATE OR REPLACE FUNCTION public.update_settings_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

-- Fix: handle_updated_at  
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- =====================================================
-- VERIFICATION
-- =====================================================
-- Check that functions have proper security settings
SELECT 
    routine_name,
    security_type,
    prosecdef as is_security_definer
FROM information_schema.routines
LEFT JOIN pg_proc ON proname = routine_name
WHERE routine_schema = 'public'
  AND routine_name IN ('update_settings_updated_at', 'handle_updated_at');
