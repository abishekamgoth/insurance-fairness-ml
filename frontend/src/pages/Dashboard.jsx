import { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { getOverview, getGroups } from '../api/client';
import StatCard from '../components/StatCard';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const usdFull = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

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

function ChartCard({ title, data, nameKey = 'name', valueKey = 'value' }) {
  return (
    <div className="chart-card">
      <div className="chart-title">{title}</div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey={nameKey} tick={{ fontSize: 12 }} />
          <YAxis
            tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
            tick={{ fontSize: 11 }}
            width={55}
          />
          <Tooltip content={<USDTooltip />} />
          <Bar dataKey={valueKey} fill="#0d9488" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function Dashboard() {
  const [overviewData, setOverviewData] = useState(null);
  const [groupsData, setGroupsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [overview, groups] = await Promise.all([getOverview(), getGroups()]);
      setOverviewData(overview);
      setGroupsData(groups);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) return <LoadingSpinner message="Loading analytics data…" />;
  if (error) return (
    <div className="page">
      <ErrorMessage message={error} onRetry={loadData} />
    </div>
  );

  const sexData = groupsData.sex.map((d) => ({
    name: d.name.charAt(0).toUpperCase() + d.name.slice(1),
    value: d.value,
  }));
  const smokerData = groupsData.smoker.map((d) => ({
    name: d.name === 'yes' ? 'Smoker' : 'Non-smoker',
    value: d.value,
  }));
  const ageData = groupsData.age_group;
  const bmiData = groupsData.bmi_category;
  const regionData = groupsData.region.map((d) => ({
    name: d.name.charAt(0).toUpperCase() + d.name.slice(1),
    value: d.value,
  }));

  return (
    <div className="page">
      <h1 className="page-title">Analytics Dashboard</h1>
      <p className="page-subtitle">
        Summary statistics and distribution of insurance charges across 1,338 dataset records.
      </p>

      <div className="stats-grid">
        <StatCard
          label="Total Records"
          value={overviewData.total_records.toLocaleString()}
          icon="📋"
        />
        <StatCard
          label="Average Charges"
          value={usd.format(overviewData.avg_charges)}
          subtitle="Historical average"
          icon="💰"
        />
        <StatCard
          label="Median Charges"
          value={usd.format(overviewData.median_charges)}
          subtitle="50th percentile"
          icon="📊"
        />
        <StatCard
          label="Average Age"
          value={overviewData.avg_age.toFixed(1)}
          subtitle="Years"
          icon="🎂"
        />
        <StatCard
          label="Average BMI"
          value={overviewData.avg_bmi.toFixed(1)}
          subtitle="kg/m²"
          icon="⚖️"
        />
      </div>

      <div className="charts-grid">
        <ChartCard
          title="Average Charges by Smoker Status"
          data={smokerData}
        />
        <ChartCard
          title="Average Charges by Age Group"
          data={ageData}
        />
        <ChartCard
          title="Average Charges by BMI Category"
          data={bmiData}
        />
        <ChartCard
          title="Average Charges by Region"
          data={regionData}
        />
        <ChartCard
          title="Average Charges by Gender"
          data={sexData}
        />
      </div>

      <div className="dataset-note">
        📌 Charts show <strong>Average Historical Charges (USD) from dataset records, not model predictions</strong>.
        Values are actual recorded charges from 1,338 insurance records in the dataset.
      </div>
    </div>
  );
}
