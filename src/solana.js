import { Buffer } from "buffer";
// Make sure to import clusterApiUrl
import { Connection, PublicKey, SystemProgram, clusterApiUrl } from "@solana/web3.js";
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import idl from "./idl.json";

// --- Configuration for Devnet ---

// 1. IMPORTANT: Make sure this is your correct Program ID from deploying to Devnet
const programId = new PublicKey("QgW6fvDifjsGS5fKR9kZf6Ev7j1X8GrmxjYmZcmVMX8"); // Replace if you have a new Devnet ID

// 2. FIX: Change the connection to point to the Devnet cluster
const connection = new Connection(clusterApiUrl("devnet"), "confirmed");


/**
 * Creates a provider instance using the connected wallet.
 * @param {import('@solana/wallet-adapter-react').WalletContextState} wallet 
 * @returns {AnchorProvider}
 */
function getProvider(wallet) {
  // This uses the Devnet connection we created above
  const provider = new AnchorProvider(connection, wallet, AnchorProvider.defaultOptions());
  return provider;
}


/**
 * Submits the research metadata to the Solana smart contract.
 * @param {string} title - The title of the paper.
 * @param {string} ipfsHash - The IPFS CID for the paper's file.
 * @param {import('@solana/wallet-adapter-react').WalletContextState} wallet - The wallet object from the `useWallet` hook.
 * @returns {Promise<string>} - The transaction signature.
 */
export async function submitToSolana(title, ipfsHash, wallet) {
  if (!wallet || !wallet.publicKey) {
    throw new Error("Wallet is not connected!");
  }

  const provider = getProvider(wallet);
  const program = new Program(idl, provider);

  try {
    const [paperAccountPda] = await PublicKey.findProgramAddress(
      [
        wallet.publicKey.toBuffer(),
        Buffer.from(title)
      ],
      program.programId
    );

    const txSignature = await program.methods
      .uploadPaper(title, ipfsHash)
      .accounts({
        paper: paperAccountPda,
        author: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("✅ Metadata submitted on Solana (Devnet):", txSignature);
    return txSignature;

  } catch (err) {
    console.error("❌ Smart contract call failed on Devnet:", err);
    throw err;
  }
}