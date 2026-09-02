import React, { useState } from 'react';
import './AddModelModal.css';

function AddModelModal({ isOpen, onClose, onAddModel, loading }) {
  const [formData, setFormData] = useState({
    modelKey: '',
    name: '',
    provider: '',
    dimensions: '768',
    pricePerMillionTokens: '0.1',
    maxTokens: '2048',
  });
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.modelKey.trim() || !formData.name.trim() || !formData.provider.trim()) {
      setError('Please fill in all required fields');
      return;
    }

    if (!/^[a-z0-9-]+$/.test(formData.modelKey)) {
      setError('Model Key must contain only lowercase letters, numbers, and hyphens');
      return;
    }

    if (isNaN(parseFloat(formData.pricePerMillionTokens)) || parseFloat(formData.pricePerMillionTokens) < 0) {
      setError('Price per Million Tokens must be a non-negative number');
      return;
    }

    if (isNaN(parseInt(formData.dimensions)) || parseInt(formData.dimensions) <= 0) {
      setError('Dimensions must be a positive number');
      return;
    }

    if (isNaN(parseInt(formData.maxTokens)) || parseInt(formData.maxTokens) <= 0) {
      setError('Max Tokens must be a positive number');
      return;
    }

    await onAddModel(formData);
    
    if (!error) {
      setFormData({
        modelKey: '',
        name: '',
        provider: '',
        dimensions: '768',
        pricePerMillionTokens: '0.1',
        maxTokens: '2048',
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add Custom Embedding Model</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="model-form">
          <div className="form-row">
            <div className="form-group full-width">
              <label htmlFor="modelKey">Model Key *</label>
              <input
                type="text"
                id="modelKey"
                name="modelKey"
                value={formData.modelKey}
                onChange={handleChange}
                placeholder="e.g., my-custom-model"
                disabled={loading}
                required
              />
              <small>Lowercase letters, numbers, and hyphens only</small>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="name">Model Name *</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g., My Custom Model"
                disabled={loading}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="provider">Provider *</label>
              <input
                type="text"
                id="provider"
                name="provider"
                value={formData.provider}
                onChange={handleChange}
                placeholder="e.g., MyCompany"
                disabled={loading}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="dimensions">Dimensions</label>
              <input
                type="number"
                id="dimensions"
                name="dimensions"
                value={formData.dimensions}
                onChange={handleChange}
                min="1"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="pricePerMillionTokens">Price per 1M Tokens ($)</label>
              <input
                type="number"
                id="pricePerMillionTokens"
                name="pricePerMillionTokens"
                value={formData.pricePerMillionTokens}
                onChange={handleChange}
                min="0"
                step="0.0001"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="maxTokens">Max Tokens</label>
              <input
                type="number"
                id="maxTokens"
                name="maxTokens"
                value={formData.maxTokens}
                onChange={handleChange}
                min="1"
                disabled={loading}
              />
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-cancel"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Adding...' : '➕ Add Model'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddModelModal;
