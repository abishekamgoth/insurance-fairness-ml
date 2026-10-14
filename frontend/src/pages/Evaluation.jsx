import { useState, useEffect, useCallback } from 'react';
import { getMetrics } from '../api/client';
import StatCard from '../components/StatCard';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';

const usdNum = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

export default function Evaluation() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMetrics();
      setMetrics(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  if (loading) return <LoadingSpinner message="Loading model metrics…" />;
  if (error) return (
    <div className="page">
      <ErrorMessage message={error} onRetry={loadMetrics} />
    </div>
  );

  return (
    <div className="page">
      <h1 className="page-title">Model Evaluation</h1>
      <p className="page-subtitle">
        Performance metrics for the RandomForestRegressor evaluated on a held-out test set.
      </p>

      <div className="stats-grid">
        <StatCard
          label="Mean Absolute Error"
          value={usdNum.format(metrics.mae)}
          subtitle="Average prediction error"
          icon="📏"
        />
        <StatCard
          label="R² Score"
          value={metrics.r2.toFixed(4)}
          subtitle="Coefficient of determination"
          icon="📈"
        />
        <StatCard
          label="Test Set Size"
          value={metrics.test_size.toLocaleString()}
          subtitle="Records used for evaluation"
          icon="🧪"
        />
        <StatCard
          label="Train Set Size"
          value={metrics.train_size.toLocaleString()}
          subtitle="Records used for training"
          icon="🏋️"
        />
      </div>

      <div className="card" style={{ marginTop: '1rem' }}>
        <h2 style={{ marginBottom: '0.75rem', fontSize: '1rem' }}>About These Metrics</h2>
        <p style={{ color: 'var(--gray-600)', fontSize: '0.9rem', margin: 0, lineHeight: 1.7 }}>
          The model is evaluated on a held-out 20% test set ({metrics.test_size} records) using{' '}
          <code>random_state=42</code>. Metrics are computed using the saved{' '}
          <strong>RandomForestRegressor</strong> trained with scikit-learn 1.6.1.
        </p>
        <ul style={{ color: 'var(--gray-600)', fontSize: '0.9rem', marginTop: '0.75rem', lineHeight: 1.8 }}>
          <li>
            <strong>MAE (Mean Absolute Error):</strong> on average the model&apos;s predicted cost
            is off by {usdNum.format(metrics.mae)} from the actual recorded charge.
          </li>
          <li>
            <strong>R² Score:</strong> the model explains approximately{' '}
            {(metrics.r2 * 100).toFixed(1)}% of the variance in insurance charges.
          </li>
        </ul>
        <p style={{ color: 'var(--gray-600)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
          Model type: <strong>{metrics.model_type}</strong>. Dataset: 1,338 records from{' '}
          <code>notebook/insurance.csv</code>.
        </p>
      </div>
    </div>
  );
}
