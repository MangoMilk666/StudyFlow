const jwt = require('jsonwebtoken')

module.exports = function authRequired(req, res, next) {
  try {
    const header = req.headers.authorization || ''
    const [scheme, token] = header.split(' ')

    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const secret = process.env.JWT_SECRET || 'secret_key'
    const payload = jwt.verify(token, secret)
    req.user = payload
    return next()
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
}

