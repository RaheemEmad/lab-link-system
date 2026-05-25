UPDATE auth.users
SET encrypted_password = crypt('Ra7eem#@!', gen_salt('bf')),
    updated_at = now()
WHERE email = 'raheem.amer22@gmail.com';