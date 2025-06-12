import React, { useState, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

// Assume these functions are still in their respective files
import { uploadToIPFS } from "./ipfs.js";
import { submitToSolana } from "./solana.js";

function App() {
  const wallet = useWallet();
  const [selectedFile, setSelectedFile] = useState(null);
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState({ msg: 'Please connect your wallet to begin.', type: 'neutral' });
  const [isLoading, setIsLoading] = useState(false);
  const [fileName, setFileName] = useState('');

  const updateStatus = (msg, type) => setStatus({ msg, type });

  const resetForm = useCallback(() => {
    setSelectedFile(null);
    setTitle('');
    setFileName('');
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setFileName(`Selected: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
    }
  };

  const handleUpload = async () => {
    if (!wallet.connected || !wallet.publicKey) {
      return updateStatus('Please connect your wallet first.', 'error');
    }
    if (!title.trim() || !selectedFile) {
      return updateStatus('Please provide a title and select a file.', 'error');
    }
    
    setIsLoading(true);
    let ipfsHash = null;

    try {
      updateStatus("⏳ 1/2: Uploading file to IPFS...", 'processing');
      ipfsHash = await uploadToIPFS(selectedFile);
      if (!ipfsHash) throw new Error("Received an empty hash from IPFS.");
      
      updateStatus(`📦 IPFS Hash: ${ipfsHash.substring(0, 10)}...\n⏳ 2/2: Saving to Solana...`, 'processing');
      // Pass the wallet object from the hook directly
      const txSignature = await submitToSolana(title, ipfsHash, wallet);
      if (!txSignature) throw new Error("Failed to get a transaction signature from Solana.");
      
      updateStatus(`✅ Success! Tx: ${txSignature.substring(0, 10)}...`, 'success');
      resetForm();

    } catch (err) {
      console.error("❌ Upload process failed:", err);
      let finalErrorMessage = `❌ Upload failed: ${err.message}`;
      if (ipfsHash) {
          finalErrorMessage += `\n❗ File uploaded to IPFS (Hash: ${ipfsHash}) but failed to save on Solana. Please save this hash.`;
      }
      updateStatus(finalErrorMessage, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const isFormSubmittable = wallet.connected && title.trim() !== '' && selectedFile;
  
  // Define status color classes
  const statusColor = {
    error: 'text-red-600',
    success: 'text-green-600',
    processing: 'text-blue-600',
    neutral: 'text-gray-600',
  }[status.type];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-lg bg-white rounded-xl shadow-xl p-6 sm:p-8 space-y-6">
        <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-800">Publish Your Research</h1>
            <p className="text-sm text-gray-500">Securely upload to IPFS & Solana</p>
        </div>

        <div className="flex justify-center">
            <WalletMultiButton />
        </div>

        <fieldset disabled={!wallet.connected || isLoading} className="space-y-6">
            <div>
                <label htmlFor="titleInput" className="block text-sm font-medium text-gray-700 mb-1">Paper Title</label>
                <input type="text" id="titleInput" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Breakthrough in Quantum Entanglement" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm" />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Research Paper (PDF, DOCX)</label>
                <label htmlFor="fileInput" className="cursor-pointer border-2 border-dashed border-gray-300 p-6 flex flex-col items-center justify-center transition hover:bg-gray-50">
                    <p className="mt-2 text-sm text-gray-500"><span className="font-semibold text-purple-600">Click to upload</span> or drag and drop</p>
                </label>
                <input type="file" id="fileInput" onChange={handleFileChange} accept=".pdf" className="hidden" />
                <p className="mt-2 text-xs text-gray-500">{fileName}</p>
            </div>

            <button onClick={handleUpload} disabled={!isFormSubmittable || isLoading} className="bg-green-500 hover:bg-green-600 text-white font-semibold px-6 py-3 rounded-lg w-full flex items-center justify-center space-x-2 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed">
                <span>{isLoading ? 'Processing...' : 'Publish Paper'}</span>
                {isLoading && <div className="spinner"></div>}
            </button>
        </fieldset>

        <p className={`mt-4 text-sm text-center whitespace-pre-wrap ${statusColor}`}>{status.msg}</p>

        <div className="border-t border-gray-200 pt-6">
            <a href="viewer.html" className="w-full block">
              <button className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-6 py-3 rounded-lg w-full flex items-center justify-center space-x-2 transition-colors duration-150">
                <span>View Uploaded Metadata</span>
              </button>
            </a>
        </div>
      </div>
    </div>
  );
}

export default App;