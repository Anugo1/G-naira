'use client';

import { ethers } from 'ethers';

// Contract ABIs
const GNGN_ABI = [
  // ERC20 functions
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address owner) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  
  // Governor role functions
  "function isGovernor(address account) view returns (bool)",
  "function addGovernor(address account)",
  "function removeGovernor(address account)",
  
  // Mint/burn functions
  "function mint(address to, uint256 amount)",
  "function burn(address from, uint256 amount)",
  
  // Blacklist functions
  "function blacklist(address account)",
  "function unblacklist(address account)",
  "function isBlacklisted(address account) view returns (bool)"
];

// Contract addresses - update these after deployment
const contractAddresses = {
  // Set the actual addresses after deployment on Base Sepolia
  gngn: process.env.NEXT_PUBLIC_GNGN_ADDRESS || '',
  multiSig: process.env.NEXT_PUBLIC_MULTISIG_ADDRESS || ''
};

// Get a GNGN token contract instance
export function getGNGNContract(provider?: ethers.providers.Web3Provider, needSigner = false) {
  if (!contractAddresses.gngn) {
    throw new Error("GNGN contract address not set. Set NEXT_PUBLIC_GNGN_ADDRESS in environment.");
  }
  
  if (!provider && typeof window !== 'undefined' && window.ethereum) {
    provider = new ethers.providers.Web3Provider(window.ethereum);
  }
  
  if (!provider) {
    throw new Error("No provider available. Please connect your wallet.");
  }
  
  const signer = needSigner ? provider.getSigner() : provider;
  
  return new ethers.Contract(
    contractAddresses.gngn,
    GNGN_ABI,
    signer
  );
}

// Check if an address has the governor role
export async function isGovernor(address: string, provider?: ethers.providers.Web3Provider): Promise<boolean> {
  try {
    const gngnContract = getGNGNContract(provider);
    return await gngnContract.isGovernor(address);
  } catch (error) {
    console.error("Error checking governor role:", error);
    return false;
  }
}

// Get token balance for an address
export async function getTokenBalance(address: string, provider?: ethers.providers.Web3Provider): Promise<string> {
  try {
    const gngnContract = getGNGNContract(provider);
    const balance = await gngnContract.balanceOf(address);
    return ethers.utils.formatUnits(balance, 18); // Assuming 18 decimals
  } catch (error) {
    console.error("Error getting token balance:", error);
    return "0";
  }
}

// Mint tokens to an address
export async function mintTokens(
  to: string, 
  amount: string | number, 
  provider?: ethers.providers.Web3Provider
): Promise<ethers.ContractReceipt> {
  const gngnContract = getGNGNContract(provider, true); // Need signer
  const amountInWei = ethers.utils.parseUnits(amount.toString(), 18);
  const tx = await gngnContract.mint(to, amountInWei);
  return await tx.wait();
}

// Burn tokens from an address
export async function burnTokens(
  from: string, 
  amount: string | number, 
  provider?: ethers.providers.Web3Provider
): Promise<ethers.ContractReceipt> {
  const gngnContract = getGNGNContract(provider, true); // Need signer
  const amountInWei = ethers.utils.parseUnits(amount.toString(), 18);
  const tx = await gngnContract.burn(from, amountInWei);
  return await tx.wait();
}

// Check if an address is blacklisted
export async function isAddressBlacklisted(
  address: string,
  provider?: ethers.providers.Web3Provider
): Promise<boolean> {
  try {
    const gngnContract = getGNGNContract(provider);
    return await gngnContract.isBlacklisted(address);
  } catch (error) {
    console.error("Error checking blacklist status:", error);
    return false;
  }
}

// Add an address to blacklist
export async function blacklistAddress(
  address: string,
  provider?: ethers.providers.Web3Provider
): Promise<ethers.ContractReceipt> {
  const gngnContract = getGNGNContract(provider, true); // Need signer
  const tx = await gngnContract.blacklist(address);
  return await tx.wait();
}

// Remove an address from blacklist
export async function unblacklistAddress(
  address: string,
  provider?: ethers.providers.Web3Provider
): Promise<ethers.ContractReceipt> {
  const gngnContract = getGNGNContract(provider, true); // Need signer
  const tx = await gngnContract.unblacklist(address);
  return await tx.wait();
} 