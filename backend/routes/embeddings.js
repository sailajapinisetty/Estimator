const express = require('express');
const modelsService = require('../services/modelsService');

// cl100k_base is the encoder used by every current OpenAI embedding model
let cl100k = null;
try {
  cl100k = require('js-tiktoken').getEncoding('cl100k_base');
} catch (e) {
  console.warn('js-tiktoken unavailable, falling back to heuristic tokenization:', e.message);
}

const router = express.Router();

const MAX_PIECES = 60;

// Encode text, returning the count plus the decoded surface form of each token.
// Only OpenAI models genuinely use cl100k_base; other providers are approximated with it.
const tokenize = (text, model) => {
  const exact = Boolean(model && model.exactTokenizer);
  const label = model && model.tokenizer ? model.tokenizer : 'cl100k_base';

  try {
    if (cl100k) {
      const tokens = cl100k.encode(text);
      const sample = Array.from(tokens).slice(0, MAX_PIECES);
      return {
        count: tokens.length,
        ids: sample.slice(0, 24),
        pieces: sample.map((id) => ({ id, text: cl100k.decode([id]) })),
        encoder: label,
        exact,
      };
    }

    return {
      count: Math.ceil(text.length / 4),
      ids: [],
      pieces: [],
      encoder: 'heuristic (~4 chars/token)',
      exact: false,
    };
  } catch (error) {
    console.error('Token estimation error:', error);
    return {
      count: Math.ceil(text.length / 4),
      ids: [],
      pieces: [],
      encoder: 'heuristic (~4 chars/token)',
      exact: false,
    };
  }
};

// Technical breakdown of how the prompt travels through the embedding pipeline
const buildTechnicalProfile = (text, model, tokenization, options = {}) => {
  const tokenCount = tokenization.count;
  const isGeneration = model.type === 'generation';
  const byteLength = Buffer.byteLength(text, 'utf8');
  const words = text.split(/\s+/).filter(Boolean).length;
  const whitespace = (text.match(/\s/g) || []).length;
  const punctuation = (text.match(/[^\w\s]/g) || []).length;
  const nonAscii = (text.match(/[^\x00-\x7F]/g) || []).length;

  const CHUNK_SIZE = Math.min(Math.max(64, options.chunkSize || 512), model.maxTokens);
  const CHUNK_OVERLAP = Math.min(Math.max(0, options.overlap ?? 50), CHUNK_SIZE - 1);
  const stride = Math.max(1, CHUNK_SIZE - CHUNK_OVERLAP);
  const chunkCount = Math.max(1, Math.ceil(tokenCount / stride));

  // Overlapping windows re-send tokens, so billed volume exceeds the raw token count
  let billedTokens = 0;
  for (let i = 0; i < chunkCount; i++) {
    billedTokens += Math.min(CHUNK_SIZE, Math.max(0, tokenCount - i * stride));
  }
  const overheadTokens = billedTokens - tokenCount;

  // float32 vector payload (embedding models only)
  const dimensions = model.dimensions || 0;
  const vectorBytes = dimensions * 4;

  return {
    tokenization: {
      encoder: tokenization.encoder,
      exact: tokenization.exact,
      tokenIdSample: tokenization.ids,
      pieces: tokenization.pieces,
      charsPerToken: tokenCount ? (text.length / tokenCount).toFixed(2) : '0',
      bytesPerToken: tokenCount ? (byteLength / tokenCount).toFixed(2) : '0',
      tokensPerWord: words ? (tokenCount / words).toFixed(2) : '0',
    },
    input: {
      characters: text.length,
      bytesUtf8: byteLength,
      words,
      whitespaceChars: whitespace,
      punctuationChars: punctuation,
      nonAsciiChars: nonAscii,
      whitespaceShare: text.length ? ((whitespace / text.length) * 100).toFixed(1) : '0',
    },
    contextWindow: {
      maxTokens: model.maxTokens,
      used: tokenCount,
      remaining: Math.max(0, model.maxTokens - tokenCount),
      utilization: ((tokenCount / model.maxTokens) * 100).toFixed(2),
      exceedsWindow: tokenCount > model.maxTokens,
    },
    chunking: {
      chunkSize: CHUNK_SIZE,
      overlap: CHUNK_OVERLAP,
      chunksRequired: chunkCount,
      apiCalls: chunkCount,
      rawTokens: tokenCount,
      billedTokens,
      overheadTokens,
      overheadPercent: tokenCount ? ((overheadTokens / tokenCount) * 100).toFixed(1) : '0',
      strategy: chunkCount > 1 ? 'sliding window with overlap' : 'single pass (no chunking needed)',
    },
    vector: {
      dimensions,
      precision: 'float32',
      bytesPerVector: vectorBytes,
      kbPerVector: (vectorBytes / 1024).toFixed(2),
      normalization: 'L2 (unit length)',
      similarityMetric: 'cosine',
      totalVectors: chunkCount,
      totalStorageKb: ((vectorBytes * chunkCount) / 1024).toFixed(2),
    },
    pipeline: isGeneration
      ? [
          { stage: 'Normalize', detail: 'Unicode NFC, whitespace collapse, control chars stripped' },
          { stage: 'Encode', detail: `${tokenization.encoder} → ${tokenCount} input token IDs` },
          { stage: 'Prefill', detail: 'Input tokens processed through the model in one forward pass' },
          { stage: 'Decode', detail: 'Output tokens generated one at a time, autoregressively' },
          { stage: 'Billing', detail: 'Charged on input AND output tokens, at different rates' },
        ]
      : [
          { stage: 'Normalize', detail: 'Unicode NFC, whitespace collapse, control chars stripped' },
          { stage: 'Encode', detail: `${tokenization.encoder} → ${tokenCount} token IDs` },
          { stage: 'Chunk', detail: `${chunkCount} chunk(s) @ ${CHUNK_SIZE} tokens, ${CHUNK_OVERLAP} overlap` },
          { stage: 'Forward pass', detail: `Transformer encoder → ${dimensions}-dim pooled vector` },
          { stage: 'Normalize vector', detail: 'L2 normalize so dot product = cosine similarity' },
          { stage: 'Billing', detail: 'Charged on input tokens only; output vector is free' },
        ],
  };
};

