import React, { useState } from 'react';
import axios from 'axios';
import './EditPriceModal.css';

function EditPriceModal({ model, isOpen, onClose, onSuccess }) {
  const [price, setPrice] = useState(model?.pricePerMillionTokens || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !model) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!price || isNaN(price) || price < 0) {
      setError('Please enter a valid price (non-negative number)');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.put(`/api/models/${model.key}/price`, {
        pricePerMillionTokens: parseFloat(price),
      });

      if (response.data.success) {
        setPrice('');
        onSuccess();
        onClose();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update price');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>✏️ Edit Model Price</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="price-form">
          <div className="form-group">
            <label>Model: <strong>{model.name}</strong></label>
          </div>

          <div className="form-group">
            <label htmlFor="price">Price per 1M Tokens ($)</label>
            <input
              id="price"
              type="number"
              step="0.00001"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="e.g., 0.02"
              required
            />
            <small>Current: ${model.pricePerMillionTokens}</small>
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="form-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? 'Updating...' : 'Update Price'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditPriceModal;
