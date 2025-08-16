import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { fetchAllPaperAccounts } from './solana.js';

function useDebouncedValue(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

function timeAgo(ts) {
  if (!ts) return 'unknown';
  const s = Math.max(1, Math.floor(Date.now() / 1000) - ts);
  const units = [
    [31536000, 'y'],
    [2592000, 'mo'],
    [604800, 'w'],
    [86400, 'd'],
    [3600, 'h'],
    [60, 'm'],
    [1, 's'],
  ];
  for (const [sec, label] of units) {
    if (s >= sec) return `${Math.floor(s / sec)}${label} ago`;
  }
  return 'just now';
}

async function copy(text) {
  try { await navigator.clipboard.writeText(text); } catch {}
}

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-xl border border-gray-200 bg-white p-4">
      <div className="h-4 w-2/3 bg-gray-200 rounded-md" />
      <div className="mt-3 h-3 w-1/3 bg-gray-200 rounded-md" />
      <div className="mt-3 h-3 w-1/2 bg-gray-200 rounded-md" />
      <div className="mt-3 h-3 w-1/4 bg-gray-200 rounded-md" />
      <div className="mt-4 h-8 w-full bg-gray-200 rounded-lg" />
    </div>
  );
}

function PaperCard({ publicKey, title, author, ipfsHash, txid, blockTime }) {
  const truncated = (s, head = 6, tail = 6) =>
    s && s.length > head + tail + 3 ? `${s.slice(0, head)}...${s.slice(-tail)}` : s;

  const authorStr = typeof author === 'string' ? author : author?.toString?.() || '';

  return (
    <div className="h-full flex flex-col justify-between group rounded-xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-all duration-200">
      {/* Title & Tag */}
      <div className="flex items-start justify-between">
        <h3 className="text-lg font-semibold text-gray-900 leading-snug line-clamp-2">
          {title || '(untitled)'}
        </h3>
        <span className="shrink-0 rounded-full bg-purple-50 border border-purple-200 px-3 py-1 text-xs font-medium text-purple-700">
          devnet
        </span>
      </div>

      {/* Meta Information */}
      <div className="mt-5 space-y-3 text-sm">
        {/* Author */}
        <div className="flex items-start gap-2">
          <span className="w-20 text-gray-500 pt-0.5">Author</span>
          <div className="flex-1 flex items-center gap-2">
            <code className="font-mono text-xs text-gray-800 break-all">{authorStr}</code>
            <button
              onClick={() => copy(authorStr)}
              className="rounded border border-gray-200 px-2 py-0.5 text-xs text-gray-600 hover:bg-gray-50"
              title="Copy author"
            >
              Copy
            </button>
          </div>
        </div>

        {/* IPFS Hash */}
        <div className="flex items-start gap-2">
          <span className="w-20 text-gray-500 pt-0.5">IPFS</span>
          <div className="flex-1 flex items-center gap-2">
            <a
              className="text-blue-600 hover:underline break-all font-mono text-xs"
              href={`https://ipfs.io/ipfs/${ipfsHash}`}
              target="_blank"
              rel="noopener noreferrer"
              title={ipfsHash}
            >
              {truncated(ipfsHash, 10, 8)}
            </a>
            <button
              onClick={() => copy(ipfsHash)}
              className="rounded border border-gray-200 px-2 py-0.5 text-xs text-gray-600 hover:bg-gray-50"
              title="Copy IPFS hash"
            >
              Copy
            </button>
          </div>
        </div>

        {/* Transaction ID */}
        {txid && (
          <div className="flex items-start gap-2">
            <span className="w-20 text-gray-500 pt-0.5">Tx</span>
            <div className="flex-1 flex items-center gap-2">
              <a
                className="text-purple-600 hover:underline break-all font-mono text-xs"
                href={`https://explorer.solana.com/tx/${txid}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
                title={txid}
              >
                {truncated(txid, 8, 8)}
              </a>
              <button
                onClick={() => copy(txid)}
                className="rounded border border-gray-200 px-2 py-0.5 text-xs text-gray-600 hover:bg-gray-50"
                title="Copy transaction"
              >
                Copy
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-6 text-right">
        <span className="text-xs text-gray-400">
          {blockTime ? timeAgo(blockTime) : 'Time unknown'}
        </span>
      </div>
    </div>
  );
}

export default function ViewerPage() {
  const wallet = useWallet();
  const [papers, setPapers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState('newest'); // 'newest' | 'title-asc' | 'title-desc'

  const debouncedSearch = useDebouncedValue(searchQuery, 250);
  const mounted = useRef(false);

  const fetchMetadata = useCallback(async () => {
    try {
      setIsLoading(true);
      setError('');
      const paperAccounts = await fetchAllPaperAccounts();
      setPapers(paperAccounts || []);
    } catch (err) {
      console.error('Failed to fetch metadata:', err);
      setError('Gagal mengambil data dari Solana RPC. Coba refresh atau gunakan RPC khusus.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      fetchMetadata();
    }
  }, [fetchMetadata]);

  // FILTER then SORT (fix)
  const filteredAndSorted = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    const base = q
      ? papers.filter((p) => (p.account.title || '').toLowerCase().includes(q))
      : papers.slice();

    const byTitle = (a, b, dir = 1) =>
      (a.account.title || '').localeCompare(b.account.title || '', undefined, {
        sensitivity: 'base',
        numeric: true,
      }) * dir;

    const byNewest = (a, b) => (b.account.blockTime || 0) - (a.account.blockTime || 0);

    if (sortKey === 'title-asc') base.sort((a, b) => byTitle(a, b, 1));
    else if (sortKey === 'title-desc') base.sort((a, b) => byTitle(a, b, -1));
    else base.sort(byNewest);

    return base;
  }, [papers, debouncedSearch, sortKey]);

  const refresh = async () => {
    await fetchMetadata();
  };

  return (
    <div className="bg-gray-100 min-h-screen">
      {/* Sticky top bar */}
      <div className="top-0 z-10 backdrop-blur bg-white/75 border-b border-gray-200">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <a
              href="/"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              title="Back to Upload"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Upload
            </a>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Research Repository</h1>
            <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-200">
              {filteredAndSorted.length} Uploaded Research
            </span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6">
        {/* Controls */}
        <div className="mb-5 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <label htmlFor="search" className="block text-xs font-medium text-gray-600 mb-1">
              Search by Title
            </label>
            <div className="relative">
              <input
                id="search"
                type="text"
                placeholder="Enter a research title…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-10 text-sm shadow-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                disabled={isLoading}
              />
              <span className="absolute left-3 top-2.5 text-gray-400">
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
                </svg>
              </span>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
                  title="Clear"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Sort
            </label>
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white py-2 px-3 text-sm shadow-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            >
              <option value="newest">Newest first</option>
              <option value="title-asc">Title (A→Z)</option>
              <option value="title-desc">Title (Z→A)</option>
            </select>
          </div>
        </div>

        {/* States */}
        {error && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : filteredAndSorted.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-10 text-center text-gray-600">
            <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
              📄
            </div>
            {searchQuery ? (
              <>
                <p className="font-medium">No research found</p>
                <p className="text-sm text-gray-500">Try a different keyword or clear the search.</p>
              </>
            ) : (
              <>
                <p className="font-medium">No research uploaded yet</p>
                <p className="text-sm text-gray-500">Be the first to publish on the Upload page.</p>
              </>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAndSorted.map(({ publicKey, account }) => (
                <PaperCard
                  key={publicKey.toString()}
                  publicKey={publicKey}
                  title={account.title}
                  author={account.author}
                  ipfsHash={account.ipfsHash}
                  txid={account.txid}
                  blockTime={account.blockTime}
                />
              ))}
            </div>
            <div className="mt-6 flex items-center justify-center">
              <button
                onClick={refresh}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Load latest
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
