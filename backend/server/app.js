const express = require('express')
const app = express()
const port = process.env.PORT || 3000
const { connectToDatabase } = require('./configuration/dbConfig');
const authRoutes = require('./routes/authRoutes');
const authenticationMiddleware = require('./middleware/authMiddleware');

// Middleware to parse JSON bodies
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
// Connect to the database before starting the server
connectToDatabase()
 .then(() => {
   app.listen(port, () => console.log(`Express started on http://localhost:${port}` + `\npress Ctrl-C to terminate.`));
 })
 .catch((error) => {
   console.error('Failed to connect to the database. Server not started.', error);
 });
