-- Enable the pgcrypto extension for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create the users table if it doesn't exist
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  display_name TEXT NOT NULL, -- Ajout de la colonne display_name
  role TEXT NOT NULL,
  barcode TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create the labs table if it doesn't exist
CREATE TABLE IF NOT EXISTS laboratories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE
);

-- Function to register a new user
CREATE OR REPLACE FUNCTION register_user(
  p_username TEXT,
  p_password TEXT,
  p_name TEXT,
  p_display_name TEXT, -- Ajout du paramètre p_display_name
  p_role TEXT,
  p_barcode TEXT
) RETURNS json AS $$
DECLARE
  v_user RECORD;
BEGIN
  -- Check if username already exists
  IF EXISTS (SELECT 1 FROM users WHERE username = p_username) THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Cet identifiant est déjà utilisé'
    );
  END IF;
  
  -- Check if barcode already exists
  IF EXISTS (SELECT 1 FROM users WHERE barcode = p_barcode) THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Ce code-barres est déjà utilisé'
    );
  END IF;
  
  -- Insert new user
  INSERT INTO users (
    username,
    password,
    name,
    display_name, -- Inclusion de display_name dans l'insertion
    role,
    barcode
  ) VALUES (
    p_username,
    crypt(p_password, gen_salt('bf')),
    p_name,
    p_display_name, -- Utilisation de p_display_name
    p_role,
    p_barcode
  )
  RETURNING id, username, name, display_name, role, barcode, created_at INTO v_user;
  
  -- Return success with user data
  RETURN json_build_object(
    'success', true,
    'user_data', row_to_json(v_user)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION register_user(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION register_user(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon;

-- Insert a default laboratory if none exists
INSERT INTO laboratories (name, code)
SELECT 'Laboratoire Principal', 'LAB001'
WHERE NOT EXISTS (SELECT 1 FROM laboratories);