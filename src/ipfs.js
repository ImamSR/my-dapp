import axios from 'axios';

// Get the Pinata JWT from the Vercel environment variable
const pinataJWT = import.meta.env.VITE_PINATA_JWT;

/**
 * Uploads a file to IPFS using the Pinata API.
 * @param {File} file The file to upload.
 * @returns {Promise<string|null>} The IPFS hash (CID) of the uploaded file.
 */
export async function uploadToIPFS(file) {
  if (!pinataJWT) {
    console.error("VITE_PINATA_JWT is not set in your environment variables.");
    alert("IPFS configuration error. Cannot upload file.");
    return null;
  }

  // 1. Create a FormData object to hold the file
  const formData = new FormData();
  formData.append("file", file);

  try {
    // 2. Send the POST request to Pinata's API
    const response = await axios.post(
      "https://api.pinata.cloud/pinning/pinFileToIPFS",
      formData,
      {
        headers: {
          "Content-Type": `multipart/form-data; boundary=${formData._boundary}`,
          "Authorization": `Bearer ${pinataJWT}`
        }
      }
    );

    // 3. Get the IPFS hash from the response
    const ipfsHash = response.data.IpfsHash;
    console.log("✅ File uploaded to IPFS via Pinata:", ipfsHash);
    return ipfsHash;

  } catch (error) {
    console.error("❌ Error uploading file to Pinata:", error);
    alert(`Error uploading to IPFS: ${error.message}`);
    return null;
  }
}