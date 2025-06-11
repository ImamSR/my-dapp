import React, { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Connection, PublicKey, SystemProgram, clusterApiUrl } from "@solana/web3.js";
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import idl from "./idl.json";

// Configuration remains the same
const programId = new PublicKey("QgW6fvDifjsGS5fKR9kZf6Ev7j1X8GrmxjYmZcmVMX8");
const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

export default function ViewerPage() {
  const wallet = useWallet();
  const [papers, setPapers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // The fetchMetadata and handleRemoveFromView functions do not need to be changed.
  // They are correct as they are.
  const fetchMetadata = useCallback(async () => {
    const readOnlyWallet = {
      publicKey: new PublicKey(SystemProgram.programId),
      signTransaction: () => Promise.reject(),
      signAllTransactions: () => Promise.reject(),
    };
    const provider = new AnchorProvider(connection, readOnlyWallet, { commitment: "confirmed" });
    const program = new Program(idl, programId, provider);
    
    try {
      setIsLoading(true);
      const paperAccounts = await program.account.paper.all();
      
      const papersWithTxids = await Promise.all(paperAccounts.map(async (paper) => {
        const signatures = await connection.getSignaturesForAddress(paper.publicKey, { limit: 1 });
        const txid = signatures.length > 0 ? signatures[0].signature : null;
        return { ...paper.account, txid, publicKey: paper.publicKey };
      }));

      setPapers(papersWithTxids);
    } catch (err) {
      console.error("Failed to fetch metadata:", err);
      setError("Error fetching data from Solana.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetadata();
  }, [fetchMetadata]);

  const handleRemoveFromView = (paperToRemove) => {
    const updatedPapers = papers.filter(
      (paper) => paper.publicKey.toString() !== paperToRemove.publicKey.toString()
    );
    setPapers(updatedPapers);
  };

  // The JSX return block is where we will make the changes
  return (
    <div className="bg-gray-100 min-h-screen p-4 sm:p-8">
      <div className="w-full max-w-4xl mx-auto bg-white rounded-xl shadow-xl p-6 sm:p-8">
        {/* ================================================================== */}
        {/* UNIFIED HEADER SECTION */}
        {/* ================================================================== */}
        <div className="flex flex-wrap justify-between items-center gap-4 mb-6 border-b pb-4">
          <h1 className="text-3xl font-bold text-purple-700">📄 Uploaded Research</h1>
          
          <div className="flex items-center gap-4">
            {/* "Back to Upload" button from your HTML file */}
            <a href="/" className="bg-gray-600 hover:bg-gray-700 text-white font-semibold px-4 py-2 rounded-lg transition-colors text-sm">
              &larr; Back to Upload
            </a>
            {/* Wallet button from your React component */}
            <WalletMultiButton />
          </div>
        </div>

        {isLoading && <p className="text-center">📡 Fetching data...</p>}
        {error && <p className="text-center text-red-500">{error}</p>}
        
        <ul className="space-y-4 text-gray-800">
          {!isLoading && papers.length === 0 && <li>No research metadata found.</li>}
          {papers.map((paper) => (
            <li key={paper.txid || paper.publicKey.toString()} className="bg-gray-50 p-4 rounded shadow space-y-1">
              <p><strong>📌 Title:</strong> {paper.title}</p>
              <p><strong>👤 Author:</strong> <span className="font-mono text-xs">{paper.author.toString()}</span></p>
              {paper.txid && (
                <p><strong>🧾 Transaction:</strong> 
                  <a className="text-purple-600 hover:underline break-all text-xs font-mono" href={`https://explorer.solana.com/tx/${paper.txid}?cluster=devnet`} target="_blank" rel="noopener noreferrer">
                    {paper.txid}
                  </a>
                </p>
              )}
              <div className="pt-2">
                <button 
                  onClick={() => handleRemoveFromView(paper)}
                  className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-1 px-3 text-xs rounded"
                >
                  Hide
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}