// Heuristic prompt-quality suggestions
const buildSuggestions = (text, tokenCount, model, chunking) => {
  const suggestions = [];
  const words = text.split(/\s+/).filter(Boolean);
  const lower = text.toLowerCase();

  if (chunking && chunking.overheadTokens > 0) {
    suggestions.push({
      severity: 'high',
      title: 'Chunk overlap is inflating billed tokens',
      detail: `${chunking.chunksRequired} chunks re-send ${chunking.overheadTokens} tokens, so you are billed for ${chunking.billedTokens} instead of ${chunking.rawTokens}. Reducing overlap from ${chunking.overlap} to 25 roughly halves this waste.`,
      impact: `+${chunking.overheadPercent}% cost today`,
    });
  }

  const fillers = ['very', 'really', 'just', 'basically', 'actually', 'literally', 'simply', 'quite', 'perhaps', 'maybe'];
  const foundFillers = fillers.filter((f) => new RegExp(`\\b${f}\\b`, 'i').test(text));
  if (foundFillers.length) {
    suggestions.push({
      severity: 'medium',
      title: 'Remove filler words',
      detail: `Found: ${foundFillers.join(', ')}. Filler words add tokens without adding semantic signal.`,
      impact: `~${foundFillers.length} tokens saved`,
    });
  }

  const politeness = ['please', 'thank you', 'thanks', 'kindly', 'i would like you to', 'could you'];
  const foundPolite = politeness.filter((p) => lower.includes(p));
  if (foundPolite.length) {
    suggestions.push({
      severity: 'low',
      title: 'Drop conversational politeness',
      detail: 'Embedding models do not respond to tone. Phrases like "please" or "could you" only cost tokens.',
      impact: `~${foundPolite.length * 2} tokens saved`,
    });
  }

  if (/\s{2,}|\n{3,}/.test(text)) {
    suggestions.push({
      severity: 'low',
      title: 'Collapse redundant whitespace',
      detail: 'Repeated spaces and blank lines are tokenized and billed.',
      impact: 'Small but free win',
    });
  }

  const seen = new Set();
  const dupes = new Set();
  words.forEach((w) => {
    const k = w.toLowerCase().replace(/[^\w]/g, '');
    if (k.length > 6) {
      if (seen.has(k)) dupes.add(k);
      seen.add(k);
    }
  });
  if (dupes.size >= 3) {
    suggestions.push({
      severity: 'medium',
      title: 'Reduce repeated terminology',
      detail: `Repeated terms: ${Array.from(dupes).slice(0, 5).join(', ')}. Repetition rarely improves embedding quality.`,
      impact: `~${dupes.size * 2} tokens saved`,
    });
  }

  if (tokenCount > model.maxTokens) {
    suggestions.push({
      severity: 'high',
      title: 'Text exceeds the context window',
      detail: `${tokenCount} tokens vs a ${model.maxTokens} token limit. The provider will truncate or reject this input — chunk it first.`,
      impact: 'Prevents silent data loss',
    });
  } else if (tokenCount > model.maxTokens * 0.8) {
    suggestions.push({
      severity: 'medium',
      title: 'Approaching the context limit',
      detail: `Using ${((tokenCount / model.maxTokens) * 100).toFixed(0)}% of the window. Consider chunking for safety.`,
      impact: 'Improves reliability',
    });
  }

  if (tokenCount < 5 && tokenCount > 0) {
    suggestions.push({
      severity: 'medium',
      title: 'Text may be too short',
      detail: 'Very short inputs produce weak, ambiguous embeddings. Add surrounding context for better retrieval quality.',
      impact: 'Improves retrieval accuracy',
    });
  }

  if (/[<>]|\{\{|\}\}|```/.test(text)) {
    suggestions.push({
      severity: 'low',
      title: 'Strip markup and templating syntax',
      detail: 'HTML tags, template braces and code fences consume tokens but carry little semantic meaning for retrieval.',
      impact: 'Cleaner vectors',
    });
  }

  if (!suggestions.length) {
    suggestions.push({
      severity: 'good',
      title: 'Prompt looks well optimized',
      detail: 'No filler, redundancy or context-window issues detected for this input.',
      impact: 'No action needed',
    });
  }

  return suggestions;
};

// Cumulative cost-reduction scenarios for generation workloads.
// Percentages are planning heuristics, not measurements — labelled as such in the UI.
const buildGenerationSavings = (model, systemTokens, userTokens, outTokens, volume, allModels) => {
  const calls = volume || 1;
  const inTokens = systemTokens + userTokens;

  const priceOf = (m, inTok, outTok) =>
    (inTok / 1000000) * m.pricePerMillionTokens + (outTok / 1000000) * (m.outputPricePerMillionTokens || 0);

  const baseline = priceOf(model, inTokens, outTokens) * calls;

  // Cheapest generation model available, used for the routing scenario
  const cheaper = Object.values(allModels)
    .filter((m) => m.type === 'generation' && m.outputPricePerMillionTokens)
    .sort((a, b) => a.outputPricePerMillionTokens - b.outputPricePerMillionTokens)[0];

  const steps = [];
  let outNow = outTokens;
  let modelNow = model;
  let multiplier = 1;

  const push = (label, detail, assumption) => {
    const cost = priceOf(modelNow, inTokens, outNow) * calls * multiplier;
    const prev = steps.length ? steps[steps.length - 1].costRaw : baseline;
    const costPerReq = priceOf(modelNow, inTokens, outNow) * multiplier;
    const prevPerReq = steps.length ? steps[steps.length - 1].costRawPerRequest : priceOf(model, inTokens, outTokens);
    steps.push({
      label,
      detail,
      assumption,
      costRaw: cost,
      costRawPerRequest: costPerReq,
      cost: formatCost(cost),
      costPerRequest: formatCost(costPerReq),
      savedFromPrevious: formatCost(Math.max(0, prev - cost)),
      savedPerRequest: formatCost(Math.max(0, prevPerReq - costPerReq)),
      cumulativeReduction: baseline ? (((baseline - cost) / baseline) * 100).toFixed(1) : '0',
    });
  };

  steps.push({
    label: 'Current configuration',
    detail: `${model.name} · ${outTokens.toLocaleString()} output tokens`,
    assumption: null,
    costRaw: baseline,
    costRawPerRequest: priceOf(model, inTokens, outTokens),
    cost: formatCost(baseline),
    costPerRequest: formatCost(priceOf(model, inTokens, outTokens)),
    savedFromPrevious: formatCost(0),
    savedPerRequest: formatCost(0),
    cumulativeReduction: '0.0',
  });

  outNow = Math.round(outTokens * 0.85);
  push(
    'Ban preamble and explanation',
    `Output drops to ${outNow.toLocaleString()} tokens`,
    'Assumes 15% of output is prose the model adds unprompted'
  );

  outNow = Math.max(50, Math.round(outTokens * 0.16));
  push(
    'Emit a structured spec, template the code',
    `Output drops to ${outNow.toLocaleString()} tokens`,
    'Assumes boilerplate (imports, setup, page objects) is rendered deterministically'
  );

  if (cheaper && cheaper.outputPricePerMillionTokens < model.outputPricePerMillionTokens) {
    modelNow = cheaper;
    push(
      `Route simple cases to ${cheaper.name}`,
      `$${cheaper.pricePerMillionTokens} in / $${cheaper.outputPricePerMillionTokens} out`,
      'Assumes all traffic routes; blend the rate if only a portion qualifies'
    );
  }

  multiplier = 0.5;
  push('Use the Batch API', '50% cost savings', 'Group requests together and process them later (not immediately) - like bulk mail instead of overnight delivery');

  const baselinePerRequest = priceOf(model, inTokens, outTokens);

  return {
    baseline: formatCost(baseline),
    baselinePerRequest: formatCost(baselinePerRequest),
    best: steps[steps.length - 1].cost,
    bestPerRequest: steps[steps.length - 1].costPerRequest,
    totalReduction: steps[steps.length - 1].cumulativeReduction,
    steps: steps.map(({ costRaw, costRawPerRequest, ...rest }) => rest),
  };
};

// System-prompt specific advice. The system prompt is resent on every call,
// so its cost scales with volume in a way the user prompt's does not.
const buildSystemPromptAdvice = (prompt, systemTokens, model, volume, cacheMultiplier) => {
  if (!prompt || !systemTokens) return null;

  const advice = [];
  const monthlyCost = (systemTokens / 1000000) * model.pricePerMillionTokens * (volume || 0);
  const CREDIT_VALUE = 0.0001;
  const monthlyCredits = monthlyCost / CREDIT_VALUE;

  const negativeMatches = prompt.match(/[^.!?]*\b(do not|don't|never|avoid|must not|should not)\b[^.!?]*/gi) || [];
  const negatives = negativeMatches.length;
  const hasExamples = /```|example:|for example|e\.g\./i.test(prompt);
  const formatMatches = prompt.match(/[^.!?]*\b(format|output|return|respond)\b[^.!?]{0,60}\b(json|markdown|xml|yaml|schema)\b[^.!?]*/gi) || [];
  const formatRules = formatMatches.length;
  const politenessMatches = prompt.match(/\b(please|kindly|thank you|thanks)\b/gi) || [];
  const politeness = politenessMatches.length;

  const trim = (s, n = 70) => {
    const t = s.trim().replace(/\s+/g, ' ');
    return t.length > n ? `${t.slice(0, n)}…` : t;
  };

  const sentences = prompt.split(/[.!?]+/).map((s) => s.trim()).filter((s) => s.length > 20);
  const seen = new Map();
  const duplicates = [];
  sentences.forEach((s) => {
    const key = s.toLowerCase().split(/\s+/).slice(0, 5).join(' ');
    if (seen.has(key)) duplicates.push(s);
    seen.set(key, true);
  });
  const duplicateIdeas = duplicates.length;

  if (systemTokens > 1000) {
    advice.push({
      severity: 'high',
      title: 'System prompt is large',
      detail: `${systemTokens.toLocaleString()} tokens resent on every call. Split it: keep behavioural rules here, move reference material to retrieval so it is sent only when relevant.`,
      impact: volume ? `${formatCost(monthlyCost)}/month for this prompt alone` : 'Charged on every request',
    });
  } else if (systemTokens > 400) {
    advice.push({
      severity: 'medium',
      title: 'System prompt is moderately long',
      detail: `${systemTokens.toLocaleString()} tokens on every call. Worth reviewing for instructions that rarely change the output.`,
      impact: volume ? `${formatCost(monthlyCost)}/month` : 'Charged on every request',
    });
  }

  if (hasExamples) {
    advice.push({
      severity: 'medium',
      title: 'Few-shot examples are billed every call',
      detail: 'Examples are usually the largest part of a system prompt. Remove one at a time and measure output quality — models often need fewer than assumed.',
      impact: 'Commonly 30-50% of system prompt size',
    });
  }

  if (negatives >= 4) {
    advice.push({
      severity: 'low',
      title: `${negatives} negative instructions`,
      detail:
        'Prohibitions are wordier than their positive equivalent. "Output only code" replaces several "do not include..." rules.',
      found: negativeMatches.slice(0, 4).map((m) => trim(m)),
      impact: 'Shorter, and usually followed more reliably',
    });
  }

  if (formatRules > 0) {
    advice.push({
      severity: 'medium',
      title: 'Format rules written in prose',
      detail:
        'Structured output or a JSON schema enforces format at the API level, so these instructions can be deleted rather than paid for on every call.',
      found: formatMatches.slice(0, 3).map((m) => trim(m)),
      impact: 'Removes tokens and improves compliance',
    });
  }

  if (duplicateIdeas > 0) {
    advice.push({
      severity: 'low',
      title: 'Repeated instructions detected',
      detail: `${duplicateIdeas} sentence(s) restate an earlier rule. Repetition rarely improves adherence.`,
      found: duplicates.slice(0, 3).map((m) => trim(m)),
      impact: 'Free to remove',
    });
  }

  if (politeness > 0) {
    advice.push({
      severity: 'low',
      title: 'Politeness in the system prompt',
      detail: 'Courtesy words carry no instruction and are billed on every request.',
      impact: `~${politeness * 2} tokens per call`,
    });
  }

  if (cacheMultiplier < 1) {
    const cacheSaving = monthlyCost * (1 - cacheMultiplier);
    advice.push(
      systemTokens >= 1024
        ? {
            severity: 'good',
            title: 'Large enough for prompt caching',
            detail: `This provider charges ${cacheMultiplier}× for cached reads, and a stable system prefix qualifies.`,
            impact: volume ? `Saves ~${formatCost(cacheSaving)}/month` : 'Worth enabling',
          }
        : {
            severity: 'good',
            title: 'Too small for caching to matter',
            detail: 'Prompt caching gets recommended reflexively, but at this size the saving is negligible. Spend the effort on output length instead.',
            impact: volume ? `Would save only ${formatCost(cacheSaving)}/month` : 'Not worth it yet',
          }
    );
  }

  return {
    tokens: systemTokens,
    monthlyCost: volume ? formatCost(monthlyCost) : null,
    monthlyCredits: volume ? monthlyCredits.toFixed(4) : null,
    items: advice,
  };
};

const formatCost = (cost) => {
  if (cost === 0) return '$0.00';

  // Everyday amounts read better as plain currency
  if (cost >= 1) return `$${cost.toFixed(2)}`;
  if (cost >= 0.01) return `$${cost.toFixed(3)}`;

  // For very small costs, count significant figures
  if (cost < 0.00000001) {
    return `$${cost.toExponential(2)}`;
  }
  
  // Find how many decimal places we need to show a non-zero digit
  const costStr = cost.toFixed(15); // Use high precision first
  const match = costStr.match(/0\.0*[1-9]/);
  
  if (match) {
    // Count zeros after decimal point
    const zerosCount = match[0].split('').slice(2, -1).length;
    const decimals = Math.min(zerosCount + 2, 12); // Show non-zero digit + 2 more digits
    return `$${cost.toFixed(decimals)}`;
  }
  
  return `$${cost.toFixed(8)}`;
};

// POST /api/analyze - Analyze prompt and calculate tokens/cost
router.post('/analyze', (req, res) => {
  try {
    const { text, modelKey, chunkSize, overlap, outputTokens, systemPrompt, monthlyRequests } = req.body;

    if (!text || !modelKey) {
      return res.status(400).json({ 
        error: 'Missing required fields: text and modelKey' 
      });
    }

    const model = modelsService.getModel(modelKey);
    if (!model) {
      return res.status(400).json({ 
        error: `Model '${modelKey}' not found` 
      });
    }

    const tokenization = tokenize(text, model);
    const tokenCount = tokenization.count;
    const isGeneration = model.type === 'generation';

    // Calculate cost
    const cost = (tokenCount / 1000000) * model.pricePerMillionTokens;

    const technical = buildTechnicalProfile(text, model, tokenization, {
      chunkSize: chunkSize ? parseInt(chunkSize, 10) : undefined,
      overlap: overlap !== undefined ? parseInt(overlap, 10) : undefined,
    });

    // Generation models bill output too; embedding models only ever bill input.
    // Chunk overlap re-sends tokens, so embedding billing can exceed the raw count.
    const outTokens = isGeneration ? Math.max(0, parseInt(outputTokens, 10) || 500) : 0;
    const outputCost = isGeneration
      ? (outTokens / 1000000) * (model.outputPricePerMillionTokens || 0)
      : 0;

    // A system prompt is resent on every request, so it is a fixed per-call tax
    const systemTokens = isGeneration && systemPrompt ? tokenize(systemPrompt, model).count : 0;
    const systemCost = (systemTokens / 1000000) * model.pricePerMillionTokens;

    const billedTokens = isGeneration ? tokenCount + systemTokens : technical.chunking.billedTokens;
    const inputCost = (billedTokens / 1000000) * model.pricePerMillionTokens;
    const billedCost = inputCost + outputCost;

    // Providers discount repeated prompt prefixes when caching is enabled
    const cacheMultiplier = model.cacheReadMultiplier != null ? model.cacheReadMultiplier : 1;
    const cachedSystemCost = systemCost * cacheMultiplier;
    const cachedTotalCost = billedCost - systemCost + cachedSystemCost;
    const cacheSavingPerCall = billedCost - cachedTotalCost;
    const cacheSavingPercent = billedCost > 0 ? ((cacheSavingPerCall / billedCost) * 100).toFixed(1) : '0';

    const volume = Math.max(0, parseInt(monthlyRequests, 10) || 0);

    // 1 credit = $0.0001, priced on what is actually billed
    const CREDIT_VALUE = 0.0001;
    const creditsConsumed = billedCost / CREDIT_VALUE;
    const rawCredits = cost / CREDIT_VALUE;
    const systemPromptCredits = systemCost / CREDIT_VALUE;
    const systemPromptCreditsTotal = (systemCost * volume) / CREDIT_VALUE;
    const userPromptCost = inputCost - systemCost;
    const userPromptCredits = userPromptCost / CREDIT_VALUE;
    const outputCredits = outputCost / CREDIT_VALUE;
    const totalCreditsPerCall = billedCost / CREDIT_VALUE;
    const outputCreditsTotal = (outputCost * volume) / CREDIT_VALUE;
    const userPromptCreditsTotal = (userPromptCost * volume) / CREDIT_VALUE;

    res.json({
      success: true,
      text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
      modelKey,
      model: model.name,
      provider: model.provider,
      modelType: model.type || 'embedding',
      tokenCount,
      maxTokens: model.maxTokens,
      cost: cost.toFixed(15),
      costFormatted: formatCost(cost),
      billedTokens,
      billedCost: billedCost.toFixed(15),
      billedCostFormatted: formatCost(billedCost),
      inputCostFormatted: formatCost(inputCost),
      outputTokens: outTokens,
      outputCostFormatted: formatCost(outputCost),
      outputPricePerMillionTokens: model.outputPricePerMillionTokens || null,
      outputCredits: outputCredits.toFixed(4),
      systemTokens,
      systemCostFormatted: formatCost(systemCost),
      systemPromptCredits: systemPromptCredits.toFixed(4),
      userTokens: tokenCount,
      userPromptCostFormatted: formatCost(userPromptCost),
      userPromptCredits: userPromptCredits.toFixed(4),
      systemShareOfInput: billedTokens ? ((systemTokens / billedTokens) * 100).toFixed(1) : '0',
      caching: isGeneration
        ? {
            supported: cacheMultiplier < 1,
            readMultiplier: cacheMultiplier,
            cachedTotalFormatted: formatCost(cachedTotalCost),
            cachedTotalCredits: (cachedTotalCost / CREDIT_VALUE).toFixed(4),
            savingPerCallFormatted: formatCost(cacheSavingPerCall),
            savingPerCallCredits: (cacheSavingPerCall / CREDIT_VALUE).toFixed(4),
            savingPercent: billedCost ? ((cacheSavingPerCall / billedCost) * 100).toFixed(1) : '0',
          }
        : null,
      volume: volume
        ? {
            requests: volume,
            totalFormatted: formatCost(billedCost * volume),
            totalCredits: (creditsConsumed * volume).toFixed(4),
            cachedTotalFormatted: formatCost(cachedTotalCost * volume),
            savingFormatted: formatCost(cacheSavingPerCall * volume),
            systemPromptTotalFormatted: formatCost(systemCost * volume),
            systemPromptCreditsTotal: systemPromptCreditsTotal.toFixed(4),
            userPromptTotalFormatted: formatCost(userPromptCost * volume),
            userPromptCreditsTotal: userPromptCreditsTotal.toFixed(4),
            outputTotalFormatted: formatCost(outputCost * volume),
            outputCreditsTotal: outputCreditsTotal.toFixed(4),
          }
        : null,
      creditValue: CREDIT_VALUE,
      creditsConsumed: creditsConsumed.toFixed(4),
      rawCredits: rawCredits.toFixed(4),
      overlapCredits: (creditsConsumed - rawCredits).toFixed(4),
      pricePerMillionTokens: model.pricePerMillionTokens,
      dimensions: model.dimensions || null,
      isCustom: model.isCustom || false,
      tokenizer: tokenization.encoder,
      tokenCountExact: tokenization.exact,
      modelNote: model.note || null,
      savings:
        isGeneration
          ? (() => {
              try {
                const result = buildGenerationSavings(
                  model,
                  systemTokens,
                  tokenCount,
                  outTokens,
                  volume || 1,
                  modelsService.getAllModels()
                );
                console.log('[SAVINGS]', result);
                return result;
              } catch (e) {
                console.error('[SAVINGS_ERROR]', e.message, e);
                return null;
              }
            })()
          : null,
      technical,
      suggestions: buildSuggestions(text, tokenCount, model, isGeneration ? null : technical.chunking),
      systemPromptAdvice: isGeneration
        ? buildSystemPromptAdvice(systemPrompt, systemTokens, model, volume, cacheMultiplier)
        : null,
      projections: {
        per1kRequests: formatCost(billedCost * 1000),
        per100kRequests: formatCost(billedCost * 100000),
        per1mRequests: formatCost(billedCost * 1000000),
        credits1k: (creditsConsumed * 1000).toFixed(0),
        credits100k: (creditsConsumed * 100000).toFixed(0),
        credits1m: (creditsConsumed * 1000000).toFixed(0),
      },
    });
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ error: 'Analysis failed', message: error.message });
  }
});

