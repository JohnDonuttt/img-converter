import { useState, useRef, useEffect, useCallback } from 'react'
import ResultCard from './components/ResultCard.jsx'
import { convertImage, formatBytes, isLossy } from './lib/convert.js'

const FORMATS = [
  { label: 'PNG', mime: 'image/png', ext: 'png' },
  { label: 'JPEG', mime: 'image/jpeg', ext: 'jpg' },
  { label: 'WEBP', mime: 'image/webp', ext: 'webp' },
]

const ACCEPT_RE = /\.(png|jpe?g|webp|gif|bmp|avif|svg)$/i

let counter = 0

export default function App() {
  const [format, setFormat] = useState(FORMATS[0])
  const [quality, setQuality] = useState(90)
  const [jobs, setJobs] = useState([])
  const [hot, setHot] = useState(false)

  const inputRef = useRef(null)
  const dragDepth = useRef(0)
  const jobsRef = useRef(jobs)
  useEffect(() => {
    jobsRef.current = jobs
  }, [jobs])

  // Convert one job with the given format/quality, then patch it into state.
  const runConvert = useCallback(async (job, fmt, q) => {
    setJobs((prev) => prev.map((j) => (j.id === job.id ? { ...j, status: 'busy' } : j)))
    try {
      const blob = await convertImage(job.file, fmt.mime, q)
      const outUrl = URL.createObjectURL(blob)
      setJobs((prev) =>
        prev.map((j) => {
          if (j.id !== job.id) return j
          if (j.outUrl) URL.revokeObjectURL(j.outUrl)
          return { ...j, status: 'done', blob, outSize: blob.size, outUrl, error: null }
        }),
      )
    } catch (err) {
      setJobs((prev) =>
        prev.map((j) => (j.id === job.id ? { ...j, status: 'error', error: err.message } : j)),
      )
    }
  }, [])

  const addFiles = useCallback(
    (fileList) => {
      const files = [...fileList].filter(
        (f) => f.type.startsWith('image/') || ACCEPT_RE.test(f.name),
      )
      if (!files.length) return

      const newJobs = files.map((file) => ({
        id: ++counter,
        file,
        name: file.name,
        size: file.size,
        fromType: file.type,
        thumbUrl: URL.createObjectURL(file),
        status: 'wait',
        blob: null,
        outSize: 0,
        outUrl: null,
        error: null,
      }))

      setJobs((prev) => [...newJobs, ...prev])
      newJobs.forEach((j) => runConvert(j, format, quality))
    },
    [format, quality, runConvert],
  )

  const reconvertAll = useCallback(
    (fmt, q) => {
      jobsRef.current.forEach((j) => {
        if (j.status !== 'error') runConvert(j, fmt, q)
      })
    },
    [runConvert],
  )

  const changeFormat = (fmt) => {
    setFormat(fmt)
    reconvertAll(fmt, quality)
  }

  const commitQuality = () => {
    if (isLossy(format.mime)) reconvertAll(format, quality)
  }

  // ----- file pickers -----
  const openPicker = () => inputRef.current?.click()

  const onInputChange = (e) => {
    if (e.target.files?.length) addFiles(e.target.files)
    e.target.value = ''
  }

  // ----- drag & drop -----
  const onDragEnter = (e) => {
    e.preventDefault()
    dragDepth.current += 1
    setHot(true)
  }
  const onDragOver = (e) => {
    e.preventDefault()
  }
  const onDragLeave = (e) => {
    e.preventDefault()
    dragDepth.current -= 1
    if (dragDepth.current <= 0) {
      dragDepth.current = 0
      setHot(false)
    }
  }
  const onDrop = (e) => {
    e.preventDefault()
    dragDepth.current = 0
    setHot(false)
    if (e.dataTransfer?.files?.length) addFiles(e.dataTransfer.files)
  }

  // paste images anywhere on the page
  useEffect(() => {
    const onPaste = (e) => {
      if (e.clipboardData?.files?.length) addFiles(e.clipboardData.files)
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [addFiles])

  // revoke object URLs on unmount
  useEffect(() => {
    return () => {
      jobsRef.current.forEach((j) => {
        if (j.thumbUrl) URL.revokeObjectURL(j.thumbUrl)
        if (j.outUrl) URL.revokeObjectURL(j.outUrl)
      })
    }
  }, [])

  // ----- actions -----
  const download = (job) => {
    if (!job.outUrl) return
    const a = document.createElement('a')
    a.href = job.outUrl
    a.download = job.name.replace(/\.[^.]+$/, '') + '.' + format.ext
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  const downloadAll = async () => {
    const ready = jobsRef.current.filter((j) => j.status === 'done')
    for (const job of ready) {
      download(job)
      await new Promise((r) => setTimeout(r, 250)) // stagger so the browser allows each
    }
  }

  const removeJob = (job) => {
    if (job.thumbUrl) URL.revokeObjectURL(job.thumbUrl)
    if (job.outUrl) URL.revokeObjectURL(job.outUrl)
    setJobs((prev) => prev.filter((j) => j.id !== job.id))
  }

  const clearAll = () => {
    jobsRef.current.forEach((j) => {
      if (j.thumbUrl) URL.revokeObjectURL(j.thumbUrl)
      if (j.outUrl) URL.revokeObjectURL(j.outUrl)
    })
    setJobs([])
  }

  // ----- derived stats -----
  const done = jobs.filter((j) => j.status === 'done')
  const busy = jobs.some((j) => j.status === 'wait' || j.status === 'busy')
  const errors = jobs.filter((j) => j.status === 'error').length
  const inSize = done.reduce((s, j) => s + j.size, 0)
  const outSize = done.reduce((s, j) => s + j.outSize, 0)
  const saved = inSize - outSize

  let statusText = 'Ready.'
  if (busy) {
    statusText = `Developing… ${done.length}/${jobs.length}`
  } else if (jobs.length) {
    statusText = `${done.length} image${done.length === 1 ? '' : 's'} ready`
    if (done.length && saved > 0) {
      statusText += ` — saved ${formatBytes(saved)} (${Math.round((saved / inSize) * 100)}%)`
    }
    if (errors) statusText += ` · ${errors} failed`
  }

  return (
    <div className="wrap">
      <header>
        <div className="brand">
          <div className="lamp" aria-hidden="true" />
          <h1>
            SAFE<span className="dim">LIGHT</span>
          </h1>
        </div>
        <div className="tag">
          Image converter
          <br />
          <b>WebP · PNG · JPEG</b> — in your browser
        </div>
      </header>

      <div
        className={'drop' + (hot ? ' hot' : '')}
        role="button"
        tabIndex={0}
        aria-label="Add images"
        onClick={openPicker}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            openPicker()
          }
        }}
        onDragEnter={onDragEnter}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <div className="ring" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </div>
        <h2>Drop images to develop</h2>
        <p>
          or <span className="browse">browse your files</span> — convert as many as you like, at once
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={onInputChange}
        />
      </div>

      <div className="console">
        <div className="field">
          <label>Convert to</label>
          <div className="seg" role="group" aria-label="Output format">
            {FORMATS.map((f) => (
              <button
                key={f.mime}
                className={f.mime === format.mime ? 'on' : ''}
                onClick={() => changeFormat(f)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {isLossy(format.mime) && (
          <div className="field qbox">
            <label>Quality</label>
            <div className="qrow">
              <input
                type="range"
                min="10"
                max="100"
                value={quality}
                onChange={(e) => setQuality(Number(e.target.value))}
                onMouseUp={commitQuality}
                onTouchEnd={commitQuality}
                onKeyUp={commitQuality}
              />
              <span className="qval">{quality}</span>
            </div>
          </div>
        )}
      </div>

      {jobs.length > 0 && (
        <div className="results">
          <div className="bar">
            <div
              className="stat"
              dangerouslySetInnerHTML={{
                __html: statusText.replace(
                  /saved ([^(]+)/,
                  'saved <b>$1</b>',
                ),
              }}
            />
            <div className="actions">
              <button className="btn" onClick={clearAll}>
                Clear
              </button>
              <button className="btn primary" onClick={downloadAll} disabled={done.length === 0}>
                Download all
              </button>
            </div>
          </div>

          <div className="list">
            {jobs.map((job) => (
              <ResultCard
                key={job.id}
                job={job}
                targetExt={format.ext}
                onDownload={() => download(job)}
                onRemove={() => removeJob(job)}
              />
            ))}
          </div>
        </div>
      )}

      <footer>
        <span className="lock">
          ⚡ 100% local — nothing is uploaded, your images never leave this device.
        </span>
        <span>Built for the darkroom · {new Date().getFullYear()}</span>
      </footer>
    </div>
  )
}
