-- Add simplified slots data to reach 700 total (using basic logic)
DO $$
DECLARE
    i INTEGER;
    slot_bank TEXT;
    slot_game TEXT;
    slot_denom TEXT;
    slot_room TEXT;
    slot_status TEXT;
BEGIN
    FOR i IN 9..700 LOOP
        -- Simple patterns for variety
        slot_bank := 'Bank ' || chr(65 + ((i % 20)));
        slot_game := CASE (i % 5)
            WHEN 0 THEN 'Lightning Link'
            WHEN 1 THEN 'Buffalo Gold'
            WHEN 2 THEN 'Wheel of Fortune'
            WHEN 3 THEN 'Quick Hit'
            ELSE 'Dancing Drums'
        END;
        slot_denom := CASE (i % 4)
            WHEN 0 THEN '$0.01'
            WHEN 1 THEN '$0.25'
            WHEN 2 THEN '$1.00'
            ELSE '$5.00'
        END;
        slot_room := CASE WHEN (i % 10) = 0 THEN 'High Limit' ELSE 'Main Floor' END;
        slot_status := CASE WHEN (i % 3) = 0 THEN 'occupied' ELSE 'free' END;
        
        INSERT INTO public.slots (id, bank, position, game_title, denom, room, status)
        VALUES ('sl_' || LPAD(i::text, 4, '0'), slot_bank, ((i-1) % 20) + 1, slot_game, slot_denom, slot_room, slot_status);
    END LOOP;
END $$;