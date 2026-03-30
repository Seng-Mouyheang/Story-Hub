const express = require("express");
const app = express();
const port = process.env.PORT || 3000;
const { connectToDatabase } = require("./configuration/dbConfig");
const authRoutes = require("./routes/authRoutes");
const storyRoutes = require("./routes/storyRoutes");
const profileRoutes = require("./routes/profileRoute");

// Middleware to parse JSON bodies
app.use(express.json());

app.disable("x-powered-by");

const trustProxy = process.env.TRUST_PROXY_HOPS;
if (trustProxy !== undefined) {
  const trustProxyHops = Number(trustProxy);
  if (
    trustProxy.trim() === "" ||
    !Number.isInteger(trustProxyHops) ||
    trustProxyHops < 0
  ) {
    throw new Error("TRUST_PROXY_HOPS must be a non-negative integer");
  }
  app.set("trust proxy", trustProxyHops);
} else if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/stories", storyRoutes);
app.use("/api/profile", profileRoutes);

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
╚════════════════════════════════════════════════╝

╔════════════════════════════════════════════════╗
║   Login / Signup / Logout Routes               ║
╠════════════════════════════════════════════════╣
║   - POST /api/auth/login                       ║
║   - POST /api/auth/signup                      ║
║   - POST /api/auth/logout                      ║
╚════════════════════════════════════════════════╝

╔════════════════════════════════════════════════╗
║   Story Routes                                 ║
╠════════════════════════════════════════════════╣
║   - GET /api/stories/                          ║
║   - GET /api/stories/me                        ║
║   - GET /api/stories/:id                       ║
║   - POST /api/stories/                         ║
║   - PUT /api/stories/:id                       ║
║   - DELETE /api/stories/:id                    ║
╚════════════════════════════════════════════════╝

╔════════════════════════════════════════════════╗
║   Story Likes Routes                           ║
╠════════════════════════════════════════════════╣
║   - GET /api/stories/:id/likes                 ║
║   - POST /api/stories/:id/toggle-like          ║
╚════════════════════════════════════════════════╝

╔════════════════════════════════════════════════╗
║   Story Comments Routes                        ║
╠════════════════════════════════════════════════╣
║   - GET /api/stories/:id/comments              ║
║   - POST /api/stories/:id/comments             ║
║   - PUT /api/stories/comments/:id              ║
║   - DELETE /api/stories/comments/:id           ║
╚════════════════════════════════════════════════╝

╔════════════════════════════════════════════════╗
║   Story Comment's Likes / Replies Routes       ║
╠════════════════════════════════════════════════╣
║   - GET /api/stories/comments/:id/replies      ║
║   - POST /api/stories/comments/:id/toggle-like ║
╚════════════════════════════════════════════════╝

╔════════════════════════════════════════════════╗
║   Profile Routes                               ║
╠════════════════════════════════════════════════╣
║   - GET /api/profile/:userId                   ║
║   - PUT /api/profile/                          ║
╚════════════════════════════════════════════════╝
  `),
    );
  })
  .catch((error) => {
    console.error(
      "Failed to connect to the database. Server not started.",
      error,
    );
    process.exit(1);
  });
