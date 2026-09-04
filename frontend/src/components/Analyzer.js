import React, { useState } from 'react';
import './Analyzer.css';
import AddModelModal from './AddModelModal';
import EditPriceModal from './EditPriceModal';
import ModelsModal from './ModelsModal';

function Analyzer({
  text,
  setText,
  selectedModel,
  setSelectedModel,
  models,
  loading,
  modelsLoading,
  onAnalyze,
  onCompare,
  onAddCustomModel,
  onDeleteCustomModel,
  onLoadSample,
  chunkSize,
  setChunkSize,
  overlap,
  setOverlap,
  outputTokens,
  setOutputTokens,
  systemPrompt,
  setSystemPrompt,
  monthlyRequests,
  setMonthlyRequests,
  error,
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [addingModel, setAddingModel] = useState(false);
  const [editPriceOpen, setEditPriceOpen] = useState(false);
  const [catalogueOpen, setCatalogueOpen] = useState(false);
  const [showVolume, setShowVolume] = useState(false);
  const [showSystem, setShowSystem] = useState(false);

  const model = models.find((m) => m.key === selectedModel);
  const overheadPct = ((overlap / Math.max(1, chunkSize - overlap)) * 100).toFixed(1);
  const isGeneration = model && model.type === 'generation';

  const handleAddModel = async (formData) => {
    setAddingModel(true);
    try {
      await onAddCustomModel(formData);
      setIsModalOpen(false);
    } catch (err) {
      console.error('Error adding model:', err);
    } finally {
      setAddingModel(false);
    }
  };

  return (
    <section className="panel analyzer">
      <header className="panel-head">
        <div>
          <h2 className="panel-title">Input &amp; Configuration</h2>
          <p className="panel-sub">Select a provider model and paste the prompt you want to price</p>
        </div>
        {model && (
          <div className="model-badges">
            {model.dimensions && <span className="badge">{model.dimensions}d</span>}
            <span className="badge">{model.maxTokens.toLocaleString()} ctx</span>
            <span className="badge accent">
              ${model.pricePerMillionTokens}
              {isGeneration ? ` / $${model.outputPricePerMillionTokens}` : ''}/1M
            </span>
            <button className="icon-btn" onClick={() => setCatalogueOpen(true)} title="View all models">
              View models
            </button>
            <button className="icon-btn" onClick={() => setEditPriceOpen(true)} title="Edit model price">
              Edit price
            </button>
            {model.isCustom && (
              <button
                className="icon-btn danger"
                onClick={() => {
                  if (window.confirm(`Remove "${model.name}"? This cannot be undone.`)) {
                    onDeleteCustomModel(model.key);
                  }
                }}
                title="Remove this custom model"
              >
                Remove
              </button>
            )}
          </div>
        )}
      </header>

      <div className="analyzer-body">
        <div className="field">
            <label htmlFor="model-select">{isGeneration ? 'Generation model' : 'Embedding model'}</label>
          <div className="model-select-wrapper">
            <select
              id="model-select"
              value={selectedModel}
              onChange={(e) => {
                if (e.target.value === 'ADD_MODEL') {
                  setIsModalOpen(true);
                } else {
                  setSelectedModel(e.target.value);
                }
              }}
              disabled={modelsLoading}
              className="model-select"
            >
              {modelsLoading ? (
                <option>Loading models…</option>
              ) : models.length > 0 ? (
                <>
                  {models.map((m) => (
                    <option key={m.key} value={m.key}>
                      {m.isCustom ? '★ ' : ''}{m.name} — {m.provider}
                    </option>
                  ))}
                  <option value="ADD_MODEL" disabled={loading}>
                    + Add custom model…
                  </option>
                </>
              ) : (
                <option>No models available</option>
              )}
            </select>
            <button
              className="add-model-btn"
              onClick={() => setIsModalOpen(true)}
              disabled={loading || modelsLoading}
              title="Add custom embedding model"
            >
              + Model
            </button>
          </div>
          {model && (
            <div className="field-hint">
              {model.provider} ·{' '}
              {isGeneration
                ? `generation model · $${model.pricePerMillionTokens} in / $${model.outputPricePerMillionTokens} out per 1M`
                : `${model.dimensions}-dimension vectors`}{' '}
              · {model.maxTokens.toLocaleString()} token context window
            </div>
          )}
        </div>

        {isGeneration && (
          <div className="field">
            {showSystem || systemPrompt ? (
              <>
                <div className="field-label-row">
                  <label htmlFor="system-input">System prompt</label>
                  <div className="label-actions">
                    <span className="char-count">sent on every request</span>
                    <button
                      className="icon-btn"
                      onClick={() => {
                        setSystemPrompt('');
                        setShowSystem(false);
                      }}
                      disabled={loading}
                      title="Remove the system prompt from this estimate"
                    >
                      ✕
                    </button>
                  </div>
                </div>
                <textarea
                  id="system-input"
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  placeholder="Paste your system prompt — the fixed instructions sent with every call…"
                  className="text-input system-input"
                  rows="4"
                  disabled={loading}
                />
              </>
            ) : (
              <button
                className="toggle-volume"
                onClick={() => setShowSystem(true)}
                disabled={loading}
                title="Include a system prompt in this estimate"
              >
                ▶ Add system prompt (optional — billed on every request)
              </button>
            )}
          </div>
        )}

        <div className="field">
          <div className="field-label-row">
            <label htmlFor="text-input">{isGeneration ? 'User prompt' : 'Prompt / text'}</label>
            <span className="char-count">{text.length.toLocaleString()} characters</span>
          </div>          <textarea
            id="text-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={
              isGeneration
                ? 'Paste the feature or request you send to the model…'
                : 'Paste the prompt, document chunk or query you want to embed…'
            }
            className="text-input"
            rows="8"
            disabled={loading}
          />
          <button className="link-btn" onClick={onLoadSample} disabled={loading}>
            {isGeneration ? 'Load sample input' : 'Load sample document (long enough to trigger chunking)'}
          </button>
        </div>

        <div className="chunking-controls">
          <div className="chunk-head">
            <span className="chunk-title">{isGeneration ? 'Expected response' : 'Chunking strategy'}</span>
            <span className="chunk-note">
              {isGeneration
                ? 'Output tokens are billed separately, usually at a higher rate'
                : 'Only applies when the text exceeds one chunk'}
            </span>
          </div>

          {isGeneration ? (
            <>
              <div className="chunk-sliders">
                <div className="slider-field">
                  <div className="slider-label">
                    <span>Response length</span>
                    <span className="slider-value">{outputTokens} tokens</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="4000"
                    step="50"
                    value={outputTokens}
                    onChange={(e) => setOutputTokens(Number(e.target.value))}
                    disabled={loading}
                  />
                </div>
                {showVolume && (
                  <div className="slider-field">
                    <div className="slider-label">
                      <span>Requests per month</span>
                      <span className="slider-value">{monthlyRequests.toLocaleString()}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="200000"
                      step="1000"
                      value={monthlyRequests}
                      onChange={(e) => setMonthlyRequests(Number(e.target.value))}
                      disabled={loading}
                    />
                  </div>
                )}
                <button
                  className="toggle-volume"
                  onClick={() => setShowVolume(!showVolume)}
                  title={showVolume ? 'Hide monthly volume' : 'Show monthly volume estimation'}
                >
                  {showVolume ? '▼ Hide monthly volume' : '▶ Show monthly volume'}
                </button>
              </div>
              <div className="chunk-readout">
                <span>
                  Output is billed at{' '}
                  <strong>
                    {(model.outputPricePerMillionTokens / model.pricePerMillionTokens).toFixed(1)}×
                  </strong>{' '}
                  the input rate — adjust either slider above to see impact
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="chunk-sliders">
            <div className="slider-field">
              <div className="slider-label">
                <span>Chunk size</span>
                <span className="slider-value">{chunkSize} tokens</span>
              </div>
              <input
                type="range"
                min="128"
                max="2048"
                step="64"
                value={chunkSize}
                onChange={(e) => setChunkSize(Number(e.target.value))}
                disabled={loading}
              />
            </div>
            <div className="slider-field">
              <div className="slider-label">
                <span>Overlap</span>
                <span className="slider-value">{overlap} tokens</span>
              </div>
              <input
                type="range"
                min="0"
                max="200"
                step="5"
                value={overlap}
                onChange={(e) => setOverlap(Number(e.target.value))}
                disabled={loading}
              />
            </div>
          </div>
          <div className="chunk-readout">
            Overlap overhead ≈ <strong>{overheadPct}%</strong> of billed tokens
          </div>
            </>
          )}
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="button-group">
          <button
            onClick={onAnalyze}
            disabled={loading || modelsLoading || !text.trim()}
            className="btn btn-primary"
          >
            {loading ? 'Analyzing…' : 'Analyze prompt'}
          </button>
          <button
            onClick={onCompare}
            disabled={loading || modelsLoading || !text.trim() || models.length === 0}
            className="btn btn-ghost"
          >
            {loading ? 'Comparing…' : `Compare ${isGeneration ? 'generation' : 'embedding'} models`}
          </button>
        </div>
      </div>

      <AddModelModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAddModel={handleAddModel}
        loading={addingModel}
      />

      <ModelsModal
        isOpen={catalogueOpen}
        onClose={() => setCatalogueOpen(false)}
        models={models}
        selectedModel={selectedModel}
        onSelect={(key) => {
          setSelectedModel(key);
          setCatalogueOpen(false);
        }}
        onDelete={onDeleteCustomModel}
      />

      {model && (
        <EditPriceModal
          isOpen={editPriceOpen}
          onClose={() => setEditPriceOpen(false)}
          model={model}
          onSuccess={onAddCustomModel}
        />
      )}
    </section>
  );
}

export default Analyzer;
