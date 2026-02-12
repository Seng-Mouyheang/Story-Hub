import React from 'react';
import { Heart, MessageCircle, Share2 } from 'lucide-react';

export default function PostCard({ post }) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center font-bold text-red-400 text-sm">
          {post.avatar}
        </div>
        <div>
          <h4 className="font-bold text-sm">{post.author}</h4>
          <p className="text-xs text-slate-400">{post.time}</p>
        </div>
      </div>
      <p className="text-slate-600 text-sm leading-relaxed mb-6">{post.content}</p>
      <div className="flex items-center gap-6 text-slate-400">
        <button className="flex items-center gap-2 hover:text-red-400 transition-colors">
          <Heart className="w-4 h-4" />
          <span className="text-xs font-medium">{post.likes}</span>
        </button>
        <button className="flex items-center gap-2 hover:text-blue-400 transition-colors">
          <MessageCircle className="w-4 h-4" />
          <span className="text-xs font-medium">{post.comments}</span>
        </button>
        <button className="flex items-center gap-2 hover:text-slate-600 transition-colors ml-auto">
          <Share2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
