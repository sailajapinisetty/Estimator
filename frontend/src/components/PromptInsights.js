import React, { useState } from 'react';
import './PromptInsights.css';

function Row({ label, value, mono }) {
  return (
    <div className="pi-row">
      <span className="pi-row-label">{label}</span>
      <span className={`pi-row-value${mono ? ' mono' : ''}`}>{value}</span>
    </div>
  );
}

function PromptInsights({ results }) {
  const [tab, setTab] = useState(results && results.savings ? 'savings' : 'suggestions');
  const [showTechnical, setShowTechnical] = useState(false);

  if (!results || results.comparison) return null;

  const tech = results.technical;
  const suggestions = results.suggestions || [];

  return (
    <section className="panel prompt-insights">
      <header className="panel-head">
        <div>
          <h2 className="panel-title">{results.savings ? 'Cost Reduction' : 'Prompt Optimization'}</h2>
          <p className="panel-sub">
            {results.savings
              ? 'What this workload costs today, and what each change would save'
              : 'Ways to reduce the tokens this prompt consumes'}
          </p>
        </div>
        {results.savings && (
          <nav className="pi-tabs">
            <button className={tab === 'savings' ? 'active' : ''} onClick={() => setTab('savings')}>
              Reduce cost
            </button>
            <button className={tab === 'suggestions' ? 'active' : ''} onClick={() => setTab('suggestions')}>
              Prompt tips
            </button>
          </nav>
        )}
      </header>

      {tab === 'savings' && results.savings && (
        <div className="pi-body">
          <div className="savings-head">
            <div>
              <span className="savings-label">Current</span>
              <span className="savings-value">{results.savings.baseline}</span>
            </div>
            <span className="savings-arrow">→</span>
            <div>
              <span className="savings-label">Optimized</span>
              <span className="savings-value good">{results.savings.best}</span>
            </div>
            <span className="savings-badge">−{results.savings.totalReduction}%</span>
          </div>

          <ol className="savings-list">
            {results.savings.steps.map((s, i) => (
              <li key={i} className={i === 0 ? 'baseline' : ''}>
                <div className="savings-main">
                  <div className="savings-step">{s.label}</div>
                  <div className="savings-detail">{s.detail}</div>
                  {s.assumption && <div className="savings-assumption">{s.assumption}</div>}
                </div>
                <div className="savings-numbers">
                  <span className="savings-cost">{s.cost}</span>
                  {i > 0 && <span className="savings-delta">−{s.savedFromPrevious}</span>}
                </div>
              </li>
            ))}
          </ol>

          <p className="scale-note">
            Each row applies cumulatively to the row above. Percentages are planning heuristics, not measurements —
            validate output quality before adopting the model-routing step, which is the only one with a capability
            trade-off.
          </p>
        </div>
      )}

      {tab === 'suggestions' && (
        <div className="pi-body">
          {results.systemPromptAdvice && (
            <div className="advice-group">
              <h4 className="advice-heading">
                System prompt
                <span className="advice-meta">
                  {results.systemPromptAdvice.tokens.toLocaleString()} tokens, sent on every call
                  {results.systemPromptAdvice.monthlyCost
                    ? ` · ${results.systemPromptAdvice.monthlyCost}/month`
                    : ''}
                </span>
              </h4>
              <ul className="suggestion-list">
                {results.systemPromptAdvice.items.map((s, i) => (
                  <li key={i} className={`suggestion sev-${s.severity}`}>
                    <span className="sev-dot" />
                    <div className="suggestion-main">
                      <div className="suggestion-title">{s.title}</div>
                      <div className="suggestion-detail">{s.detail}</div>
                      {s.found && s.found.length > 0 && (
                        <ul className="found-list">
                          {s.found.map((f, j) => (
                            <li key={j}>{f}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <span className="suggestion-impact">{s.impact}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="advice-group">
            {results.systemPromptAdvice && (
              <h4 className="advice-heading">
                User prompt
                <span className="advice-meta">Varies per request</span>
              </h4>
            )}
            <ul className="suggestion-list">
              {suggestions.map((s, i) => (
                <li key={i} className={`suggestion sev-${s.severity}`}>
                  <span className="sev-dot" />
                  <div className="suggestion-main">
                    <div className="suggestion-title">{s.title}</div>
                    <div className="suggestion-detail">{s.detail}</div>
                  </div>
                  <span className="suggestion-impact">{s.impact}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {showTechnical && tech && (        <div className="pi-body">
          <div className="pi-grid">
            <div className="pi-card">
              <h4>Tokenization</h4>
              <Row label="Encoder" value={tech.tokenization.encoder} mono />
              <Row label="Exact count" value={tech.tokenization.exact ? 'Yes (BPE)' : 'Estimated'} />
              <Row label="Chars / token" value={tech.tokenization.charsPerToken} mono />
              <Row label="Bytes / token" value={tech.tokenization.bytesPerToken} mono />
              <Row label="Tokens / word" value={tech.tokenization.tokensPerWord} mono />
              {tech.tokenization.tokenIdSample.length > 0 && (
                <div className="token-ids">
                  <span className="pi-row-label">Token IDs (first 24)</span>
                  <div className="id-chips">
                    {tech.tokenization.tokenIdSample.map((id, i) => (
                      <code key={i}>{id}</code>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pi-card">
              <h4>Input Composition</h4>
              <Row label="Characters" value={tech.input.characters} mono />
              <Row label="UTF-8 bytes" value={tech.input.bytesUtf8} mono />
              <Row label="Words" value={tech.input.words} mono />
              <Row label="Whitespace chars" value={`${tech.input.whitespaceChars} (${tech.input.whitespaceShare}%)`} mono />
              <Row label="Punctuation" value={tech.input.punctuationChars} mono />
              <Row label="Non-ASCII" value={tech.input.nonAsciiChars} mono />
            </div>

            <div className="pi-card">
              <h4>Context Window</h4>
              <Row label="Model limit" value={`${tech.contextWindow.maxTokens} tokens`} mono />
              <Row label="Used" value={`${tech.contextWindow.used} tokens`} mono />
              <Row label="Remaining" value={`${tech.contextWindow.remaining} tokens`} mono />
              <div className="usage-bar">
                <div
                  className={`usage-fill${tech.contextWindow.exceedsWindow ? ' over' : ''}`}
                  style={{ width: `${Math.min(100, parseFloat(tech.contextWindow.utilization))}%` }}
                />
              </div>
              <div className="usage-caption">{tech.contextWindow.utilization}% of window used</div>
            </div>

            <div className="pi-card">
              <h4>Chunking Strategy</h4>
              <Row label="Chunk size" value={`${tech.chunking.chunkSize} tokens`} mono />
              <Row label="Overlap" value={`${tech.chunking.overlap} tokens`} mono />
              <Row label="Chunks required" value={tech.chunking.chunksRequired} mono />
              <Row label="API calls" value={tech.chunking.apiCalls} mono />
              <Row label="Raw tokens" value={tech.chunking.rawTokens} mono />
              <Row label="Billed tokens" value={tech.chunking.billedTokens} mono />
              <Row
                label="Overlap overhead"
                value={`+${tech.chunking.overheadTokens} (+${tech.chunking.overheadPercent}%)`}
                mono
              />
              <Row label="Strategy" value={tech.chunking.strategy} />
            </div>

            <div className="pi-card">
              <h4>Output Vector</h4>
              <Row label="Dimensions" value={tech.vector.dimensions} mono />
              <Row label="Precision" value={tech.vector.precision} mono />
              <Row label="Bytes / vector" value={`${tech.vector.bytesPerVector} B (${tech.vector.kbPerVector} KB)`} mono />
              <Row label="Normalization" value={tech.vector.normalization} />
              <Row label="Similarity metric" value={tech.vector.similarityMetric} />
              <Row label="Vector store size" value={`${tech.vector.totalStorageKb} KB`} mono />
            </div>

            <div className="pi-card pipeline-card">
              <h4>Processing Pipeline</h4>
              <ol className="pipeline-list">
                {tech.pipeline.map((p, i) => (
                  <li key={i}>
                    <span className="pipeline-stage">{p.stage}</span>
                    <span className="pipeline-detail">{p.detail}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      )}

      {!results.savings && results.projections && (
        <div className="pi-body scale-section">
          <div className="scale-grid">
            <div className="scale-card">
              <div className="scale-label">1 request</div>
              <div className="scale-value">{results.billedCostFormatted || results.costFormatted}</div>
            </div>
            <div className="scale-card">
              <div className="scale-label">1,000 requests</div>
              <div className="scale-value">{results.projections.per1kRequests}</div>
            </div>
            <div className="scale-card">
              <div className="scale-label">100,000 requests</div>
              <div className="scale-value">{results.projections.per100kRequests}</div>
            </div>
            <div className="scale-card emphasis">
              <div className="scale-label">1,000,000 requests</div>
              <div className="scale-value">{results.projections.per1mRequests}</div>
            </div>
          </div>
        </div>
      )}

      <div className="tech-toggle-row">
        <button className="tech-toggle" onClick={() => setShowTechnical((v) => !v)}>
          {showTechnical ? 'Hide technical detail' : 'Show technical detail'}
        </button>
      </div>
    </section>
  );
}

export default PromptInsights;
