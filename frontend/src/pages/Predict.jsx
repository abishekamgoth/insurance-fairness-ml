import { useState } from 'react';
import { postPredict } from '../api/client';
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

export default function Predict() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState(null);

  function handleFormChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    // Clear field error on change
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
      const data = await postPredict(payload);
      setResult(data);
    } catch (err) {
      setApiError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setResult(null);
    setApiError(null);
    setFieldErrors({});
    setForm(INITIAL_FORM);
  }

  const inputLabels = {
    age: 'Age',
    sex: 'Gender',
    bmi: 'BMI',
    children: 'Children',
    smoker: 'Smoker',
    region: 'Region',
  };

  return (
    <div className="page">
      <h1 className="page-title">Insurance Cost Prediction</h1>
      <p className="page-subtitle">
        Enter your details below to get an estimated insurance cost from the trained model.
      </p>

      <div className="card">
        <InsuranceForm
          form={form}
          fieldErrors={fieldErrors}
          loading={loading}
          onFormChange={handleFormChange}
          onSubmit={handleSubmit}
          submitLabel="Predict Insurance Cost"
        />
      </div>

      {apiError && (
        <ErrorMessage
          message={`Backend error: ${apiError}`}
          onRetry={() => {
            setApiError(null);
          }}
        />
      )}

      {result && !apiError && (
        <div className="result-card">
          <h2 style={{ margin: '0 0 0.25rem', color: 'var(--navy)' }}>Estimated Insurance Cost</h2>
          <p style={{ margin: '0 0 0.5rem', color: 'var(--gray-600)', fontSize: '0.85rem' }}>
            Predicted by the RandomForestRegressor model · currency: {result.currency}
          </p>
          <div className="result-cost">{usdFormatter.format(result.predicted_cost)}</div>

          <h3 style={{ marginTop: '1.5rem', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--gray-600)' }}>
            Inputs Used
          </h3>
          <table className="inputs-table">
            <thead>
              <tr>
                <th>Field</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(result.inputs).map(([key, val]) => (
                <tr key={key}>
                  <td>{inputLabels[key] || key}</td>
                  <td>{String(val)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ marginTop: '1.5rem' }}>
            <button className="btn btn-secondary" onClick={handleReset} type="button">
              Make Another Prediction
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
