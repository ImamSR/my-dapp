import { Connection, PublicKey, SystemProgram, clusterApiUrl } from "@solana/web3.js";
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import { Buffer } from "buffer";
import idl from "./idl.json";

// Polyfill Buffer for the browser environment
window.Buffer = Buffer;

// --- Configuration ---
const programId = new PublicKey("QgW6fvDifjsGS5fKR9kZf6Ev7j1X8GrmxjYmZcmVMX8"); // Your Devnet Program ID
const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

// Create a read-only wallet object for fetching data.
const readOnlyWallet = {
  publicKey: new PublicKey(SystemProgram.programId),
  signTransaction: () => Promise.reject(new Error("Read-only wallet")),
  signAllTransactions: () => Promise.reject(new Error("Read-only wallet")),
};

async function fetchMetadata() {
  const provider = new AnchorProvider(connection, readOnlyWallet, { commitment: "confirmed" });
  // The Program constructor in newer Anchor versions requires the programId to be passed explicitly.
  const program = new Program(idl, provider);
  const list = document.getElementById("metadata-list");

  try {
    const papers = await program.account.paper.all();
    list.innerHTML = "";

    if (papers.length === 0) {
      list.innerHTML = "<li>No research metadata found.</li>";
      return;
    }
    
    // Use Promise.all to fetch signatures for all accounts concurrently for better performance
    const papersWithTxids = await Promise.all(papers.map(async (paper) => {
      // For each paper account, find the latest transaction signature associated with its address.
      // This will be the transaction that created it.
      const signatures = await connection.getSignaturesForAddress(paper.publicKey, { limit: 1 });
      const txid = signatures.length > 0 ? signatures[0].signature : null;
      return { ...paper.account, txid };
    }));


    papersWithTxids.forEach((paper) => {
      const item = document.createElement("li");
      item.className = "bg-gray-50 p-4 rounded shadow space-y-1"; // Added space-y-1 for better spacing

      // Build the HTML, now including a link to the transaction on Solana Explorer
      item.innerHTML = `
        <p><strong>📌 Title:</strong> ${paper.title}</p>
        <p><strong>📤 IPFS:</strong> <a class="text-blue-600 hover:underline break-all" href="https://ipfs.io/ipfs/${paper.ipfsHash}" target="_blank" rel="noopener noreferrer">${paper.ipfsHash}</a></p>
        <p><strong>👤 Author:</strong> <span class="font-mono text-xs">${paper.author.toString()}</span></p>
        ${paper.txid ? `
        <p><strong>🧾 Transaction:</strong> 
          <a class="text-purple-600 hover:underline break-all text-xs font-mono" href="https://explorer.solana.com/tx/${paper.txid}?cluster=devnet" target="_blank" rel="noopener noreferrer">
            ${paper.txid}
          </a>
        </p>
        ` : ''}
      `;
      list.appendChild(item);
    });

  } catch (err) {
    console.error("Failed to fetch metadata:", err);
    list.innerText = "Error fetching data from Solana.";
  }
}

fetchMetadata();