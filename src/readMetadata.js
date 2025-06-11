import { Connection, PublicKey } from "@solana/web3.js";
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import { Buffer } from "buffer";
import idl from "./idl.json";

// Polyfill Buffer for the browser environment
window.Buffer = Buffer;

// --- Configuration ---
// Ensure this Program ID matches the one from `anchor deploy`
const programId = new PublicKey("QgW6fvDifjsGS5fKR9kZf6Ev7j1X8GrmxjYmZcmVMX8");
const connection = new Connection("http://127.0.0.1:8899", "confirmed");

// --- UI Element References ---
const metadataList = document.getElementById("metadata-list");
const loadingState = document.getElementById("loading-state");

/**
 * Fetches all 'Paper' accounts from the Solana program and renders them.
 */
async function displayAllMetadata() {
  // Use a "mock" wallet since we are only reading data, not sending transactions.
  const provider = new AnchorProvider(connection, {}, { commitment: "confirmed" });
  const program = new Program(idl, programId, provider);

  try {
    // 1. Fetch all accounts of type 'paper'
    const paperAccounts = await program.account.paper.all();

    // 2. Clear the list and hide the loading message
    metadataList.innerHTML = "";
    loadingState.style.display = 'none';

    if (paperAccounts.length === 0) {
      metadataList.innerHTML = '<li class="text-center text-gray-500">No research metadata has been uploaded yet.</li>';
      return;
    }

    // 3. Render each paper account to the list
    paperAccounts.forEach(({ account }) => {
      const listItem = document.createElement("li");
      listItem.className = "bg-gray-50 p-4 rounded-lg shadow-sm border border-gray-200";

      // Note: We use textContent for security to prevent HTML injection from on-chain data.
      const titleEl = document.createElement('p');
      titleEl.innerHTML = `<strong>📌 Title:</strong>`;
      titleEl.append(` ${account.title}`); // Safely append text

      const ipfsEl = document.createElement('p');
      ipfsEl.innerHTML = `<strong>📤 IPFS:</strong> <a class="text-blue-600 hover:underline break-all" href="https://ipfs.io/ipfs/${account.ipfsHash}" target="_blank" rel="noopener noreferrer">${account.ipfsHash}</a>`;
      
      const authorEl = document.createElement('p');
      authorEl.innerHTML = `<strong>👤 Author:</strong> <span class="font-mono text-xs">${account.author.toString()}</span>`;

      listItem.appendChild(titleEl);
      listItem.appendChild(ipfsEl);
      listItem.appendChild(authorEl);
      metadataList.appendChild(listItem);
    });

  } catch (error) {
    console.error("Failed to fetch metadata:", error);
    loadingState.style.display = 'none';
    metadataList.innerHTML = `<li class="text-center text-red-500">Error: Could not fetch data from the Solana blockchain. Check the console for details.</li>`;
  }
}

// --- Initial Execution ---
displayAllMetadata();