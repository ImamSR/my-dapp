import { Buffer } from "buffer";
import { Connection, PublicKey, SystemProgram, clusterApiUrl } from "@solana/web3.js";
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import idl from "./idl.json";

const programId = new PublicKey("QgW6fvDifjsGS5fKR9kZf6Ev7j1X8GrmxjYmZcmVMX8");
const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

function getProvider(wallet) {
  const provider = new AnchorProvider(connection, wallet, AnchorProvider.defaultOptions());
  return provider;
}

// Helper function to derive the PDA WITHOUT hashing
async function getPaperPda(title, walletPublicKey) {
    const titleBuffer = Buffer.from(title, 'utf8');
    // Note: No hashing is performed
    const [pda] = await PublicKey.findProgramAddress(
        [walletPublicKey.toBuffer(), titleBuffer],
        programId
    );
    return pda;
}

export async function checkIfPaperExists(title, wallet) {
  try {
    const paperPda = await getPaperPda(title, wallet.publicKey);
    const accountInfo = await connection.getAccountInfo(paperPda);
    return accountInfo !== null;
  } catch (error) {
    console.error("Error checking for existing paper:", error);
    return false;
  }
}

export async function submitToSolana(title, ipfsHash, wallet) {
  if (!wallet || !wallet.publicKey) throw new Error("Wallet not connected!");
  
  const provider = getProvider(wallet);
  const program = new Program(idl, provider);

  try {
    const paperPda = await getPaperPda(title, wallet.publicKey);

    const txSignature = await program.methods
      .uploadPaper(title, ipfsHash)
      .accounts({
        paper: paperPda,
        author: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("✅ Metadata submitted on Solana:", txSignature);
    return txSignature;
  } catch (err) {
    console.error("❌ Smart contract call failed on Devnet:", err);
    throw err;
  }
}