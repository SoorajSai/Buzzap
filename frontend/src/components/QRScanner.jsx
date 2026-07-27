import React from 'react';
import { QrCode, Smartphone } from 'lucide-react';

const QRScanner = ({ status, qrCode }) => {
  return (
    <div className="glass-card">
      <div className="qr-container">
        {status === 'disconnected' && !qrCode && (
          <>
            <span className="loader"></span>
            <h2>Initializing WhatsApp...</h2>
            <p className="text-muted">Starting headless browser, please wait.</p>
          </>
        )}
        
        {status === 'qr_ready' && qrCode && (
          <>
            <div className="qr-image-wrapper">
              <img src={qrCode} alt="WhatsApp QR Code" />
            </div>
            <h2>Scan to Link Device</h2>
            <p className="text-muted" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
              <Smartphone size={18} />
              Open WhatsApp on your phone and scan this code.
            </p>
          </>
        )}

        {status === 'authenticated' && (
          <>
            <div className="dropzone-icon" style={{ color: 'var(--success-color)' }}>
              <QrCode size={48} />
            </div>
            <h2>Authenticated!</h2>
            <p className="text-muted">Getting ready...</p>
          </>
        )}
      </div>
    </div>
  );
};

export default QRScanner;
