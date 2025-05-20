'use client';

import { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { ethers } from 'ethers';
import Web3Modal from 'web3modal';

interface WalletContextType {
  account: string;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  isConnected: boolean;
  provider: ethers.providers.Web3Provider | null;
  signer: ethers.Signer | null;
  chainId: number | null;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [web3Modal, setWeb3Modal] = useState<Web3Modal | null>(null);
  const [provider, setProvider] = useState<ethers.providers.Web3Provider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [account, setAccount] = useState<string>('');
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [chainId, setChainId] = useState<number | null>(null);

  // Initialize web3modal on first load
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const modal = new Web3Modal({
        network: "mainnet",
        cacheProvider: true,
        providerOptions: {}
      });
      setWeb3Modal(modal);

      // Auto connect if cached provider exists
      if (modal.cachedProvider) {
        connect();
      }
    }
  }, []);

  // Handle account changes
  useEffect(() => {
    if (provider?.on) {
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          setIsConnected(true);
        } else {
          setAccount('');
          setIsConnected(false);
        }
      };

      const handleChainChanged = (chainId: string) => {
        setChainId(parseInt(chainId, 16));
        // Force page refresh on chain change
        window.location.reload();
      };

      const handleDisconnect = () => {
        disconnect();
      };

      provider.on("accountsChanged", handleAccountsChanged);
      provider.on("chainChanged", handleChainChanged);
      provider.on("disconnect", handleDisconnect);

      // Cleanup listeners on provider change
      return () => {
        if (provider.removeListener) {
          provider.removeListener("accountsChanged", handleAccountsChanged);
          provider.removeListener("chainChanged", handleChainChanged);
          provider.removeListener("disconnect", handleDisconnect);
        }
      };
    }
  }, [provider]);

  const connect = async () => {
    if (!web3Modal) return;
    
    try {
      const instance = await web3Modal.connect();
      const ethersProvider = new ethers.providers.Web3Provider(instance);
      const ethersSigner = ethersProvider.getSigner();
      const accounts = await ethersProvider.listAccounts();
      const network = await ethersProvider.getNetwork();

      setProvider(ethersProvider);
      setSigner(ethersSigner);
      
      if (accounts.length > 0) {
        setAccount(accounts[0]);
        setIsConnected(true);
      }
      
      setChainId(network.chainId);
    } catch (error) {
      console.error("Connection error:", error);
    }
  };

  const disconnect = async () => {
    try {
      if (web3Modal) {
        await web3Modal.clearCachedProvider();
      }
      setAccount('');
      setSigner(null);
      setProvider(null);
      setIsConnected(false);
    } catch (error) {
      console.error("Disconnect error:", error);
    }
  };

  return (
    <WalletContext.Provider
      value={{
        connect,
        disconnect,
        account,
        isConnected,
        provider,
        signer,
        chainId
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
} 