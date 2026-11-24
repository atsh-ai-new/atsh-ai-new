BEGIN;
CREATE TABLE IF NOT EXISTS internal_chat_conversations (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 kind text NOT NULL CHECK (kind IN ('direct','group')),
 title text NOT NULL DEFAULT '',
 created_by text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS internal_chat_members (
 conversation_id bigint NOT NULL REFERENCES internal_chat_conversations(id) ON DELETE CASCADE,
 principal text NOT NULL,
 joined_at timestamptz NOT NULL DEFAULT now(),
 last_read_id bigint NOT NULL DEFAULT 0,
 PRIMARY KEY(conversation_id,principal)
);
CREATE TABLE IF NOT EXISTS internal_chat_messages (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 conversation_id bigint NOT NULL REFERENCES internal_chat_conversations(id) ON DELETE CASCADE,
 sender text NOT NULL,
 body text NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(conversation_id,sender) REFERENCES internal_chat_members(conversation_id,principal)
);
CREATE INDEX IF NOT EXISTS internal_chat_messages_cursor ON internal_chat_messages(conversation_id,id);
CREATE INDEX IF NOT EXISTS internal_chat_members_principal ON internal_chat_members(principal,conversation_id);
COMMIT;
