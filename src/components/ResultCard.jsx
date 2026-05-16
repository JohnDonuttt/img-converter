import { formatBytes } from '../lib/convert.js'

function labelOf(type, name) {
  if (type && type.startsWith('image/')) return type.slice(6).split('+')[0].toUpperCase()
  const ext = name.split('.').pop()
  return ext ? ext.toUpperCase() : 'IMG'
}

export default function ResultCard({ job, targetExt, onDownload, onRemove }) {
  const fromLabel = labelOf(job.fromType, job.name)
  const busy = job.status === 'wait' || job.status === 'busy'

  let delta = null
  if (job.status === 'done') {
    const diff = job.size - job.outSize
    const pct = job.size ? Math.round((diff / job.size) * 100) : 0
    delta = { good: diff > 0, pct }
  }

  return (
    <div className="card">
      <img className="thumb" src={job.thumbUrl} alt="" />

      <div className="meta">
        <div className="name">{job.name}</div>
        <div className="sub">
          {job.status === 'error' ? (
            <>
              <span className="pill err">Cannot convert</span>
              <span>{job.error}</span>
            </>
          ) : (
            <>
              <span className="pill from">{fromLabel}</span>
              <span className="arrow">&rarr;</span>
              <span className="pill to">{targetExt.toUpperCase()}</span>
              {job.status === 'done' ? (
                <>
                  <span>
                    {formatBytes(job.size)} &rarr; <b>{formatBytes(job.outSize)}</b>
                  </span>
                  <span className={'delta ' + (delta.good ? 'good' : 'bad')}>
                    {delta.good ? '−' : '+'}
                    {Math.abs(delta.pct)}%
                  </span>
                </>
              ) : (
                <span>{formatBytes(job.size)}</span>
              )}
            </>
          )}
        </div>
      </div>

      <div className="cstate">
        {busy && <div className="spinner" aria-label="Converting" />}

        {job.status === 'done' && (
          <button className="iconbtn dl" title="Download" aria-label="Download" onClick={onDownload}>
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14" />
            </svg>
          </button>
        )}

        {!busy && (
          <button className="iconbtn x" title="Remove" aria-label="Remove" onClick={onRemove}>
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}
