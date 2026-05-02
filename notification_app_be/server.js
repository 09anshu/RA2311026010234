const express = require('express')
const createLogger = require('../logging_middleware')
const createAuth = require('../auth_middleware')

const app = express()
app.use(express.json())
app.use(createLogger({ redact: ['password', 'token'] }))

const TRUSTED_TOKEN = process.env.HIRE_MANAGER_TRUSTED_TOKEN || ''

app.get('/health', (req, res) => res.json({ ok: true }))

app.get('/notifications', createAuth({ trustedToken: TRUSTED_TOKEN }), (req, res) => {
 
  const sample = [
    { id: 'n1', type: 'Event', message: 'Placement drive on campus', timestamp: new Date().toISOString() },
    { id: 'n2', type: 'Result', message: 'Exam results published', timestamp: new Date().toISOString() },
  ]

  res.json({ notifications: sample, user: req.user })
})

const port = process.env.PORT || 3001
app.listen(port, () => console.log(`Notification BE demo running on http://localhost:${port}`))
