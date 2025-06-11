import { PublicKey } from "@solana/web3.js";

const programId = new PublicKey("QgW6fvDifjsGS5fKR9kZf6Ev7j1X8GrmxjYmZcmVMX8");
const userPublicKey = new PublicKey("8WmMy8pkMTCtCJhND8gixM8BNE5Ww3SKWJMJXypXUXas");
const title = "paper5";

const [pda, bump] = PublicKey.findProgramAddressSync(
  [userPublicKey.toBuffer(), Buffer.from(title)],
  programId
);

console.log("📌 PDA Address:", pda.toBase58());
console.log("🧩 Bump:", bump);
