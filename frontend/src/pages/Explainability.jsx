import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts';
import { postExplain } from '../api/client';
import InsuranceForm from '../components/InsuranceForm';
import ErrorMessage from '../components/ErrorMessage';

const usdFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
});

const INITIAL_FORM = {
  age: '',
  sex: 'male',
  bmi: '',
  children: 0,
  smoker: 'no',
  region: 'northeast',
};

function validate(form) {
  const errors = {};
  const age = Number(form.age);
  if (form.age === '' || isNaN(age)) {
    errors.age = 'Age is required.';
  } else if (age < 18) {
    errors.age = 'Age must be at least 18.';
  } else if (age > 120) {
    errors.age = 'Age must be 120 or less.';
  }
  const bmi = Number(form.bmi);
  if (form.bmi === '' || isNaN(bmi)) {
    errors.bmi = 'BMI is required.';
  } else if (bmi < 10.0) {
    errors.bmi = 'BMI must be at least 10.0.';
  } else if (bmi > 60.0) {
    errors.bmi = 'BMI must be 60.0 or less.';
  }
  const children = Number(form.children);
  if (isNaN(children) || children < 0 || children > 5) {
    errors.children = 'Children must be between 0 and 5.';
  }
  return errors;
}

function SHAPTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    const val = payload[0].value;
    return (
      <div style={{
        background: 'white', border: '1px solid #e2e8f0', borderRadius: 8,
        padding: '0.5rem 0.75rem', fontSize: '0.85rem',
      }}>
        <p style={{ margin: 0, fontWeight: 600 }}>{label}</p>
        <p style={{ margin: 0, color: val >= 0 ? '#0d9488' : '#ef4444' }}>
          SHAP: {val >= 0 ? '+' : ''}{usdFormatter.format(val)}
        </p>
      </div>
    );
  }
  return null;
}

export default function Explainability() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState(null);

  function handleFormChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errors = validate(form);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setResult(null);
    setApiError(null);
    setLoading(true);

    try {
      const payload = {
        age: parseInt(form.age, 10),
        sex: form.sex,
        bmi: parseFloat(form.bmi),
        children: parseInt(form.children, 10),
        smoker: form.smoker,
        region: form.region,
      };
      const data = await postExplain(payload);
      setResult(data);
    } catch (err) {
      setApiError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <h1 className="page-title">Model Explainability</h1>
      <p className="page-subtitle">
        See which features drive the predicted cost using SHAP (SHapley Additive exPlanations).
      </p>

      <div className="card">
        <InsuranceForm
          form={form}
          fieldErrors={fieldErrors}
          loading={loading}
          onFormChange={handleFormChange}
          onSubmit={handleSubmit}
          submitLabel="Explain Prediction"
        />
      </div>

      {apiError && (
        <ErrorMessage
          message={`Backend error: ${apiError}`}
          onRetry={() => setApiError(null)}
        />
      )}

      {result && !apiError && (
        <div className="card" style={{ marginTop: '2rem' }}>
          <div style={{ marginBottom: '1rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--gray-600)' }}>
              Base Value (average prediction):
            </span>{' '}
            <strong style={{ color: 'var(--navy)', fontSize: '1rem' }}>
              {usdFormatter.format(result.base_value)}
            </strong>
          </div>

          <h2 style={{ fontSize: '1rem', color: 'var(--navy)', marginBottom: '0.5rem' }}>
            Feature Contributions (SHAP Values)
          </h2>

          <ResponsiveContainer width="100%" height={result.features.length * 46 + 40}>
            <BarChart
              data={result.features}
              layout="vertical"
              margin={{ top: 4, right: 24, left: 100, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis
                type="number"
                tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`}
                tick={{ fontSize: 11 }}
                label={{
                  value: 'SHAP Value (impact on predicted cost in USD)',
                  position: 'insideBottom',
                  offset: -2,
                  fontSize: 11,
                  fill: '#475569',
                }}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 12 }}
                width={95}
              />
              <Tooltip content={<SHAPTooltip />} />
              <ReferenceLine x={0} stroke="#94a3b8" />
              <Bar dataKey="shap_value" radius={[0, 4, 4, 0]}>
                {result.features.map((entry) => (
                  <Cell
                    key={entry.name}
                    fill={entry.shap_value >= 0 ? '#0d9488' : '#ef4444'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          <div className="dataset-note" style={{ marginTop: '1rem' }}>
            Features with <span style={{ color: '#0d9488', fontWeight: 600 }}>positive</span> SHAP values
            increase the predicted cost; <span style={{ color: '#ef4444', fontWeight: 600 }}>negative</span> values
            decrease it. Smoker status and age typically have the largest impact.
          </div>
        </div>
      )}
    </div>
  );
}
