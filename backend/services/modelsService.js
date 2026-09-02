const fs = require('fs');
const path = require('path');
const builtInModels = require('../config/models');

const DATA_DIR = path.join(__dirname, '..', 'data');
const STORE_PATH = path.join(DATA_DIR, 'custom-models.json');

// Reject keys that would pollute Object.prototype when used as property names
const RESERVED_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const KEY_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;

const assertSafeKey = (modelKey) => {
  if (typeof modelKey !== 'string' || RESERVED_KEYS.has(modelKey) || !KEY_PATTERN.test(modelKey)) {
    throw new Error('modelKey must be 1-64 lowercase letters, numbers or hyphens');
  }
};

const loadFromDisk = () => {
  try {
    if (!fs.existsSync(STORE_PATH)) return {};
    const parsed = JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'));
    const safe = Object.create(null);
    for (const [key, value] of Object.entries(parsed)) {
      if (!RESERVED_KEYS.has(key) && KEY_PATTERN.test(key)) safe[key] = value;
    }
    return safe;
  } catch (error) {
    console.warn('Could not read custom model store, starting empty:', error.message);
    return {};
  }
};

// Custom models persist to disk so they survive server restarts
let customModels = loadFromDisk();

const persist = () => {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(STORE_PATH, JSON.stringify(customModels, null, 2), 'utf8');
  } catch (error) {
    console.error('Failed to persist custom models:', error.message);
  }
};

class ModelsService {
  // Get all models (built-in + custom)
  getAllModels() {
    return { ...builtInModels, ...customModels };
  }

  // Get built-in models
  getBuiltInModels() {
    return builtInModels;
  }

  // Get custom models only
  getCustomModels() {
    return customModels;
  }

  // Add a custom model
  addCustomModel(modelKey, modelData) {
    if (!modelKey || !modelData.name || !modelData.provider) {
      throw new Error('Missing required fields: modelKey, name, provider');
    }

    assertSafeKey(modelKey);

    if (builtInModels[modelKey]) {
      throw new Error(`Cannot override built-in model: ${modelKey}`);
    }

    // Validate numeric fields
    const pricePerMillionTokens = parseFloat(modelData.pricePerMillionTokens);
    const dimensions = parseInt(modelData.dimensions);
    const maxTokens = parseInt(modelData.maxTokens);

    if (isNaN(pricePerMillionTokens) || pricePerMillionTokens < 0) {
      throw new Error('pricePerMillionTokens must be a non-negative number');
    }

    if (isNaN(dimensions) || dimensions <= 0) {
      throw new Error('dimensions must be a positive integer');
    }

    if (isNaN(maxTokens) || maxTokens <= 0) {
      throw new Error('maxTokens must be a positive integer');
    }

    customModels[modelKey] = {
      name: modelData.name.trim(),
      provider: modelData.provider.trim(),
      type: 'embedding',
      dimensions,
      pricePerMillionTokens,
      maxTokens,
      tokenizer: 'cl100k_base (approximated)',
      exactTokenizer: false,
      isCustom: true,
    };

    persist();

    return customModels[modelKey];
  }

  // Delete a custom model
  deleteCustomModel(modelKey) {
    if (builtInModels[modelKey]) {
      throw new Error('Cannot delete built-in model');
    }

    if (!customModels[modelKey]) {
      throw new Error(`Custom model not found: ${modelKey}`);
    }

    delete customModels[modelKey];
    persist();
  }

  // Check if a model exists
  modelExists(modelKey) {
    return !!(builtInModels[modelKey] || customModels[modelKey]);
  }

  // Get a specific model
  getModel(modelKey) {
    return builtInModels[modelKey] || customModels[modelKey];
  }

  // Update model price (works for both built-in and custom models)
  updateModelPrice(modelKey, newPrice) {
    const model = this.getModel(modelKey);
    if (!model) {
      throw new Error(`Model not found: ${modelKey}`);
    }

    if (builtInModels[modelKey]) {
      builtInModels[modelKey].pricePerMillionTokens = newPrice;
    } else if (customModels[modelKey]) {
      customModels[modelKey].pricePerMillionTokens = newPrice;
      persist();
    }
  }

  // Clear all custom models
  clearCustomModels() {
    customModels = {};
    persist();
  }
}

module.exports = new ModelsService();
