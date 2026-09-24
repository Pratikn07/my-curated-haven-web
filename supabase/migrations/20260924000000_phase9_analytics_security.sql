-- Migration: 20260924000000_phase9_analytics_security.sql
-- Description: Phase 9 security hardening - revoke broad raw-search access and lock down search_analytics

-- 1. Drop permissive and obsolete legacy policies on public.search_analytics
DROP POLICY IF EXISTS "Anyone can view searches for trending" ON public.search_analytics;
DROP POLICY IF EXISTS "Users can insert their own searches" ON public.search_analytics;
DROP POLICY IF EXISTS "Users can delete their own searches" ON public.search_analytics;

-- 2. Revoke permissions from public roles
REVOKE ALL ON TABLE public.search_analytics FROM anon;
REVOKE ALL ON TABLE public.search_analytics FROM authenticated;
REVOKE ALL ON TABLE public.search_analytics FROM public;

-- 3. Ensure Row Level Security remains enabled (fail-closed, 0 rows exposed)
ALTER TABLE public.search_analytics ENABLE ROW LEVEL SECURITY;
