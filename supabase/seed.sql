-- ============================================================
-- Supabase Seed Script — ReportForge
-- ============================================================
-- Run with: supabase db reset (applies migrations + seed)
-- Or manually: psql -f supabase/seed.sql
-- ============================================================


-- ============================================================
-- 1. Storage Buckets (idempotent — safe to re-run)
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'reports', 'reports', false, 52428800,
    ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
  ),
  (
    'uploads', 'uploads', false, 26214400,
    ARRAY['text/csv', 'text/plain', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/json']
  ),
  (
    'logos', 'logos', true, 5242880,
    ARRAY['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']
  ),
  (
    'previews', 'previews', true, 10485760,
    ARRAY['image/png', 'image/jpeg', 'image/webp']
  )
ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- 2. Default Report Templates
-- ============================================================
-- These are system-level templates available to all users.
-- They use a placeholder userId ('system') since they're not user-owned.
-- The application's template-matcher.ts uses templateId to reference these.

INSERT INTO "UserTemplate" (id, "userId", name, description, config, "isPublic", "createdAt")
VALUES
  (
    'tpl_sales_report',
    'system',
    'Sales Performance Report',
    'Revenue trends, top products, regional breakdown, and period-over-period comparisons.',
    '{
      "sections": ["executive_summary", "revenue_trends", "top_products", "regional_breakdown", "period_comparison"],
      "charts": ["line", "bar", "pie"],
      "matchPatterns": ["revenue", "sales", "orders", "income", "profit"],
      "color": "#2563EB"
    }'::jsonb,
    true,
    NOW()
  ),
  (
    'tpl_social_media',
    'system',
    'Social Media Analytics',
    'Follower growth, engagement rates, top content, and posting frequency analysis.',
    '{
      "sections": ["executive_summary", "follower_growth", "engagement_rates", "top_content", "posting_frequency"],
      "charts": ["area", "bar", "horizontal_bar"],
      "matchPatterns": ["followers", "likes", "engagement", "impressions", "reach", "shares"],
      "color": "#7C3AED"
    }'::jsonb,
    true,
    NOW()
  ),
  (
    'tpl_crypto_wallet',
    'system',
    'Crypto Wallet Activity',
    'Portfolio value over time, token allocation, transaction history, and gas fee analysis.',
    '{
      "sections": ["executive_summary", "portfolio_value", "token_allocation", "transaction_history", "gas_analysis", "pnl_breakdown"],
      "charts": ["line", "donut", "bar"],
      "matchPatterns": ["token", "wallet", "gas", "tx", "hash", "wei", "eth", "btc", "portfolio"],
      "color": "#F59E0B"
    }'::jsonb,
    true,
    NOW()
  ),
  (
    'tpl_ecommerce',
    'system',
    'E-commerce / Shopify Report',
    'Sales by category, customer acquisition, AOV trends, and fulfillment performance.',
    '{
      "sections": ["executive_summary", "sales_by_category", "customer_acquisition", "aov_trends", "inventory_turnover", "fulfillment"],
      "charts": ["bar", "line", "stacked_bar"],
      "matchPatterns": ["product", "sku", "inventory", "cart", "checkout", "shopify", "order_value"],
      "color": "#059669"
    }'::jsonb,
    true,
    NOW()
  ),
  (
    'tpl_analytics',
    'system',
    'Website Analytics',
    'Traffic sources, page performance, conversion funnels, bounce rates, and geographic distribution.',
    '{
      "sections": ["executive_summary", "traffic_sources", "page_performance", "conversion_funnel", "bounce_rates", "geo_distribution"],
      "charts": ["pie", "bar", "line", "stacked_area"],
      "matchPatterns": ["sessions", "pageviews", "bounce", "conversion", "referrer", "utm"],
      "color": "#DC2626"
    }'::jsonb,
    true,
    NOW()
  ),
  (
    'tpl_custom',
    'system',
    'Custom / AI-Selected',
    'Auto-selects the best layout based on your data structure. Fully customizable.',
    '{
      "sections": ["executive_summary", "auto"],
      "charts": ["auto"],
      "matchPatterns": [],
      "color": "#6B7280",
      "isDefault": true
    }'::jsonb,
    true,
    NOW()
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  config = EXCLUDED.config;
