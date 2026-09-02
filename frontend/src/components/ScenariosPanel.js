import React, { useState } from 'react';
import './ScenariosPanel.css';

function ScenariosPanel({ scenarios, onLoadScenario, onDeleteScenario, onCompareScenarios }) {
  const [selectedIds, setSelectedIds] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((s) => s !== id);
      }
      if (prev.length < 3) {
        return [...prev, id];
      }
      return prev;
    });
  };

  const handleCompare = () => {
    if (selectedIds.length >= 2) {
      const selectedScenarios = scenarios.filter((s) => selectedIds.includes(s.id));
      onCompareScenarios(selectedScenarios);
      setSelectedIds([]);
    }
  };

  const formatDate = (isoString) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (!scenarios || scenarios.length === 0) {
    return (
      <section className="panel scenarios-panel">
        <header className="panel-head">
          <div>
            <h2 className="panel-title">Saved Scenarios</h2>
            <p className="panel-sub">No scenarios saved yet. Run an analysis and click "Save scenario" to store it.</p>
          </div>
        </header>
        <div className="empty-scenarios">
          <div className="empty-icon">💾</div>
          <p>Your saved scenarios will appear here</p>
        </div>
      </section>
    );
  }

  return (
    <section className="panel scenarios-panel">
      <header className="panel-head">
        <div>
          <h2 className="panel-title">Saved Scenarios ({scenarios.length})</h2>
          <p className="panel-sub">
            {selectedIds.length === 0
              ? 'Select 2-3 to compare side-by-side'
              : `${selectedIds.length} selected — click Compare to see differences`}
          </p>
        </div>
        {selectedIds.length >= 2 && (
          <button className="btn-primary" onClick={handleCompare}>
            Compare {selectedIds.length}
          </button>
        )}
      </header>

      <div className="scenarios-list">
        {scenarios.map((scenario) => (
          <div
            key={scenario.id}
            className={`scenario-card ${selectedIds.includes(scenario.id) ? 'selected' : ''}`}
            onClick={() => toggleSelect(scenario.id)}
          >
            <div className="scenario-checkbox">
              <input
                type="checkbox"
                checked={selectedIds.includes(scenario.id)}
                onChange={() => toggleSelect(scenario.id)}
                onClick={(e) => e.stopPropagation()}
              />
            </div>

            <div className="scenario-info">
              <div className="scenario-name">
                {editingId === scenario.id ? (
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={() => {
                      if (editName.trim() && editName !== scenario.name) {
                        // onUpdateScenario would go here
                      }
                      setEditingId(null);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                  />
                ) : (
                  <span>{scenario.name}</span>
                )}
              </div>
              <div className="scenario-meta">
                <span className="scenario-model">{scenario.results?.model}</span>
                <span className="scenario-sep">·</span>
                <span className="scenario-cost">{scenario.results?.billedCostFormatted} per request</span>
                {scenario.results?.volume && (
                  <>
                    <span className="scenario-sep">·</span>
                    <span className="scenario-monthly">
                      ${scenario.results.volume.totalFormatted.replace('$', '')}/month
                    </span>
                  </>
                )}
                <span className="scenario-sep">·</span>
                <span className="scenario-date">{formatDate(scenario.timestamp)}</span>
              </div>
            </div>

            <div className="scenario-actions" onClick={(e) => e.stopPropagation()}>
              <button
                className="scenario-action"
                title="Load this scenario"
                onClick={() => onLoadScenario(scenario)}
              >
                ↻ Load
              </button>
              <button
                className="scenario-action"
                title="Delete this scenario"
                onClick={() => {
                  if (window.confirm(`Delete "${scenario.name}"?`)) {
                    onDeleteScenario(scenario.id);
                  }
                }}
              >
                🗑 Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default ScenariosPanel;
