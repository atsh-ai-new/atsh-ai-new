CREATE TABLE IF NOT EXISTS site_page_drafts (
 slug varchar(100) NOT NULL,
 locale varchar(12) NOT NULL,
 content jsonb NOT NULL DEFAULT '{}'::jsonb,
 updated_by text,
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (slug, locale)
);
