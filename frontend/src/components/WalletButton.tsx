'use client';

import { useWallet } from "@/context/WalletProvider";

export default function WalletButton() {
  const { account, connect, disconnect, isConnected } = useWallet();

  const shortenAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="flex items-center justify-center gap-2">
      {!isConnected ? (
        <button 
          onClick={connect}
          className="px-4 py-2 bg-green-700 text-white rounded-md shadow-sm hover:bg-green-800 transition-colors"
        >
          Connect Wallet
        </button>
      ) : (
        <div className="flex items-center space-x-2">
          <span className="font-mono text-sm bg-gray-100 py-1 px-3 rounded-full">
            {shortenAddress(account)}
          </span>
          <button 
            onClick={disconnect}
            className="px-4 py-2 bg-red-600 text-white rounded-md shadow-sm hover:bg-red-700 transition-colors"
          >
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
} 