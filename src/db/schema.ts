export interface Asset {
  id: string;
  uri: string;
  filename: string | null;
  size_bytes: number | null;
  width: number | null;
  height: number | null;
  created_at: number;
  is_screenshot: number;
  // Bundle detection fields
  is_blurry?: number;
  is_burst?: number;
  is_whatsapp?: number;
  is_video?: number;
  duration_ms?: number;
  mime_type?: string;
  content_hash?: string;
}

export interface Intent {
  id: string;
  asset_id: string;
  action: 'keep' | 'delete';
  created_at: number;
}

export const SCHEMA = {
  assets: `
    CREATE TABLE IF NOT EXISTS assets (
      id TEXT PRIMARY KEY,
      uri TEXT NOT NULL,
      filename TEXT,
      size_bytes INTEGER,
      width INTEGER,
      height INTEGER,
      created_at INTEGER NOT NULL,
      is_screenshot INTEGER DEFAULT 0,
      is_blurry INTEGER DEFAULT 0,
      is_burst INTEGER DEFAULT 0,
      is_whatsapp INTEGER DEFAULT 0,
      is_video INTEGER DEFAULT 0,
      duration_ms INTEGER,
      mime_type TEXT,
      content_hash TEXT
    )
  `,

  intents: `
    CREATE TABLE IF NOT EXISTS intents (
      id TEXT PRIMARY KEY,
      asset_id TEXT NOT NULL,
      action TEXT NOT NULL CHECK(action IN ('keep', 'delete')),
      created_at INTEGER NOT NULL,
      FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE
    )
  `,

  indexes: [
    'CREATE INDEX IF NOT EXISTS idx_assets_created ON assets(created_at)',
    'CREATE INDEX IF NOT EXISTS idx_assets_screenshot ON assets(is_screenshot)',
    'CREATE INDEX IF NOT EXISTS idx_intents_asset ON intents(asset_id)',
    'CREATE INDEX IF NOT EXISTS idx_intents_action ON intents(action)',
    // Index for efficient duplicate detection
    'CREATE INDEX IF NOT EXISTS idx_assets_duplicates ON assets(size_bytes, width, height)',
    // Bundle detection indexes
    'CREATE INDEX IF NOT EXISTS idx_assets_blurry ON assets(is_blurry)',
    'CREATE INDEX IF NOT EXISTS idx_assets_burst ON assets(is_burst)',
    'CREATE INDEX IF NOT EXISTS idx_assets_whatsapp ON assets(is_whatsapp)',
    'CREATE INDEX IF NOT EXISTS idx_assets_large ON assets(size_bytes)',
    'CREATE INDEX IF NOT EXISTS idx_assets_video ON assets(is_video, duration_ms)',
    'CREATE INDEX IF NOT EXISTS idx_assets_hash ON assets(content_hash)',
  ],
};
