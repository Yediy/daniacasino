-- Add more slots to reach 700 total
INSERT INTO public.slots (id, bank, position, game_title, denom, room, device_id, status)
SELECT 
    'sl_' || LPAD((row_number() OVER() + 8)::text, 4, '0'),
    'Bank ' || CASE 
        WHEN (row_number() OVER() % 26) + 1 <= 26 THEN chr(65 + (row_number() OVER() % 26)::integer)
        ELSE 'Z'
    END,
    ((row_number() OVER() - 1) % 20) + 1,
    (ARRAY['Lightning Link', 'Buffalo Gold', 'Wheel of Fortune', 'Quick Hit', 'Dancing Drums'])[((row_number() OVER() - 1) % 5) + 1],
    (ARRAY['$0.01', '$0.25', '$1.00', '$5.00'])[((row_number() OVER() - 1) % 4) + 1],
    CASE WHEN row_number() OVER() % 10 = 0 THEN 'High Limit' ELSE 'Main Floor' END,
    CASE WHEN (row_number() OVER() % 3) = 0 THEN 'occupied' ELSE 'free' END
FROM generate_series(1, 692);