-- COSTCO-SAVER — delete_my_user RPC.
-- Wipes the calling user's row from auth.users; cascades remove any private
-- profile / preferences via existing ON DELETE CASCADE foreign keys.
-- Public price observations are kept (they help the community); the
-- submitter_user_id is left NULL by a separate UPDATE trigger.
--
-- Per spec §46: account deletion removes private data and signs the user
-- out. This RPC is intentionally narrow: it cannot be called by anyone
-- other than the caller, and it cannot delete another user.

CREATE OR REPLACE FUNCTION public.delete_my_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Null out the submitter on observations so we keep the community signal
  -- but remove the personal attribution.
  UPDATE public.price_observations
    SET submitter_user_id = NULL
    WHERE submitter_user_id = v_uid;
  UPDATE public.price_confirmations
    SET submitter_user_id = NULL
    WHERE submitter_user_id = v_uid;

  -- Wipe the auth row. Foreign keys to auth.users (profile, watches,
  -- purchases, receipts, notifications, device_tokens) cascade.
  DELETE FROM auth.users WHERE id = v_uid;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_my_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_my_user() TO authenticated;
