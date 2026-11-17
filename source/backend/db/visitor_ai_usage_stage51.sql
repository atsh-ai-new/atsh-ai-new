-- Minimal aggregate usage accounting: do not store visitors' messages or identifiers.
CREATE TABLE IF NOT EXISTS visitor_ai_daily_usage (
  day date PRIMARY KEY,
  requests bigint NOT NULL DEFAULT 0 CHECK(requests>=0),
  input_tokens bigint NOT NULL DEFAULT 0 CHECK(input_tokens>=0),
  output_tokens bigint NOT NULL DEFAULT 0 CHECK(output_tokens>=0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
