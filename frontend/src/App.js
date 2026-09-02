import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import Analyzer from './components/Analyzer';
import Results from './components/Results';
import SaveScenarioModal from './components/SaveScenarioModal';
import ScenariosPanel from './components/ScenariosPanel';
import ScenarioComparison from './components/ScenarioComparison';
import { useScenarios } from './hooks/useScenarios';

function App() {
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('claude-sonnet-4');
  const [text, setText] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [modelsLoading, setModelsLoading] = useState(true);
  const [chunkSize, setChunkSize] = useState(512);
  const [overlap, setOverlap] = useState(50);
  const [outputTokens, setOutputTokens] = useState(500);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [monthlyRequests, setMonthlyRequests] = useState(10000);
  
  // Scenario management
  const { scenarios, saveScenario, deleteScenario, getScenario, loaded: scenariosLoaded } = useScenarios();
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [comparisonScenarios, setComparisonScenarios] = useState(null);

  const SAMPLE_FEATURE = `Feature: Account login

Users sign in with email and password. A "remember me" checkbox keeps the session alive for 30 days. After 5 consecutive failed attempts the account locks for 15 minutes and an email notification is sent. Password reset is available from the login screen. SSO users are redirected to the identity provider and never see the password field.

Generate test cases and executable test scripts covering positive paths, negative paths, boundary conditions around the lockout threshold, and the SSO redirect branch.`;

  const SAMPLE_DOC = `Quarterly Business Review — Revenue Performance and Outlook

Revenue for the quarter reached $48.2 million, representing year-over-year growth of 23 percent and exceeding the guidance range we issued last quarter. Growth was broad based across all three business units, with the enterprise segment contributing the largest absolute increase at $14.1 million.

The enterprise segment continues to be our strongest performer. Net revenue retention held at 118 percent, driven primarily by seat expansion within existing accounts rather than price increases. Average contract value rose to $186,000 from $171,000 in the prior period. We closed fourteen deals above $500,000, compared with nine in the same quarter last year.

The mid-market segment grew 19 percent but showed signs of lengthening sales cycles. Median time from qualified opportunity to closed won extended from 47 days to 61 days. Sales leadership attributes this to increased procurement scrutiny and a higher incidence of multi-vendor evaluations. We are adjusting pipeline coverage targets accordingly.

Gross margin improved 240 basis points to 74.3 percent. The improvement came from three sources: renegotiated cloud infrastructure commitments, a shift in customer mix toward higher margin products, and reduced support costs per account following the self-service documentation initiative.

Operating expenses grew 16 percent, below revenue growth, producing operating leverage for the fourth consecutive quarter. Sales and marketing spend as a percentage of revenue declined from 41 percent to 38 percent. Research and development spend increased in absolute terms to $9.4 million as we expanded the platform engineering team.

Looking ahead, we see three principal risks. First, foreign exchange exposure has increased as international revenue now represents 34 percent of the total. Second, two enterprise renewals representing a combined $3.2 million in annual recurring revenue are scheduled for the coming quarter and both accounts have undergone leadership changes. Third, competitive pricing pressure in the mid-market has intensified.

Against these risks we see meaningful opportunity. The new platform tier launched in beta with 47 design partners and early usage metrics exceed our modeling. Partner-sourced pipeline has grown 61 percent and now represents a credible second channel. We are maintaining full year guidance and will revisit at the midpoint.

Segment Detail — Enterprise

Enterprise bookings totaled $26.4 million, up 27 percent year over year. The segment now accounts for 55 percent of total revenue, up from 52 percent in the prior year. Logo retention was 96 percent, with the two departures attributable to acquisition rather than dissatisfaction. Expansion revenue within the installed base contributed $6.1 million, of which $4.3 million came from seat growth and $1.8 million from module attachment.

The largest single expansion was a global logistics customer that moved from a departmental deployment of 400 seats to an enterprise-wide agreement covering 3,100 seats across eleven countries. That transaction alone contributed $1.2 million in incremental annual recurring revenue and required a six month security and compliance review.

Pipeline for the coming quarter stands at 3.8 times the target, above our 3.2 times coverage threshold. However, pipeline quality warrants attention: the proportion of opportunities sourced from outbound prospecting has fallen from 34 percent to 26 percent, with the gap filled by lower converting inbound and partner referrals.

Segment Detail — Mid-Market

Mid-market revenue was $14.7 million, growing 19 percent. Customer count increased by 218 net new accounts. Average revenue per account declined slightly to $31,400 from $32,900, reflecting a deliberate shift toward a lower priced entry tier intended to widen the top of the funnel.

The lengthening sales cycle noted earlier deserves elaboration. Analysis of 340 closed opportunities shows the delay concentrates in two stages. Security review now averages 14 days versus 6 days a year ago. Procurement and legal review averages 19 days versus 11 days. Technical evaluation time has actually shortened, suggesting the product itself is not the constraint.

We are responding with three measures: a pre-completed security questionnaire package covering the most requested frameworks, standardized contract terms for deals below $50,000, and a dedicated deal desk function to shepherd larger transactions through internal review.

Segment Detail — Self-Serve

Self-serve revenue reached $7.1 million, growing 34 percent and representing the fastest growing segment on a percentage basis. Conversion from free trial to paid improved from 4.1 percent to 5.3 percent following the onboarding redesign. Monthly churn remains elevated at 3.8 percent, consistent with the segment norm but a drag on net growth.

The self-serve motion now produces a meaningful pipeline for the mid-market team. Of the 218 net new mid-market accounts, 61 originated as self-serve users who exceeded usage thresholds and were routed to sales. This product-led pathway carries a customer acquisition cost roughly 40 percent below outbound sourced accounts.

Cost Structure and Efficiency

Cost of revenue totaled $12.4 million. Cloud infrastructure represents 61 percent of that figure, customer support 24 percent, and third party data and licensing the remainder. The infrastructure renegotiation completed in the prior quarter delivered $1.1 million in annualized savings and is now fully reflected in reported margin.

Support cost per account fell 18 percent following the documentation initiative. Ticket volume per account declined 31 percent while satisfaction scores held steady at 4.6 out of 5, indicating deflection rather than suppression. The team redeployed three support engineers to a customer success function focused on at-risk enterprise accounts.

Headcount ended the quarter at 412, up from 371. Engineering represents 44 percent of headcount, go-to-market 38 percent, and general and administrative 18 percent. Revenue per employee improved to $468,000 on a trailing twelve month basis, up from $421,000.

Capital and Liquidity

Cash and equivalents stood at $94.3 million at quarter end. Free cash flow was positive at $4.1 million, the third consecutive positive quarter. Days sales outstanding improved to 41 days from 49 days following the collections process change implemented in the prior period.

We have no drawn debt and the revolving facility of $50 million remains undrawn. At the current burn profile and growth trajectory, we do not anticipate requiring external financing to reach sustained profitability.

Outlook

We are maintaining full year revenue guidance of $198 million to $204 million, implying growth of 21 to 25 percent. We are raising the operating margin outlook by 100 basis points to reflect the sustained efficiency gains described above.

The principal variables remain the two enterprise renewals flagged earlier, the trajectory of mid-market sales cycles, and foreign exchange. We will provide an update at the midpoint and, should the renewal outcomes resolve favorably, would expect to revisit the upper end of the range.`;

  // Fetch available models on mount
  useEffect(() => {
    const fetchModels = async () => {
      try {
        setModelsLoading(true);
        const response = await axios.get('/api/models');
        if (response.data.success && response.data.models) {
          setModels(response.data.models);
        }
      } catch (err) {
        console.error('Failed to fetch models:', err);
        setError('Failed to load embedding models');
      } finally {
        setModelsLoading(false);
      }
    };

    fetchModels();
  }, []);

  // Handle text analysis
  const handleAnalyze = async () => {
    if (!text.trim()) {
      setError('Please enter some text to analyze');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await axios.post('/api/analyze', {
        text: text,
        modelKey: selectedModel,
        chunkSize,
        overlap,
        outputTokens,
        systemPrompt,
        monthlyRequests,
      });

      if (response.data.success) {
        console.log('[APP] Analysis response:', response.data);
        console.log('[APP] Has savings:', !!response.data.savings);
        setResults(response.data);
      } else {
        setError(response.data.error || 'Analysis failed');
      }
    } catch (err) {
      console.error('Analysis error:', err);
      setError(err.response?.data?.error || 'Failed to analyze text');
    } finally {
      setLoading(false);
    }
  };

  // Re-price silently when chunking settings change so sliders feel live
  useEffect(() => {
    if (!results || results.comparison || !text.trim()) return;
    let cancelled = false;

    const id = setTimeout(async () => {
      try {
        const response = await axios.post('/api/analyze', {
          text,
          modelKey: selectedModel,
          chunkSize,
          overlap,
          outputTokens,
          systemPrompt,
          monthlyRequests,
        });
        if (!cancelled && response.data.success) setResults(response.data);
      } catch (err) {
        console.error('Re-price error:', err);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chunkSize, overlap, outputTokens, systemPrompt, monthlyRequests]);

  // Compare only within the active model's class — embedding and generation
  // models bill differently and are not substitutes for each other
  const handleCompare = async () => {
    if (!text.trim()) {
      setError('Please enter some text to analyze');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const active = models.find((m) => m.key === selectedModel);
      const activeType = (active && active.type) || 'embedding';
      const peers = models.filter((m) => (m.type || 'embedding') === activeType);

      const comparisons = await Promise.all(
        peers.map((model) =>
          axios.post('/api/analyze', {
            text: text,
            modelKey: model.key,
            chunkSize,
            overlap,
            outputTokens,
            systemPrompt,
            monthlyRequests,
          })
        )
      );

      const validResults = comparisons.filter((r) => r.data.success).map((r) => r.data);

      setResults({
        comparison: true,
        comparisonType: activeType,
        results: validResults,
        text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
      });
    } catch (err) {
      console.error('Comparison error:', err);
      setError('Failed to compare models');
    } finally {
      setLoading(false);
    }
  };

  // Handle adding a custom model
  const handleAddCustomModel = async (formData) => {
    try {
      const response = await axios.post('/api/models/custom', {
        modelKey: formData.modelKey,
        name: formData.name,
        provider: formData.provider,
        dimensions: parseInt(formData.dimensions),
        pricePerMillionTokens: parseFloat(formData.pricePerMillionTokens),
        maxTokens: parseInt(formData.maxTokens),
      });

      if (response.data.success) {
        // Refresh models list
        const modelsResponse = await axios.get('/api/models');
        if (modelsResponse.data.success && modelsResponse.data.models) {
          setModels(modelsResponse.data.models);
          // Automatically select the new model
          setSelectedModel(formData.modelKey);
          setError(null);
        }
      }
    } catch (err) {
      console.error('Add custom model error:', err);
      setError(err.response?.data?.error || 'Failed to add custom model');
      throw err;
    }
  };

  // Handle removing a custom model
  const handleDeleteCustomModel = async (modelKey) => {
    try {
      await axios.delete(`/api/models/custom/${modelKey}`);

      const modelsResponse = await axios.get('/api/models');
      if (modelsResponse.data.success && modelsResponse.data.models) {
        const remaining = modelsResponse.data.models;
        setModels(remaining);
        if (selectedModel === modelKey && remaining.length > 0) {
          setSelectedModel(remaining[0].key);
        }
        setResults(null);
        setError(null);
      }
    } catch (err) {
      console.error('Delete custom model error:', err);
      setError(err.response?.data?.error || 'Failed to remove model');
    }
  };

  // Save current analysis as a scenario
  const handleSaveScenario = (name) => {
    if (!results || results.comparison) {
      setError('Cannot save a comparison as a scenario');
      return;
    }
    saveScenario(name, {
      selectedModel,
      text,
      systemPrompt,
      outputTokens,
      monthlyRequests,
      chunkSize,
      overlap,
    }, results);
  };

  // Load a saved scenario and restore it
  const handleLoadScenario = (scenario) => {
    setSelectedModel(scenario.config.selectedModel);
    setText(scenario.config.text);
    setSystemPrompt(scenario.config.systemPrompt);
    setOutputTokens(scenario.config.outputTokens);
    setMonthlyRequests(scenario.config.monthlyRequests);
    setChunkSize(scenario.config.chunkSize);
    setOverlap(scenario.config.overlap);
    setResults(scenario.results);
    setComparisonScenarios(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Compare multiple scenarios side-by-side
  const handleCompareScenarios = (selectedScenarios) => {
    setComparisonScenarios(selectedScenarios);
    window.scrollTo({ top: 600, behavior: 'smooth' });
  };

  const activeModel = models.find((m) => m.key === selectedModel);

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <div className="brand-mark">AI</div>
            <div className="brand-text">
              <span className="brand-name">AI Cost Estimator</span>
              <span className="brand-tag">Token, cost &amp; prompt efficiency analysis</span>
            </div>
          </div>
          <div className="topbar-meta">
            <span className="meta-chip">
              <span className="dot" /> {modelsLoading ? 'Connecting' : 'Live'}
            </span>
            <span className="meta-chip">{models.length} models</span>
            {activeModel && <span className="meta-chip strong">{activeModel.provider}</span>}
          </div>
        </div>
      </header>

      <main className="container">
        <div className="page-head">
          <div>
            <h1 className="page-title">Prompt Cost Analysis</h1>
            <p className="page-sub">
              Measure how a prompt is tokenized, embedded and billed — then optimize it before it reaches production.
            </p>
          </div>
        </div>

        <div className="main-content">
          <Analyzer
            text={text}
            setText={setText}
            selectedModel={selectedModel}
            setSelectedModel={setSelectedModel}
            models={models}
            loading={loading}
            modelsLoading={modelsLoading}
            onAnalyze={handleAnalyze}
            onCompare={handleCompare}
            onAddCustomModel={handleAddCustomModel}
            onDeleteCustomModel={handleDeleteCustomModel}
            onLoadSample={() =>
              setText(
                activeModel && activeModel.type === 'generation' ? SAMPLE_FEATURE : SAMPLE_DOC
              )
            }
            chunkSize={chunkSize}
            setChunkSize={setChunkSize}
            overlap={overlap}
            setOverlap={setOverlap}
            outputTokens={outputTokens}
            setOutputTokens={setOutputTokens}
            systemPrompt={systemPrompt}
            setSystemPrompt={setSystemPrompt}
            monthlyRequests={monthlyRequests}
            setMonthlyRequests={setMonthlyRequests}
            error={error}
          />

          <Results 
            results={results} 
            loading={loading} 
            text={text}
            onSaveScenario={() => setSaveModalOpen(true)}
          />

          {scenariosLoaded && scenarios.length > 0 && (
            <ScenariosPanel
              scenarios={scenarios}
              onLoadScenario={handleLoadScenario}
              onDeleteScenario={deleteScenario}
              onCompareScenarios={handleCompareScenarios}
            />
          )}

          {comparisonScenarios && (
            <ScenarioComparison
              scenarios={comparisonScenarios}
              onClose={() => setComparisonScenarios(null)}
            />
          )}
        </div>

        <footer className="app-footer">
          Prices are provider list prices per 1M input tokens and change over time. Please verify against provider pricing
          pages before relying on them. OpenAI token counts use the cl100k_base BPE encoder and are exact; other
          providers use different tokenizers and are approximated. No embedding API is called — all figures are
          calculated locally.
        </footer>
      </main>

      <SaveScenarioModal
        isOpen={saveModalOpen}
        onClose={() => setSaveModalOpen(false)}
        onSave={handleSaveScenario}
        defaultName={results ? `${results.model || 'Analysis'} - ${new Date().toLocaleDateString()}` : ''}
      />
    </div>
  );
}

export default App;
