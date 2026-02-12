import React from 'react';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import { Heart, MessageCircle } from 'lucide-react';

export default function Explore() {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 bg-slate-50/50 min-h-screen flex flex-col overflow-y-auto">
        <Navbar title="Explore Content" />
        <div className="p-8 max-w-6xl mx-auto w-full">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[41, 42, 43, 44, 45, 46].map((seed) => (
              <div
                key={seed}
                className="aspect-square bg-slate-200 rounded-2xl overflow-hidden relative group cursor-pointer"
              >
                <img
                  src={`https://picsum.photos/seed/${seed}/400`}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  alt="Content"
                />
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                  <div className="flex gap-4">
                    <span className="flex items-center gap-1">
                      <Heart className="w-5 h-5 fill-white" /> 24
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="w-5 h-5 fill-white" /> 3
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
