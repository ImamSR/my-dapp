import React from 'react';
import ReactDOM from 'react-dom/client';
import { Buffer } from "buffer";
import WalletProvider from './WalletProvider.jsx'; // Reuse your existing wallet provider
import ViewerPage from './ViewerPage.jsx';

window.Buffer = Buffer;

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <WalletProvider>
      <ViewerPage />
    </WalletProvider>
  </React.StrictMode>
);