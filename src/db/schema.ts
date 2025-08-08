export interface Asset {
  id: string;
  uri: string;
  filename: string | null;
  size_bytes: number | null;
  width: number | null;
  height: number | null;
  created_at: number;
  is_screenshot: number;
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
      is_screenshot INTEGER DEFAULT 0
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
  ],
};
