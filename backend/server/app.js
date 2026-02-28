const express = require("express");
const app = express();
const port = process.env.PORT || 3000;
const { connectToDatabase } = require("./configuration/dbConfig");
const authRoutes = require("./routes/authRoutes");
const storyRoutes = require("./routes/storyRoutes");

// Middleware to parse JSON bodies
app.use(express.json());

app.disable("x-powered-by");

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/stories", storyRoutes);

// Connect to the database before starting the server
connectToDatabase()
  .then(() => {
    app.listen(port, () =>
      console.log(`
╔════════════════════════════════════════════════╗
║   Backend Server Running                       ║
╠════════════════════════════════════════════════╣
║   Express started on http://localhost:${port}     ║
║   press Ctrl-C to terminate.                   ║
║                                                ║
║   Routes:                                      ║
║   - POST /api/auth/login                       ║
║   - POST /api/auth/signup                      ║
║                                                ║
║   - GET /api/stories/                          ║
║   - GET /api/stories/me                        ║
║   - GET /api/stories/:id                       ║
║   - POST /api/stories/                         ║
║   - PUT /api/stories/:id                       ║
║   - DELETE /api/stories/:id                    ║
║                                                ║
║   - GET /api/stories/:id/likes                 ║
║   - POST /api/stories/:id/toggle-like          ║
╚════════════════════════════════════════════════╝
  `),
    );
  })
  .catch((error) => {
    console.error(
      "Failed to connect to the database. Server not started.",
      error,
    );
  });
