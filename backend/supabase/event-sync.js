// Event sync functions for G-Naira CBDC
import { ethers } from 'ethers';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Contract ABI snippets - just the events we need to monitor
const GNGN_ABI = [
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event Blacklisted(address indexed account)",
  "event Unblacklisted(address indexed account)",
  "event GovernorRoleGranted(address indexed account, address indexed sender)",
  "event GovernorRoleRevoked(address indexed account, address indexed sender)"
];

/**
 * Sync blacklist events to Supabase
 * @param {Object} event - Blockchain event
 * @param {string} eventType - 'Blacklisted' or 'Unblacklisted'
 * @param {Object} txInfo - Transaction information
 */
async function syncBlacklistEvent(event, eventType, txInfo) {
  const isBlacklisted = eventType === 'Blacklisted';
  const walletAddress = event.args.account.toLowerCase();
  
  try {
    await supabase
      .from('blacklist_logs')
      .insert({
        wallet_address: walletAddress,
        is_blacklisted: isBlacklisted,
        transaction_hash: txInfo.transactionHash,
        block_number: txInfo.blockNumber,
        governor_address: txInfo.from.toLowerCase()
      });
      
    console.log(`Synced ${eventType} event for ${walletAddress}`);
  } catch (error) {
    console.error(`Failed to sync ${eventType} event:`, error);
  }
}

/**
 * Sync mint/burn events to Supabase by tracking Transfer events
 * @param {Object} event - Transfer event
 * @param {Object} txInfo - Transaction information
 */
async function syncMintBurnEvent(event, txInfo) {
  const { from, to, value } = event.args;
  const zeroAddress = ethers.ZeroAddress.toLowerCase();
  
  // Determine if it's a mint or burn event
  let eventType = null;
  let walletAddress = null;
  
  if (from.toLowerCase() === zeroAddress) {
    // Mint event (from zero address)
    eventType = 'mint';
    walletAddress = to.toLowerCase();
  } else if (to.toLowerCase() === zeroAddress) {
    // Burn event (to zero address)
    eventType = 'burn';
    walletAddress = from.toLowerCase();
  } else {
    // Regular transfer, not a mint/burn
    return;
  }
  
  try {
    await supabase
      .from('mint_burn_events')
      .insert({
        event_type: eventType,
        wallet_address: walletAddress,
        amount: value.toString(),
        transaction_hash: txInfo.transactionHash,
        block_number: txInfo.blockNumber,
        governor_address: txInfo.from.toLowerCase()
      });
      
    console.log(`Synced ${eventType} event for ${walletAddress}: ${ethers.formatUnits(value, 18)} GNGN`);
  } catch (error) {
    console.error(`Failed to sync ${eventType} event:`, error);
  }
}

/**
 * Sync governor role events to Supabase
 * @param {Object} event - Role event
 * @param {string} eventType - 'GovernorRoleGranted' or 'GovernorRoleRevoked'
 */
async function syncGovernorRoleEvent(event, eventType) {
  const walletAddress = event.args.account.toLowerCase();
  const isActive = eventType === 'GovernorRoleGranted';
  
  try {
    if (isActive) {
      // Add new governor or update existing one
      await supabase
        .from('governors')
        .upsert({
          wallet_address: walletAddress,
          is_active: true,
          added_at: new Date().toISOString()
        }, { onConflict: 'wallet_address' });
        
      // Also update the user record
      await supabase
        .from('users')
        .update({ is_governor: true })
        .eq('wallet_address', walletAddress);
    } else {
      // Deactivate governor
      await supabase
        .from('governors')
        .update({ is_active: false })
        .eq('wallet_address', walletAddress);
        
      // Update user record
      await supabase
        .from('users')
        .update({ is_governor: false })
        .eq('wallet_address', walletAddress);
    }
    
    console.log(`Synced ${eventType} event for ${walletAddress}`);
  } catch (error) {
    console.error(`Failed to sync ${eventType} event:`, error);
  }
}

/**
 * Main event listener function - set up to sync all events
 * @param {string} rpcUrl - Blockchain RPC URL
 * @param {string} contractAddress - GNGN token contract address
 */
export async function setupEventListeners(rpcUrl, contractAddress) {
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const contract = new ethers.Contract(contractAddress, GNGN_ABI, provider);
  
  // Listen for blacklist events
  contract.on('Blacklisted', async (account, event) => {
    const tx = await provider.getTransaction(event.transactionHash);
    await syncBlacklistEvent(event, 'Blacklisted', {
      transactionHash: event.transactionHash,
      blockNumber: event.blockNumber,
      from: tx.from
    });
  });
  
  contract.on('Unblacklisted', async (account, event) => {
    const tx = await provider.getTransaction(event.transactionHash);
    await syncBlacklistEvent(event, 'Unblacklisted', {
      transactionHash: event.transactionHash,
      blockNumber: event.blockNumber,
      from: tx.from
    });
  });
  
  // Listen for Transfer events to catch mints and burns
  contract.on('Transfer', async (from, to, value, event) => {
    const tx = await provider.getTransaction(event.transactionHash);
    await syncMintBurnEvent(event, {
      transactionHash: event.transactionHash,
      blockNumber: event.blockNumber,
      from: tx.from
    });
  });
  
  // Listen for governor role changes
  contract.on('GovernorRoleGranted', async (account, sender, event) => {
    await syncGovernorRoleEvent(event, 'GovernorRoleGranted');
  });
  
  contract.on('GovernorRoleRevoked', async (account, sender, event) => {
    await syncGovernorRoleEvent(event, 'GovernorRoleRevoked');
  });
  
  console.log(`Event listeners set up for contract ${contractAddress}`);
  return contract;
}

// For Supabase Edge Function
export async function handleEventSync(req) {
  const { rpcUrl, contractAddress, eventType, eventData } = req.body;
  
  if (!rpcUrl || !contractAddress || !eventType || !eventData) {
    return { error: 'Missing required parameters' };
  }
  
  try {
    switch (eventType) {
      case 'blacklist':
        await syncBlacklistEvent(eventData, eventData.action, eventData.txInfo);
        break;
      case 'mintburn':
        await syncMintBurnEvent(eventData, eventData.txInfo);
        break;
      case 'governor':
        await syncGovernorRoleEvent(eventData, eventData.action);
        break;
      default:
        return { error: 'Invalid event type' };
    }
    
    return { success: true };
  } catch (error) {
    console.error('Event sync failed:', error);
    return { error: error.message };
  }
}

export default {
  setupEventListeners,
  handleEventSync
}; 