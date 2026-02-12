import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Home from './pages/Home';
import Explore from './pages/Explore';
import Confession from './pages/Confession';
import Bookmarks from './pages/Bookmarks';
import Dashboard from './pages/Dashboard';
import Write from './pages/Write';
import Profile from './pages/Profile';
import EditProfile from './pages/EditProfile';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Home />} />
        <Route path="/explore" element={<Explore />} />
        <Route path="/confession" element={<Confession />} />
        <Route path="/bookmarks" element={<Bookmarks />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/write" element={<Write />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/edit-profile" element={<EditProfile />} />
      </Routes>
    </Router>
  );
}

export default App;
