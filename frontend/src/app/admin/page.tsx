'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import WalletButton from '@/components/WalletButton';
import { useWallet } from '@/context/WalletProvider';
import { 
  isGovernor, 
  mintTokens, 
  burnTokens, 
  blacklistAddress, 
  unblacklistAddress,
  isAddressBlacklisted
} from '@/utils/contracts';

export default function AdminPage() {
  const router = useRouter();
  const { account, isConnected } = useWallet();
  
  const [loading, setLoading] = useState<boolean>(false);
  const [hasGovernorRole, setHasGovernorRole] = useState<boolean>(false);
  const [mintAddress, setMintAddress] = useState<string>('');
  const [mintAmount, setMintAmount] = useState<string>('');
  const [burnAddress, setBurnAddress] = useState<string>('');
  const [burnAmount, setBurnAmount] = useState<string>('');
  const [blacklistAddr, setBlacklistAddr] = useState<string>('');
  const [isBlacklisted, setIsBlacklisted] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [txPending, setTxPending] = useState<boolean>(false);

  useEffect(() => {
    if (isConnected && account) {
      checkGovernorRole();
    } else {
      setHasGovernorRole(false);
    }
  }, [account, isConnected]);

  const checkGovernorRole = async () => {
    if (!account) return;
    
    setLoading(true);
    try {
      const isGov = await isGovernor(account);
      setHasGovernorRole(isGov);
      
      if (!isGov) {
        setStatusMessage('You do not have the governor role. Redirecting...');
        setTimeout(() => {
          router.push('/');
        }, 3000);
      }
    } catch (error) {
      console.error('Error checking governor role:', error);
      setStatusMessage('Error checking governor role');
    } finally {
      setLoading(false);
    }
  };

  const handleMint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasGovernorRole || !mintAddress || !mintAmount) return;
    
    setTxPending(true);
    setStatusMessage('Minting tokens...');
    
    try {
      await mintTokens(mintAddress, mintAmount);
      setStatusMessage(`Successfully minted ${mintAmount} tokens to ${mintAddress}`);
      setMintAddress('');
      setMintAmount('');
    } catch (error: any) {
      console.error('Error minting tokens:', error);
      setStatusMessage(`Error minting tokens: ${error.message}`);
    } finally {
      setTxPending(false);
    }
  };

  const handleBurn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasGovernorRole || !burnAddress || !burnAmount) return;
    
    setTxPending(true);
    setStatusMessage('Burning tokens...');
    
    try {
      await burnTokens(burnAddress, burnAmount);
      setStatusMessage(`Successfully burned ${burnAmount} tokens from ${burnAddress}`);
      setBurnAddress('');
      setBurnAmount('');
    } catch (error: any) {
      console.error('Error burning tokens:', error);
      setStatusMessage(`Error burning tokens: ${error.message}`);
    } finally {
      setTxPending(false);
    }
  };

  const checkBlacklist = async () => {
    if (!blacklistAddr) return;
    
    setTxPending(true);
    setStatusMessage('Checking blacklist status...');
    
    try {
      const blacklisted = await isAddressBlacklisted(blacklistAddr);
      setIsBlacklisted(blacklisted);
      setStatusMessage(`Address ${blacklistAddr} is ${blacklisted ? 'blacklisted' : 'not blacklisted'}`);
    } catch (error: any) {
      console.error('Error checking blacklist:', error);
      setStatusMessage(`Error checking blacklist: ${error.message}`);
    } finally {
      setTxPending(false);
    }
  };

  const handleBlacklist = async () => {
    if (!hasGovernorRole || !blacklistAddr) return;
    
    setTxPending(true);
    setStatusMessage(`${isBlacklisted ? 'Removing' : 'Adding'} address ${blacklistAddr} ${isBlacklisted ? 'from' : 'to'} blacklist...`);
    
    try {
      if (isBlacklisted) {
        await unblacklistAddress(blacklistAddr);
        setStatusMessage(`Successfully removed ${blacklistAddr} from blacklist`);
      } else {
        await blacklistAddress(blacklistAddr);
        setStatusMessage(`Successfully added ${blacklistAddr} to blacklist`);
      }
      
      // Refresh blacklist status
      const blacklisted = await isAddressBlacklisted(blacklistAddr);
      setIsBlacklisted(blacklisted);
    } catch (error: any) {
      console.error('Error updating blacklist:', error);
      setStatusMessage(`Error updating blacklist: ${error.message}`);
    } finally {
      setTxPending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <header className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">
              Governor <span className="text-green-700">Dashboard</span>
            </h1>
            <p className="mt-2 text-lg text-gray-600">
              Manage G-Naira token operations
            </p>
          </div>
          <WalletButton />
        </header>

        {!isConnected ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-md">
            <p className="text-lg text-gray-600 mb-4">
              Please connect your wallet to access the governor dashboard.
            </p>
          </div>
        ) : loading ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-md">
            <div className="inline-flex items-center">
              <div className="animate-spin mr-3 h-5 w-5 border-b-2 border-green-700"></div>
              <span className="text-lg">Checking governor access...</span>
            </div>
          </div>
        ) : (
          <>
            {statusMessage && (
              <div className={`mb-6 p-4 rounded-md ${
                txPending 
                  ? 'bg-yellow-50 text-yellow-800 border border-yellow-200' 
                  : 'bg-blue-50 text-blue-800 border border-blue-200'
              }`}>
                {txPending && (
                  <div className="inline-block animate-spin mr-2 h-4 w-4 border-b-2 border-current"></div>
                )}
                {statusMessage}
              </div>
            )}

            {!hasGovernorRole ? (
              <div className="text-center py-12 bg-white rounded-lg shadow-md">
                <p className="text-red-600 mb-4">
                  You do not have access to the governor dashboard.
                </p>
                <Link 
                  href="/" 
                  className="inline-block mt-2 px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
                >
                  Return to Home
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-semibold mb-4 text-gray-800 border-b pb-2">Mint Tokens</h2>
                  <form onSubmit={handleMint}>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Recipient Address
                      </label>
                      <input
                        type="text"
                        value={mintAddress}
                        onChange={(e) => setMintAddress(e.target.value)}
                        placeholder="0x..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                        required
                      />
                    </div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Amount
                      </label>
                      <input
                        type="number"
                        value={mintAmount}
                        onChange={(e) => setMintAmount(e.target.value)}
                        placeholder="0"
                        min="1"
                        step="any"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={txPending}
                      className="w-full py-2 px-4 bg-green-700 text-white rounded-md hover:bg-green-800 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      Mint Tokens
                    </button>
                  </form>
                </div>

                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-semibold mb-4 text-gray-800 border-b pb-2">Burn Tokens</h2>
                  <form onSubmit={handleBurn}>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        From Address
                      </label>
                      <input
                        type="text"
                        value={burnAddress}
                        onChange={(e) => setBurnAddress(e.target.value)}
                        placeholder="0x..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                        required
                      />
                    </div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Amount
                      </label>
                      <input
                        type="number"
                        value={burnAmount}
                        onChange={(e) => setBurnAmount(e.target.value)}
                        placeholder="0"
                        min="1"
                        step="any"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={txPending}
                      className="w-full py-2 px-4 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      Burn Tokens
                    </button>
                  </form>
                </div>

                <div className="bg-white rounded-lg shadow-md p-6 md:col-span-2">
                  <h2 className="text-xl font-semibold mb-4 text-gray-800 border-b pb-2">Blacklist Management</h2>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Address
                    </label>
                    <input
                      type="text"
                      value={blacklistAddr}
                      onChange={(e) => setBlacklistAddr(e.target.value)}
                      placeholder="0x..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={checkBlacklist}
                      disabled={txPending || !blacklistAddr}
                      className="py-2 px-4 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex-1"
                    >
                      Check Status
                    </button>
                    <button
                      onClick={handleBlacklist}
                      disabled={txPending || !blacklistAddr}
                      className={`py-2 px-4 text-white rounded-md transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex-1 ${
                        isBlacklisted 
                          ? 'bg-blue-600 hover:bg-blue-700' 
                          : 'bg-red-600 hover:bg-red-700'
                      }`}
                    >
                      {isBlacklisted ? 'Remove from Blacklist' : 'Add to Blacklist'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        <div className="mt-8 text-center">
          <Link 
            href="/" 
            className="inline-flex items-center text-green-700 hover:text-green-800"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
} 