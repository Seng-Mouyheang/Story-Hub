import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { useEffect } from "react";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Home from "./pages/Home";
import Explore from "./pages/Explore";
import Confession from "./pages/Confession";
import Bookmarks from "./pages/Bookmarks";
import Dashboard from "./pages/Dashboard";
import Write from "./pages/Write";
import Profile from "./pages/Profile";
import EditProfile from "./pages/EditProfile";
import Settings from "./pages/Settings";
import "./App.css";

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

function App() {
  return (
    <Router>
      <TitleManager />
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
    </Router>
  );
}

export default App;
