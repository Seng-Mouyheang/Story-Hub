import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle login logic here
    console.log('Login:', { email, password, remember });
  };

  return (
    <div className="flex min-h-screen">
      {/* Illustration Side */}
      <div className="hidden lg:flex w-1/2 bg-[#2d2424] items-center justify-center p-12">
        <div className="text-center">
          <div className="relative inline-block">
            <div className="w-64 h-64 bg-amber-100 rounded-full flex items-center justify-center mb-8 overflow-hidden">
              <img
                src="https://api.dicebear.com/7.x/shapes/svg?seed=book"
                className="w-48 h-48 opacity-20 absolute"
              />
              <div className="text-9xl">📚</div>
            </div>
          </div>
          <h2 className="text-white text-3xl font-bold mb-4">Welcome Back</h2>
          <p className="text-slate-400 max-w-sm mx-auto">
            Visualize your thoughts, ideas, and confessions in a beautiful, minimalist space.
          </p>
        </div>
      </div>

      {/* Form Side */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-white p-8">
        <div className="w-full max-w-md">
          <div className="mb-10">
            <h1 className="text-4xl font-bold text-slate-900 mb-2">Login</h1>
            <p className="text-slate-500">Welcome back! Please enter your details.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-100 focus:border-red-400 outline-none transition-all"
              />
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <label className="block text-sm font-medium text-slate-700">Password</label>
                <a href="#" className="text-sm font-semibold text-red-400">
                  Forgot password?
                </a>
              </div>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-100 focus:border-red-400 outline-none transition-all"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="remember"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="w-4 h-4 text-red-400 border-slate-300 rounded focus:ring-red-400"
              />
              <label htmlFor="remember" className="ml-2 text-sm text-slate-600">
                Remember for 30 days
              </label>
            </div>

            <Link
              to="/"
              className="w-full bg-red-400 text-white py-3 rounded-xl font-bold text-lg shadow-lg shadow-red-100 hover:opacity-90 transition-all block text-center"
            >
              Sign In
            </Link>

          </form>

          <p className="mt-8 text-center text-sm text-slate-500">
            Don't have an account?{' '}
            <Link to="/signup" className="font-bold text-red-400 hover:text-red-500">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
