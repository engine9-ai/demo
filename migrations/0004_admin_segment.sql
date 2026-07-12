-- Roles are segments: the Admin role used by delegate logins is a segment,
-- gated through person_segment exactly like VIP (seeded in 0003_engine9.sql).
-- ADMIN_SEGMENT_ID in src/lib/engine9.ts must match this id.
INSERT INTO segment (id, plugin_id, name, build_type)
VALUES ('4f4ac886-f53d-48e1-b4bd-5a98eb48cc6f', '86dfc4a8-318b-51e6-9f25-d9648f963609', 'Admin', 'list');

-- Ada Adminson (person 900), the seeded demo admin, joins the Admin segment.
INSERT INTO person_segment (segment_id, person_id)
VALUES ('4f4ac886-f53d-48e1-b4bd-5a98eb48cc6f', 900);
