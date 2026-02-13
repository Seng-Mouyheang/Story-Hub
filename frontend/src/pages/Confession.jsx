import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import { Shield, Lock } from 'lucide-react';

export default function Confession() {
  const [confession, setConfession] = useState('');
  const navigate = useNavigate();

  const handleSubmit = () => {
    if (confession.trim()) {
      // Handle confession submission
      console.log('Confession posted:', confession);
      setConfession('');
      // Could navigate or show success message
    }
  };

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col bg-white">
        <Navbar title="Confession Wall" />
        <main className="flex-1 overflow-y-auto pt-10 px-6 pb-10">
          <div className="max-w-2xl mx-auto flex flex-col items-center justify-start">
            <div className="w-20 h-20 bg-red-50 text-red-400 rounded-full flex items-center justify-center mx-auto mb-6">
              <Shield className="w-10 h-10" />
            </div>
            <h2 className="text-3xl font-bold mb-4 text-center">Post Anonymously</h2>
            <p className="text-gray-500 mb-10 text-center">
              Share your thoughts without revealing your identity. Everything here is safe, secure, and
              encrypted.
            </p>

            <div className="bg-black text-white p-12 rounded-[40px] text-left relative overflow-hidden w-full">
              <div className="absolute top-0 right-0 w-32 h-32 bg-red-400/20 blur-3xl"></div>
              <div className="relative z-10">
                <div className="w-12 h-1 bg-red-400 rounded-full mb-4"></div>
                <h3 className="text-xl font-bold mb-8">Write your confession...</h3>
                <textarea
                  value={confession}
                  onChange={(e) => setConfession(e.target.value)}
                  className="bg-transparent border-none outline-none w-full h-32 text-lg text-slate-300 resize-none placeholder:text-slate-700"
                  placeholder="Type here in complete anonymity..."
                />
                <div className="flex justify-between items-center mt-8">
                  <p className="text-xs text-slate-500 flex items-center gap-2">
                    <Lock className="w-3 h-3" /> Encrypted end-to-end
                  </p>
                  <button
                    onClick={handleSubmit}
                    className="px-8 py-2 bg-white text-black font-bold rounded-full hover:bg-slate-100 transition-colors"
                  >
                    Post Anonymously
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
