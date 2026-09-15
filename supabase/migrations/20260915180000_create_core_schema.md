-- Local copy of remote migration: create_core_schema
-- Applied via Supabase MCP to project zkqtcujjyrucdyelqidi

-- See remote history for exact applied SQL.
-- This file documents the Phase 2 schema for version control.

-- Entities:
-- audiences, moments, journeys, journey_moments, user_needs, capabilities,
-- features, channels, channel_contexts, feature_channel_contexts,
-- evidences, roadmap_items, gaps

-- Enums:
-- temporal_status, feature_status, experience_level, priority_level,
-- roadmap_phase, evidence_type, gap_type, gap_status, impact_level

-- Notes:
-- - Soft delete via active=false (no hard delete in MVP)
-- - RLS enabled with temporary open policies for anon/authenticated until Phase 5 auth
-- - feature status lives on feature_channel_contexts, not features
