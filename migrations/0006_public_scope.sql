-- Narrow the public form key to the `public` scope. POST /people accepts
-- `public` or `people:write`. The private demo key keeps people:write.
UPDATE api_key
SET scopes = '["public"]'
WHERE id = 'a7e4d2c1-8b90-4f12-9e3a-1c5d7b9e0f22';
