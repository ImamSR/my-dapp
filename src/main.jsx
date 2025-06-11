import React from 'react';
import ReactDOM from 'react-dom/client';
import { Buffer } from "buffer";
import WalletProvider from './WalletProvider.jsx';
import App from './App.jsx';

// Polyfill Buffer for the browser
window.Buffer = Buffer;

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    <WalletProvider>
      <App />
    </WalletProvider>
  </React.StrictMode>
);