INSERT INTO shopping_lists (id, name, created_at, updated_at) VALUES
    ('11111111-1111-1111-1111-111111111111', 'Groceries',     now() - interval '2 days', now() - interval '1 day'),
    ('22222222-2222-2222-2222-222222222222', 'Hardware Store', now() - interval '1 day', now());

INSERT INTO shopping_items (id, list_id, name, completed, created_at, updated_at) VALUES
    ('aaaaaaaa-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Milk',          false, now() - interval '2 days', now() - interval '2 days'),
    ('aaaaaaaa-1111-1111-1111-111111111112', '11111111-1111-1111-1111-111111111111', 'Bread',         true,  now() - interval '2 days', now() - interval '1 day'),
    ('aaaaaaaa-1111-1111-1111-111111111113', '11111111-1111-1111-1111-111111111111', 'Eggs',          false, now() - interval '2 days', now() - interval '2 days'),
    ('aaaaaaaa-1111-1111-1111-111111111114', '11111111-1111-1111-1111-111111111111', 'Olive oil',     false, now() - interval '1 day',  now() - interval '1 day'),
    ('bbbbbbbb-2222-2222-2222-222222222221', '22222222-2222-2222-2222-222222222222', 'Drill bits',    false, now() - interval '1 day',  now() - interval '1 day'),
    ('bbbbbbbb-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'Wood screws',   true,  now() - interval '1 day',  now()),
    ('bbbbbbbb-2222-2222-2222-222222222223', '22222222-2222-2222-2222-222222222222', 'Sandpaper',     false, now() - interval '1 day',  now() - interval '1 day');
