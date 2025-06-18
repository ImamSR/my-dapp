import { fetchAllPaperAccounts } from "./solana.js";

// --- DOM Element References ---
const paperListContainer = document.getElementById('paper-list-container');
const paperList = document.getElementById('paper-list');
const loadingContainer = document.getElementById('loading-container');
const errorContainer = document.getElementById('error-container');
const errorMessage = document.getElementById('error-message');
const paginationControls = document.getElementById('pagination-controls');
const prevButton = document.getElementById('prev-button');
const nextButton = document.getElementById('next-button');
const pageInfo = document.getElementById('page-info');

// --- Pagination State ---
let allPapers = [];
let currentPage = 1;
const PAGE_SIZE = 10; // Only show 10 items per page

/**
 * Renders the data for the currently active page.
 */
function renderPage() {
  // Clear the existing list
  paperList.innerHTML = '';

  // Calculate total pages
  const totalPages = Math.ceil(allPapers.length / PAGE_SIZE);
  
  // Determine the start and end index for the current page
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const endIndex = startIndex + PAGE_SIZE;
  const papersToShow = allPapers.slice(startIndex, endIndex);

  // If there's no data on this page, show a message
  if (papersToShow.length === 0 && allPapers.length > 0) {
      paperList.innerHTML = `<p class="text-center text-gray-500">No more papers to show.</p>`;
  } else if (allPapers.length === 0) {
      paperList.innerHTML = `<p class="text-center text-gray-500">No research has been published yet.</p>`;
  }

  // Create and append HTML elements for each paper
  papersToShow.forEach(paper => {
    const paperData = paper.account; 
    const card = document.createElement('div');
    card.className = 'bg-white p-6 rounded-lg shadow-lg border border-gray-200 transition-all hover:shadow-xl';
    
    // Build the HTML with better styling, icons, and layout
    card.innerHTML = `
      <div class="flex flex-col space-y-4">
        <div>
          <h2 class="text-2xl font-bold text-gray-800 tracking-tight">${paperData.title}</h2>
        </div>
        
        <div class="border-t border-gray-200 pt-4 space-y-3 text-sm">
          <div class="flex items-center">
            <svg class="w-5 h-5 text-gray-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
            <span class="font-semibold text-gray-600 mr-2">Author:</span>
            <span class="font-mono text-gray-800 text-xs break-all">${paperData.author.toBase58()}</span>
          </div>

          <div class="flex items-center">
            <svg class="w-5 h-5 text-gray-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
            <span class="font-semibold text-gray-600 mr-2">IPFS Hash:</span>
            <a href="https://ipfs.io/ipfs/${paperData.ipfsHash}" target="_blank" class="text-blue-600 hover:text-blue-800 hover:underline font-mono text-xs break-all">${paperData.ipfsHash}</a>
          </div>

          ${paperData.txid ? `
            <div class="flex items-center">
              <svg class="w-5 h-5 text-gray-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              <span class="font-semibold text-gray-600 mr-2">Transaction ID:</span>
              <a href="https://explorer.solana.com/tx/${paperData.txid}?cluster=devnet" target="_blank" class="text-purple-600 hover:text-purple-800 hover:underline font-mono text-xs break-all">${paperData.txid}</a>
            </div>
          ` : ''}
        </div>
      </div>
    `;
    paperList.appendChild(card);
  });

  // Update pagination controls
  pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
  prevButton.disabled = currentPage === 1;
  nextButton.disabled = currentPage === totalPages || totalPages === 0;
}

/**
 * Main function to load data from the blockchain.
 */
async function loadAndInitialize() {
  try {
    allPapers = await fetchAllPaperAccounts();
    
    // Hide loading spinner and show content
    loadingContainer.classList.add('hidden');
    paperListContainer.classList.remove('hidden');
    if (allPapers.length > PAGE_SIZE) {
        paginationControls.classList.remove('hidden');
    }

    // Render the first page
    renderPage();

  } catch (err) {
    // Show error message on failure
    loadingContainer.classList.add('hidden');
    errorContainer.classList.remove('hidden');
    errorMessage.textContent = err.message;
    console.error(err);
  }
}

// --- Event Listeners for Pagination Buttons ---
prevButton.addEventListener('click', () => {
  if (currentPage > 1) {
    currentPage--;
    renderPage();
    window.scrollTo(0, 0); // Scroll to top
  }
});

nextButton.addEventListener('click', () => {
  const totalPages = Math.ceil(allPapers.length / PAGE_SIZE);
  if (currentPage < totalPages) {
    currentPage++;
    renderPage();
    window.scrollTo(0, 0); // Scroll to top
  }
});

// Run the initialization function when the page loads
loadAndInitialize();