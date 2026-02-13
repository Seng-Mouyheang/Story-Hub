import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';

export default function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle signup logic here
    console.log('Signup:', { name, email, password, confirmPassword, agreeTerms });
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
              <div className="text-9xl">📖</div>
            </div>
          </div>
          <h2 className="text-white text-3xl font-bold mb-4">Create Your Story</h2>
          <p className="text-slate-400 max-w-sm mx-auto">
            Join our community and share your thoughts, ideas, and confessions in a beautiful, minimalist space.
          </p>
        </div>
      </div>

      {/* Form Side */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-white p-8">
        <div className="w-full max-w-md">
          <div className="mb-10">
            <h1 className="text-4xl font-bold text-slate-900 mb-2">Sign Up</h1>
            <p className="text-slate-500">Create your account to get started.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name Field */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Full Name
              </label>
              <input
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-100 focus:border-red-400 outline-none transition-all"
                required
              />
            </div>

            {/* Email Field */}
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
                required
              />
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-100 focus:border-red-400 outline-none transition-all pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>
            </div>

            {/* Confirm Password Field */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-100 focus:border-red-400 outline-none transition-all pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showConfirmPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>
            </div>

            {/* Terms Agreement */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="agreeTerms"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className="w-4 h-4 text-red-400 border-slate-300 rounded focus:ring-red-400"
                required
              />
              <label htmlFor="agreeTerms" className="ml-3 text-sm text-slate-600">
                I agree to the
                <a href="#" className="font-semibold text-slate-900 hover:text-red-400 mx-1">
                  Terms of Service
                </a>
                and
                <a href="#" className="font-semibold text-slate-900 hover:text-red-400 mx-1">
                  Privacy Policy
                </a>
              </label>
            </div>

            {/* Sign Up Button */}
            <button
              type="submit"
              className="w-full py-3 px-4 bg-red-400 text-white font-semibold rounded-xl hover:bg-red-500 transition-colors shadow-lg shadow-red-100 mt-8"
            >
              Create Account
            </button>
          </form>

          {/* Sign In Link */}
          <div className="mt-8 text-center">
            <p className="text-slate-600">
              Already have an account?
              <Link to="/login" className="font-semibold text-red-400 hover:text-red-500 ml-1">
                Log in
              </Link>
            </p>
          </div>

          {/* Footer */}
          <p className="mt-10 text-center text-xs text-slate-400">
            © 2026 Story Hub. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
