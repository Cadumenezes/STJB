-- Upgrade client studiodedancajb@gmail.com to Diamante plan (highest privileges)
-- as agreed offline for the price of R$ 40,00.
-- This sets their plan to 'diamante', active status, and sets a permanent validity (2099-12-31).

UPDATE public.profiles
SET 
  plan = 'diamante', 
  expires_at = '2099-12-31', 
  status = 'active'
WHERE email = 'studiodedancajb@gmail.com';
