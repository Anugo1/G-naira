-- G-Naira Supabase Schema

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User profiles table with wallet addresses
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_address TEXT UNIQUE NOT NULL,
  is_governor BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Blacklist logs to track addresses being blacklisted/unblacklisted
CREATE TABLE public.blacklist_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_address TEXT NOT NULL,
  is_blacklisted BOOLEAN NOT NULL,
  transaction_hash TEXT NOT NULL,
  block_number BIGINT NOT NULL,
  governor_address TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Mint/Burn events log
CREATE TABLE public.mint_burn_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type TEXT NOT NULL CHECK (event_type IN ('mint', 'burn')),
  wallet_address TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  transaction_hash TEXT NOT NULL,
  block_number BIGINT NOT NULL,
  governor_address TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Governors table to sync with on-chain role
CREATE TABLE public.governors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_address TEXT UNIQUE NOT NULL,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

-- Row Level Security Policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blacklist_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mint_burn_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.governors ENABLE ROW LEVEL SECURITY;

-- Public user profile access policy
CREATE POLICY "Public profiles are viewable by everyone" 
ON public.users FOR SELECT USING (true);

-- User can update own profile
CREATE POLICY "Users can update their own profile"
ON public.users FOR UPDATE USING (auth.uid() = id);

-- Public blacklist and mint/burn logs access policy
CREATE POLICY "Blacklist logs are viewable by everyone"
ON public.blacklist_logs FOR SELECT USING (true);

CREATE POLICY "Mint/burn events are viewable by everyone"
ON public.mint_burn_events FOR SELECT USING (true);

-- Only service role can insert records (for event syncing from blockchain)
CREATE POLICY "Service role can insert blacklist logs"
ON public.blacklist_logs FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can insert mint/burn events"
ON public.mint_burn_events FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Governors list is viewable by everyone"
ON public.governors FOR SELECT USING (true);

CREATE POLICY "Service role can manage governors"
ON public.governors FOR ALL WITH CHECK (auth.role() = 'service_role'); 