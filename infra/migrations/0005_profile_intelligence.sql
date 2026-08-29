CREATE TABLE IF NOT EXISTS profile_intelligence_candidates (
  id VARCHAR(40) PRIMARY KEY,
  owner_id VARCHAR(40) NOT NULL,
  candidate_json TEXT NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_profile_intelligence_owner (owner_id),
  KEY idx_profile_intelligence_status (status),
  CONSTRAINT fk_profile_intelligence_owner FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);
