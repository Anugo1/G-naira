// Wallet authentication for G-Naira using Sign-in with Ethereum (EIP-4361)
import { ethers } from 'ethers';
import { createClient } from '@supabase/supabase-js';

const DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || 'g-naira.com';
const STATEMENT = 'Sign this message to authenticate with G-Naira CBDC application.';
const VERSION = '1';
const CHAIN_ID = process.env.NEXT_PUBLIC_CHAIN_ID || '84532'; // Base Sepolia

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Generate a message for wallet signature following EIP-4361
 * @param {string} address - Ethereum address
 * @param {string} nonce - Random nonce for authentication
 * @returns {string} - Message to sign
 */
export function generateSignatureMessage(address, nonce) {
  const currentDate = new Date();
  const issuedAt = currentDate.toISOString();
  const expiryDate = new Date(currentDate.getTime() + 3600 * 1000); // 1 hour expiration
  const expirationTime = expiryDate.toISOString();

  return `${DOMAIN} wants you to sign in with your Ethereum account:
${address}

${STATEMENT}

URI: https://${DOMAIN}
Version: ${VERSION}
Chain ID: ${CHAIN_ID}
Nonce: ${nonce}
Issued At: ${issuedAt}
Expiration Time: ${expirationTime}`;
}

/**
 * Verify a signature from a wallet
 * @param {string} message - Original message that was signed
 * @param {string} signature - Signature from the wallet
 * @param {string} address - Expected signer address
 * @returns {boolean} - Whether signature is valid
 */
export function verifySignature(message, signature, address) {
  try {
    const recoveredAddress = ethers.verifyMessage(message, signature);
    return recoveredAddress.toLowerCase() === address.toLowerCase();
  } catch (error) {
    console.error('Signature verification failed:', error);
    return false;
  }
}

/**
 * Authentication handler for Supabase Edge Function
 * @param {Object} req - Request object
 * @returns {Object} - Authentication result
 */
export async function handleWalletAuth(req) {
  const { address, signature, message } = req.body;

  if (!address || !signature || !message) {
    return { error: 'Missing required authentication parameters' };
  }

  // Verify signature
  const isValid = verifySignature(message, signature, address);
  if (!isValid) {
    return { error: 'Invalid signature' };
  }

  // Check if user exists, create if not
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('wallet_address', address.toLowerCase())
    .single();

  if (userError && userError.code !== 'PGRST116') {
    return { error: 'Error fetching user' };
  }

  if (!user) {
    // Create new user
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({
        wallet_address: address.toLowerCase(),
        is_governor: false, // Default to non-governor
      })
      .select()
      .single();

    if (createError) {
      return { error: 'Failed to create user' };
    }

    return { user: newUser };
  }

  // Check if user is a governor on-chain (could be implemented later)
  // For now, return the existing user
  return { user };
}

export default {
  generateSignatureMessage,
  verifySignature,
  handleWalletAuth,
}; 