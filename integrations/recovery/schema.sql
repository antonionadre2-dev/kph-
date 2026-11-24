PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS recovery_drafts (
  id TEXT PRIMARY KEY,
  idempotency_key TEXT NOT NULL UNIQUE,
  fingerprint TEXT NOT NULL,
  email_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('active','completed','paid','cancelled','unsubscribed','bounced','complaint','expired')),
  last_activity_at INTEGER NOT NULL,
  reminder_consent INTEGER NOT NULL CHECK(reminder_consent IN (0,1)),
  version INTEGER NOT NULL DEFAULT 1,
  data_json TEXT NOT NULL CHECK(json_valid(data_json))
);
CREATE INDEX IF NOT EXISTS recovery_drafts_email ON recovery_drafts(email_hash);
CREATE INDEX IF NOT EXISTS recovery_drafts_expiry ON recovery_drafts(expires_at);

CREATE TABLE IF NOT EXISTS recovery_outbox (
  id TEXT PRIMARY KEY,
  draft_id TEXT NOT NULL REFERENCES recovery_drafts(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK(kind IN ('saved','reminder1','reminder2')),
  due_at INTEGER NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('queued','sending','sent','failed','cancelled','delivery_unknown')),
  attempts INTEGER NOT NULL DEFAULT 0,
  lease_until INTEGER,
  provider_id TEXT,
  sent_at INTEGER,
  last_error_code TEXT,
  UNIQUE(draft_id,kind)
);
CREATE INDEX IF NOT EXISTS recovery_outbox_due ON recovery_outbox(status,due_at);

-- Minimal keyed hashes are retained to honour opt-outs; no address or message body here.
CREATE TABLE IF NOT EXISTS recovery_suppressions (
  email_hash TEXT PRIMARY KEY,
  reason TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS recovery_rate_limits (
  bucket_key TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

-- Tombstones retain the highest revision, preventing an old webhook replay from republishing a cancellation.
CREATE TABLE IF NOT EXISTS recovery_booking_activity (
  id TEXT PRIMARY KEY,
  booking_key TEXT NOT NULL UNIQUE,
  revision INTEGER NOT NULL,
  visible INTEGER NOT NULL CHECK(visible IN (0,1)),
  service TEXT,
  region TEXT,
  occurred_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS recovery_activity_visible ON recovery_booking_activity(visible,occurred_at,id);
