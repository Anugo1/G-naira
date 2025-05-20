'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@/context/WalletProvider';
import { getTokenBalance } from '@/utils/contracts';

export default function BalanceDisplay() {
  const { account, isConnected } = useWallet();
  const [balance, setBalance] = useState<string>('0');
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (isConnected && account) {
      fetchBalance();
    } else {
      setBalance('0');
    }
  }, [account, isConnected]);

  const fetchBalance = async () => {
    if (!account) return;
    
    setLoading(true);
    try {
      const tokenBalance = await getTokenBalance(account);
      setBalance(tokenBalance);
    } catch (error) {
      console.error('Error fetching balance:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) return null;

  return (
    <div className="my-8 p-6 bg-white rounded-lg shadow-md w-full max-w-md">
      <h2 className="text-xl font-semibold mb-4 text-gray-800">Your Balance</h2>
      
      {loading ? (
        <div className="flex justify-center items-center h-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700"></div>
        </div>
      ) : (
        <div className="flex justify-center">
          <p className="text-4xl font-bold text-green-700">
            {balance} <span className="text-sm ml-1 text-gray-600">gNGN</span>
          </p>
        </div>
      )}
      
      <div className="mt-4 flex justify-center">
        <button 
          onClick={fetchBalance} 
          className="mt-2 px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
        >
          Refresh Balance
        </button>
      </div>
    </div>
  );
} 