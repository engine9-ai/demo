-- Migration 0002: demo content. Five fake pop acts, a two-day schedule,
-- ticket types, and the two people the pretend login buttons sign in as.

INSERT INTO ticket_type (code, name, price_cents, description) VALUES
  ('ga',  'General Admission', 8900,  'Both days, all public stages, food court access.'),
  ('vip', 'VIP Weekend',       24900, 'Everything in GA plus the VIP Lounge, soundcheck sessions, and artist meet-and-greets.');

-- The pretend "Login as ..." buttons sign in as these two people.
INSERT INTO person (person_id, name, email, address) VALUES
  (101, 'Vera Vipperman', 'vera@example.com',  '12 Shoreline Drive, Crescent Bay'),
  (900, 'Ada Adminson',   'ada@festival.test', '1 Backstage Way, Crescent Bay');

INSERT INTO ticket (person_id, ticket_type_id) VALUES
  (101, (SELECT id FROM ticket_type WHERE code = 'vip')),
  (900, (SELECT id FROM ticket_type WHERE code = 'vip'));

INSERT INTO artist (id, name, genre, blurb, emoji, color) VALUES
  (1, 'Neon Harbor',          'Synth-pop',    'Shimmering synth lines and harbor-town heartbreak from the duo that soundtracked last summer.', '🌊', '#06b6d4'),
  (2, 'The Glitter Foxes',    'Dance-pop',    'Four-piece glitter-cannon of hooks. Their live show ends with the whole crowd on someone''s shoulders.', '🦊', '#f59e0b'),
  (3, 'Juniper Skye',         'Indie pop',    'Whisper-close verses that explode into festival-sized choruses. Bring tissues and a friend.', '🌿', '#10b981'),
  (4, 'Prism Court',          'Electro-pop',  'Laser-grid visuals, vocoder harmonies, and a drop you will feel in your ribcage.', '🔮', '#8b5cf6'),
  (5, 'Miles & The Meteors',  'Retro pop-rock', 'Leather jackets, talk-box solos, and every chorus written to be shouted back at them.', '☄️', '#ef4444');

-- Public schedule, two days, two stages.
INSERT INTO performance (artist_id, day, stage, start_time, end_time, vip_only) VALUES
  (3, 'Saturday', 'Lagoon Stage', '15:00', '16:00', 0),
  (2, 'Saturday', 'Main Stage',   '17:00', '18:15', 0),
  (4, 'Saturday', 'Lagoon Stage', '19:00', '20:15', 0),
  (1, 'Saturday', 'Main Stage',   '21:00', '22:30', 0),
  (5, 'Sunday',   'Lagoon Stage', '15:30', '16:30', 0),
  (4, 'Sunday',   'Main Stage',   '17:30', '18:45', 0),
  (3, 'Sunday',   'Main Stage',   '19:30', '20:30', 0),
  (5, 'Sunday',   'Main Stage',   '21:15', '22:45', 0),
  -- VIP-only sets: never appear on the public schedule.
  (1, 'Saturday', 'VIP Lounge',   '14:00', '14:40', 1),
  (2, 'Sunday',   'VIP Lounge',   '13:30', '14:10', 1),
  (5, 'Sunday',   'VIP Lounge',   '18:00', '18:30', 1);
