CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(40) PRIMARY KEY,
  owner_id VARCHAR(40) NOT NULL,
  kind VARCHAR(40) NOT NULL,
  title VARCHAR(240) NOT NULL,
  body TEXT NOT NULL,
  action_json TEXT NOT NULL,
  source_id VARCHAR(80) NOT NULL,
  delivery_status VARCHAR(24) NOT NULL DEFAULT 'delivered',
  delivered_at DATETIME(6) NULL,
  read_at DATETIME(6) NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  UNIQUE KEY uq_notification_source (owner_id, kind, source_id),
  KEY idx_notifications_owner_unread (owner_id, read_at, created_at),
  KEY idx_notifications_delivery (delivery_status),
  CONSTRAINT fk_notifications_owner FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);
