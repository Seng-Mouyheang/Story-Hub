const express = require('express')
const app = express()
const port = process.env.PORT || 3000

// If you see cannot GET, is because I haven't setup any route to /

app.listen(port, () => console.log(`Express started on http://localhost:${port}` + `\npress Ctrl-C to terminate.`))

