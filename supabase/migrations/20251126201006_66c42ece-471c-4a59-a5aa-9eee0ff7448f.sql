-- Allow public access to view open poker tables and cash game lists
CREATE POLICY "Anyone can view open poker tables"
ON public.poker_tables
FOR SELECT
USING (status = 'open');

CREATE POLICY "Anyone can view cash game lists"
ON public.cash_game_lists
FOR SELECT
USING (true);

CREATE POLICY "Anyone can view poker table players"
ON public.poker_table_players
FOR SELECT
USING (true);

-- Function to calculate tournament payouts
CREATE OR REPLACE FUNCTION public.calculate_tournament_payouts(
  p_tourney_id uuid,
  p_prize_structure jsonb -- e.g. [{"position": 1, "percentage": 50}, {"position": 2, "percentage": 30}, ...]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_buyin integer;
  v_total_prize_pool integer;
  v_result jsonb := '[]'::jsonb;
  v_standing record;
  v_payout integer;
  v_percentage numeric;
BEGIN
  -- Calculate total prize pool
  SELECT 
    COUNT(*) * t.buyin,
    COUNT(*) * t.buyin
  INTO v_total_buyin, v_total_prize_pool
  FROM poker_entries pe
  JOIN poker_tourneys t ON t.id = pe.tourney_id
  WHERE pe.tourney_id = p_tourney_id
    AND pe.status = 'paid';

  -- Calculate and update payouts for each standing
  FOR v_standing IN
    SELECT * FROM tournament_standings
    WHERE tourney_id = p_tourney_id
    ORDER BY rank ASC
  LOOP
    -- Get percentage for this position from structure
    SELECT (elem->>'percentage')::numeric INTO v_percentage
    FROM jsonb_array_elements(p_prize_structure) elem
    WHERE (elem->>'position')::integer = v_standing.rank;

    IF v_percentage IS NOT NULL THEN
      v_payout := (v_total_prize_pool * v_percentage / 100)::integer;
      
      -- Update the standing with prize amount
      UPDATE tournament_standings
      SET prize_amount = v_payout
      WHERE id = v_standing.id;

      -- Add to result
      v_result := v_result || jsonb_build_object(
        'rank', v_standing.rank,
        'user_id', v_standing.user_id,
        'prize_amount', v_payout
      );
    END IF;
  END LOOP;

  -- Log the action
  PERFORM log_sensitive_action(
    'tournament_payouts_calculated',
    'poker_tourney',
    p_tourney_id::text,
    jsonb_build_object(
      'total_prize_pool', v_total_prize_pool,
      'payouts', v_result
    )
  );

  RETURN jsonb_build_object(
    'total_prize_pool', v_total_prize_pool,
    'payouts', v_result
  );
END;
$$;

-- Function to adjust player points (admin only)
CREATE OR REPLACE FUNCTION public.adjust_player_points(
  p_user_id uuid,
  p_points_change integer,
  p_reason text,
  p_admin_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify admin permission
  IF NOT has_role(p_admin_id, 'Admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized: Admin role required';
  END IF;

  -- Update profile points
  UPDATE profiles
  SET points = points + p_points_change
  WHERE id = p_user_id;

  -- Record transaction
  INSERT INTO loyalty_transactions (
    user_id,
    transaction_type,
    points_change,
    description
  ) VALUES (
    p_user_id,
    'admin_adjustment',
    p_points_change,
    p_reason
  );

  -- Log audit trail
  PERFORM log_sensitive_action(
    'points_adjusted',
    'profile',
    p_user_id::text,
    jsonb_build_object(
      'points_change', p_points_change,
      'reason', p_reason,
      'admin_id', p_admin_id
    )
  );

  -- Notify user
  PERFORM create_notification(
    p_user_id,
    'points_adjusted',
    'Loyalty Points Updated',
    'Your loyalty points have been adjusted by ' || p_points_change || ' points.',
    NULL,
    NULL
  );
END;
$$;

-- Function to adjust player tier (admin only)
CREATE OR REPLACE FUNCTION public.adjust_player_tier(
  p_user_id uuid,
  p_new_tier user_role,
  p_reason text,
  p_admin_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_tier user_role;
BEGIN
  -- Verify admin permission
  IF NOT has_role(p_admin_id, 'Admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized: Admin role required';
  END IF;

  -- Get old tier
  SELECT tier INTO v_old_tier FROM profiles WHERE id = p_user_id;

  -- Update tier
  UPDATE profiles
  SET tier = p_new_tier
  WHERE id = p_user_id;

  -- Log audit trail
  PERFORM log_sensitive_action(
    'tier_adjusted',
    'profile',
    p_user_id::text,
    jsonb_build_object(
      'old_tier', v_old_tier,
      'new_tier', p_new_tier,
      'reason', p_reason,
      'admin_id', p_admin_id
    )
  );

  -- Notify user
  PERFORM create_notification(
    p_user_id,
    'tier_updated',
    'Loyalty Tier Updated',
    'Your loyalty tier has been updated to ' || p_new_tier || '.',
    NULL,
    NULL
  );
END;
$$;