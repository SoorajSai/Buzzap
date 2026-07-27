import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { User, LogOut } from 'lucide-react';
import QRScanner from './components/QRScanner';
import MessageForm from './components/MessageForm';
import ProgressTracker from './components/ProgressTracker';

const BACKEND_URL = 'http://localhost:3005';

// Session Management: Generate or retrieve a session ID for this browser tab
let sessionId = sessionStorage.getItem('buzzap_session_id');
if (!sessionId) {
  sessionId = crypto.randomUUID();
  sessionStorage.setItem('buzzap_session_id', sessionId);
}

// Initialize socket connection to backend with the session ID
const socket = io(BACKEND_URL, { query: { sessionId } });

function App() {
  const [waStatus, setWaStatus] = useState('disconnected'); // disconnected, qr_ready, authenticated, ready
  const [qrCode, setQrCode] = useState(null);
  const [connectedUser, setConnectedUser] = useState(null);
  const [broadcastState, setBroadcastState] = useState('idle'); // idle, sending, paused
  const [progress, setProgress] = useState(null); // { current, total }
  const [logs, setLogs] = useState([]);

  const [sentNumbers, setSentNumbers] = useState(() => {
    const saved = localStorage.getItem('whatsapp_sent_numbers');
    return saved ? JSON.parse(saved) : [];
  });

  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    // Listen for status updates
    socket.on('wa_status', (data) => {
      console.log('Status update:', data);
      setWaStatus(data.status);
      if (data.qrCode) {
        setQrCode(data.qrCode);
      }
      if (data.user) {
        setConnectedUser(data.user);
      } else {
        setConnectedUser(null);
      }
    });

    // Listen for broadcast events
    socket.on('broadcast_started', (data) => {
      setBroadcastState('sending');
      setProgress({ current: 0, total: data.total });
      setLogs([]);
    });

    socket.on('broadcast_progress', (data) => {
      if (data.status === 'stopped') {
         setBroadcastState('idle');
         setLogs(prev => [{ number: 'Broadcast', status: 'failed', error: 'Stopped by user' }, ...prev]);
         return;
      }

      setProgress(prev => prev ? { ...prev, current: data.index } : null);
      setLogs(prev => [data, ...prev]);
      
      if (data.status === 'success') {
        setSentNumbers(prev => {
          const newSet = [...new Set([...prev, data.number])];
          localStorage.setItem('whatsapp_sent_numbers', JSON.stringify(newSet));
          return newSet;
        });
      }
    });

    socket.on('broadcast_completed', (data) => {
      setBroadcastState('idle');
      // Optional: show a success toast here
    });

    return () => {
      socket.off('wa_status');
      socket.off('broadcast_started');
      socket.off('broadcast_progress');
      socket.off('broadcast_completed');
    };
  }, []);

  const handleStartBroadcast = async (numbers, message, minDelay, maxDelay, selectedImage) => {
    try {
      const formData = new FormData();
      formData.append('numbers', JSON.stringify(numbers));
      formData.append('message', message);
      formData.append('minDelay', minDelay);
      formData.append('maxDelay', maxDelay);
      
      if (selectedImage) {
        formData.append('image', selectedImage);
      }

      const response = await fetch(`${BACKEND_URL}/api/send`, {
        method: 'POST',
        headers: { 'X-Session-Id': sessionId },
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) {
        alert(data.error || 'Failed to start broadcast');
      }
    } catch (err) {
      console.error(err);
      alert('Error connecting to backend server');
    }
  };

  const handleLogout = async () => {
    try {
      await fetch(`${BACKEND_URL}/api/logout`, {
        method: 'POST',
        headers: { 'X-Session-Id': sessionId }
      });
    } catch(err) {
      console.error('Error logging out:', err);
    }
    sessionStorage.removeItem('buzzap_session_id');
    window.location.reload();
  };

  return (
    <div className="app-container">
      <div className="legal-banner">
        <strong>⚠️ DISCLAIMER:</strong> If your WhatsApp account gets banned due to spam or any other reason, we are not responsible. Use this tool responsibly.
      </div>
      <header className="header">
        <div className="header-left">
          <img src="/logo.png" alt="BuzApp Logo" className="app-logo" />
        </div>
        <div className="nav-tabs">
          <div className="nav-tab active">Send Message</div>
          <div className="nav-tab">Reports</div>
        </div>
        <div className="header-right">
          <div className="user-avatar" title={connectedUser || 'Not logged in'}>
            {connectedUser ? <User size={20} /> : '?'}
          </div>
          {waStatus !== 'disconnected' && (
            <button 
              onClick={handleLogout} 
              style={{ 
                marginLeft: '1rem', 
                background: 'transparent', 
                border: '1px solid var(--border-color)', 
                color: 'var(--text-secondary)', 
                padding: '0.5rem 1rem', 
                borderRadius: '4px', 
                cursor: 'pointer', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem' 
              }}
              title="Log out and destroy session"
            >
              <LogOut size={16} /> Logout
            </button>
          )}
        </div>
      </header>

      <main>
        {waStatus !== 'ready' ? (
          <QRScanner status={waStatus} qrCode={qrCode} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <MessageForm 
              onStartBroadcast={handleStartBroadcast}
              broadcastState={broadcastState}
              setBroadcastState={setBroadcastState}
              sentNumbers={sentNumbers}
              connectedUser={connectedUser}
              onClearSent={() => {
                if(window.confirm("Are you sure you want to clear the history of sent numbers? This will allow you to message them again.")) {
                  localStorage.removeItem('whatsapp_sent_numbers');
                  setSentNumbers([]);
                }
              }}
            />
            
            {progress && (
              <ProgressTracker progress={progress} logs={logs} />
            )}
          </div>
        )}
      </main>

      {showScrollTop && (
        <button className="fab-scroll-top" onClick={scrollToTop} aria-label="Scroll to top">
          ↑
        </button>
      )}

      <footer style={{ marginTop: '2rem', padding: '1.5rem', textAlign: 'center', borderTop: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
        <div>Made by <strong>Sooraj Sai</strong></div>
        <div style={{ marginTop: '0.5rem' }}>
          ☕ Buy me a coffee! UPI ID: <strong>soorajmangalore1@okhdfcbank</strong>
        </div>
      </footer>
    </div>
  );
}

export default App;
