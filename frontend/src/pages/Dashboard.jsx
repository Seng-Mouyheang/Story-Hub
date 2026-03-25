import React from "react";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import SiteFooter from "../components/SiteFooter";
import { Filter, PenTool } from "lucide-react";

const StatCard = ({ title, value, subtitle }) => (
  <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between min-h-[160px] shadow-sm">
    <div>
      <h2 className="text-[10px] font-semibold tracking-[0.15em] text-slate-500 uppercase">
        {title}
      </h2>
      <div className="mt-4 text-5xl sm:text-[64px] leading-tight font-light text-rose-500">
        {value}
      </div>
    </div>
    <div className="text-xs text-slate-400 font-medium tracking-tight">
      {subtitle}
    </div>
  </div>
);

export default function Dashboard() {
  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 bg-slate-50">
        <Navbar title="Analytics Dashboard" />
        <main className="flex-1 min-h-0 overflow-hidden">
          <div className="h-full overflow-y-auto pt-6 sm:pt-8 lg:pt-10 px-3 sm:px-5 lg:px-6 pb-8 sm:pb-10 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <div className="max-w-6xl mx-auto">
              {/* Header */}
              <header className="mb-8 sm:mb-10">
                <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900">
                  Writing Analytics
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  Track your publishing progress and engagement at a glance.
                </p>
              </header>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
                <StatCard
                  title="Published Stories"
                  value="0"
                  subtitle="Total works"
                />
                <StatCard
                  title="Total Word Count"
                  value="0"
                  subtitle="Across all drafts"
                />
                <StatCard
                  title="Total Reader Loves"
                  value="0"
                  subtitle="total likes"
                />
              </div>

              {/* Recent Activity Card */}
              <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl overflow-hidden min-h-[420px] sm:min-h-[500px] flex flex-col shadow-sm">
                <div className="px-4 sm:px-8 py-5 border-b border-slate-100 flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-slate-700">
                    Your Recent Activity
                  </h3>
                  <button className="p-2 hover:bg-slate-100 rounded-full transition-colors group">
                    <Filter className="w-5 h-5 text-slate-400 group-hover:text-slate-600" />
                  </button>
                </div>

                {/* Empty State Body */}
                <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                  <div className="bg-slate-100 p-6 rounded-full mb-6">
                    <PenTool
                      className="w-12 h-12 text-slate-300"
                      strokeWidth={1.5}
                    />
                  </div>
                  <p className="text-slate-500 text-sm md:text-base font-medium">
                    You haven't written any stories yet. Start your journey!
                  </p>
                </div>
              </div>
            </div>
            <SiteFooter />
          </div>
        </main>
      </div>
    </div>
  );
}
