import React, { useMemo } from 'react';
import './ProcessVisualization.css';

const MAX_TOKENS_SHOWN = 60;

function ProcessVisualization({ text, results, children, onSaveScenario }) {
  const tech = results ? results.technical : null;

  // Prefer real BPE tokens from the encoder; fall back to word split only if unavailable
  const shown = useMemo(() => {
    if (tech && tech.tokenization.pieces && tech.tokenization.pieces.length) {
      return tech.tokenization.pieces.map((p) => p.text);
    }
    if (!text) return [];
    return text.split(/(\s+)/).filter((t) => t.trim().length > 0).slice(0, MAX_TOKENS_SHOWN);
  }, [tech, text]);

  if (!text || !results) return null;

  const overflow = Math.max(0, results.tokenCount - shown.length);
  const vectors = tech ? tech.chunking.chunksRequired : 1;
  const isGeneration = results.modelType === 'generation';
  const charsPerToken = tech ? tech.tokenization.charsPerToken : (text.length / results.tokenCount).toFixed(2);
  const outputPremium =
    results.outputPricePerMillionTokens && results.pricePerMillionTokens
      ? (results.outputPricePerMillionTokens / results.pricePerMillionTokens).toFixed(1)
      : null;

  return (
    <section className="panel viz">
      <header className="panel-head">
        <div>
          <h2 className="panel-title">Processing Pipeline</h2>
          <p className="panel-sub">
            {isGeneration
              ? 'Raw input → tokens → response, then cost and caching below'
              : 'Text → tokens → vector → billed cost'}
          </p>
        </div>
        <span className="badge">{tech ? tech.tokenization.encoder : 'tokenizer'}</span>
        {onSaveScenario && (
          <button
            className="btn-save-scenario"
            onClick={onSaveScenario}
            title="Save this configuration and results for later comparison"
          >
            💾 Save scenario
          </button>
        )}
      </header>

      {isGeneration && (
        <div className="accuracy-notice info">
          <strong>📊 What this shows:</strong> This analysis estimates token consumption and cost for your prompt.
          <strong> Tokens</strong> = roughly 4 characters.
          <strong> System prompt</strong> is sent on every API call (large overhead).
          Compare models with different token costs to optimize your spending.
          <strong> Enable caching</strong> on repeated system prompts to save up to 90%.
        </div>
      )}

      {results.modelNote && <div className="accuracy-notice info">{results.modelNote}</div>}
      {results.tokenCountExact === false && (
        <div className="accuracy-notice">
          Token counts for {results.provider} are approximated using OpenAI's cl100k_base encoder. This provider
          uses a different tokenizer, so the real count will differ — treat this figure as indicative, not exact.
        </div>
      )}

      <div className="viz-flow">
        {/* Stage 1 */}
        <div className="stage">
          <div className="stage-head">
            <span className="stage-idx">01</span>
            <div>
              <div className="stage-name">Raw input</div>
              <div className="stage-meta">
                {text.length.toLocaleString()} characters
                {tech ? ` · ${tech.input.words} words · ${tech.input.bytesUtf8} bytes` : ''}
              </div>
            </div>
          </div>
          <div className="stage-body">
            <div className="input-wave">
              <svg viewBox="0 0 800 60" preserveAspectRatio="none" aria-hidden="true">
                <defs>
                  <linearGradient id="wg" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#2563eb" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#0d9488" stopOpacity="0.35" />
                  </linearGradient>
                </defs>
                <path
                  className="wave-path"
                  d="M0 30 Q 50 5 100 30 T 200 30 T 300 30 T 400 30 T 500 30 T 600 30 T 700 30 T 800 30"
                  fill="none"
                  stroke="url(#wg)"
                  strokeWidth="2"
                />
                <path
                  className="wave-path delay"
                  d="M0 30 Q 50 55 100 30 T 200 30 T 300 30 T 400 30 T 500 30 T 600 30 T 700 30 T 800 30"
                  fill="none"
                  stroke="url(#wg)"
                  strokeWidth="2"
                />
              </svg>
            </div>
            <p className="input-text">
              {text.substring(0, 220)}
              {text.length > 220 ? '…' : ''}
            </p>
          </div>
        </div>

        <div className="connector" aria-hidden="true" />

        {/* Stage 2 */}
        <div className="stage">
          <div className="stage-head">
            <span className="stage-idx">02</span>
            <div>
              <div className="stage-name">Tokenization</div>
              <div className="stage-meta">
                {results.tokenCount.toLocaleString()} tokens
                {tech ? ` · ${tech.tokenization.charsPerToken} chars/token · ${tech.tokenization.exact ? 'exact BPE' : 'estimated'}` : ''}
              </div>
            </div>
          </div>
          <div className="stage-body">
            <div className="token-strip">
              {shown.map((t, i) => (
                <span key={i} className="token" style={{ animationDelay: `${Math.min(i * 18, 600)}ms` }}>
                  {t.replace(/ /g, '\u00b7')}
                </span>
              ))}
              {overflow > 0 && <span className="token more">+{overflow} more</span>}
            </div>
            <div className="math-note">
              {text.length.toLocaleString()} characters → {results.tokenCount.toLocaleString()} tokens
              (about {charsPerToken} characters per token).
              {isGeneration && results.systemTokens > 0
                ? ` Your system prompt adds ${results.systemTokens.toLocaleString()} more, so ${results.billedTokens.toLocaleString()} tokens get billed.`
                : ''}
            </div>
          </div>
        </div>

        <div className="connector" aria-hidden="true" />

        {/* Stage 3 */}
        <div className="stage">
          <div className="stage-head">
            <span className="stage-idx">03</span>
            {isGeneration ? (
              <div>
                <div className="stage-name">Response generation</div>
                <div className="stage-meta">
                  {results.outputTokens.toLocaleString()} output tokens · billed at $
                  {results.outputPricePerMillionTokens}/1M
                </div>
              </div>
            ) : (
              <div>
                <div className="stage-name">Vector encoding</div>
                <div className="stage-meta">
                  {vectors.toLocaleString()} embedding{vectors === 1 ? '' : 's'} ·{' '}
                  {(results.dimensions || 0).toLocaleString()} dimensions each
                  {tech ? ` · ${tech.vector.totalStorageKb} KB` : ''}
                </div>
              </div>
            )}
          </div>
          <div className="stage-body">
            <div className="vector-bars">
              {Array.from({ length: 48 }).map((_, i) => {
                const h = 18 + Math.abs(Math.sin((i + 1) * 1.7) * 62);
                return (
                  <span
                    key={i}
                    className="vbar"
                    style={{ height: `${h}%`, animationDelay: `${i * 14}ms` }}
                  />
                );
              })}
            </div>
            <div className="vector-caption">
              {isGeneration
                ? 'Tokens generated one at a time, each billed at the output rate'
                : 'L2-normalized · cosine similarity ready'}
            </div>
            {isGeneration && (
              <div className="math-note">
                {results.outputTokens.toLocaleString()} tokens × ${results.outputPricePerMillionTokens} per
                million = {results.outputCostFormatted}. Output costs {outputPremium}× more than input, so
                shorter answers are the fastest way to save.
              </div>
            )}
          </div>
        </div>

        {children}

        {!isGeneration && (
          <>
            <div className="connector" aria-hidden="true" />

            {/* Stage 4 */}
            <div className="stage">
              <div className="stage-head">
                <span className="stage-idx">04</span>
                <div>
                  <div className="stage-name">Billing</div>
                  <div className="stage-meta">Charged on input tokens only</div>
                </div>
              </div>
              <div className="stage-body">
                <div className="equation">
                  <div className="term">
                    <span className="term-value">{results.tokenCount.toLocaleString()}</span>
                    <span className="term-label">tokens</span>
                  </div>
                  <span className="op">÷</span>
                  <div className="term">
                    <span className="term-value">1M</span>
                    <span className="term-label">unit</span>
                  </div>
                  <span className="op">×</span>
                  <div className="term">
                    <span className="term-value">${results.pricePerMillionTokens}</span>
                    <span className="term-label">rate</span>
                  </div>
                  <span className="op">=</span>
                  <div className="term outcome">
                    <span className="term-value">{results.costFormatted}</span>
                    <span className="term-label">total cost</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

export default ProcessVisualization;
