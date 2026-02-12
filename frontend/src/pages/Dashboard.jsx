import React from 'react';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';

export default function Dashboard() {
  const stats = [
    { label: 'Total Posts', value: '124', color: 'bg-blue-50' },
    { label: 'Followers', value: '1.2k', color: 'bg-pink-50' },
    { label: 'Engagement', value: '84%', color: 'bg-orange-50' },
  ];

  const chartData = [40, 70, 45, 90, 65, 80, 50];

  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 bg-slate-50/50 min-h-screen flex flex-col overflow-y-auto">
        <Navbar title="Analytics Dashboard" />
        <div className="p-8 max-w-6xl mx-auto w-full">
          <div className="space-y-8">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {stats.map((stat, i) => (
                <div key={i} className={`${stat.color} p-6 rounded-3xl border border-white shadow-sm`}>
                  <p className="text-sm text-slate-500 font-medium mb-1">{stat.label}</p>
                  <h3 className="text-3xl font-bold">{stat.value}</h3>
                </div>
              ))}
            </div>

            {/* Activity Chart */}
            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
              <div className="flex justify-between items-center mb-8">
                <h3 className="font-bold text-lg">Activity Overview</h3>
                <select className="text-xs border border-slate-100 rounded-lg p-1 px-2 outline-none">
                  <option>Last 7 Days</option>
                  <option>Last Month</option>
                  <option>Last Year</option>
                </select>
              </div>
              <div className="h-64 flex items-end gap-2 px-2">
                {chartData.map((height, i) => (
                  <div
                    key={i}
                    className="flex-1 bg-red-100 rounded-t-lg hover:bg-red-400 transition-colors group relative"
                    style={{ height: `${height}%` }}
                  >
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      {height}%
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-4 text-[10px] text-slate-400 font-medium px-2">
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
                <span>Sat</span>
                <span>Sun</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
