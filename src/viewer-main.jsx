import React from 'react';
import ReactDOM from 'react-dom/client';
import { Buffer } from "buffer";

// Import the providers and components needed for the page
import WalletProvider from './WalletProvider.jsx'; // Provides wallet context
import ViewerPage from './ViewerPage.jsx';     // Your actual page component

// Polyfill Buffer for the browser
window.Buffer = Buffer;

// 1. Find the <div id="root"> from viewer.html
const rootElement = document.getElementById('root');
const root = ReactDOM.createRoot(rootElement);

// 2. Render your components into that div
root.render(
  <React.StrictMode>
    {/* The WalletProvider is necessary for the WalletMultiButton inside ViewerPage to work */}
    <WalletProvider>
      <ViewerPage />
    </WalletProvider>
  </React.StrictMode>
);