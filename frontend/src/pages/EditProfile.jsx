import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import { Camera } from 'lucide-react';

export default function EditProfile() {
  const [name, setName] = useState('Felix Designer');
  const [bio, setBio] = useState(
    'UI Designer & Content Creator. Visualizing the world through simple interfaces.'
  );
  const navigate = useNavigate();

  const handleSave = () => {
    console.log('Profile updated:', { name, bio });
    navigate('/profile');
  };

  const handleDiscard = () => {
    navigate('/profile');
  };

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col bg-white">
        <Navbar title="Edit Dashboard" />
        <main className="flex-1 overflow-y-auto pt-10 px-6 pb-10">
          <div className="max-w-3xl mx-auto">
            <div className="bg-white p-8 rounded-3xl border border-gray-100">
              <h3 className="font-bold text-lg mb-8">Edit Profile Information</h3>
              <div className="space-y-6">
                {/* Profile Picture */}
                <div className="flex items-center gap-6 mb-8">
                  <div className="w-20 h-20 rounded-2xl bg-slate-100 relative group">
                    <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" className="w-full h-full" alt="Profile" />
                    <div className="absolute inset-0 bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity">
                      <Camera className="text-white w-6 h-6" />
                    </div>
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">Profile Picture</h4>
                    <p className="text-xs text-slate-400">Recommended size: 400x400px</p>
                  </div>
                </div>

                {/* Display Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border-none outline-none focus:ring-2 focus:ring-red-100"
                  />
                </div>

                {/* Bio */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Bio
                  </label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border-none outline-none focus:ring-2 focus:ring-red-100 h-32 resize-none"
                  />
                </div>

                {/* Buttons */}
                <div className="flex gap-4 pt-4">
                  <button
                    onClick={handleDiscard}
                    className="flex-1 px-6 py-3 bg-slate-100 text-slate-500 font-bold rounded-xl hover:bg-slate-200"
                  >
                    Discard
                  </button>
                  <button
                    onClick={handleSave}
                    className="flex-1 px-6 py-3 bg-red-400 text-white font-bold rounded-xl shadow-lg shadow-red-100 hover:opacity-90"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
