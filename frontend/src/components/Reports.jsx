import React, { useState } from 'react';
import { Download, Filter, CheckCircle, XCircle } from 'lucide-react';

const Reports = ({ logs }) => {
  const [filter, setFilter] = useState('all'); // 'all', 'success', 'failed'

  const filteredLogs = logs.filter(log => {
    if (filter === 'all') return true;
    return log.status === filter;
  });

  const successCount = logs.filter(l => l.status === 'success').length;
  const failedCount = logs.filter(l => l.status === 'failed').length;

  const handleDownload = () => {
    if (filteredLogs.length === 0) return;

    // Create CSV content
    const headers = ['Number', 'Status', 'Error Details'];
    const rows = filteredLogs.map(log => {
      const errorMsg = log.error ? `"${log.error.replace(/"/g, '""')}"` : '';
      return `${log.number},${log.status},${errorMsg}`;
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `buzzap_report_${filter}_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="glass-card" style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          📊 Broadcast Report
        </h2>
        
        <button 
          className="btn" 
          onClick={handleDownload}
          disabled={filteredLogs.length === 0}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--wa-dark-green)' }}
        >
          <Download size={16} /> Download CSV
        </button>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div style={{ background: 'var(--card-bg)', padding: '1rem', borderRadius: '8px', flex: 1, border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ fontSize: '2rem', fontWeight: 'bold' }}>{logs.length}</span>
          <span style={{ color: 'var(--text-secondary)' }}>Total Processed</span>
        </div>
        <div style={{ background: 'var(--card-bg)', padding: '1rem', borderRadius: '8px', flex: 1, border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--wa-green)' }}>{successCount}</span>
          <span style={{ color: 'var(--text-secondary)' }}>Successful</span>
        </div>
        <div style={{ background: 'var(--card-bg)', padding: '1rem', borderRadius: '8px', flex: 1, border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--error-color)' }}>{failedCount}</span>
          <span style={{ color: 'var(--text-secondary)' }}>Failed</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <button 
          onClick={() => setFilter('all')} 
          style={{ 
            padding: '0.5rem 1rem', 
            borderRadius: '20px', 
            border: 'none',
            cursor: 'pointer',
            background: filter === 'all' ? 'var(--wa-green)' : 'var(--card-bg)',
            color: filter === 'all' ? 'white' : 'var(--text-primary)',
            border: filter === 'all' ? 'none' : '1px solid var(--border-color)'
          }}
        >
          All
        </button>
        <button 
          onClick={() => setFilter('success')} 
          style={{ 
            padding: '0.5rem 1rem', 
            borderRadius: '20px', 
            cursor: 'pointer',
            background: filter === 'success' ? 'var(--wa-green)' : 'var(--card-bg)',
            color: filter === 'success' ? 'white' : 'var(--text-primary)',
            border: filter === 'success' ? 'none' : '1px solid var(--border-color)'
          }}
        >
          Success Only
        </button>
        <button 
          onClick={() => setFilter('failed')} 
          style={{ 
            padding: '0.5rem 1rem', 
            borderRadius: '20px', 
            cursor: 'pointer',
            background: filter === 'failed' ? 'var(--error-color)' : 'var(--card-bg)',
            color: filter === 'failed' ? 'white' : 'var(--text-primary)',
            border: filter === 'failed' ? 'none' : '1px solid var(--border-color)'
          }}
        >
          Failed Only
        </button>
      </div>

      <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>
        {filteredLogs.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            No logs available for the selected filter.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '1rem' }}>Number</th>
                <th style={{ padding: '1rem' }}>Status</th>
                <th style={{ padding: '1rem' }}>Details</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '0.75rem', fontFamily: 'monospace' }}>
                    {log.name ? `${log.name} (${log.number})` : log.number}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    {log.status === 'success' ? (
                      <span style={{ color: 'var(--wa-green)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <CheckCircle size={16} /> Success
                      </span>
                    ) : (
                      <span style={{ color: 'var(--error-color)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <XCircle size={16} /> Failed
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>
                    {log.error || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Reports;
