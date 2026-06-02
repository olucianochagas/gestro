CREATE TABLE users (
  id            text PRIMARY KEY,
  name          text NOT NULL,
  email         text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  created_at    timestamptz NOT NULL
);

CREATE TABLE organizations (
  id         text PRIMARY KEY,
  name       text NOT NULL,
  slug       text NOT NULL,
  owner_id   text NOT NULL,
  created_at timestamptz NOT NULL
);

CREATE TABLE memberships (
  user_id         text NOT NULL,
  organization_id text NOT NULL,
  role            text NOT NULL,
  PRIMARY KEY (user_id, organization_id)
);

CREATE TABLE projects (
  id              text PRIMARY KEY,
  organization_id text NOT NULL,
  key             text NOT NULL,
  name            text NOT NULL,
  description     text NOT NULL,
  status          text NOT NULL,
  created_by      text NOT NULL,
  created_at      timestamptz NOT NULL,
  UNIQUE (organization_id, key)
);

CREATE INDEX idx_projects_org ON projects (organization_id);
