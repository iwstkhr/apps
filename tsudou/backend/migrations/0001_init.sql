-- イベントと回答。候補日時 (candidates) と回答の選択 (choices) は JSON 文字列で持つ。
-- 日時 (created_at / updated_at) は ISO 8601 文字列、expires_at はエポック秒。

CREATE TABLE events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  fee INTEGER,
  memo TEXT,
  candidates TEXT NOT NULL,
  closed INTEGER NOT NULL DEFAULT 0,
  manage_token_hash TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 期限切れの削除 (Cron Trigger) 用
CREATE INDEX events_expires_at ON events (expires_at);

CREATE TABLE answers (
  id TEXT PRIMARY KEY,
  -- イベントを消すと回答も消える
  event_id TEXT NOT NULL REFERENCES events (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  message TEXT,
  choices TEXT NOT NULL,
  edit_token_hash TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  -- 同じイベントに同じ名前の回答は置けない。1 イベントの回答を引くインデックスも兼ねる
  UNIQUE (event_id, name)
);
