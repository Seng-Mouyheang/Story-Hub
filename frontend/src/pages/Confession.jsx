import React, { useState } from "react";

import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import SiteFooter from "../components/SiteFooter";
import { Shield, Lock } from "lucide-react";

export default function Confession() {
  const [confession, setConfession] = useState("");

  const handleSubmit = () => {
    if (confession.trim()) {
      // Handle confession submission
      console.log("Confession posted:", confession);
      setConfession("");
      // Could navigate or show success message
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 bg-slate-50">
        <Navbar title="Confession Wall" />
        <main className="flex-1 min-h-0 overflow-hidden">
          <div className="h-full overflow-y-auto pt-6 sm:pt-8 lg:pt-10 px-3 sm:px-5 lg:px-6 pb-8 sm:pb-10 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <div className="max-w-2xl mx-auto flex flex-col items-center justify-start">
              <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <Shield className="w-10 h-10" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-semibold mb-4 text-center text-slate-900">
                Post Anonymously
              </h2>
              <p className="text-slate-500 mb-10 text-center">
                Share your thoughts without revealing your identity. Everything
                here is safe, secure, and encrypted.
              </p>

              <div className="bg-slate-900 text-white p-6 sm:p-10 lg:p-12 rounded-3xl sm:rounded-[40px] text-left relative overflow-hidden w-full shadow-sm">
                <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/20 blur-3xl"></div>
                <div className="relative z-10">
                  <div className="w-12 h-1 bg-rose-500 rounded-full mb-4"></div>
                  <h3 className="text-lg sm:text-xl font-semibold mb-6 sm:mb-8">
                    Write your confession...
                  </h3>
                  <textarea
                    value={confession}
                    onChange={(e) => setConfession(e.target.value)}
                    className="bg-transparent border-none outline-none w-full h-36 sm:h-32 text-base sm:text-lg text-slate-300 resize-none placeholder:text-slate-600"
                    placeholder="Type here in complete anonymity..."
                  />
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mt-8">
                    <p className="text-xs text-slate-500 flex items-center gap-2">
                      <Lock className="w-3 h-3" /> Encrypted end-to-end
                    </p>
                    <button
                      onClick={handleSubmit}
                      className="w-full sm:w-auto px-8 py-2 bg-rose-500 text-white font-semibold rounded-full hover:bg-rose-600 transition-colors"
                    >
                      Post Anonymously
                    </button>
                  </div>
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
