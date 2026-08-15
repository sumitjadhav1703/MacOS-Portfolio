-- SumitOS CMS schema.
--
-- Rich, deeply-nested fields (a project's sections, a skill group's items) are stored as JSON
-- text columns rather than as child tables. Nothing queries inside them — the whole published
-- set is read at once to build /api/content — so three extra tables and three joins would buy
-- nothing. The column comments below mark which ones are JSON.

CREATE TABLE projects (
  id            TEXT PRIMARY KEY,          -- doubles as the desktop AppId, always 'project-<slug>'
  slug          TEXT NOT NULL UNIQUE,
  title         TEXT NOT NULL,
  -- Short name for the desktop icon, Finder folder and Launchpad tile, where the full title
  -- would wrap. Empty falls back to `title`.
  desktop_label TEXT NOT NULL DEFAULT '',
  tagline       TEXT NOT NULL DEFAULT '',
  status_label  TEXT NOT NULL DEFAULT '',
  status_ok     INTEGER NOT NULL DEFAULT 1,
  stack         TEXT NOT NULL DEFAULT '[]',   -- JSON string[]
  sections      TEXT NOT NULL DEFAULT '[]',   -- JSON ProjectSection[]
  links         TEXT NOT NULL DEFAULT '[]',   -- JSON ProjectLink[]
  aliases       TEXT NOT NULL DEFAULT '[]',   -- JSON string[], extra names the Shell accepts
  note          TEXT,
  caveat        TEXT,
  cover_key     TEXT,                         -- R2 object key
  featured      INTEGER NOT NULL DEFAULT 0,
  published     INTEGER NOT NULL DEFAULT 0,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX projects_order ON projects (published, display_order);

CREATE TABLE certificates (
  id             TEXT PRIMARY KEY,
  title          TEXT NOT NULL,
  issuer         TEXT NOT NULL DEFAULT '',
  issue_date     TEXT NOT NULL DEFAULT '',
  credential_url TEXT,
  file_key       TEXT,                        -- R2 object key, the certificate PDF
  image_key      TEXT,                        -- R2 object key, a preview image
  published      INTEGER NOT NULL DEFAULT 0,
  display_order  INTEGER NOT NULL DEFAULT 0,
  created_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX certificates_order ON certificates (published, display_order);

CREATE TABLE experience (
  id            TEXT PRIMARY KEY,
  title         TEXT NOT NULL,
  detail        TEXT NOT NULL DEFAULT '',
  hint          TEXT,
  published     INTEGER NOT NULL DEFAULT 0,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX experience_order ON experience (published, display_order);

CREATE TABLE education (
  id            TEXT PRIMARY KEY,
  title         TEXT NOT NULL,
  detail        TEXT NOT NULL DEFAULT '',
  hint          TEXT,
  published     INTEGER NOT NULL DEFAULT 0,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX education_order ON education (published, display_order);

CREATE TABLE skills (
  id            TEXT PRIMARY KEY,
  heading       TEXT NOT NULL,
  items         TEXT NOT NULL DEFAULT '[]',   -- JSON string[]
  published     INTEGER NOT NULL DEFAULT 0,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX skills_order ON skills (published, display_order);

CREATE TABLE social_links (
  id            TEXT PRIMARY KEY,
  slug          TEXT NOT NULL,               -- icon slug, resolved by src/lib/icons
  label         TEXT NOT NULL,
  handle        TEXT NOT NULL DEFAULT '',
  url           TEXT NOT NULL,
  pill          INTEGER NOT NULL DEFAULT 0,
  published     INTEGER NOT NULL DEFAULT 0,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX social_links_order ON social_links (published, display_order);

-- Singletons. id is pinned to 1 by the CHECK so a second row cannot be inserted.
CREATE TABLE site (
  id         INTEGER PRIMARY KEY CHECK (id = 1),
  name       TEXT NOT NULL DEFAULT '',
  initials   TEXT NOT NULL DEFAULT '',
  subtitle   TEXT NOT NULL DEFAULT '',
  paragraphs TEXT NOT NULL DEFAULT '[]',      -- JSON string[]
  email      TEXT NOT NULL DEFAULT '',
  resume_key TEXT,                            -- R2 object key; null falls back to the packaged PDF
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE os_content (
  id             INTEGER PRIMARY KEY CHECK (id = 1),
  term           TEXT NOT NULL DEFAULT '{}',  -- JSON Record<string,string>
  neofetch_art   TEXT NOT NULL DEFAULT '',
  neofetch_rows  TEXT NOT NULL DEFAULT '[]',  -- JSON [string,string][]
  kb             TEXT NOT NULL DEFAULT '[]',  -- JSON [string[],string][]
  ai_fallback    TEXT NOT NULL DEFAULT '',
  ai_suggestions TEXT NOT NULL DEFAULT '[]',  -- JSON string[]
  shortcuts      TEXT NOT NULL DEFAULT '[]',  -- JSON [string,string][]
  updated_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE assets (
  key          TEXT PRIMARY KEY,              -- R2 object key, generated, never client-supplied
  filename     TEXT NOT NULL,                 -- original name, kept for display only
  content_type TEXT NOT NULL,
  size         INTEGER NOT NULL,
  kind         TEXT NOT NULL,                 -- resume | certificates | projects | profile | misc
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Admin sessions. The cookie carries an opaque 256-bit id; everything else lives here, so
-- logout and expiry are a DELETE rather than a token that stays valid until it expires.
CREATE TABLE sessions (
  id         TEXT PRIMARY KEY,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX sessions_expiry ON sessions (expires_at);

CREATE TABLE login_attempts (
  ip TEXT NOT NULL,
  at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX login_attempts_ip ON login_attempts (ip, at);
