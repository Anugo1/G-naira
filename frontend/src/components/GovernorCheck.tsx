'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useWallet } from '@/context/WalletProvider';
import { isGovernor } from '@/utils/contracts';

export default function GovernorCheck() {
  const { account, isConnected } = useWallet();
  const [hasGovernorRole, setHasGovernorRole] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

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
    } catch (error) {
      console.error('Error checking governor role:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) return null;

  return (
    <div className="mt-6 text-center">
      {loading ? (
        <div className="inline-flex items-center">
          <div className="animate-spin mr-2 h-4 w-4 border-b-2 border-green-700"></div>
          <span>Checking governance status...</span>
        </div>
      ) : hasGovernorRole ? (
        <div className="space-y-2">
          <div className="inline-flex items-center px-3 py-1 bg-green-100 text-green-800 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-medium">Governor Access</span>
          </div>
          <div>
            <Link 
              href="/admin" 
              className="inline-block px-4 py-2 bg-green-700 text-white rounded-md hover:bg-green-800 transition-colors"
            >
              Access Governor Dashboard
            </Link>
          </div>
        </div>
      ) : (
        <div className="text-sm text-gray-600">
          You don't have governor privileges.
        </div>
      )}
    </div>
  );
} 