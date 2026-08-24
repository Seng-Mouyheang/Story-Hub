import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { lazy, Suspense, useEffect } from "react";
import "./App.css";

const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const Home = lazy(() => import("./pages/Home"));
const Explore = lazy(() => import("./pages/Explore"));
const Confession = lazy(() => import("./pages/Confession"));
const Bookmarks = lazy(() => import("./pages/Bookmarks"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Write = lazy(() => import("./pages/Write"));
const Profile = lazy(() => import("./pages/Profile"));
const EditProfile = lazy(() => import("./pages/EditProfile"));
const Settings = lazy(() => import("./pages/Settings"));

const isAuthenticated = () => Boolean(localStorage.getItem("token"));

const ProtectedRoute = ({ children }) => {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

const PublicRoute = ({ children }) => {
  if (isAuthenticated()) {
    return <Navigate to="/" replace />;
  }

  return children;
};

const PAGE_TITLES = [
  { path: "/login", title: "Login" },
  { path: "/signup", title: "Sign Up" },
  { path: "/", title: "Home" },
  { path: "/explore", title: "Explore" },
  { path: "/confession", title: "Confession" },
  { path: "/bookmarks", title: "Bookmarks" },
  { path: "/dashboard", title: "Dashboard" },
  { path: "/write", title: "Write Story" },
  { path: "/profile", title: "Profile" },
  { path: "/edit-profile", title: "Edit Profile" },
  { path: "/settings", title: "Settings" },
];

function TitleManager() {
  const location = useLocation();

  useEffect(() => {
    const matchedTitle = PAGE_TITLES.find(({ path }) => {
      if (path === "/") {
        return location.pathname === "/";
      }

      return (
        location.pathname === path || location.pathname.startsWith(`${path}/`)
      );
    })?.title;

    let nextTitle = matchedTitle || "Story Hub";

    if (
      location.pathname === "/write" &&
      location.search.includes("storyId=")
    ) {
      nextTitle = "Edit Story";
    }

    document.title = `${nextTitle} | Story Hub`;
  }, [location.pathname, location.search]);

  return null;
}

function RouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-rose-500" />
    </div>
  );
}

function App() {
  return (
    <Router>
      <TitleManager />
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route
            path="/login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />
          <Route
            path="/signup"
            element={
              <PublicRoute>
                <Signup />
              </PublicRoute>
            }
          />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            }
          />
          <Route
            path="/explore"
            element={
              <ProtectedRoute>
                <Explore />
              </ProtectedRoute>
            }
          />
          <Route
            path="/confession"
            element={
              <ProtectedRoute>
                <Confession />
              </ProtectedRoute>
            }
          />
          <Route
            path="/bookmarks"
            element={
              <ProtectedRoute>
                <Bookmarks />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/write"
            element={
              <ProtectedRoute>
                <Write />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile/:userId"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/edit-profile"
            element={
              <ProtectedRoute>
                <EditProfile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
