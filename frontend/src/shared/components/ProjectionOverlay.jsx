export default function ProjectionOverlay({ html, onClose }) {
  return (
    <div className="projection-overlay" onClick={onClose}>
      <button
        type="button"
        className="projection-exit-btn"
        onClick={(event) => {
          event.stopPropagation()
          onClose()
        }}
      >
        Exit
      </button>
      <div className="projection-content" onClick={(event) => event.stopPropagation()}>
        {html ? (
          <div className="projection-lyrics" dangerouslySetInnerHTML={{ __html: html }} />
        ) : (
          <p className="projection-empty">No lyrics available for projection.</p>
        )}
      </div>
      <div className="projection-hint">Press Esc or P to exit</div>
    </div>
  )
}
