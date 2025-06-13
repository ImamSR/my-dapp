import React, { useState, useCallback, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

// Make sure these functions are in their respective files
import { uploadToIPFS } from "./ipfs.js";
import { submitToSolana, checkIfPaperExists } from "./solana.js"; // checkIfPaperExists should also use the non-hashing logic

// A component for the user guide
function UserGuide() {
  const estimatedFeeSOL = 0.00001; 
  const solPriceUSD = 158; // Example static price
  const estimatedFeeUSD = (estimatedFeeSOL * solPriceUSD).toFixed(5);

  return (
    <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
      <h2 className="text-lg font-semibold text-purple-800 mb-3">How It Works 📝</h2>
      <ol className="list-decimal list-inside text-sm text-gray-700 space-y-2">
        <li><strong>Connect Wallet:</strong> Use the button below to connect your Solana wallet.</li>
        <li><strong>Fill in Details:</strong> Provide a title (max 32 bytes) and select your research file.</li>
        <li><strong>Agree & Publish:</strong> Accept the terms and click "Publish" to approve the transaction.
          <div className="mt-2 pl-4 text-xs">
            <p className="text-purple-700"><span className="font-semibold">Gas Fee:</span> A small network fee is required.</p>
            <p className="text-gray-600">- Est. Fee: ~{estimatedFeeSOL} SOL (~${estimatedFeeUSD} USD)</p>
          </div>
        </li>
        <li><strong>Verify:</strong> Your file is stored on IPFS and its metadata is on the Solana blockchain!</li>
      </ol>
    </div>
  );
}

// The main application component
function App() {
  const wallet = useWallet();
  const [selectedFile, setSelectedFile] = useState(null);
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState({ msg: '', type: 'neutral' });
  const [isLoading, setIsLoading] = useState(false);
  const [fileName, setFileName] = useState('');
  const [isPolicyAgreed, setIsPolicyAgreed] = useState(false);
  
  // State for the title length validation error
  const [titleError, setTitleError] = useState('');

  const updateStatus = (msg, type) => setStatus({ msg, type });

  const resetForm = useCallback(() => {
    setSelectedFile(null);
    setTitle('');
    setFileName('');
    setIsPolicyAgreed(false);
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
    // Final check for title length before submitting
    if (titleError) {
      return updateStatus(titleError, 'error');
    }
    if (!title.trim() || !selectedFile) {
      return updateStatus('Please provide a title and select a file.', 'error');
    }
    if (!isPolicyAgreed) {
      return updateStatus('You must agree to the terms before publishing.', 'error');
    }
    
    setIsLoading(true);
    
    try {
      updateStatus("Checking for existing paper on-chain...", 'processing');
      const alreadyExists = await checkIfPaperExists(title.trim(), wallet);
      if (alreadyExists) {
        throw new Error("You have already published a paper with this exact title.");
      }

      updateStatus("⏳ 1/2: Uploading file to IPFS...", 'processing');
      const ipfsHash = await uploadToIPFS(selectedFile);
      if (!ipfsHash) throw new Error("Failed to upload file to IPFS.");
      
      updateStatus(`📦 IPFS Hash: ${ipfsHash.substring(0, 10)}...\n⏳ 2/2: Saving to Solana...`, 'processing');
      const txSignature = await submitToSolana(title, ipfsHash, wallet);
      if (!txSignature) throw new Error("Failed to get a transaction signature from Solana.");
      
      updateStatus(`✅ Success! Tx: ${txSignature.substring(0, 10)}...`, 'success');
      resetForm();

    } catch (err) {
      console.error("❌ Upload process failed:", err);
      const finalErrorMessage = `❌ Upload failed: ${err.message}`;
      updateStatus(finalErrorMessage, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // useEffect hook to validate title length in real-time
  useEffect(() => {
    // TextEncoder is the standard way to check byte length in JavaScript
    const titleBytes = new TextEncoder().encode(title);
    if (titleBytes.length > 32) {
      setTitleError(`Title is too long (${titleBytes.length}/32 bytes). Please shorten it.`);
    } else {
      setTitleError('');
    }
  }, [title]);

  // Button is disabled until all conditions are met, including the title length check
  const isFormSubmittable = wallet.connected && title.trim() !== '' && !titleError && selectedFile && isPolicyAgreed;
  
  const statusColor = {
    error: 'text-red-600',
    success: 'text-green-600',
    processing: 'text-blue-600',
    neutral: 'text-gray-600',
  }[status.type];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 bg-gray-50">
      <div className="w-full max-w-lg bg-white rounded-xl shadow-xl p-6 sm:p-8 space-y-6">
        <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-800">Decentralized Science Framework</h1>
            <p className="text-sm text-gray-500">Securely upload to IPFS & Solana</p>
        </div>

        <UserGuide />

        <div className="flex justify-center">
            <WalletMultiButton />
        </div>

        <fieldset disabled={!wallet.connected || isLoading} className="space-y-6">
            <div>
                <label htmlFor="titleInput" className="block text-sm font-medium text-gray-700 mb-1">Paper Title</label>
                <input 
                  type="text" 
                  id="titleInput" 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)} 
                  placeholder="e.g., A Brief History of Time" 
                  className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 focus:outline-none sm:text-sm ${titleError ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-purple-500 focus:border-purple-500'}`}
                />
                {titleError && <p className="mt-1 text-xs text-red-600">{titleError}</p>}
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Research Paper (PDF)</label>
                <label htmlFor="fileInput" className="cursor-pointer border-2 border-dashed border-gray-300 p-6 flex flex-col items-center justify-center transition hover:bg-gray-50">
                    <p className="mt-2 text-sm text-gray-500"><span className="font-semibold text-purple-600">Click to upload</span> or drag and drop</p>
                </label>
                <input type="file" id="fileInput" onChange={handleFileChange} accept=".pdf" className="hidden" />
                <p className="mt-2 text-xs text-gray-500">{fileName}</p>
            </div>

            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="policy-agreement"
                  name="policy-agreement"
                  type="checkbox"
                  checked={isPolicyAgreed}
                  onChange={(e) => setIsPolicyAgreed(e.target.checked)}
                  className="focus:ring-purple-500 h-4 w-4 text-purple-600 border-gray-300 rounded"
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="policy-agreement" className="font-medium text-gray-700">I agree to the Terms of Service.</label>
                <p className="text-gray-500">I understand my file will be uploaded to the public IPFS network and its metadata will be stored permanently on the Solana blockchain.</p>
              </div>
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