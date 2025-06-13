// src/WalletProvider.jsx

import React, { useMemo } from 'react';
import { ConnectionProvider, WalletProvider as SolanaWalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
// Make sure clusterApiUrl is imported
import { clusterApiUrl } from '@solana/web3.js';

// Explicitly set the network to 'devnet'
const network = 'devnet';

export default function WalletProvider({ children }) {
  // Use the clusterApiUrl function to get the correct endpoint
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);

  const wallets = useMemo(
    () => [
    ],
    []
  );

  return (
    // This <ConnectionProvider> tells the wallet which network to use
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider wallets={wallets} >
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
}