// GET /api/models - Get list of available models
router.get('/models', (req, res) => {
  try {
    const allModels = modelsService.getAllModels();
    const modelList = Object.entries(allModels).map(([key, model]) => ({
      key,
      name: model.name,
      provider: model.provider,
      type: model.type || 'embedding',
      dimensions: model.dimensions || null,
      pricePerMillionTokens: model.pricePerMillionTokens,
      outputPricePerMillionTokens: model.outputPricePerMillionTokens || null,
      maxTokens: model.maxTokens,
      tokenizer: model.tokenizer || null,
      exactTokenizer: Boolean(model.exactTokenizer),
      note: model.note || null,
      isCustom: model.isCustom || false,
    }));

    res.json({
      success: true,
      models: modelList,
      count: modelList.length,
    });
  } catch (error) {
    console.error('Models fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch models' });
  }
});

// GET /api/pricing - Get current pricing information
router.get('/pricing', (req, res) => {
  try {
    const allModels = modelsService.getAllModels();
    const pricingInfo = Object.entries(allModels).map(([key, model]) => ({
      modelKey: key,
      name: model.name,
      provider: model.provider,
      pricePerMillionTokens: model.pricePerMillionTokens,
      costPer1000Tokens: ((model.pricePerMillionTokens * 1000) / 1000000).toFixed(8),
      isCustom: model.isCustom || false,
    }));

    res.json({
      success: true,
      pricing: pricingInfo,
    });
  } catch (error) {
    console.error('Pricing fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch pricing' });
  }
});

