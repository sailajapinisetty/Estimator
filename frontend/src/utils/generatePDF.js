import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const formatDate = (isoString) => {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const generateScenarioReport = async (results, scenarioName) => {
  if (!results) return;

  try {
    const element = document.createElement('div');
    element.style.padding = '40px';
    element.style.maxWidth = '800px';
    element.style.fontFamily = 'Arial, sans-serif';
    element.style.backgroundColor = 'white';

    const html = `
      <div style="margin-bottom: 40px;">
        <h1 style="margin: 0 0 8px 0; font-size: 28px; color: #0b1524;">Cost Analysis Report</h1>
        <p style="margin: 0; color: #64748b; font-size: 14px;">
          ${formatDate(new Date().toISOString())}
        </p>
      </div>

      <div style="margin-bottom: 30px; padding: 20px; background: #f6f8fb; border-radius: 8px; border-left: 4px solid #1d4ed8;">
        <h2 style="margin: 0 0 12px 0; font-size: 16px; color: #0b1524;">Scenario: ${scenarioName}</h2>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; font-size: 13px;">
          <div>
            <div style="color: #64748b; margin-bottom: 4px;">Model</div>
            <div style="font-weight: bold; font-size: 14px; color: #0b1524;">${results.model}</div>
            <div style="color: #94a3b8; font-size: 12px;">${results.provider}</div>
          </div>
          <div>
            <div style="color: #64748b; margin-bottom: 4px;">Type</div>
            <div style="font-weight: bold; font-size: 14px; color: #0b1524;">${results.modelType === 'generation' ? 'Generation' : 'Embedding'}</div>
          </div>
        </div>
      </div>

      <div style="margin-bottom: 30px;">
        <h3 style="margin: 0 0 16px 0; font-size: 14px; font-weight: 700; color: #1d4ed8; text-transform: uppercase; letter-spacing: 0.5px;">Cost Summary</h3>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <div style="padding: 16px; background: #eff6ff; border-radius: 6px; border-left: 3px solid #1d4ed8;">
            <div style="color: #1e40af; font-size: 11px; text-transform: uppercase; margin-bottom: 6px;">Cost per Request</div>
            <div style="font-size: 20px; font-weight: bold; color: #1d4ed8;">${results.billedCostFormatted}</div>
          </div>
          ${results.volume ? `
            <div style="padding: 16px; background: #eff6ff; border-radius: 6px; border-left: 3px solid #1d4ed8;">
              <div style="color: #1e40af; font-size: 11px; text-transform: uppercase; margin-bottom: 6px;">Monthly Total</div>
              <div style="font-size: 20px; font-weight: bold; color: #1d4ed8;">${results.volume.totalFormatted}</div>
            </div>
          ` : ''}
        </div>
      </div>

      ${results.savings ? `
        <div style="margin-bottom: 30px;">
          <h3 style="margin: 0 0 16px 0; font-size: 14px; font-weight: 700; color: #1d4ed8; text-transform: uppercase; letter-spacing: 0.5px;">How to Reduce Costs</h3>
          
          <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
            <thead>
              <tr style="background: #f6f8fb; border-bottom: 2px solid #cbd5e1;">
                <th style="padding: 10px; text-align: left; color: #475569; font-weight: 700;">Optimization</th>
                <th style="padding: 10px; text-align: right; color: #475569; font-weight: 700;">Monthly Cost</th>
                <th style="padding: 10px; text-align: right; color: #475569; font-weight: 700;">Savings</th>
                <th style="padding: 10px; text-align: right; color: #475569; font-weight: 700;">Total Reduction</th>
              </tr>
            </thead>
            <tbody>
              ${results.savings.steps.map((step, i) => `
                <tr style="border-bottom: 1px solid #e2e8f0; ${i === 0 ? 'background: #eff6ff;' : ''}">
                  <td style="padding: 10px; color: #0b1524; font-weight: ${i === 0 ? '700' : '600'};">${step.label}</td>
                  <td style="padding: 10px; text-align: right; color: #0b1524; font-weight: 600;">${step.cost}</td>
                  <td style="padding: 10px; text-align: right; color: #16a34a; font-weight: 600;">${step.savedFromPrevious}</td>
                  <td style="padding: 10px; text-align: right; color: #0b1524; font-weight: 700;">${step.cumulativeReduction}%</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div style="margin-top: 12px; padding: 12px; background: #ecfdf5; border-left: 3px solid #10b981; border-radius: 4px;">
            <div style="font-size: 12px; color: #047857; font-weight: 600;">Best case with all optimizations: ${results.savings.best}</div>
            <div style="font-size: 11px; color: #059669; margin-top: 4px;">${results.savings.totalReduction}% total reduction potential</div>
          </div>
        </div>
      ` : ''}

      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b;">
        <p style="margin: 0;">
          <strong>Note:</strong> Prices are provider list prices and change over time. Please verify against official pricing pages.
          Token counts for OpenAI models use cl100k_base and are exact; other providers are approximated.
        </p>
        <p style="margin: 8px 0 0 0;">Generated by AI Cost Estimator on ${formatDate(new Date().toISOString())}</p>
      </div>
    `;

    element.innerHTML = html;
    document.body.appendChild(element);

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
    });

    document.body.removeChild(element);

    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgData = canvas.toDataURL('image/png');
    const imgWidth = 210 - 20; // A4 width minus margins
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);

    const filename = `${scenarioName.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-cost-analysis.pdf`;
    pdf.save(filename);
  } catch (error) {
    console.error('PDF generation failed:', error);
    throw error;
  }
};

export const generateComparisonReport = async (scenarios) => {
  if (!scenarios || scenarios.length < 2) return;

  try {
    const element = document.createElement('div');
    element.style.padding = '40px';
    element.style.maxWidth = '900px';
    element.style.fontFamily = 'Arial, sans-serif';
    element.style.backgroundColor = 'white';

    const html = `
      <div style="margin-bottom: 40px;">
        <h1 style="margin: 0 0 8px 0; font-size: 28px; color: #0b1524;">Scenario Comparison Report</h1>
        <p style="margin: 0; color: #64748b; font-size: 14px;">
          Comparing ${scenarios.length} scenarios · ${formatDate(new Date().toISOString())}
        </p>
      </div>

      <div style="margin-bottom: 30px;">
        <h3 style="margin: 0 0 16px 0; font-size: 14px; font-weight: 700; color: #1d4ed8; text-transform: uppercase; letter-spacing: 0.5px;">Scenarios Included</h3>
        
        <div style="display: grid; grid-template-columns: repeat(${Math.min(scenarios.length, 3)}, 1fr); gap: 12px;">
          ${scenarios.map((s) => `
            <div style="padding: 16px; background: #f6f8fb; border-radius: 6px; border-left: 3px solid #1d4ed8;">
              <div style="font-weight: 700; color: #0b1524; margin-bottom: 4px;">${s.name}</div>
              <div style="font-size: 12px; color: #64748b; margin-bottom: 8px;">${s.results?.model} · ${s.results?.provider}</div>
              <div style="font-size: 11px; color: #94a3b8;">Saved ${new Date(s.timestamp).toLocaleDateString()}</div>
            </div>
          `).join('')}
        </div>
      </div>

      <div style="margin-bottom: 30px;">
        <h3 style="margin: 0 0 16px 0; font-size: 14px; font-weight: 700; color: #1d4ed8; text-transform: uppercase; letter-spacing: 0.5px;">Cost Comparison</h3>
        
        <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
          <thead>
            <tr style="background: #f6f8fb; border-bottom: 2px solid #cbd5e1;">
              <th style="padding: 12px; text-align: left; color: #475569; font-weight: 700;">Metric</th>
              ${scenarios.map((s) => `
                <th style="padding: 12px; text-align: right; color: #475569; font-weight: 700;">${s.name}</th>
              `).join('')}
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 10px; color: #475569; font-weight: 600;">Cost per request</td>
              ${scenarios.map((s) => `
                <td style="padding: 10px; text-align: right; color: #0b1524; font-weight: 700;">${s.results?.billedCostFormatted}</td>
              `).join('')}
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 10px; color: #475569; font-weight: 600;">Input tokens</td>
              ${scenarios.map((s) => `
                <td style="padding: 10px; text-align: right; color: #0b1524;">${s.results?.billedTokens.toLocaleString()}</td>
              `).join('')}
            </tr>
            ${scenarios.some((s) => s.results?.modelType === 'generation') ? `
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 10px; color: #475569; font-weight: 600;">Output tokens</td>
                ${scenarios.map((s) => `
                  <td style="padding: 10px; text-align: right; color: #0b1524;">${s.results?.outputTokens.toLocaleString() || '—'}</td>
                `).join('')}
              </tr>
            ` : ''}
            ${scenarios.some((s) => s.results?.volume) ? `
              <tr style="border-bottom: 1px solid #e2e8f0; background: #eff6ff;">
                <td style="padding: 10px; color: #1e40af; font-weight: 700;">Monthly total</td>
                ${scenarios.map((s) => `
                  <td style="padding: 10px; text-align: right; color: #1d4ed8; font-weight: 700;">${s.results?.volume?.totalFormatted || '—'}</td>
                `).join('')}
              </tr>
            ` : ''}
          </tbody>
        </table>
      </div>

      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b;">
        <p style="margin: 0;">
          <strong>Note:</strong> Prices are provider list prices and change over time. Please verify against official pricing pages.
        </p>
        <p style="margin: 8px 0 0 0;">Generated by AI Cost Estimator on ${formatDate(new Date().toISOString())}</p>
      </div>
    `;

    element.innerHTML = html;
    document.body.appendChild(element);

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
    });

    document.body.removeChild(element);

    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgData = canvas.toDataURL('image/png');
    const imgWidth = 210 - 20; // A4 width minus margins
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);

    const filename = `scenario-comparison-${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(filename);
  } catch (error) {
    console.error('PDF generation failed:', error);
    throw error;
  }
};
