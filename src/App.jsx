import React, { useState, useCallback, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

import { uploadToIPFS } from "./ipfs.js";
import { submitToSolana } from "./solana.js";
// import { checkIfPaperExists } from "./solana.js";

import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

const MySwal = withReactContent(Swal);

function UserGuide() {
  const estimatedFeeSOL = 0.00001; 
  const solPriceUSD = 158; // Example static price
  const estimatedFeeUSD = (estimatedFeeSOL * solPriceUSD).toFixed(5);

  return (
    <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
      <h2 className="text-lg font-semibold text-purple-800 mb-3">How It Works 📝</h2>
      <ol className="list-decimal list-inside text-sm text-gray-700 space-y-2">
        <li><strong>Connect Wallet:</strong> Use the button below to connect your Solana wallet.</li>
        <li><strong>Fill in Details:</strong> Provide a title and select your research file.</li>
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

function App() {
  const wallet = useWallet();
  const [selectedFile, setSelectedFile] = useState(null);
  const [title, setTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isPolicyAgreed, setIsPolicyAgreed] = useState(false);
  const [showPolicyWarning, setShowPolicyWarning] = useState(false);
  const [titleError, setTitleError] = useState('');

  const resetForm = useCallback(() => {
    setSelectedFile(null);
    setTitle('');
    setIsPolicyAgreed(false);
  }, []);

  const handleFileChange = (e) => {
  const file = e.target.files[0];

  if (!file) return;

  const maxSizeMB = 10;
  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  if (file.size > maxSizeBytes) {
    MySwal.fire({
      icon: 'warning',
      title: 'File Too Large',
      text: `The selected file exceeds the 10MB limit.`,
    });
    e.target.value = ''; // clear input
    return;
  }

  setSelectedFile(file);
};

  const handleRemoveFile = () => {
    setSelectedFile(null);
    document.getElementById('fileInput').value = '';
  };

  const handleUpload = async () => {
    if (titleError) return MySwal.fire('Invalid Input', titleError, 'warning');
    if (!isPolicyAgreed) return MySwal.fire('Agreement Required', 'You must agree to the terms before publishing.', 'warning');
    if (!title.trim() || !selectedFile) return MySwal.fire('Missing Information', 'Please provide a title and select a file.', 'warning');

    setIsLoading(true);

    try {
      MySwal.fire({
        title: 'Processing Transaction',
        html: 'Please wait, this may take a moment...',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading() }
      });

      // const alreadyExists = await checkIfPaperExists(title.trim(), wallet);
      // if (alreadyExists) throw new Error("A paper with this exact title has already been published by your wallet.");

      const ipfsHash = await uploadToIPFS(selectedFile);
      if (!ipfsHash) throw new Error("Failed to upload file to IPFS.");

      const txSignature = await submitToSolana(title, ipfsHash, wallet);
      if (!txSignature) throw new Error("Failed to get a transaction signature from Solana.");

      MySwal.fire({
        icon: 'success',
        title: 'Upload Successful!',
        html: `<a href="https://explorer.solana.com/tx/${txSignature}?cluster=devnet" target="_blank" rel="noopener noreferrer" class="text-purple-600 hover:underline">View Transaction on Solana Blockchain Explorer </a>`,
        showConfirmButton: true,
        confirmButtonText: 'OK',
      }).then(() => {
      window.location.reload(); // ⬅️ reloads the page after user clicks OK
      });

    } catch (err) {
      MySwal.fire({
        icon: 'error',
        title: 'Upload Failed ',
        text: err.message,
        showConfirmButton: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const titleBytes = new TextEncoder().encode(title);
    if (titleBytes.length > 200 && title.length > 0) {
      setTitleError(`Title is too long (${titleBytes.length}/200 bytes).`);
    } else {
      setTitleError('');
    }
  }, [title]);

  useEffect(() => {
    const everythingIsFilledButPolicy = wallet.connected && title.trim() !== '' && !titleError && selectedFile && !isPolicyAgreed;
    setShowPolicyWarning(everythingIsFilledButPolicy);
  }, [wallet.connected, title, selectedFile, isPolicyAgreed, titleError]);

  const isFormSubmittable = wallet.connected && title.trim() !== '' && !titleError && selectedFile && isPolicyAgreed;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 bg-gray-50">
      <div className="w-full max-w-lg bg-white rounded-xl shadow-xl p-6 sm:p-8 space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-800">Publish Your Research</h1>
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Research Paper</label>
          <div className="mt-1">
            {!selectedFile ? (
              <label
                htmlFor="fileInput"
                className="relative flex flex-col items-center justify-center w-full h-32 border-2 border-purple-300 border-dashed rounded-lg cursor-pointer bg-purple-50 hover:bg-purple-100 transition"
              >
                <div className="text-center">
                  <svg
                    className="mx-auto h-12 w-12 text-purple-400"
                    stroke="currentColor"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <p className="mt-2 text-sm text-gray-600">
                    <span className="font-semibold text-purple-600">Click to upload</span> or drag & drop
                  </p>
                  <p className="text-xs text-gray-500">PDF (MAX. 10MB)</p>
                </div>
                <input
                  id="fileInput"
                  type="file"
                  className="hidden"
                  onChange={handleFileChange}
                  accept=".pdf"
                  size={10*1000*1024}
                />
              </label>
            ) : (
              <div className="relative flex flex-col items-center justify-center w-full h-32 px-4 border-2 border-green-500 border-solid rounded-lg bg-green-50 text-center">
                <svg
                  className="h-10 w-10 text-green-600"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <div className="mt-1 px-2 w-full max-w-full text-center">
                  <p
                    className="text-sm font-medium text-gray-900 break-words whitespace-normal max-w-[280px]"
                    title={selectedFile.name}
                  >
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  className="absolute top-2 right-2 p-1 text-red-500 hover:text-red-700"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </button>
              </div>
            )}
          </div>
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

          {showPolicyWarning && (
            <div className="text-center text-red-500 text-sm font-semibold -mt-2">
              Please agree to the terms to enable publishing.
            </div>
          )}
          
          <button onClick={handleUpload} disabled={!isFormSubmittable || isLoading} className="bg-green-500 hover:bg-green-600 text-white font-semibold px-6 py-3 rounded-lg w-full flex items-center justify-center space-x-2 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed">
            <span>{isLoading ? 'Processing...' : 'Publish Paper'}</span>
            {isLoading && <div className="spinner"></div>}
          </button>
        </fieldset>

        <div className="border-t border-gray-200 pt-6">
          <a href="viewer.html" className="w-full block">
            <button className="bg-purple-700 hover:bg-blue-600 text-white font-semibold px-6 py-3 rounded-lg w-full flex items-center justify-center space-x-2 transition-colors duration-150">
              <span>View Uploaded Metadata</span>
            </button>
          </a>
        </div>
      </div>
    </div>
  );
}

export default App;