// POST /api/models/custom - Add a custom embedding model
router.post('/models/custom', (req, res) => {
  try {
    const { modelKey, name, provider, dimensions, pricePerMillionTokens, maxTokens } = req.body;

    if (!modelKey || !name || !provider) {
      return res.status(400).json({
        error: 'Missing required fields: modelKey, name, provider',
      });
    }

    const customModel = modelsService.addCustomModel(modelKey, {
      name,
      provider,
      dimensions: dimensions || 768,
      pricePerMillionTokens: pricePerMillionTokens || 0.1,
      maxTokens: maxTokens || 2048,
    });

    res.status(201).json({
      success: true,
      message: `Custom model '${name}' added successfully`,
      model: {
        key: modelKey,
        ...customModel,
      },
    });
  } catch (error) {
    console.error('Add custom model error:', error);
    res.status(400).json({ error: error.message });
  }
});

// GET /api/models/custom - Get all custom models
router.get('/models/custom', (req, res) => {
  try {
    const customModels = modelsService.getCustomModels();
    const customModelList = Object.entries(customModels).map(([key, model]) => ({
      key,
      ...model,
    }));

    res.json({
      success: true,
      customModels: customModelList,
      count: customModelList.length,
    });
  } catch (error) {
    console.error('Get custom models error:', error);
    res.status(500).json({ error: 'Failed to fetch custom models' });
  }
});

