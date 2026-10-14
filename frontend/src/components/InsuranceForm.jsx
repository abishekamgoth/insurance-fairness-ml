/**
 * Shared insurance input form used by Predict and Explainability pages.
 * Props:
 *   form        - form state object
 *   fieldErrors - per-field validation error strings
 *   loading     - boolean
 *   onFormChange(e) - change handler
 *   onSubmit(e)     - submit handler
 *   submitLabel - string for submit button (default: 'Submit')
 */
export default function InsuranceForm({
  form,
  fieldErrors = {},
  loading = false,
  onFormChange,
  onSubmit,
  submitLabel = 'Submit',
}) {
  return (
    <form onSubmit={onSubmit} noValidate>
      <div className="form-grid">
        {/* Age */}
        <div className="form-group">
          <label htmlFor="age">Age</label>
          <span className="helper-text">Years (18–120)</span>
          <input
            id="age"
            name="age"
            type="number"
            min="18"
            max="120"
            value={form.age}
            onChange={onFormChange}
            className={fieldErrors.age ? 'has-error' : ''}
            aria-describedby={fieldErrors.age ? 'age-error' : undefined}
          />
          {fieldErrors.age && (
            <span id="age-error" className="field-error" role="alert">
              {fieldErrors.age}
            </span>
          )}
        </div>

        {/* Sex */}
        <div className="form-group">
          <label htmlFor="sex">Gender</label>
          <span className="helper-text">Biological sex</span>
          <select
            id="sex"
            name="sex"
            value={form.sex}
            onChange={onFormChange}
          >
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </div>

        {/* BMI */}
        <div className="form-group">
          <label htmlFor="bmi">BMI</label>
          <span className="helper-text">Body Mass Index (10.0–60.0)</span>
          <input
            id="bmi"
            name="bmi"
            type="number"
            step="0.1"
            min="10"
            max="60"
            value={form.bmi}
            onChange={onFormChange}
            className={fieldErrors.bmi ? 'has-error' : ''}
            aria-describedby={fieldErrors.bmi ? 'bmi-error' : undefined}
          />
          {fieldErrors.bmi && (
            <span id="bmi-error" className="field-error" role="alert">
              {fieldErrors.bmi}
            </span>
          )}
        </div>

        {/* Children */}
        <div className="form-group">
          <label htmlFor="children">Number of Children</label>
          <span className="helper-text">Dependents (0–5)</span>
          <input
            id="children"
            name="children"
            type="number"
            min="0"
            max="5"
            value={form.children}
            onChange={onFormChange}
            className={fieldErrors.children ? 'has-error' : ''}
            aria-describedby={fieldErrors.children ? 'children-error' : undefined}
          />
          {fieldErrors.children && (
            <span id="children-error" className="field-error" role="alert">
              {fieldErrors.children}
            </span>
          )}
        </div>

        {/* Smoker */}
        <div className="form-group">
          <label htmlFor="smoker">Smoking Status</label>
          <span className="helper-text">Are you a smoker?</span>
          <select
            id="smoker"
            name="smoker"
            value={form.smoker}
            onChange={onFormChange}
          >
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </select>
        </div>

        {/* Region */}
        <div className="form-group">
          <label htmlFor="region">Region</label>
          <span className="helper-text">US region of residence</span>
          <select
            id="region"
            name="region"
            value={form.region}
            onChange={onFormChange}
          >
            <option value="northeast">Northeast</option>
            <option value="northwest">Northwest</option>
            <option value="southeast">Southeast</option>
            <option value="southwest">Southwest</option>
          </select>
        </div>
      </div>

      <div style={{ marginTop: '1.5rem' }}>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading}
        >
          {loading ? 'Processing…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
