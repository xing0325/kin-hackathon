CREATE TABLE IF NOT EXISTS signals (
  id VARCHAR(40) PRIMARY KEY, owner_id VARCHAR(40) NOT NULL, kind VARCHAR(24) NOT NULL,
  statement TEXT NOT NULL, context_json JSON NOT NULL, status VARCHAR(24) NOT NULL DEFAULT 'active',
  expires_at TIMESTAMP(6) NULL, created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  INDEX idx_signal_owner (owner_id), INDEX idx_signal_kind (kind), INDEX idx_signal_status (status),
  CONSTRAINT fk_signal_owner FOREIGN KEY (owner_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS proactive_items (
  id VARCHAR(40) PRIMARY KEY, owner_id VARCHAR(40) NOT NULL, kind VARCHAR(40) NOT NULL,
  title VARCHAR(240) NOT NULL, body TEXT NOT NULL, action_json JSON NOT NULL,
  source_id VARCHAR(40) NULL, status VARCHAR(24) NOT NULL DEFAULT 'open',
  created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  INDEX idx_proactive_owner (owner_id), INDEX idx_proactive_kind (kind), INDEX idx_proactive_status (status),
  CONSTRAINT fk_proactive_owner FOREIGN KEY (owner_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS experience_candidates (
  id VARCHAR(40) PRIMARY KEY, owner_id VARCHAR(40) NOT NULL, artifact_json JSON NOT NULL,
  source_json JSON NOT NULL, status VARCHAR(24) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  INDEX idx_candidate_owner (owner_id), INDEX idx_candidate_status (status),
  CONSTRAINT fk_candidate_owner FOREIGN KEY (owner_id) REFERENCES users(id)
);