// PUT /api/models/:modelKey/price - Update model price
router.put('/models/:modelKey/price', (req, res) => {
  try {
    const { modelKey } = req.params;
    const { pricePerMillionTokens } = req.body;

    if (!pricePerMillionTokens && pricePerMillionTokens !== 0) {
      return res.status(400).json({
        error: 'Missing required field: pricePerMillionTokens',
      });
    }

    if (isNaN(pricePerMillionTokens) || pricePerMillionTokens < 0) {
      return res.status(400).json({
        error: 'Price must be a non-negative number',
      });
    }

    modelsService.updateModelPrice(modelKey, parseFloat(pricePerMillionTokens));

    const updatedModel = modelsService.getModel(modelKey);
    res.json({
      success: true,
      message: `Model '${modelKey}' price updated to $${pricePerMillionTokens}`,
      model: {
        key: modelKey,
        ...updatedModel,
      },
    });
  } catch (error) {
    console.error('Update model price error:', error);
    res.status(400).json({ error: error.message });
  }
});

// DELETE /api/models/custom/:modelKey - Delete a custom model
router.delete('/models/custom/:modelKey', (req, res) => {
  try {
    const { modelKey } = req.params;

    modelsService.deleteCustomModel(modelKey);

    res.json({
      success: true,
      message: `Custom model '${modelKey}' deleted successfully`,
    });
  } catch (error) {
    console.error('Delete custom model error:', error);
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
