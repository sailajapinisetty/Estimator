import { useState, useEffect } from 'react';

const STORAGE_KEY = 'ai-cost-estimator-scenarios';

export function useScenarios() {
  const [scenarios, setScenarios] = useState([]);
  const [loaded, setLoaded] = useState(false);

  // Load scenarios from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setScenarios(JSON.parse(saved));
      }
    } catch (err) {
      console.error('Failed to load scenarios:', err);
    }
    setLoaded(true);
  }, []);

  // Persist scenarios to localStorage whenever they change
  useEffect(() => {
    if (loaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(scenarios));
      } catch (err) {
        console.error('Failed to save scenarios:', err);
      }
    }
  }, [scenarios, loaded]);

  const saveScenario = (name, config, results) => {
    const scenario = {
      id: Date.now().toString(),
      name,
      timestamp: new Date().toISOString(),
      config: {
        selectedModel: config.selectedModel,
        text: config.text,
        systemPrompt: config.systemPrompt,
        outputTokens: config.outputTokens,
        monthlyRequests: config.monthlyRequests,
        chunkSize: config.chunkSize,
        overlap: config.overlap,
      },
      results: results ? {
        model: results.model,
        provider: results.provider,
        modelType: results.modelType,
        tokenCount: results.tokenCount,
        billedTokens: results.billedTokens,
        billedCost: results.billedCost,
        billedCostFormatted: results.billedCostFormatted,
        outputTokens: results.outputTokens,
        volume: results.volume,
        savings: results.savings,
        systemTokens: results.systemTokens,
        userTokens: results.userTokens,
      } : null,
    };

    setScenarios((prev) => [scenario, ...prev]);
    return scenario;
  };

  const deleteScenario = (id) => {
    setScenarios((prev) => prev.filter((s) => s.id !== id));
  };

  const updateScenario = (id, name) => {
    setScenarios((prev) =>
      prev.map((s) => (s.id === id ? { ...s, name } : s))
    );
  };

  const getScenario = (id) => {
    return scenarios.find((s) => s.id === id);
  };

  return {
    scenarios,
    saveScenario,
    deleteScenario,
    updateScenario,
    getScenario,
    loaded,
  };
}
