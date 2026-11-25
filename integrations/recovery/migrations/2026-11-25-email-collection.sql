-- Explicit D1/SQLite migration for an EXISTING recovery_outbox table.
-- Fresh installations use schema.sql. This is not a Firestore migration.
-- Apply once with the database's normal migration ledger; never execute at send time.
ALTER TABLE recovery_outbox ADD COLUMN notification_json TEXT CHECK(notification_json IS NULL OR json_valid(notification_json));
ALTER TABLE recovery_outbox ADD COLUMN prepared_json TEXT CHECK(prepared_json IS NULL OR json_valid(prepared_json));
ALTER TABLE recovery_outbox ADD COLUMN prepared_at INTEGER;
ALTER TABLE recovery_outbox ADD COLUMN prepared_expires_at INTEGER;
