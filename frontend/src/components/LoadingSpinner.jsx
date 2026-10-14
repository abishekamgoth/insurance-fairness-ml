export default function LoadingSpinner({ message = 'Loading...' }) {
  return (
    <div className="spinner-wrapper" role="status" aria-live="polite">
      <div className="spinner" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}
