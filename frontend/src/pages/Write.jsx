import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import { Image, Video, Link2 } from 'lucide-react';

export default function Write() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const navigate = useNavigate();

  const handlePublish = () => {
    if (title.trim() || content.trim()) {
      console.log('Post published:', { title, content });
      navigate('/');
    }
  };

  const handleCancel = () => {
    navigate('/');
  };

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col bg-white">
        <Navbar title="Write Story" />
        <main className="flex-1 overflow-y-auto pt-10 px-6 pb-10">
          <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-full bg-slate-100 overflow-hidden">
                  <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="User" />
                </div>
                <div>
                  <h4 className="font-bold">Creating new post</h4>
                  <p className="text-xs text-slate-400">Public visibility</p>
                </div>
              </div>

              <textarea
                placeholder="Untitled Story Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full text-3xl font-bold border-none outline-none placeholder:text-slate-200 mb-4 resize-none"
                rows="2"
              />

              <textarea
                placeholder="Tell your story..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full h-64 border-none outline-none placeholder:text-slate-200 resize-none leading-loose text-lg"
                rows="10"
              />

              <div className="flex items-center gap-4 pt-8 border-t border-slate-50">
                <button className="p-3 bg-slate-100 text-slate-500 rounded-xl hover:bg-slate-200 transition-colors">
                  <Image className="w-5 h-5" />
                </button>
                <button className="p-3 bg-slate-100 text-slate-500 rounded-xl hover:bg-slate-200 transition-colors">
                  <Video className="w-5 h-5" />
                </button>
                <button className="p-3 bg-slate-100 text-slate-500 rounded-xl hover:bg-slate-200 transition-colors">
                  <Link2 className="w-5 h-5" />
                </button>
                <div className="ml-auto flex gap-3">
                  <button
                    onClick={handleCancel}
                    className="px-6 py-2.5 text-slate-500 font-medium rounded-xl hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handlePublish}
                    className="px-8 py-2.5 bg-red-400 text-white font-bold rounded-xl shadow-lg shadow-red-100 hover:opacity-90"
                  >
                    Publish
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
