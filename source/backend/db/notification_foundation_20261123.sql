-- Durable in-app notifications and opt-in device subscriptions.
-- Apply only after customer_accounts, team_members and customer_journey_projects exist.
CREATE TABLE IF NOT EXISTS platform_notifications (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 recipient_type varchar(12) NOT NULL CHECK (recipient_type IN ('customer','team')),
 recipient_id uuid NOT NULL,
 project_id uuid,
 event_type varchar(64) NOT NULL,
 title varchar(180) NOT NULL,
 body text NOT NULL DEFAULT '',
 target_path varchar(500) NOT NULL,
 read_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT notification_target_relative CHECK (target_path LIKE '/%' AND target_path NOT LIKE '//%')
);
CREATE INDEX IF NOT EXISTS platform_notifications_inbox_idx ON platform_notifications(recipient_type,recipient_id,created_at DESC);
CREATE TABLE IF NOT EXISTS notification_push_subscriptions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 recipient_type varchar(12) NOT NULL CHECK (recipient_type IN ('customer','team')),
 recipient_id uuid NOT NULL,
 endpoint text NOT NULL UNIQUE,
 p256dh text NOT NULL,
 auth_secret text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notification_push_owner_idx ON notification_push_subscriptions(recipient_type,recipient_id);
CREATE TABLE IF NOT EXISTS notification_delivery_attempts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 notification_id uuid NOT NULL REFERENCES platform_notifications(id) ON DELETE CASCADE,
 channel varchar(16) NOT NULL CHECK(channel IN ('web_push','telegram')),
 state varchar(16) NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','sent','failed','disabled')),
 attempt_count integer NOT NULL DEFAULT 0,
 last_error text,
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(notification_id,channel)
);
-- Telegram is intentionally disabled until the operator configures a bot token and chat id.
