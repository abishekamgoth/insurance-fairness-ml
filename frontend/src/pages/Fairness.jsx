import { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { getOverview } from '../api/client';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';

const usdFull = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
});

function USDTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: 'white', border: '1px solid #e2e8f0', borderRadius: 8,
        padding: '0.5rem 0.75rem', fontSize: '0.85rem',
      }}>
        <p style={{ margin: 0, fontWeight: 600 }}>{label}</p>
        <p style={{ margin: 0, color: '#0d9488' }}>{usdFull.format(payload[0].value)}</p>
      </div>
    );
  }
  return null;
}

export default function Fairness() {
  const [overviewData, setOverviewData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getOverview();
      setOverviewData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) return <LoadingSpinner message="Loading fairness data…" />;
  if (error) return (
    <div className="page">
      <ErrorMessage message={error} onRetry={loadData} />
    </div>
  );

  const sexChartData = overviewData.charges_by_sex.map((d) => ({
    name: d.sex.charAt(0).toUpperCase() + d.sex.slice(1),
    avg_charges: d.avg_charges,
  }));

  const smokerChartData = overviewData.charges_by_smoker.map((d) => ({
    name: d.group === 'yes' ? 'Smoker' : 'Non-smoker',
    avg_charges: d.avg_charges,
  }));

  return (
    <div className="page">
      <h1 className="page-title">Fairness Analysis</h1>
      <p className="page-subtitle">
        Comparison of historical insurance charges across demographic groups.
      </p>

      <div
        className="card"
        style={{
          background: 'var(--light-teal)',
          border: '1px solid var(--teal)',
          marginBottom: '1.5rem',
          fontSize: '0.9rem',
          color: 'var(--gray-700)',
        }}
      >
        ⚠️ <strong>Disclaimer:</strong> This analysis is based on historical charges from the
        1,338-record insurance dataset. It shows patterns in actual recorded charges, not model
        predictions or prescriptions.
      </div>

      <div className="charts-grid">
        {/* Gender chart */}
        <div className="chart-card">
          <div className="chart-title">Average Charges by Gender</div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={sexChartData} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 13 }} />
              <YAxis
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                tick={{ fontSize: 11 }}
                width={55}
              />
              <Tooltip content={<USDTooltip />} />
              <Bar dataKey="avg_charges" fill="#0d9488" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <p style={{ fontSize: '0.85rem', color: 'var(--gray-600)', marginTop: '0.75rem', marginBottom: 0 }}>
            The dataset shows a small difference in average charges between male and female
            policyholders. This may reflect differences in age, BMI, or smoking rates in the
            sample rather than direct gender-based pricing.
          </p>
        </div>

        {/* Smoker chart */}
        <div className="chart-card">
          <div className="chart-title">Average Charges by Smoker Status</div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={smokerChartData} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 13 }} />
              <YAxis
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                tick={{ fontSize: 11 }}
                width={55}
              />
              <Tooltip content={<USDTooltip />} />
              <Bar dataKey="avg_charges" fill="#0d9488" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <p style={{ fontSize: '0.85rem', color: 'var(--gray-600)', marginTop: '0.75rem', marginBottom: 0 }}>
            Smokers have substantially higher average charges than non-smokers in this dataset.
            Smoking status is the single largest predictor of insurance cost in the model.
          </p>
        </div>
      </div>
    </div>
  );
}
