import React, { useCallback, useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import { FileUp, X, Send, Pause, Play, Square } from 'lucide-react';

const BACKEND_URL = 'http://localhost:3005';

const MessageForm = ({ onStartBroadcast, broadcastState, setBroadcastState, sentNumbers, onClearSent, connectedUser }) => {
  const [contacts, setContacts] = useState([]); // [{ id, name, number, selected }]
  const [message, setMessage] = useState('');
  const [minDelaySec, setMinDelaySec] = useState(4);
  const [maxDelaySec, setMaxDelaySec] = useState(7);
  const [randomize, setRandomize] = useState(true);
  
  const [manualInput, setManualInput] = useState('');
  const [csvFileName, setCsvFileName] = useState('');
  const [isListCollapsed, setIsListCollapsed] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  // Legal state
  const [agreed, setAgreed] = useState(false);
  const [isAgreementChecking, setIsAgreementChecking] = useState(false);

  useEffect(() => {
    if (connectedUser) {
      setIsAgreementChecking(true);
      fetch(`${BACKEND_URL}/api/agreement/${connectedUser}`)
        .then(res => res.json())
        .then(data => {
          // We no longer auto-check this. The user must explicitly check it every time.
          // But we could store if they are a returning user if needed.
        })
        .catch(err => console.error(err))
        .finally(() => setIsAgreementChecking(false));
    }
  }, [connectedUser]);

  const handleAgreementChange = (e) => {
    const checked = e.target.checked;
    setAgreed(checked);
    if (checked && connectedUser) {
      fetch(`${BACKEND_URL}/api/agreement`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: connectedUser })
      }).catch(err => console.error(err));
    }
  };

  const processNumber = (rawNum) => {
    let cleaned = String(rawNum).replace(/\D/g, '');
    if (cleaned.length >= 10) {
        return cleaned;
    }
    return null;
  };

  const addContact = (name, rawNum) => {
    const num = processNumber(rawNum);
    if (num) {
      setContacts(prev => {
        if (prev.find(c => c.number === num)) return prev;
        return [...prev, { id: Math.random().toString(), name: name || 'Unknown', number: num, selected: true }];
      });
    }
  };

  const onDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    if (file) {
      setCsvFileName(file.name);
      Papa.parse(file, {
        complete: (results) => {
          results.data.forEach(row => {
            let cells = [];
            if (Array.isArray(row)) cells = row;
            else if (typeof row === 'object') cells = Object.values(row);

            let foundNum = null;
            let foundName = '';

            for (let cell of cells) {
                if (!cell) continue;
                const cellStr = String(cell).trim();
                const possibleNum = processNumber(cellStr);
                if (possibleNum && !foundNum) {
                    foundNum = possibleNum;
                } else if (!foundName && isNaN(cellStr.replace(/\s/g, ''))) {
                    foundName = cellStr;
                }
            }

            if (foundNum) addContact(foundName, foundNum);
          });
        },
        header: true,
        skipEmptyLines: true
      });
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'] },
    maxFiles: 1
  });

  const handleManualAdd = (e) => {
    if (e.key === 'Enter' || e.type === 'blur') {
        e.preventDefault();
        const parts = manualInput.split(',');
        parts.forEach(part => {
           const p = part.trim();
           if(p) addContact('', p);
        });
        setManualInput('');
    }
  };

  const toggleContactSelection = (id) => {
    setContacts(prev => prev.map(c => c.id === id ? { ...c, selected: !c.selected } : c));
  };

  const removeContact = (id) => {
    setContacts(prev => prev.filter(c => c.id !== id));
  };

  const selectedNumbers = contacts.filter(c => c.selected).map(c => c.number);
  const remainingNumbers = selectedNumbers.filter(num => !sentNumbers.includes(num));

  const isReadyToSend = remainingNumbers.length > 0 && (message || selectedImage) && agreed;

  const handleSubmit = () => {
    if (remainingNumbers.length === 0) {
      alert("Please add at least one valid recipient.");
      return;
    }
    if (!message && !selectedImage) {
      alert("Please enter a message or attach an image.");
      return;
    }
    if (!agreed) {
      alert("Please accept the legal disclaimer by checking the box.");
      return;
    }
    
    let minDelayMs = Math.max(4, minDelaySec) * 1000;
    let maxDelayMs = minDelayMs;
    
    if (randomize) {
        maxDelayMs = Math.max(minDelaySec, maxDelaySec) * 1000;
    }
    
    onStartBroadcast(remainingNumbers, message, minDelayMs, maxDelayMs, selectedImage);
  };

  const handlePause = async () => {
    try {
      await fetch(`${BACKEND_URL}/api/pause`, { method: 'POST' });
      setBroadcastState('paused');
    } catch (err) {
      console.error('Failed to pause', err);
    }
  };

  const handleResume = async () => {
    try {
      await fetch(`${BACKEND_URL}/api/resume`, { method: 'POST' });
      setBroadcastState('sending');
    } catch (err) {
      console.error('Failed to resume', err);
    }
  };

  const handleStop = async () => {
    try {
      await fetch(`${BACKEND_URL}/api/stop`, { method: 'POST' });
      // The backend will emit broadcast_progress with stopped status, which sets state to idle
    } catch (err) {
      console.error('Failed to stop', err);
    }
  };

  const isSendingActive = broadcastState !== 'idle';

  return (
    <div className="glass-card">
      <div className="form-group">
        <label>Recipients</label>
        <div className="input-row">
            <div className="country-code">
                <span>🇮🇳 +91</span>
            </div>
            
            <div style={{ flex: 1 }}>
              {contacts.length > 5 && (
                <button className="toggle-list-btn" onClick={() => setIsListCollapsed(!isListCollapsed)}>
                  {isListCollapsed ? 'Show Full List' : 'Close List'}
                </button>
              )}
              
              <div className={`tags-wrapper ${isListCollapsed ? 'collapsed' : ''}`}>
                <div className="tags-input-container">
                    {contacts.map(c => (
                        <div className="tag" key={c.id}>
                            <input 
                                type="checkbox" 
                                checked={c.selected} 
                                onChange={() => toggleContactSelection(c.id)}
                                style={{ margin: 0 }}
                                disabled={isSendingActive}
                            />
                            <span>{c.name !== 'Unknown' ? `${c.name} (${c.number})` : c.number}</span>
                            <button onClick={() => removeContact(c.id)} disabled={isSendingActive}><X size={14} /></button>
                        </div>
                    ))}
                    <input 
                        type="text" 
                        placeholder="Type number & press Enter..." 
                        value={manualInput}
                        onChange={e => setManualInput(e.target.value)}
                        onKeyDown={handleManualAdd}
                        onBlur={handleManualAdd}
                        disabled={isSendingActive}
                    />
                </div>
              </div>

              {contacts.length > 5 && !isListCollapsed && (
                <button className="toggle-list-btn" onClick={() => setIsListCollapsed(true)}>
                  Close List
                </button>
              )}
            </div>

            <div {...getRootProps()} style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
                <input {...getInputProps()} disabled={isSendingActive} />
                <button className="file-upload-btn" title="Upload CSV" disabled={isSendingActive}>
                    <FileUp size={20} />
                    {csvFileName && <span style={{ fontSize: '0.85rem', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{csvFileName}</span>}
                </button>
            </div>
        </div>
      </div>

      <div className="form-group">
        <label>Message box</label>
        <textarea 
          className="textarea" 
          placeholder="Enter your message here..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          disabled={isSendingActive}
        ></textarea>
        
        <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <label className="file-upload-btn" style={{ margin: 0, padding: '0.5rem 1rem', width: 'fit-content' }}>
            <FileUp size={16} />
            Attach Image (Optional)
            <input 
              type="file" 
              accept="image/*" 
              style={{ display: 'none' }} 
              onChange={(e) => setSelectedImage(e.target.files[0])}
              disabled={isSendingActive}
            />
          </label>
          {selectedImage && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--wa-dark-green)' }}>
              <span>{selectedImage.name}</span>
              <button 
                onClick={() => setSelectedImage(null)} 
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--error-color)' }}
                disabled={isSendingActive}
              >
                <X size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="settings-row">
        <div className="settings-col">
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            Delay (Seconds) - Min 4s
            <div className="tooltip-container">
              <span className="tooltip-icon">ℹ️ Why we use delay?</span>
              <div className="tooltip-content">
                If messages are sent without delay, WhatsApp will flag and ban your account for spam. Using a delay doesn't guarantee your account won't be banned, but it significantly reduces the risk by simulating human behavior.
              </div>
            </div>
          </label>
          <input 
            type="number" 
            className="input-field" 
            value={minDelaySec}
            onChange={(e) => setMinDelaySec(Math.max(4, Number(e.target.value)))}
            min={4}
            disabled={isSendingActive}
          />
        </div>
        <div className="settings-col" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1.5rem' }}>
          <input 
            type="checkbox" 
            checked={randomize} 
            onChange={e => setRandomize(e.target.checked)} 
            style={{ width: '18px', height: '18px', accentColor: 'var(--wa-green)' }}
            disabled={isSendingActive}
          />
          <label style={{ margin: 0 }}>Randomize Delay</label>
        </div>
        {randomize && (
            <div className="settings-col">
            <label>Max Delay (Seconds)</label>
            <input 
                type="number" 
                className="input-field" 
                value={maxDelaySec}
                onChange={(e) => setMaxDelaySec(Math.max(minDelaySec, Number(e.target.value)))}
                min={minDelaySec}
                disabled={isSendingActive}
            />
            </div>
        )}
      </div>

      <div className="legal-checkbox-container">
          <input 
            type="checkbox" 
            checked={agreed} 
            onChange={handleAgreementChange}
            disabled={isAgreementChecking || isSendingActive}
          />
          <div className="legal-text">
              I agree that I am solely responsible for the messages sent using this tool. I understand that bulk messaging may lead to my WhatsApp account being banned or deleted by WhatsApp for violating their Terms of Service. I agree that the creators of this software are not responsible for any such bans, deletions, or legal consequences.
          </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Selected: {selectedNumbers.length} | Remaining: {remainingNumbers.length}
          </div>
          
          <div className="btn-group">
              <button 
                className={`btn ${!isReadyToSend && broadcastState === 'idle' ? 'btn-unready' : ''}`}
                onClick={handleSubmit} 
                disabled={broadcastState !== 'idle'}
              >
                <Send size={18} />
                Send
              </button>

              <button 
                className="btn btn-secondary" 
                onClick={broadcastState === 'paused' ? handleResume : handlePause}
                disabled={broadcastState !== 'sending' && broadcastState !== 'paused'}
              >
                {broadcastState === 'paused' ? (
                  <><Play size={18} fill="currentColor" /> Resume</>
                ) : (
                  <><Pause size={18} /> Pause</>
                )}
              </button>

              <button 
                className="btn btn-danger" 
                onClick={handleStop}
                disabled={broadcastState === 'idle'}
              >
                <Square size={18} fill="currentColor" /> Stop
              </button>
          </div>
      </div>
      
      {sentNumbers.length > 0 && broadcastState === 'idle' && (
          <div style={{ marginTop: '1rem', textAlign: 'right' }}>
              <button 
                onClick={onClearSent} 
                style={{ background: 'none', border: 'none', color: 'var(--wa-dark-green)', cursor: 'pointer', textDecoration: 'underline' }}
              >
                  Clear history of previously sent numbers
              </button>
          </div>
      )}
    </div>
  );
};

export default MessageForm;
