import React, { useState } from 'react';
import './SaveScenarioModal.css';

function SaveScenarioModal({ isOpen, onClose, onSave, defaultName }) {
  const [name, setName] = useState(defaultName || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      alert('Please enter a scenario name');
      return;
    }
    setSaving(true);
    try {
      await onSave(name);
      setName('');
      onClose();
    } catch (err) {
      console.error('Error saving scenario:', err);
      alert('Failed to save scenario');
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <h2>Save this scenario</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </header>

        <div className="modal-body">
          <label htmlFor="scenario-name">Scenario name</label>
          <input
            id="scenario-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g., Dashboard API (Claude 3.5) or Test Gen Feature v2"
            autoFocus
          />
          <p className="modal-hint">Give this analysis a memorable name so you can find it later</p>
        </div>

        <div className="modal-footer">
          <button className="btn secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button className="btn primary" onClick={handleSave} disabled={saving || !name.trim()}>
            {saving ? 'Saving…' : 'Save scenario'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default SaveScenarioModal;
