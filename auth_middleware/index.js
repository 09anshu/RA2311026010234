function decodeJwtPayload(token) {
  try {
    const parts = token.split('.')
    if (parts.length < 2) return null
    const payload = Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
    return JSON.parse(payload)
  } catch (e) {
    return null
  }
}
function createAuthMiddleware(options = {}) {
  const { trustedToken } = options

  return function authMiddleware(req, res, next) {
    const header = req.headers.authorization || req.headers.Authorization
    if (!header) {
      return res.status(401).json({ error: 'Missing Authorization header' })
    }

    const [scheme, token] = header.split(' ')
    if (!scheme || scheme.toLowerCase() !== 'bearer' || !token) {
      return res.status(401).json({ error: 'Invalid Authorization format' })
    }

    if (trustedToken && token === trustedToken) {
      req.user = decodeJwtPayload(token) || { access_token: token }
      return next()
    }

    const payload = decodeJwtPayload(token)
    if (!payload) {
      return res.status(401).json({ error: 'Unable to decode token' })
    }
    if (payload.exp && Number.isFinite(payload.exp)) {
      const now = Math.floor(Date.now() / 1000)
      if (now >= payload.exp) {
        return res.status(401).json({ error: 'Token has expired' })
      }
    }

    req.user = payload
    return next()
  }
}

module.exports = createAuthMiddleware
