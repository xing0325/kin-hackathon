CREATE TABLE IF NOT EXISTS campfires (
  id VARCHAR(40) PRIMARY KEY,
  creator_id VARCHAR(40) NOT NULL,
  name VARCHAR(160) NOT NULL,
  venue VARCHAR(160) NOT NULL DEFAULT '',
  members_json JSON NOT NULL,
  proposal_json JSON NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'proposed',
  version INT NOT NULL DEFAULT 1,
  expires_at TIMESTAMP(6) NOT NULL,
  created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  INDEX idx_campfire_creator (creator_id),
  INDEX idx_campfire_status (status),
  INDEX idx_campfire_expires (expires_at),
  CONSTRAINT fk_campfire_creator FOREIGN KEY (creator_id) REFERENCES users(id)
);
