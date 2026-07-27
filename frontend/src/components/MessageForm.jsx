import React, { useCallback, useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import { FileUp, X, Send, Pause, Play, Square, CheckCircle2, XCircle } from 'lucide-react';

const BACKEND_URL = 'http://localhost:3005';

const MessageForm = ({ sessionId, onStartBroadcast, broadcastState, setBroadcastState, sentNumbers, onClearSent, connectedUser, progress, logs }) => {
  const [contacts, setContacts] = useState([]); // [{ id, name, number, selected }]
  const [message, setMessage] = useState('');
  const [minDelaySec, setMinDelaySec] = useState(4);
  const [maxDelaySec, setMaxDelaySec] = useState(7);
  const [randomize, setRandomize] = useState(true);
  
  const [manualInput, setManualInput] = useState('');
  const [csvFileName, setCsvFileName] = useState('');
  const [isListCollapsed, setIsListCollapsed] = useState(false);
  const [selectedImages, setSelectedImages] = useState([]); // array of up to 2 images

  // Legal state
  const [agreed, setAgreed] = useState(false);
  const [isAgreementChecking, setIsAgreementChecking] = useState(false);

  useEffect(() => {
    if (connectedUser) {
      setIsAgreementChecking(true);
      fetch(`${BACKEND_URL}/api/agreement/${connectedUser}`)
        .then(res => res.json())
        .then(data => {
          // handled manually by user checking
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

  const addContact = (name, rawNum, currentCount) => {
    const num = processNumber(rawNum);
    let added = false;
    if (num) {
      setContacts(prev => {
        // Enforce 500 limit
        if (prev.length >= 500) return prev;
        if (prev.find(c => c.number === num)) return prev;
        added = true;
        return [...prev, { id: Math.random().toString(), name: name || 'Unknown', number: num, selected: true }];
      });
    }
    return added;
  };

  const onDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    if (file) {
      setCsvFileName(file.name);
      Papa.parse(file, {
        complete: (results) => {
          let rows = results.data;
          
          if (rows.length > 500) {
            alert('Vercel rate limit protection: CSV truncated to 500 contacts maximum.');
            rows = rows.slice(0, 500);
          }

          rows.forEach(row => {
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
        let limitHit = false;
        
        parts.forEach(part => {
           const p = part.trim();
           if(p) {
               setContacts(prev => {
                   if (prev.length >= 500) {
                       limitHit = true;
                       return prev;
                   }
                   const num = processNumber(p);
                   if (num && !prev.find(c => c.number === num)) {
                       return [...prev, { id: Math.random().toString(), name: 'Unknown', number: num, selected: true }];
                   }
                   return prev;
               });
           }
        });
        
        if (limitHit) alert('Contact list limited to 500 contacts.');
        setManualInput('');
    }
  };

  const toggleContactSelection = (id) => {
    setContacts(prev => prev.map(c => c.id === id ? { ...c, selected: !c.selected } : c));
  };

  const removeContact = (id) => {
    setContacts(prev => prev.filter(c => c.id !== id));
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    let validFiles = [];
    let sizeError = false;

    for (let f of files) {
      if (f.size > 1024 * 1024) { // 1MB limit
        sizeError = true;
      } else {
        validFiles.push(f);
      }
    }

    if (sizeError) {
      alert("Some images were larger than 1MB and were skipped.");
    }

    setSelectedImages(prev => {
      const combined = [...prev, ...validFiles];
      if (combined.length > 2) {
        alert("Maximum 2 images allowed.");
      }
      return combined.slice(0, 2);
    });
    
    // Clear input so same file can be selected again if removed
    e.target.value = '';
  };

  const removeImage = (index) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const selectedContacts = contacts.filter(c => c.selected);
  const remainingContacts = selectedContacts.filter(c => !sentNumbers.includes(c.number));

  const isReadyToSend = remainingContacts.length > 0 && (message || selectedImages.length > 0) && agreed;

  const handleSubmit = () => {
    if (remainingContacts.length === 0) {
      alert("Please add at least one valid recipient.");
      return;
    }
    if (!message && selectedImages.length === 0) {
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
    
    onStartBroadcast(remainingContacts, message, minDelayMs, maxDelayMs, selectedImages);
  };

  const handlePause = async () => {
    try {
      await fetch(`${BACKEND_URL}/api/pause`, { 
        method: 'POST',
        headers: { 'X-Session-Id': sessionId }
      });
      setBroadcastState('paused');
    } catch (err) {
      console.error('Failed to pause', err);
    }
  };

  const handleResume = async () => {
    try {
      await fetch(`${BACKEND_URL}/api/resume`, { 
        method: 'POST',
        headers: { 'X-Session-Id': sessionId }
      });
      setBroadcastState('sending');
    } catch (err) {
      console.error('Failed to resume', err);
    }
  };

  const handleStop = async () => {
    try {
      await fetch(`${BACKEND_URL}/api/stop`, { 
        method: 'POST',
        headers: { 'X-Session-Id': sessionId }
      });
    } catch (err) {
      console.error('Failed to stop', err);
    }
  };

  const isSendingActive = broadcastState !== 'idle';

  return (
    <div className="glass-card">
      <div className="form-group">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <label style={{ margin: 0 }}>Recipients (Max 500)</label>
          {contacts.length > 0 && !isSendingActive && (
            <button 
              onClick={() => {
                setContacts([]);
                setCsvFileName('');
              }} 
              style={{ background: 'none', border: 'none', color: 'var(--error-color)', cursor: 'pointer', fontSize: '0.85rem' }}
            >
              Clear All Contacts
            </button>
          )}
        </div>
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
                        disabled={isSendingActive || contacts.length >= 500}
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
                <input {...getInputProps()} disabled={isSendingActive || contacts.length >= 500} />
                <button className="file-upload-btn" title="Upload CSV" disabled={isSendingActive || contacts.length >= 500}>
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
        
        <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <label className="file-upload-btn" style={{ margin: 0, padding: '0.5rem 1rem', width: 'fit-content' }}>
              <FileUp size={16} />
              Attach Images (Max 2, &lt;1MB each)
              <input 
                type="file" 
                accept="image/*" 
                multiple
                style={{ display: 'none' }} 
                onChange={handleImageChange}
                disabled={isSendingActive || selectedImages.length >= 2}
              />
            </label>
          </div>
          
          {selectedImages.length > 0 && (
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              {selectedImages.map((img, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--wa-dark-green)', background: 'var(--card-bg)', padding: '0.25rem 0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                  <span style={{ maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{img.name}</span>
                  <button 
                    onClick={() => removeImage(idx)} 
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--error-color)' }}
                    disabled={isSendingActive}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
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

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Selected: {selectedContacts.length} | Remaining: {remainingContacts.length}
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
      
      {/* Progress Tracker */}
      {(broadcastState !== 'idle' || (progress && progress.current > 0)) && progress && (
        <div style={{ marginTop: '2rem' }}>
          <div className="progress-header">
            <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Broadcast Progress</h3>
            <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
              {progress.current} / {progress.total}
            </span>
          </div>
          <div className="progress-bar-bg">
            <div 
              className="progress-bar-fill" 
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            ></div>
          </div>
          
          <div className="log-container">
            {logs && logs.map((log, idx) => (
              <div key={idx} className="log-entry">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {log.status === 'success' ? (
                    <CheckCircle2 size={16} className="log-success" />
                  ) : (
                    <XCircle size={16} className="log-error" />
                  )}
                  <span style={{ fontFamily: 'monospace' }}>
                    {log.name ? `${log.name} (${log.number})` : log.number}
                  </span>
                </div>
                <div style={{ fontSize: '0.85rem' }} className={log.status === 'success' ? 'log-success' : 'log-error'}>
                  {log.status === 'success' ? 'Sent' : `Failed: ${log.error || 'Unknown'}`}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
