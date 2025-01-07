1- Add otp validation for email field during registration.
2- integrating the concept of a refresh token involves securely handling token expiration





-- 1. Create the trigger function
CREATE OR REPLACE FUNCTION create_virtual_balance()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert a new record into the virtual_balance table
  INSERT INTO public.virtual_balance (
    user_id,
    type,
    description,
    trading_balance,
    available_cash,
    margin_from_holdings,
    amount_utilized,
    amount_added,
    opening_cash_balance
  )
  VALUES (
    NEW.id,                          -- User ID from the new record in users table
    'deposit',                       -- Default type
    'Initial balance created',       -- Default description
    1000000.00,                      -- Default trading balance
    1000000.00,                      -- Default available cash
    0.00,                            -- Default margin from holdings
    0.00,                            -- Default amount utilized
    0.00,                            -- Default amount added
    1000000.00                       -- Default opening cash balance
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Create the trigger
CREATE TRIGGER after_user_insert
AFTER INSERT ON public.users
FOR EACH ROW
EXECUTE FUNCTION create_virtual_balance();
