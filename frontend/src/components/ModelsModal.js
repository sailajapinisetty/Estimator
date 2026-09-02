import React from 'react';
import './ModelsModal.css';

function ModelsModal({ isOpen, onClose, models, selectedModel, onSelect, onDelete }) {
  if (!isOpen) return null;

  const embedding = models.filter((m) => (m.type || 'embedding') === 'embedding');
  const generation = models.filter((m) => m.type === 'generation');

  const renderRow = (m) => {
    const isActive = m.key === selectedModel;
    const isGeneration = m.type === 'generation';

    return (
      <tr key={m.key} className={isActive ? 'active' : ''}>
        <td>
          <div className="m-name">
            {m.isCustom && <span className="star">★</span>}
            {m.name}
            {isActive && <span className="pill">in use</span>}
          </div>
          <div className="m-key mono">{m.key}</div>
        </td>
        <td>{m.provider}</td>
        <td className="mono">{isGeneration ? '—' : m.dimensions}</td>
        <td className="mono">{m.maxTokens ? m.maxTokens.toLocaleString() : '—'}</td>
        <td className="mono">
          ${m.pricePerMillionTokens}
          {isGeneration && m.outputPricePerMillionTokens != null && (
            <span className="out-price"> in / ${m.outputPricePerMillionTokens} out</span>
          )}
        </td>
        <td>
          <span className={`tok-badge ${m.exactTokenizer ? 'exact' : 'approx'}`}>
            {m.exactTokenizer ? 'Exact' : 'Approx'}
          </span>
        </td>
        <td className="actions">
          <button className="row-btn" onClick={() => onSelect(m.key)} disabled={isActive}>
            {isActive ? 'Selected' : 'Use'}
          </button>
          {m.isCustom ? (
            <button
              className="row-btn danger"
              onClick={() => {
                if (window.confirm(`Remove "${m.name}"? This cannot be undone.`)) onDelete(m.key);
              }}
            >
              Remove
            </button>
          ) : (
            <span className="row-locked" title="Built-in models cannot be removed">
              Built-in
            </span>
          )}
        </td>
      </tr>
    );
  };

  const table = (rows) => (
    <table className="models-table">
      <thead>
        <tr>
          <th>Model</th>
          <th>Provider</th>
          <th>Dims</th>
          <th>Context</th>
          <th>Price / 1M</th>
          <th>Tokens</th>
          <th />
        </tr>
      </thead>
      <tbody>{rows.map(renderRow)}</tbody>
    </table>
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content models-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>Model Catalogue</h2>
            <p className="modal-sub">
              {models.length} models · {models.filter((m) => m.isCustom).length} custom
            </p>
          </div>
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="models-body">
          <div className="group">
            <h3 className="group-title">
              Embedding models <span className="group-note">text in → vector out · billed on input only</span>
            </h3>
            {table(embedding)}
          </div>

          {generation.length > 0 && (
            <div className="group">
              <h3 className="group-title">
                Generation models <span className="group-note">text in → text out · billed on input and output</span>
              </h3>
              {table(generation)}
            </div>
          )}

          <p className="models-footnote">
            <strong>Tokens</strong> shows whether the token count is exact. Only models using OpenAI's cl100k_base
            encoder are exact; other providers use different tokenizers and are approximated. Prices are provider list
            prices and change over time — verify before relying on them.
          </p>
        </div>
      </div>
    </div>
  );
}

export default ModelsModal;
