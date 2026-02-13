import React from 'react';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import { Filter, PenTool } from 'lucide-react';

const StatCard = ({ title, value, subtitle }) => (
  <div className="bg-white border border-gray-200 rounded-2xl p-6 flex flex-col justify-between min-h-[160px] shadow-sm">
    <div>
      <h2 className="text-[10px] font-bold tracking-[0.15em] text-gray-500 uppercase">
        {title}
      </h2>
      <div className="mt-4 text-[64px] leading-tight font-light text-rose-400">
        {value}
      </div>
    </div>
    <div className="text-xs text-gray-400 font-medium tracking-tight">
      {subtitle}
    </div>
  </div>
);

export default function Dashboard() {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col bg-white">
        <Navbar title="Analytics Dashboard" />
        <main className="flex-1 overflow-y-auto pt-10 px-6 pb-10">
          <div className="max-w-6xl mx-auto">

            {/* Header */}
            <header className="mb-10">
              <h1 className="text-3xl font-serif font-medium tracking-tight text-gray-800">
                Writing Analytics
              </h1>
            </header>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <StatCard title="Published Stories" value="0" subtitle="Total works" />
              <StatCard title="Total Word Count" value="0" subtitle="Across all drafts" />
              <StatCard title="Total Reader Loves" value="0" subtitle="total likes" />
            </div>

            {/* Recent Activity Card */}
            <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden min-h-[500px] flex flex-col shadow-sm">
              <div className="px-8 py-5 border-b border-gray-100 flex justify-between items-center">
                <h3 className="text-lg font-serif font-medium text-gray-700">
                  Your Recent Activity
                </h3>
                <button className="p-2 hover:bg-gray-50 rounded-full transition-colors group">
                  <Filter className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
                </button>
              </div>

              {/* Empty State Body */}
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                <div className="bg-gray-50 p-6 rounded-full mb-6">
                  <PenTool className="w-12 h-12 text-gray-200" strokeWidth={1.5} />
                </div>
                <p className="text-gray-400 text-sm md:text-base font-medium">
                  You haven't written any stories yet. Start your journey!
                </p>
              </div>
            </div>

            {/* Footer */}
            <footer className="mt-12 text-center">
              <p className="text-[10px] text-gray-400 tracking-wider">
                © 2026 Story Hub. All rights reserved.
              </p>
            </footer>

          </div>
        </main>
      </div>
    </div>
  );
}
