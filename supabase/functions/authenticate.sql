-- Enable the pgcrypto extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Function to authenticate a user
CREATE OR REPLACE FUNCTION authenticate_user(
  p_username TEXT,
  p_password TEXT
) RETURNS json AS $$
DECLARE
  v_user RECORD;
BEGIN
  -- Check if user exists and password matches
  SELECT id, username, name, display_name, role, barcode, created_at
  INTO v_user
  FROM users
  WHERE username = p_username 
  AND password = crypt(p_password, password);
  
  IF v_user.id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Identifiant ou mot de passe incorrect'
    );
  END IF;
  
  -- Return success with user data
  RETURN json_build_object(
    'success', true,
    'user_data', row_to_json(v_user)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION authenticate_user(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION authenticate_user(TEXT, TEXT) TO anon;
