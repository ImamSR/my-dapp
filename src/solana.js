import { Buffer } from "buffer";
window.Buffer = Buffer;

import { Connection, PublicKey, SystemProgram, clusterApiUrl } from "@solana/web3.js";
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import { sha256 } from '@noble/hashes/sha256'; // Library untuk hashing
import idl from "./idl.json";
import {  sendAndConfirmTransaction,Transaction} from "@solana/web3.js";

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
  if (titleHash.length !== 32) throw new Error("Invalid SHA256 hash length");

  const titleHashSeed = new PublicKey(titleHash); // ✅ hash must be 32 bytes
  const [pda] = await PublicKey.findProgramAddress(
    [
      Buffer.from("paper"),
      authorPublicKey.toBuffer(),
      titleHashSeed.toBuffer()
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

  const { pda: paperPda, titleHashSeed } = await getPaperPdaWithHash(title, wallet.publicKey);

  console.log("📄 PDA:", paperPda.toBase58());
  console.log("🔑 Hash seed:", titleHashSeed.toBase58());

  const tx = await program.methods
    .uploadPaper(title, ipfsHash)
    .accounts({
      paper: paperPda,
      titleHashSeed,
      author: wallet.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .transaction(); // build Transaction object instead of sending directly

  tx.feePayer = wallet.publicKey;
  tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

  // sign and send manually to avoid reuse issues
  const signed = await wallet.signTransaction(tx);
  const txid = await connection.sendRawTransaction(signed.serialize());

  console.log("✅ TX submitted:", txid);
  return txid;
}

export async function checkIfPaperExists(title, wallet) {
  if (!wallet || !wallet.publicKey) return false;

  try {
    const { pda: paperPda } = await getPaperPdaWithHash(title, wallet.publicKey);
    const account = await connection.getAccountInfo(paperPda);
    return account !== null;
  } catch (e) {
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

    for (const paper of accounts) {
      try {
        const signatures = await connection.getSignaturesForAddress(paper.publicKey, { limit: 1 });
        const txid = signatures.length > 0 ? signatures[0].signature : null;

        accountsWithTxids.push({
          publicKey: paper.publicKey,
          account: {
            ...paper.account,
            txid
          }
        });
      } catch (e) {
        console.warn(`Could not fetch signature for account ${paper.publicKey.toBase58()}`);
        accountsWithTxids.push({
          publicKey: paper.publicKey,
          account: {
            ...paper.account,
            txid: null
          }
        });
      }
    }

    return accountsWithTxids;
  } catch (error) {
    console.error("Error fetching all paper accounts:", error);
    throw new Error("Failed to fetch data from Solana.");
  }
}
