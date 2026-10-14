export default function StatCard({ label, value, subtitle, icon }) {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
        {icon && <span style={{ fontSize: '1.3rem' }}>{icon}</span>}
        <span
          style={{
            fontSize: '0.7rem',
            fontWeight: 600,
            color: 'var(--gray-600)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}
        >
          {label}
        </span>
      </div>
      <div
        style={{
          fontSize: '1.75rem',
          fontWeight: 700,
          color: 'var(--navy)',
          lineHeight: 1.2,
        }}
      >
        {value}
      </div>
      {subtitle && (
        <div style={{ fontSize: '0.8rem', color: 'var(--gray-600)', marginTop: '0.15rem' }}>
          {subtitle}
        </div>
      )}
    </div>
  );
}
