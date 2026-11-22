-- Stage: per-member permissions foundation.
-- NULL means inherit the member's role defaults; an explicit empty array means no optional grants.
-- This migration is additive and does not change existing members' effective access until
-- the authorization middleware is updated to evaluate this field.
ALTER TABLE team_members
  ADD COLUMN IF NOT EXISTS permission_overrides jsonb DEFAULT NULL;
ALTER TABLE team_members
  ADD CONSTRAINT team_members_permission_overrides_object
  CHECK (permission_overrides IS NULL OR jsonb_typeof(permission_overrides) = 'object');
-- Apply once using the existing migration process; do not apply during page rendering.
