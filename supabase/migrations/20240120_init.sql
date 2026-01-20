-- Create table for storing GHL tokens
CREATE TABLE IF NOT EXISTS ghl_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  location_id TEXT UNIQUE NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  user_type TEXT,
  company_id TEXT,
  expires_in BIGINT,
  scope TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE ghl_tokens ENABLE ROW LEVEL SECURITY;

-- For this verification, we allow service role (Edge Functions) full access
CREATE POLICY "Enable access for service role only" ON ghl_tokens
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow public read access JUST for checking connection status
-- We only select location_id, not sensitive tokens
CREATE POLICY "Enable read access for all users" ON ghl_tokens
  FOR SELECT
  TO anon
  USING (true);

-- Optional: Cache table for appointments to reduce API calls
CREATE TABLE IF NOT EXISTS appointments_cache (
  id TEXT PRIMARY KEY, -- GHL Appointment ID
  location_id TEXT NOT NULL,
  contact_id TEXT,
  start_time TIMESTAMP WITH TIME ZONE,
  end_time TIMESTAMP WITH TIME ZONE,
  status TEXT,
  title TEXT,
  raw_data JSONB,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE appointments_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable access for service role only" ON appointments_cache
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
