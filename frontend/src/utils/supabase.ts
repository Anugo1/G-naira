import { createClient } from '@supabase/supabase-js';
import { ethers } from 'ethers';
import { Database } from '../types/supabase';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase configuration');
}

const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Generate a random nonce for auth
export const generateNonce = () => {
  return Math.floor(Math.random() * 1000000).toString();
};

// Create the sign-in message
export const createSignMessage = (address: string, nonce: string) => {
  const domain = window.location.host;
  const statement = 'Sign this message to authenticate with G-Naira CBDC application.';
  const currentDate = new Date();
  const issuedAt = currentDate.toISOString();
  const expiryDate = new Date(currentDate.getTime() + 3600 * 1000); // 1 hour expiration
  const expirationTime = expiryDate.toISOString();
  const chainId = process.env.NEXT_PUBLIC_CHAIN_ID || '84532';
  
  return `${domain} wants you to sign in with your Ethereum account:
${address}

${statement}

URI: https://${domain}
Version: 1
Chain ID: ${chainId}
Nonce: ${nonce}
Issued At: ${issuedAt}
Expiration Time: ${expirationTime}`;
};

// Sign in with wallet
export const signInWithWallet = async (address: string, signer: ethers.Signer) => {
  try {
    const nonce = generateNonce();
    const message = createSignMessage(address, nonce);
    const signature = await signer.signMessage(message);
    
    // Call Supabase auth endpoint
    const { data, error } = await supabase.functions.invoke('wallet-auth', {
      body: {
        address,
        signature,
        message
      }
    });
    
    if (error) {
      throw new Error(error.message);
    }
    
    return data.user;
  } catch (error) {
    console.error('Sign in failed:', error);
    throw error;
  }
};

// Check if user is a governor
export const checkGovernorStatus = async (address: string) => {
  try {
    // First, check the governors table
    const { data: governor, error: governorError } = await supabase
      .from('governors')
      .select('*')
      .eq('wallet_address', address.toLowerCase())
      .eq('is_active', true)
      .single();
    
    if (governorError && governorError.code !== 'PGRST116') {
      console.error('Error checking governor status:', governorError);
    }
    
    return !!governor;
  } catch (error) {
    console.error('Error checking governor status:', error);
    return false;
  }
};

// Get blacklist events
export const getBlacklistEvents = async (limit = 10) => {
  try {
    const { data, error } = await supabase
      .from('blacklist_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error('Error fetching blacklist events:', error);
    return [];
  }
};

// Get mint/burn events
export const getMintBurnEvents = async (limit = 10) => {
  try {
    const { data, error } = await supabase
      .from('mint_burn_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error('Error fetching mint/burn events:', error);
    return [];
  }
};

export default supabase; 