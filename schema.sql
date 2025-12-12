CREATE TABLE IF NOT EXISTS coach_memory (
  id TEXT PRIMARY KEY,
  name TEXT,
  goals TEXT,
  current_challenge TEXT,
  history JSONB DEFAULT '[]',
  updated_at TIMESTAMP DEFAULT NOW()
);
