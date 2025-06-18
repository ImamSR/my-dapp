import { Buffer } from "buffer";
window.Buffer = Buffer;

import { Connection, PublicKey, SystemProgram, clusterApiUrl } from "@solana/web3.js";
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import { sha256 } from '@noble/hashes/sha256'; // Library untuk hashing
import idl from "./idl.json";

// --- Konfigurasi ---
const programId = new PublicKey("7Rc9yjhQ9RrGFLe5WbZwQ3kqqE7bzAYDsk4tJsXXKre8");
const heliusRpcUrl = "https://devnet.helius-rpc.com/?api-key=f80922f6-ec9a-47d2-af09-cb1d1e7c8a50";
const connection = new Connection(heliusRpcUrl, "confirmed");

function getProvider(wallet) {
  return new AnchorProvider(connection, wallet, AnchorProvider.defaultOptions());
}

/**
 * Helper function to derive PDA using the new hashing logic.
 */
async function getPaperPdaWithHash(title, authorPublicKey) {
    const titleHash = sha256(Buffer.from(title));
    const titleHashSeed = new PublicKey(titleHash); // Convert hash bytes to a public key
    
    const [pda] = await PublicKey.findProgramAddress(
        [
            Buffer.from("paper"),
            authorPublicKey.toBuffer(),
            titleHashSeed.toBuffer(), // Use the public key's buffer as the seed
        ],
        programId
    );
    return { pda, titleHashSeed };
}

export async function submitToSolana(title, ipfsHash, wallet) {
  if (!wallet || !wallet.publicKey) {
    throw new Error("Wallet not connected!");
  }

  const provider = getProvider(wallet);
  const program = new Program(idl, provider);

  try {
      const { pda: paperPda, titleHashSeed } = await getPaperPdaWithHash(title, wallet.publicKey);
      
      const tx = await program.methods
        .uploadPaper(title, ipfsHash)
        .accounts({
          paper: paperPda,
          titleHashSeed: titleHashSeed, // Pass the hash key as the seed account
          author: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log("✅ Metadata submitted on Solana:", tx);
      return tx;
  } catch (err) {
      console.error("❌ Smart contract call failed:", err);
      if (err.logs) {
          console.error("Solana Logs:", err.logs);
      }
      throw new Error(`Smart contract call failed: ${err.message}`);
  }
}

export async function checkIfPaperExists(title, wallet) {
  if (!wallet || !wallet.publicKey) return false;

  try {
      const { pda: paperPda } = await getPaperPdaWithHash(title, wallet.publicKey);
      const account = await connection.getAccountInfo(paperPda);
      return account !== null;
  } catch(e) {
      console.error("Error checking for existing paper:", e);
      return false;
  }
}

// Function to fetch all data for the viewer page
export async function fetchAllPaperAccounts() {
  const provider = new AnchorProvider(connection, null, AnchorProvider.defaultOptions());
  const program = new Program(idl, provider);

  try {
    const accounts = await program.account.paper.all();
    const accountsWithTxids = [];

    // Fetch transaction signatures sequentially to avoid rate-limiting
    for (const paper of accounts) {
      try {
          const signatures = await connection.getSignaturesForAddress(paper.publicKey, { limit: 1 });
          const txid = signatures.length > 0 ? signatures[0].signature : null;
          
          accountsWithTxids.push({
            publicKey: paper.publicKey,
            account: {
              ...paper.account,
              txid: txid
            }
          });
      } catch (e) {
          console.warn(`Could not fetch signature for account ${paper.publicKey.toString()}`);
          accountsWithTxids.push({ publicKey: paper.publicKey, account: { ...paper.account, txid: null } });
      }
    }
    return accountsWithTxids;
  } catch (error) {
    console.error("Error fetching all paper accounts:", error);
    throw new Error("Failed to fetch data from Solana. Using a dedicated RPC provider is highly recommended.");
  }
}
