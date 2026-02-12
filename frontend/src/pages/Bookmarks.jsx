import React from 'react';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import { Bookmark } from 'lucide-react';

export default function Bookmarks() {
  const bookmarks = [
    {
      id: 1,
      title: 'Visualizing System Design',
      description: 'A deep dive into how we created the visualize platform architecture...',
      tag: 'Article',
      image: 'https://picsum.photos/seed/81/200',
    },
    {
      id: 2,
      title: 'UI Component Library',
      description: 'Comprehensive guide to building reusable UI components...',
      tag: 'Tutorial',
      image: 'https://picsum.photos/seed/82/200',
    },
    {
      id: 3,
      title: 'Design Trends 2024',
      description: 'Latest trends and predictions for UI/UX design in 2024...',
      tag: 'Blog Post',
      image: 'https://picsum.photos/seed/83/200',
    },
  ];

  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 bg-slate-50/50 min-h-screen flex flex-col overflow-y-auto">
        <Navbar title="Saved Items" />
        <div className="p-8 max-w-5xl mx-auto w-full">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {bookmarks.map((item) => (
              <div key={item.id} className="bg-white p-6 rounded-2xl border border-slate-100 flex gap-4">
                <div className="w-24 h-24 bg-slate-100 rounded-xl flex-shrink-0 overflow-hidden">
                  <img src={item.image} className="w-full h-full object-cover" alt={item.title} />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-sm mb-1">{item.title}</h4>
                  <p className="text-xs text-slate-400 mb-4 line-clamp-2">{item.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] bg-slate-50 px-2 py-1 rounded text-slate-500 font-medium">
                      {item.tag}
                    </span>
                    <button className="text-red-400">
                      <Bookmark className="w-4 h-4 fill-red-400" />
                    </button>
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
