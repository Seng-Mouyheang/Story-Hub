const express = require("express");
const app = express();
const path = require("node:path");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
require("dotenv").config({ path: path.resolve(__dirname, "../../../.env") });
const { connectToDatabase } = require("./src/configuration/dbConfig");
const authRoutes = require("./src/routes/authRoutes");
const storyRoutes = require("./src/routes/storyRoutes");
const confessionRoutes = require("./src/routes/confessionRoutes");
const profileRoutes = require("./src/routes/profileRoute");
const searchRoutes = require("./src/routes/searchRoutes");
const uploadThingRoutes = require("./src/routes/uploadThingRoute");
const dashboardRoutes = require("./src/routes/dashboardRoutes");
const recommendationRoutes = require("./src/routes/recommendationRoutes");

const port = process.env.PORT;
const allowedOrigins = new Set(
  String(
    process.env.CORS_ORIGIN ||
      process.env.FRONTEND_ORIGIN ||
      "http://localhost:5173",
  )
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
);

const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many API requests. Please try again later." },
});

app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || "1mb" }));
app.use("/api", apiRateLimiter);
app.use("/api/uploadthing", uploadThingRoutes);

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
app.use("/api/confessions", confessionRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/recommendations", recommendationRoutes);

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
╔════════════════════════════════════════════════╗            ║    Account Routes                              ║
║   Login / Signup / Logout Routes               ║            ╠════════════════════════════════════════════════╣
╠════════════════════════════════════════════════╣            ║   - POST /api/auth/recover                     ║
║   - POST /api/auth/login                       ║            ║   - PATCH /api/auth/email                      ║
║   - POST /api/auth/signup                      ║            ║   - PATCH /api/auth/password                   ║
║   - POST /api/auth/logout                      ║            ║   - DELETE /api/auth/account                   ║
╚════════════════════════════════════════════════╝            ╚════════════════════════════════════════════════╝

╔════════════════════════════════════════════════╗            ╔════════════════════════════════════════════════╗        
║   Story Routes                                 ║            ║   Confession Routes                            ║
╠════════════════════════════════════════════════╣            ╠════════════════════════════════════════════════╣  
║   - GET /api/stories/                          ║            ║   - GET /api/confessions/                      ║
║   - GET /api/stories/me                        ║            ║   - GET /api/confessions/me                    ║
║   - GET /api/stories/me/deleted                ║            ║   - GET /api/confessions/me/deleted            ║
║   - GET /api/stories/:id                       ╠════════════╣   - GET /api/confessions/:id                   ║
║   - POST /api/stories/                         ║            ║   - POST /api/confessions/                     ║ 
║   - PUT /api/stories/:id                       ║            ║   - PUT /api/confessions/:id                   ║  
║   - DELETE /api/stories/:id                    ║            ║   - DELETE /api/confessions/:id                ║
║   - POST /api/stories/:id/restore              ║            ║   - POST /api/confessions/:id/restore          ║
╚════════════════════════════════════════════════╝            ╚════════════════════════════════════════════════╝

╔════════════════════════════════════════════════╗            ╔════════════════════════════════════════════════╗       
║   Story Likes Routes                           ║            ║   Confession Likes Routes                      ║
╠════════════════════════════════════════════════╣            ╠════════════════════════════════════════════════╣
║   - GET /api/stories/:id/likes                 ╠════════════╣   - GET /api/confessions/:id/likes             ║
║   - POST /api/stories/:id/toggle-like          ║            ║   - POST /api/confessions/:id/toggle-like      ║
╚════════════════════════════════════════════════╝            ╚════════════════════════════════════════════════╝

╔════════════════════════════════════════════════╗            ╔════════════════════════════════════════════════╗  
║   Story Comments Routes                        ║            ║   Confession Comments Routes                   ║
╠════════════════════════════════════════════════╣            ╠════════════════════════════════════════════════╣  
║   - GET /api/stories/:id/comments              ║            ║   - GET /api/confessions/:id/comments          ║
║   - POST /api/stories/:id/comments             ╠════════════╣   - POST /api/confessions/:id/comments         ║
║   - PUT /api/stories/comments/:id              ║            ║   - PUT /api/confessions/comments/:id          ║
║   - DELETE /api/stories/comments/:id           ║            ║   - DELETE /api/confessions/comments/:id       ║
╚════════════════════════════════════════════════╝            ╚════════════════════════════════════════════════╝

╔════════════════════════════════════════════════╗            ╔════════════════════════════════════════════════════╗
║   Story Comment's Likes / Replies Routes       ║            ║   Confession Comment's Likes / Replies Routes      ║
╠════════════════════════════════════════════════╣            ╠════════════════════════════════════════════════════╣
║   - GET /api/stories/comments/:id/replies      ╠════════════╣   - GET /api/confessions/comments/:id/replies      ║
║   - POST /api/stories/comments/:id/toggle-like ║            ║   - POST /api/confessions/comments/:id/toggle-like ║
╚════════════════════════════════════════════════╝            ╚════════════════════════════════════════════════════╝

╔════════════════════════════════════════════════╗            ╔════════════════════════════════════════════════╗
║   Story Bookmark Routes                        ║            ║   (Optional) Confession Bookmark Routes        ║
╠════════════════════════════════════════════════╣            ╠════════════════════════════════════════════════╣
║   - GET /api/stories/bookmarks/me              ║            ║   - GET /api/confessions/bookmarks/me          ║
║   - GET /api/stories/:id/bookmark-status       ╠════════════╣   - GET /api/confessions/:id/bookmark-status   ║
║   - POST /api/stories/:id/toggle-bookmark      ║            ║   - POST /api/confessions/:id/toggle-bookmark  ║
║   - DELETE /api/stories/:id/bookmark           ║            ║   - DELETE /api/confessions/:id/bookmark       ║
╚════════════════════════════════════════════════╝            ╚════════════════════════════════════════════════╝

╔════════════════════════════════════════════════╗            ╔════════════════════════════════════════════════╗   
║   Profile Routes                               ║            ║   Search Routes                                ║
╠════════════════════════════════════════════════╣            ╠════════════════════════════════════════════════╣
║   - GET /api/profile/:userId                   ║            ║   - GET /api/search/                           ║
║   - PUT /api/profile/                          ║            ║   - GET /api/profile/search/accounts           ║
╚════════════════════════════════════════════════╝            ║   - GET /api/stories/search/title              ║
                                                              ║   - GET /api/stories/tags/:tag                 ║
╔════════════════════════════════════════════════╗            ║   - GET /api/confessions/tags/:tag             ║
║   Follow Routes                                ║            ║   - GET /api/stories/categories                ║
╠════════════════════════════════════════════════╣            ║   - GET /api/stories/interests/me              ║           
║   - POST /api/profile/:userId/follow           ║            ╚════════════════════════════════════════════════╝
║   - DELETE /api/profile/:userId/follow         ║
║   - GET /api/profile/:userId/follow/status     ║
║   - GET /api/profile/:userId/followers         ║
║   - GET /api/profile/:userId/following         ║
╚════════════════════════════════════════════════╝

╔════════════════════════════════════════════════╗
║   Dashboard Routes                             ║
╠════════════════════════════════════════════════╣
║   - GET /api/dashboard/stats                   ║
║   - GET /api/dashboard/stories                 ║
║   - GET /api/dashboard/confessions             ║
╚════════════════════════════════════════════════╝

╔════════════════════════════════════════════════╗
║   Recommendation Routes                        ║
╠════════════════════════════════════════════════╣
║   - GET /api/recommendations/authors           ║
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
