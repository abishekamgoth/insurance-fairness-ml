export default function ErrorMessage({ message, onRetry }) {
  return (
    <div className="error-card" role="alert">
      <span className="error-icon" aria-hidden="true">⚠️</span>
      <div className="error-body">
        <p className="error-message">{message}</p>
        {onRetry && (
          <button className="btn btn-primary" onClick={onRetry} type="button">
            Retry
          </button>
        )}
      </div>
    </div>
  );
}
