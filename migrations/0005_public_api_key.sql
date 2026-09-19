-- Public form key for Level 1 registration (POST /people).
-- Plaintext: e9publickey_9f2c1a0b8d7e6f5a4c3b2d1e0f9a8b7c6d5e4f3a
INSERT INTO api_key (id, name, key_hash, scopes, active)
VALUES (
  'a7e4d2c1-8b90-4f12-9e3a-1c5d7b9e0f22',
  'festival-demo-public',
  '27beb93d006eb5287847fb912e25a7d5390159db3b2de23d6786e814b639a7de',
  '["public","people:write"]',
  1
);
