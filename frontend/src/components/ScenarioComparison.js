import React, { useState } from 'react';
import './ScenarioComparison.css';
import { generateComparisonReport } from '../utils/generatePDF';

function ScenarioComparison({ scenarios, onClose }) {
  const [exportingPDF, setExportingPDF] = useState(false);

  const handleExportComparison = async () => {
    if (exportingPDF) return;
    setExportingPDF(true);
    try {
      await generateComparisonReport(scenarios);
    } catch (error) {
      console.error('Comparison export failed:', error);
      alert('Failed to export comparison. Please try again.');
    } finally {
      setExportingPDF(false);
    }
  };

  if (!scenarios || scenarios.length < 2) {
    return null;
  }

  const formatDate = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <section className="panel comparison-panel">
      <header className="panel-head">
        <div>
          <h2 className="panel-title">Scenario Comparison</h2>
          <p className="panel-sub">Side-by-side analysis of {scenarios.length} saved scenarios</p>
        </div>
        <div className="comparison-head-actions">
          <button className="btn-export-pdf" onClick={handleExportComparison} disabled={exportingPDF} title="Export this comparison as a PDF">
            {exportingPDF ? '⏳ Generating...' : '📄 Export PDF'}
          </button>
          <button className="close-comparison" onClick={onClose}>Close</button>
        </div>
      </header>

      <div className="comparison-table-wrapper">
        <table className="comparison-table">
          <thead>
            <tr>
              <th className="label-col">Metric</th>
              {scenarios.map((s) => (
                <th key={s.id} className="scenario-col">
                  <div className="scenario-header">
                    <div className="scenario-header-name">{s.name}</div>
                    <div className="scenario-header-date">{formatDate(s.timestamp)}</div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Model */}
            <tr>
              <td className="label-cell">Model</td>
              {scenarios.map((s) => (
                <td key={s.id} className="value-cell">
                  <div className="value-main">{s.results?.model}</div>
                  <div className="value-sub">{s.results?.provider}</div>
                </td>
              ))}
            </tr>

            {/* Input tokens */}
            <tr>
              <td className="label-cell">Input tokens</td>
              {scenarios.map((s) => (
                <td key={s.id} className="value-cell mono">
                  {s.results?.billedTokens.toLocaleString()}
                </td>
              ))}
            </tr>

            {/* Output tokens */}
            <tr>
              <td className="label-cell">Output tokens</td>
              {scenarios.map((s) => (
                <td key={s.id} className="value-cell mono">
                  {s.results?.outputTokens.toLocaleString()}
                </td>
              ))}
            </tr>

            {/* Cost per request */}
            <tr className="highlight">
              <td className="label-cell">Cost per request</td>
              {scenarios.map((s) => (
                <td key={s.id} className="value-cell mono emphasis">
                  {s.results?.billedCostFormatted} ({s.results?.creditsConsumed} credits)
                </td>
              ))}
            </tr>

            {/* Monthly volume */}
            {scenarios.some((s) => s.results?.volume) && (
              <tr>
                <td className="label-cell">Monthly requests</td>
                {scenarios.map((s) => (
                  <td key={s.id} className="value-cell mono">
                    {s.results?.volume?.requests.toLocaleString() || '—'}
                  </td>
                ))}
              </tr>
            )}

            {/* Monthly total */}
            {scenarios.some((s) => s.results?.volume) && (
              <tr className="highlight">
                <td className="label-cell">Monthly total</td>
                {scenarios.map((s) => (
                  <td key={s.id} className="value-cell mono emphasis">
                    {s.results?.volume?.totalFormatted || '—'}
                  </td>
                ))}
              </tr>
            )}

            {/* System tokens */}
            {scenarios.some((s) => s.results?.systemTokens > 0) && (
              <tr>
                <td className="label-cell">System prompt tokens</td>
                {scenarios.map((s) => (
                  <td key={s.id} className="value-cell mono">
                    {s.results?.systemTokens > 0 ? s.results.systemTokens.toLocaleString() : '—'}
                  </td>
                ))}
              </tr>
            )}

            {/* Savings (if available) */}
            {scenarios.some((s) => s.results?.savings) && (
              <tr className="section-spacer">
                <td className="label-cell section-label">Optimization potential</td>
                {scenarios.map((s) => (
                  <td key={s.id} className="value-cell" />
                ))}
              </tr>
            )}

            {scenarios.some((s) => s.results?.savings) && (
              <tr>
                <td className="label-cell">Current baseline</td>
                {scenarios.map((s) => (
                  <td key={s.id} className="value-cell mono">
                    {s.results?.savings?.baseline || '—'}
                  </td>
                ))}
              </tr>
            )}

            {scenarios.some((s) => s.results?.savings) && (
              <tr>
                <td className="label-cell">Best-case with optimizations</td>
                {scenarios.map((s) => (
                  <td key={s.id} className="value-cell mono good">
                    {s.results?.savings?.best || '—'}
                  </td>
                ))}
              </tr>
            )}

            {scenarios.some((s) => s.results?.savings) && (
              <tr className="highlight">
                <td className="label-cell">Total reduction potential</td>
                {scenarios.map((s) => (
                  <td key={s.id} className="value-cell mono emphasis">
                    {s.results?.savings?.totalReduction || '—'}%
                  </td>
                ))}
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="comparison-insights">
        <h3>Key differences</h3>
        <ul className="insights-list">
          {scenarios.length === 2 ? (
            <>
              {scenarios[0].results?.billedCost !== scenarios[1].results?.billedCost && (
                <li>
                  Cost per request differs by{' '}
                  <strong>
                    {(
                      ((Math.abs(
                        scenarios[0].results?.billedCost - scenarios[1].results?.billedCost
                      ) / scenarios[0].results?.billedCost) *
                        100) ||
                      0
                    ).toFixed(0)
                  }%
                  </strong>
                  {scenarios[1].results?.billedCost < scenarios[0].results?.billedCost
                    ? ` — ${scenarios[1].name} is cheaper`
                    : ` — ${scenarios[0].name} is cheaper`}
                </li>
              )}
              {scenarios[0].results?.outputTokens !== scenarios[1].results?.outputTokens && (
                <li>
                  Response lengths differ:{' '}
                  <strong>{scenarios[0].results?.outputTokens}</strong> vs{' '}
                  <strong>{scenarios[1].results?.outputTokens}</strong> tokens
                </li>
              )}
              {scenarios[0].results?.model !== scenarios[1].results?.model && (
                <li>
                  Different models: <strong>{scenarios[0].results?.model}</strong> vs{' '}
                  <strong>{scenarios[1].results?.model}</strong>
                </li>
              )}
            </>
          ) : (
            <li>Comparing {scenarios.length} scenarios across key metrics</li>
          )}
        </ul>
      </div>
    </section>
  );
}

export default ScenarioComparison;
