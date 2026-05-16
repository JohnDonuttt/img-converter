// All conversion runs in the browser — nothing is uploaded.

const LOSSY = new Set(['image/jpeg', 'image/webp'])

/**
 * Decode a file into something drawable on a canvas.
 * createImageBitmap covers png/jpeg/webp/gif/bmp/avif; the <img> fallback
 * additionally handles SVG and older browsers.
 */
async function decode(file) {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file)
    } catch {
      /* fall through to <img> */
    }
  }
  return await new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not decode this image'))
    }
    img.src = url
  })
}

/**
 * Convert a File to a Blob of the requested mime type.
 * @param {File} file        source image
 * @param {string} mime      target mime, e.g. "image/png"
 * @param {number} quality   0–100, only used for lossy formats
 * @returns {Promise<Blob>}
 */
export async function convertImage(file, mime, quality) {
  const src = await decode(file)
  const width = src.width || src.naturalWidth
  const height = src.height || src.naturalHeight
  if (!width || !height) throw new Error('Empty or invalid image')

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')

  // JPEG has no alpha channel — flatten transparency onto white,
  // otherwise transparent pixels turn black.
  if (mime === 'image/jpeg') {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)
  }
  ctx.drawImage(src, 0, 0)
  if (typeof src.close === 'function') src.close()

  const q = LOSSY.has(mime) ? quality / 100 : undefined
  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Encoder unavailable'))),
      mime,
      q,
    )
  })

  // Some browsers silently fall back to PNG when they can't encode a format.
  if (blob.type !== mime) {
    throw new Error(`This browser can't encode ${mime.split('/')[1].toUpperCase()}`)
  }
  return blob
}

export function formatBytes(n) {
  if (n < 1024) return n + ' B'
  if (n < 1048576) return (n / 1024).toFixed(1) + ' KB'
  return (n / 1048576).toFixed(2) + ' MB'
}

export function isLossy(mime) {
  return LOSSY.has(mime)
}
