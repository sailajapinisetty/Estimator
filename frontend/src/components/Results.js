import React, { useState } from 'react';
import './Results.css';
import ProcessVisualization from './ProcessVisualization';
import { generateScenarioReport } from '../utils/generatePDF';

function Results({ results, loading, text, onSaveScenario }) {
  const [showMonthly, setShowMonthly] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);

  // Debug: log what we receive
  React.useEffect(() => {
    if (results && !results.comparison) {
      console.log('Results object:', results);
      console.log('Has savings:', !!results.savings);
      if (results.savings) {
        console.log('Savings data:', results.savings);
      }
    }
  }, [results]);

  const handleExportPDF = async () => {
    if (exportingPDF) return;
    setExportingPDF(true);
    try {
      const scenarioName = `${results.model} - ${new Date().toLocaleDateString()}`;
      await generateScenarioReport(results, scenarioName);
    } catch (error) {
      console.error('PDF export failed:', error);
      alert('Failed to export PDF. Please try again.');
    } finally {
      setExportingPDF(false);
    }
  };

  // Helper function to format cost for display
  const formatDisplayCost = (costStr) => {
    if (!costStr) return '$0.00';
    // Remove $ and convert to number
    const num = parseFloat(costStr.replace('$', ''));
    // Format with appropriate precision
    if (num >= 1) return `$${num.toFixed(2)}`;
    if (num >= 0.01) return `$${num.toFixed(3)}`;
    if (num >= 0.0001) return `$${num.toFixed(6)}`;
    if (num >= 0.000001) return `$${num.toFixed(8)}`;
    return `$${num.toExponential(2)}`;
  };

  // Helper to convert per-request cost to monthly
  const getMonthlyFromPerRequest = (perRequestStr, volume) => {
    if (!perRequestStr || !volume) return perRequestStr;
    const num = parseFloat(perRequestStr.replace('$', ''));
    const monthly = num * volume;
    return formatDisplayCost(`$${monthly}`);
  };

  if (loading) {
    return (
      <section className="panel">
        <div className="loading-container">
          <div className="spinner" />
          <p>Tokenizing and pricing your prompt…</p>
        </div>
      </section>
    );
  }

  if (!results) {
    return (
      <section className="panel">
        <div className="empty-state">
          <div className="empty-mark">⌁</div>
          <h3>No analysis yet</h3>
          <p>Enter a prompt above and run an analysis to see token counts, cost and processing internals.</p>
        </div>
      </section>
    );
  }

  if (results.comparison) {
    const isGenComparison = results.comparisonType === 'generation';
    const cheapest = results.results.reduce((min, r) =>
      parseFloat(r.billedCost) < parseFloat(min.billedCost) ? r : min
    );
    const priciest = results.results.reduce((max, r) =>
      parseFloat(r.billedCost) > parseFloat(max.billedCost) ? r : max
    );
    const spread =
      parseFloat(cheapest.billedCost) > 0
        ? `${(parseFloat(priciest.billedCost) / parseFloat(cheapest.billedCost)).toFixed(1)}×`
        : '—';

    return (
      <>
        <section className="panel">
          <header className="panel-head">
            <div>
              <h2 className="panel-title">
                {isGenComparison ? 'Generation Model Comparison' : 'Embedding Model Comparison'}
              </h2>
              <p className="panel-sub">
                {isGenComparison
                  ? `Same prompt with a ${results.results[0].outputTokens}-token response, priced across providers`
                  : 'The same prompt priced across every configured embedding provider'}
              </p>
            </div>
            <span className="badge accent">{spread} cost spread</span>
          </header>

          <div className="panel-body">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Model</th>
                  {isGenComparison ? (
                    <>
                      <th className="num">In / Out $/1M</th>
                      <th className="num">Input cost</th>
                      <th className="num">Output cost</th>
                    </>
                  ) : (
                    <>
                      <th className="num">Tokens</th>
                      <th className="num">Credits</th>
                      <th className="num">Price / 1M</th>
                    </>
                  )}
                  <th className="num">Total cost</th>
                </tr>
              </thead>
              <tbody>
                {results.results.map((r, i) => (
                  <tr key={i} className={r.modelKey === cheapest.modelKey ? 'best' : ''}>
                    <td>
                      <div className="cell-model">{r.model}</div>
                      <div className="cell-provider">{r.provider}</div>
                    </td>
                    {isGenComparison ? (
                      <>
                        <td className="num mono">
                          ${r.pricePerMillionTokens} / ${r.outputPricePerMillionTokens}
                        </td>
                        <td className="num mono">{r.inputCostFormatted}</td>
                        <td className="num mono">{r.outputCostFormatted}</td>
                      </>
                    ) : (
                      <>
                        <td className="num mono">{r.tokenCount}</td>
                        <td className="num mono">{r.creditsConsumed}</td>
                        <td className="num mono">${r.pricePerMillionTokens}</td>
                      </>
                    )}
                    <td className="num mono strong">{r.billedCostFormatted}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="summary-strip">
              <div className="summary-cell">
                <span className="summary-label">Models compared</span>
                <span className="summary-value">{results.results.length}</span>
              </div>
              <div className="summary-cell">
                <span className="summary-label">Lowest cost</span>
                <span className="summary-value good">{cheapest.model}</span>
              </div>
              <div className="summary-cell">
                <span className="summary-label">Highest cost</span>
                <span className="summary-value warn">{priciest.model}</span>
              </div>
            </div>
          </div>
        </section>

        <ProcessVisualization text={text} results={results.results[0]} />
      </>
    );
  }

  const utilization = ((results.tokenCount / results.maxTokens) * 100).toFixed(2);
  const chars = results.technical ? results.technical.input.characters : (text || '').length;
  const vectors = results.technical ? results.technical.chunking.chunksRequired : 1;
  const values = vectors * (results.dimensions || 0);
  const overhead = results.technical ? results.technical.chunking.overheadTokens : 0;
  const isGeneration = results.modelType === 'generation';

  if (isGeneration) {
    return (
      <>
        <section className="panel">
          <header className="panel-head">
            <div>
              <h2 className="panel-title">Analysis Summary</h2>
              <p className="panel-sub">
                {results.model} · {results.provider} · generation model
              </p>
            </div>
            {onSaveScenario && (
              <button className="btn-save-scenario" onClick={onSaveScenario} title="Save this configuration and results for later comparison">
                💾 Save scenario
              </button>
            )}
          </header>

          {results.modelNote && <div className="accuracy-notice info">{results.modelNote}</div>}
          {results.tokenCountExact === false && (
            <div className="accuracy-notice">
              Token counts for {results.provider} are approximated using OpenAI's cl100k_base encoder. This provider
              uses a different tokenizer, so the real count will differ — treat this figure as indicative, not exact.
            </div>
          )}

          <div className="conversion-chain">
            <div className="chain-node">
              <span className="chain-value">{chars.toLocaleString()}</span>
              <span className="chain-label">Characters</span>
            </div>
            <span className="chain-arrow">→</span>
            <div className="chain-node">
              <span className="chain-value">{results.tokenCount.toLocaleString()}</span>
              <span className="chain-label">Input tokens</span>
            </div>
            {results.outputTokens && (
              <>
                <span className="chain-arrow">+</span>
                <div className="chain-node">
                  <span className="chain-value">{results.outputTokens.toLocaleString()}</span>
                  <span className="chain-label">Output tokens</span>
                </div>
                <span className="chain-arrow">=</span>
              </>
            )}
            <div className="chain-node">
              <span className="chain-value">{results.billedCostFormatted}</span>
              <span className="chain-label">Total cost</span>
            </div>
          </div>

          <div className="kpi-strip">
            <div className="kpi">
              <span className="kpi-label">Input tokens</span>
              <span className="kpi-value">{results.billedTokens.toLocaleString()}</span>
              <span className="kpi-foot">
                {results.systemTokens > 0
                  ? `${results.systemTokens} system + ${results.userTokens} user`
                  : `${results.inputCostFormatted} at $${results.pricePerMillionTokens}/1M`}
              </span>
            </div>
            {results.outputTokens && (
              <div className="kpi">
                <span className="kpi-label">Output tokens</span>
                <span className="kpi-value">{results.outputTokens.toLocaleString()}</span>
                <span className="kpi-foot">
                  {results.outputCostFormatted} at ${results.outputPricePerMillionTokens}/1M
                </span>
              </div>
            )}
            <div className="kpi accent">
              <span className="kpi-label">Cost per request</span>
              <span className="kpi-value">{results.billedCostFormatted}</span>
              <span className="kpi-foot">input + output</span>
            </div>
          </div>

          <div className="panel-body split">
            <div className="detail-block">
              <h3>Per-request breakdown</h3>
              <dl className="detail-list">
                <div>
                  <dt>System prompt</dt>
                  <dd className="mono">
                    {results.systemTokens.toLocaleString()} tok · {results.systemCostFormatted}
                  </dd>
                </div>
                <div>
                  <dt>User prompt</dt>
                  <dd className="mono">
                    {results.userTokens.toLocaleString()} tok
                  </dd>
                </div>
                <div>
                  <dt>Response</dt>
                  <dd className="mono">
                    {results.outputTokens.toLocaleString()} tok · {results.outputCostFormatted}
                  </dd>
                </div>
                <div>
                  <dt>System share of input</dt>
                  <dd className="mono">{results.systemShareOfInput}%</dd>
                </div>
                <div className="total">
                  <dt>Total per request</dt>
                  <dd className="mono">{results.billedCostFormatted}</dd>
                </div>
              </dl>
            </div>

            <div className="detail-block">
              <h3 className="block-head-row">
                {showMonthly && results.volume
                  ? `At ${results.volume.requests.toLocaleString()} requests/month`
                  : 'Model rates'}
                {results.volume && (
                  <button className="block-toggle" onClick={() => setShowMonthly((v) => !v)}>
                    {showMonthly ? 'Hide monthly' : 'Show monthly estimate'}
                  </button>
                )}
              </h3>
              {showMonthly && results.volume ? (
                <dl className="detail-list">
                  <div>
                    <dt>System prompt cost</dt>
                    <dd className="mono">{results.volume.systemPromptTotalFormatted}</dd>
                  </div>
                  <div>
                    <dt>Response cost</dt>
                    <dd className="mono">{results.volume.outputTotalFormatted}</dd>
                  </div>
                  {results.caching && results.caching.supported && (
                    <>
                      <div>
                        <dt>With prompt caching</dt>
                        <dd className="mono">{results.volume.cachedTotalFormatted}</dd>
                      </div>
                      <div>
                        <dt>Caching saves</dt>
                        <dd className="mono">
                          {results.volume.savingFormatted} ({results.caching.savingPercent}%)
                        </dd>
                      </div>
                    </>
                  )}
                  <div className="total">
                    <dt>Monthly total</dt>
                    <dd className="mono">{results.volume.totalFormatted}</dd>
                  </div>
                </dl>
              ) : (
                <dl className="detail-list">
                  <div>
                    <dt>Input price</dt>
                    <dd className="mono">${results.pricePerMillionTokens} / 1M</dd>
                  </div>
                  {results.outputPricePerMillionTokens && (
                    <div>
                      <dt>Output price</dt>
                      <dd className="mono">${results.outputPricePerMillionTokens} / 1M</dd>
                    </div>
                  )}
                  <div>
                    <dt>Context window</dt>
                    <dd className="mono">{results.maxTokens.toLocaleString()} tokens</dd>
                  </div>
                </dl>
              )}
            </div>
          </div>
        </section>

        <ProcessVisualization text={text} results={results} />

        {/* How to reduce costs - optimization roadmap */}
        {results.savings && (
          <section className="panel">
            <div className="panel-body">
              <div className="detail-block">
                <div className="savings-header">
                  <div>
                    <h3>How to reduce costs</h3>
                    <p className="block-sub">Simple steps to lower your costs</p>
                  </div>
                  <button 
                    className="toggle-view-btn"
                    onClick={() => setShowMonthly(!showMonthly)}
                  >
                    {showMonthly ? '💰 Per request' : '📅 Monthly estimate'}
                  </button>
                </div>
                
                <div className="savings-steps">
                  {results.savings.steps.map((step, i) => {
                    const monthlyVolume = results.volume?.requests || 1;
                    const displayCost = showMonthly 
                      ? getMonthlyFromPerRequest(step.costPerRequest, monthlyVolume)
                      : step.costPerRequest;
                    const displaySavings = showMonthly
                      ? getMonthlyFromPerRequest(step.savedPerRequest, monthlyVolume)
                      : step.savedPerRequest;
                    
                    return (
                      <div key={i} className={`savings-step ${i === 0 ? 'current' : ''}`}>
                        <div className="step-number">
                          {i === 0 ? 'Current' : `Step ${i}`}
                        </div>
                        <div className="step-content">
                          <div className="step-title">{step.label}</div>
                          <div className="step-desc">{step.detail}</div>
                          {step.assumption && (
                            <div className="step-note">💡 {step.assumption}</div>
                          )}
                        </div>
                        <div className="step-cost">
                          <div className="cost-value">{displayCost}</div>
                          <div className="cost-label">{showMonthly ? '/month' : '/request'}</div>
                        </div>
                        {i > 0 && (
                          <div className="step-savings">
                            <div className="savings-value">{displaySavings}</div>
                            <div className="savings-label">save</div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="savings-summary">
                  {showMonthly ? (
                    <>
                      <strong>Best case:</strong> {getMonthlyFromPerRequest(results.savings.bestPerRequest, results.volume?.requests)} /month
                      <br />
                    </>
                  ) : (
                    <>
                      <strong>Best case:</strong> {results.savings.bestPerRequest} /request
                      <br />
                    </>
                  )}
                  <strong className="reduction">Save {results.savings.totalReduction}% from current</strong>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Technical Details */}
        <section className="panel">
          <div className="panel-body">
            <div className="detail-block">
              <h3>What this means</h3>
              <p className="block-sub">How your prompt is being processed</p>
              
              <div className="tech-grid">
                <div className="tech-item">
                  <div className="tech-icon">🔤</div>
                  <div className="tech-info">
                    <div className="tech-label">Characters → Tokens</div>
                    <div className="tech-value mono">{(results.tokenCount / chars).toFixed(2)} avg</div>
                    <div className="tech-hint">Each character uses about this many tokens</div>
                  </div>
                </div>

                <div className="tech-item">
                  <div className="tech-icon">📦</div>
                  <div className="tech-info">
                    <div className="tech-label">Context Used</div>
                    <div className="tech-value mono">{utilization}%</div>
                    <div className="tech-hint">How much of the model's memory you're using (max: 100%)</div>
                  </div>
                </div>

                <div className="tech-item">
                  <div className="tech-icon">⚡</div>
                  <div className="tech-info">
                    <div className="tech-label">Model Type</div>
                    <div className="tech-value mono">{results.modelType}</div>
                    <div className="tech-hint">Whether this model generates text or just processes input</div>
                  </div>
                </div>

                <div className="tech-item">
                  <div className="tech-icon">✓</div>
                  <div className="tech-info">
                    <div className="tech-label">Token Counting</div>
                    <div className="tech-value mono">{results.tokenCountExact ? 'Exact' : 'Estimated'}</div>
                    <div className="tech-hint">{results.tokenCountExact ? 'Perfect accuracy' : 'Approximate, may vary slightly'}</div>
                  </div>
                </div>

                {results.caching?.supported && (
                  <div className="tech-item">
                    <div className="tech-icon">💾</div>
                    <div className="tech-info">
                      <div className="tech-label">Prompt Caching</div>
                      <div className="tech-value mono">Available</div>
                      <div className="tech-hint">Reuse this prompt cheaply if you call it multiple times</div>
                    </div>
                  </div>
                )}

                <div className="tech-item">
                  <div className="tech-icon">🔚</div>
                  <div className="tech-info">
                    <div className="tech-label">Max Response</div>
                    <div className="tech-value mono">{results.maxTokens.toLocaleString()}</div>
                    <div className="tech-hint">Maximum tokens the model will generate</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Tips */}
        <section className="panel">
          <div className="panel-body">
            <div className="detail-block">
              <h3>Optimization tips</h3>
              <ul className="tips-list">
                <li>
                  <strong>Reduce output tokens:</strong> Shorter responses cost less. Use length constraints in your
                  prompt: "Keep the response under 100 tokens" or "Be concise."
                </li>
                <li>
                  <strong>Use system prompts strategically:</strong> System prompts count toward token usage but
                  provide important context. Keep them focused on essential instructions.
                </li>
                <li>
                  <strong>Enable prompt caching:</strong> If your model supports it, prompt caching reduces costs for
                  repeated system prompts by up to 90%.
                </li>
                <li>
                  <strong>Reuse models within a batch:</strong> Using the same model repeatedly within short timeframes
                  can benefit from batching or cached tokens.
                </li>
                <li>
                  <strong>Monitor context window usage:</strong> You're using {utilization}% of the context window.
                  Consider using a smaller context window model if you have capacity.
                </li>
                <li>
                  <strong>Batch requests:</strong> If applicable, batch multiple requests to reduce overhead and
                  potentially earn better rates.
                </li>
              </ul>
            </div>
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <section className="panel">
        <header className="panel-head">
          <div>
            <h2 className="panel-title">Analysis Summary</h2>
            <p className="panel-sub">
              {results.model} · {results.provider}
            </p>
          </div>
          <div className="panel-head-actions">
            {results.isCustom && <span className="badge accent">Custom model</span>}
            {onSaveScenario && (
              <button className="btn-save-scenario" onClick={onSaveScenario} title="Save this configuration and results for later comparison">
                💾 Save scenario
              </button>
            )}
            <button className="btn-export-pdf" onClick={handleExportPDF} disabled={exportingPDF} title="Export this analysis as a PDF report">
              {exportingPDF ? '⏳ Generating...' : '📄 Export PDF'}
            </button>
          </div>
        </header>

        {results.modelNote && <div className="accuracy-notice info">{results.modelNote}</div>}

        {results.tokenCountExact === false && (
          <div className="accuracy-notice">
            Token counts for {results.provider} are approximated using OpenAI's cl100k_base encoder. This provider uses
            a different tokenizer, so the real count will differ — treat this figure as indicative, not exact.
          </div>
        )}

        <div className="conversion-chain">
          <div className="chain-node">
            <span className="chain-value">{chars.toLocaleString()}</span>
            <span className="chain-label">Characters</span>
          </div>
          <span className="chain-arrow">→</span>
          <div className="chain-node">
            <span className="chain-value">{results.tokenCount.toLocaleString()}</span>
            <span className="chain-label">Tokens</span>
          </div>
          <span className="chain-arrow">→</span>
          <div className="chain-node">
            <span className="chain-value">{vectors.toLocaleString()}</span>
            <span className="chain-label">Embedding{vectors === 1 ? '' : 's'}</span>
          </div>
          <span className="chain-arrow">→</span>
          <div className="chain-node">
            <span className="chain-value">{values.toLocaleString()}</span>
            <span className="chain-label">Vector values</span>
          </div>
        </div>

        <div className="kpi-strip">
          <div className="kpi">
            <span className="kpi-label">Characters</span>
            <span className="kpi-value">{chars.toLocaleString()}</span>
            <span className="kpi-foot">
              {results.technical ? `${results.technical.input.words} words` : 'raw input length'}
            </span>
          </div>
          <div className="kpi">
            <span className="kpi-label">Tokens</span>
            <span className="kpi-value">{results.tokenCount.toLocaleString()}</span>
            <span className="kpi-foot">
              {overhead > 0
                ? `${results.billedTokens.toLocaleString()} billed after overlap`
                : `${results.technical ? results.technical.tokenization.charsPerToken + ' chars each · ' : ''}${utilization}% of window`}
            </span>
          </div>
          <div className="kpi">
            <span className="kpi-label">Embeddings</span>
            <span className="kpi-value">{vectors.toLocaleString()}</span>
            {results.dimensions && (
              <span className="kpi-foot">{results.dimensions.toLocaleString()} dimensions each</span>
            )}
          </div>
          <div className="kpi">
            <span className="kpi-label">Credits</span>
            <span className="kpi-value">{results.creditsConsumed}</span>
            <span className="kpi-foot">
              {overhead > 0 ? `${results.rawCredits} + ${results.overlapCredits} overlap` : '1 credit = $0.0001'}
            </span>
          </div>
          <div className="kpi accent">
            <span className="kpi-label">Estimated cost</span>
            <span className="kpi-value">{results.billedCostFormatted || results.costFormatted}</span>
            <span className="kpi-foot">
              {overhead > 0 ? `includes +${results.technical.chunking.overheadPercent}% overlap` : 'per single request'}
            </span>
          </div>
        </div>

        <div className="panel-body split">
          <div className="detail-block">
            <h3>Model configuration</h3>
            <dl className="detail-list">
              <div>
                <dt>Model</dt>
                <dd>{results.model}</dd>
              </div>
              <div>
                <dt>Provider</dt>
                <dd>{results.provider}</dd>
              </div>
              {results.dimensions && (
                <div>
                  <dt>Dimensions</dt>
                  <dd className="mono">{results.dimensions}</dd>
                </div>
              )}
              <div>
                <dt>Context window</dt>
                <dd className="mono">{results.maxTokens.toLocaleString()} tokens</dd>
              </div>
              <div>
                <dt>List price</dt>
                <dd className="mono">${results.pricePerMillionTokens} / 1M tokens</dd>
              </div>
            </dl>
          </div>

          <div className="detail-block">
            <h3>Cost derivation</h3>
            <dl className="detail-list">
              <div>
                <dt>Raw tokens</dt>
                <dd className="mono">{results.tokenCount.toLocaleString()}</dd>
              </div>
              <div>
                <dt>Chunk overlap re-sends</dt>
                <dd className="mono">{overhead > 0 ? `+${overhead.toLocaleString()}` : '0'}</dd>
              </div>
              <div>
                <dt>Billed tokens</dt>
                <dd className="mono">{(results.billedTokens || results.tokenCount).toLocaleString()}</dd>
              </div>
              <div>
                <dt>Rate</dt>
                <dd className="mono">${results.pricePerMillionTokens} / 1,000,000</dd>
              </div>
              <div>
                <dt>Formula</dt>
                <dd className="mono">
                  {(results.billedTokens || results.tokenCount).toLocaleString()} ÷ 1M × $
                  {results.pricePerMillionTokens}
                </dd>
              </div>
              <div>
                <dt>Credits consumed</dt>
                <dd className="mono">{results.creditsConsumed}</dd>
              </div>
              <div className="total">
                <dt>Total cost</dt>
                <dd className="mono">{results.billedCostFormatted || results.costFormatted}</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <ProcessVisualization text={text} results={results} />
    </>
  );
}

export default Results;
