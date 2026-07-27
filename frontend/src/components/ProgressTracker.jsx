import React from 'react';
import { CheckCircle, XCircle } from 'lucide-react';

const ProgressTracker = ({ progress, logs }) => {
  if (!progress) return null;

  const percentage = progress.total > 0 ? (progress.current / progress.total) * 100 : 0;

  return (
    <div className="glass-card progress-container">
      <div className="progress-header">
        <h3 style={{ margin: 0 }}>Broadcast Progress</h3>
        <span className="text-muted">{progress.current} / {progress.total}</span>
      </div>
      
      <div className="progress-bar-bg">
        <div 
          className="progress-bar-fill" 
          style={{ width: `${percentage}%` }}
        ></div>
      </div>

      <div className="log-container">
        {logs.map((log, idx) => (
          <div key={idx} className="log-entry">
            <span>
              {log.status === 'success' ? (
                <CheckCircle size={14} className="log-success" style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
              ) : (
                <XCircle size={14} className="log-error" style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
              )}
              {log.number}
            </span>
            <span className={log.status === 'success' ? 'log-success' : 'log-error'}>
              {log.status === 'success' ? 'Sent' : 'Failed'}
            </span>
          </div>
        ))}
        {logs.length === 0 && (
          <div className="text-muted" style={{ textAlign: 'center', padding: '1rem' }}>
            Sending will appear here...
          </div>
        )}
      </div>
    </div>
  );
};

export default ProgressTracker;
