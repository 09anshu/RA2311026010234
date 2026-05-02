function createLogger(options = {}) {
  const { redact = [], level = 'info' } = options

  function redactObj(obj) {
    if (!obj || typeof obj !== 'object') return obj
    const copy = Array.isArray(obj) ? [...obj] : { ...obj }
    for (const key of redact) {
      if (key in copy) copy[key] = '[REDACTED]'
    }
    return copy
  }

  return function logger(req, res, next) {
    const start = Date.now()
    const { method, url, headers } = req
    const safeHeaders = redactObj({ ...headers })

    const bodyPreview = req.body ? JSON.stringify(redactObj(req.body)).slice(0, 200) : ''

    const onFinish = () => {
      const duration = Date.now() - start
      const status = res.statusCode || 200

      const payload = {
        timestamp: new Date().toISOString(),
        method,
        url,
        status,
        duration_ms: duration,
        level,
      }

      if (bodyPreview) payload.requestBody = bodyPreview
      if (level === 'debug') {
        console.debug('[logger] ', JSON.stringify({ ...payload, headers: safeHeaders }))
      } else {
        console.log('[logger] ', JSON.stringify(payload))
      }
    }

    res.on && res.on('finish', onFinish)

    if (typeof next === 'function') return next()
    return null
  }
}

module.exports = createLogger
