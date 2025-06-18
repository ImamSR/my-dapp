import React, { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Connection, PublicKey, SystemProgram, clusterApiUrl } from "@solana/web3.js";
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import idl from "./idl.json";

// --- Configuration ---
const programId = new PublicKey("7Rc9yjhQ9RrGFLe5WbZwQ3kqqE7bzAYDsk4tJsXXKre8");
const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

export default function ViewerPage() {
  const wallet = useWallet();
  const [papers, setPapers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Function to fetch data from the blockchain
  const fetchMetadata = useCallback(async () => {
    // A read-only wallet object is used when we only need to fetch data
    // and don't need to sign any transactions.
    const readOnlyWallet = {
      publicKey: new PublicKey(SystemProgram.programId),
      signTransaction: () => Promise.reject(new Error("Read-only wallet cannot sign")),
      signAllTransactions: () => Promise.reject(new Error("Read-only wallet cannot sign")),
    };
    const provider = new AnchorProvider(connection, readOnlyWallet, { commitment: "confirmed" });
    const program = new Program(idl, programId, provider);
    
    try {
      setIsLoading(true);
      setError(''); // Reset error on new fetch
      const paperAccounts = await program.account.paper.all();
      
      // We will fetch the transaction ID for each paper to provide a link
      const papersWithTxids = await Promise.all(paperAccounts.map(async (paper) => {
        try {
          const signatures = await connection.getSignaturesForAddress(paper.publicKey, { limit: 1 });
          const txid = signatures.length > 0 ? signatures[0].signature : null;
          return { ...paper.account, txid, publicKey: paper.publicKey };
        } catch (e) {
            console.warn(`Could not fetch signature for account ${paper.publicKey.toString()}:`, e);
            // Return data even if signature fetch fails
            return { ...paper.account, txid: null, publicKey: paper.publicKey };
        }
      }));

      // Sort papers to show the newest first, assuming a timestamp exists
      // If not, you can sort by another property or leave as is.
      // papersWithTxids.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

      setPapers(papersWithTxids);
    } catch (err) {
      console.error("Failed to fetch metadata:", err);
      setError("Error fetching data from Solana. The public RPC might be busy. Please try refreshing.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // useEffect hook to run fetchMetadata once when the component mounts
  useEffect(() => {
    fetchMetadata();
  }, [fetchMetadata]);

  return (
    <div className="bg-gray-100 min-h-screen p-4 sm:p-8">
      <div className="w-full max-w-4xl mx-auto bg-white rounded-xl shadow-xl p-6 sm:p-8">
        
        {/* --- Unified Header Section --- */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6 border-b border-gray-200 pb-4">
          <h1 className="text-3xl font-bold text-gray-800">
            📄 Uploaded Research
          </h1>
          
          <div className="flex items-center gap-4">
            {/* --- FIX: "Back to Upload" button is here --- */}
            <a href="/" className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white font-semibold px-4 py-2 rounded-lg transition-colors text-sm shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Upload
            </a>
            <WalletMultiButton />
          </div>
        </div>

        {/* --- Content Area --- */}
        {isLoading && (
            <div className="text-center py-10">
                <p className="text-gray-500">📡 Fetching data from Devnet...</p>
            </div>
        )}
        {error && <p className="text-center text-red-500 bg-red-50 p-4 rounded-lg">{error}</p>}
        
        <ul className="space-y-4 text-gray-800">
          {!isLoading && !error && papers.length === 0 && (
            <li className="text-center text-gray-500 py-10">No research metadata found.</li>
          )}
          {papers.map((paper) => (
            <li key={paper.txid || paper.publicKey.toString()} className="bg-gray-50 p-4 rounded-lg shadow-sm border border-gray-200 space-y-2">
              <p><strong>📌 Title:</strong> {paper.title}</p>
              <p className="flex items-center text-sm">
                <strong className="mr-2">👤 Author:</strong> 
                <span className="font-mono text-xs text-gray-600 break-all">{paper.author.toString()}</span>
              </p>
              {paper.txid && (
                <p className="flex items-center text-sm">
                  <strong className="mr-2">🧾 Transaction:</strong> 
                  <a className="text-purple-600 hover:underline break-all text-xs font-mono" href={`https://explorer.solana.com/tx/${paper.txid}?cluster=devnet`} target="_blank" rel="noopener noreferrer">
                    {paper.txid}
                  </a>
                </p>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
