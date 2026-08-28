-- Node / Builder 小天才 — TiDB Cloud schema V1
-- EMBEDDING_DIM must remain aligned with apps/api EMBEDDING_DIM=64.

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(40) PRIMARY KEY,
  handle VARCHAR(64) NOT NULL UNIQUE,
  display_name VARCHAR(120) NOT NULL,
  avatar_url VARCHAR(512) NULL,
  created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
);

CREATE TABLE IF NOT EXISTS agent_profiles (
  user_id VARCHAR(40) PRIMARY KEY,
  now_building TEXT NOT NULL,
  skills_json JSON NOT NULL,
  needs_json JSON NOT NULL,
  interests_json JSON NOT NULL,
  ai_stack_json JSON NOT NULL,
  public_summary TEXT NOT NULL,
  embedding_json JSON NOT NULL,
  embedding VECTOR(64),
  visibility VARCHAR(24) NOT NULL DEFAULT 'event',
  updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  CONSTRAINT fk_profile_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  VECTOR INDEX idx_profile_embedding ((VEC_COSINE_DISTANCE(embedding)))
);

CREATE TABLE IF NOT EXISTS devices (
  id VARCHAR(40) PRIMARY KEY,
  user_id VARCHAR(40) NULL,
  hardware_uid VARCHAR(128) NOT NULL UNIQUE,
  pairing_code_hash VARCHAR(128) NOT NULL,
  display_name VARCHAR(80) NOT NULL DEFAULT 'Cardputer',
  status VARCHAR(24) NOT NULL DEFAULT 'offline',
  battery_percent INT NULL,
  firmware_version VARCHAR(64) NULL,
  last_seen_at TIMESTAMP(6) NULL,
  created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  INDEX idx_devices_user (user_id),
  CONSTRAINT fk_device_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS presence_sessions (
  id VARCHAR(40) PRIMARY KEY,
  device_id VARCHAR(40) NOT NULL,
  venue_id VARCHAR(80) NOT NULL,
  coarse_zone VARCHAR(80) NOT NULL,
  started_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  expires_at TIMESTAMP(6) NOT NULL,
  INDEX idx_presence_lookup (venue_id, coarse_zone, expires_at),
  INDEX idx_presence_device (device_id),
  CONSTRAINT fk_presence_device FOREIGN KEY (device_id) REFERENCES devices(id)
);

CREATE TABLE IF NOT EXISTS match_candidates (
  id VARCHAR(40) PRIMARY KEY,
  pair_key VARCHAR(90) NOT NULL,
  user_a_id VARCHAR(40) NOT NULL,
  user_b_id VARCHAR(40) NOT NULL,
  score DOUBLE NOT NULL,
  reason_json JSON NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'candidate',
  expires_at TIMESTAMP(6) NOT NULL,
  created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  UNIQUE KEY uq_match_pair_status (pair_key, status),
  INDEX idx_match_user_a (user_a_id),
  INDEX idx_match_user_b (user_b_id),
  CONSTRAINT fk_match_user_a FOREIGN KEY (user_a_id) REFERENCES users(id),
  CONSTRAINT fk_match_user_b FOREIGN KEY (user_b_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS handshakes (
  id VARCHAR(40) PRIMARY KEY,
  match_id VARCHAR(40) NOT NULL UNIQUE,
  user_a_confirmed_at TIMESTAMP(6) NULL,
  user_b_confirmed_at TIMESTAMP(6) NULL,
  gesture_a_at TIMESTAMP(6) NULL,
  gesture_b_at TIMESTAMP(6) NULL,
  proof_nonce_hash VARCHAR(128) NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'pending',
  completed_at TIMESTAMP(6) NULL,
  created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  CONSTRAINT fk_handshake_match FOREIGN KEY (match_id) REFERENCES match_candidates(id)
);

CREATE TABLE IF NOT EXISTS relationships (
  id VARCHAR(40) PRIMARY KEY,
  user_a_id VARCHAR(40) NOT NULL,
  user_b_id VARCHAR(40) NOT NULL,
  handshake_id VARCHAR(40) NOT NULL UNIQUE,
  shared_context_json JSON NOT NULL,
  visibility VARCHAR(24) NOT NULL DEFAULT 'participants',
  created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  INDEX idx_relationship_user_a (user_a_id),
  INDEX idx_relationship_user_b (user_b_id),
  CONSTRAINT fk_relationship_user_a FOREIGN KEY (user_a_id) REFERENCES users(id),
  CONSTRAINT fk_relationship_user_b FOREIGN KEY (user_b_id) REFERENCES users(id),
  CONSTRAINT fk_relationship_handshake FOREIGN KEY (handshake_id) REFERENCES handshakes(id)
);

CREATE TABLE IF NOT EXISTS need_signals (
  id VARCHAR(40) PRIMARY KEY,
  owner_id VARCHAR(40) NOT NULL,
  problem TEXT NOT NULL,
  context_json JSON NOT NULL,
  embedding_json JSON NOT NULL,
  embedding VECTOR(64),
  status VARCHAR(24) NOT NULL DEFAULT 'open',
  created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  INDEX idx_need_owner (owner_id),
  CONSTRAINT fk_need_owner FOREIGN KEY (owner_id) REFERENCES users(id),
  VECTOR INDEX idx_need_embedding ((VEC_COSINE_DISTANCE(embedding)))
);

CREATE TABLE IF NOT EXISTS experience_artifacts (
  id VARCHAR(40) PRIMARY KEY,
  owner_id VARCHAR(40) NOT NULL,
  problem TEXT NOT NULL,
  context TEXT NOT NULL,
  cause TEXT NOT NULL,
  worked TEXT NOT NULL,
  failed TEXT NOT NULL,
  confidence DOUBLE NOT NULL DEFAULT 0.5,
  visibility VARCHAR(24) NOT NULL DEFAULT 'event',
  embedding_json JSON NOT NULL,
  embedding VECTOR(64),
  created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  INDEX idx_experience_owner (owner_id),
  CONSTRAINT fk_experience_owner FOREIGN KEY (owner_id) REFERENCES users(id),
  VECTOR INDEX idx_experience_embedding ((VEC_COSINE_DISTANCE(embedding)))
);

CREATE TABLE IF NOT EXISTS experience_matches (
  id VARCHAR(40) PRIMARY KEY,
  need_id VARCHAR(40) NOT NULL,
  experience_id VARCHAR(40) NOT NULL,
  score DOUBLE NOT NULL,
  explanation TEXT NOT NULL,
  permission_status VARCHAR(24) NOT NULL DEFAULT 'summary_only',
  UNIQUE KEY uq_need_experience (need_id, experience_id),
  INDEX idx_experience_match_need (need_id),
  CONSTRAINT fk_experience_match_need FOREIGN KEY (need_id) REFERENCES need_signals(id),
  CONSTRAINT fk_experience_match_artifact FOREIGN KEY (experience_id) REFERENCES experience_artifacts(id)
);

CREATE TABLE IF NOT EXISTS events (
  id VARCHAR(40) PRIMARY KEY,
  actor_type VARCHAR(24) NOT NULL,
  actor_id VARCHAR(40) NOT NULL,
  type VARCHAR(80) NOT NULL,
  payload_json JSON NOT NULL,
  idempotency_key VARCHAR(128) NOT NULL UNIQUE,
  created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  INDEX idx_event_actor (actor_id),
  INDEX idx_event_type (type)
);

CREATE TABLE IF NOT EXISTS jobs (
  id VARCHAR(40) PRIMARY KEY,
  type VARCHAR(80) NOT NULL,
  payload_json JSON NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'pending',
  attempts INT NOT NULL DEFAULT 0,
  available_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  last_error TEXT NULL,
  INDEX idx_job_poll (status, available_at)
);
