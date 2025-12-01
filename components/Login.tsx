
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface LoginProps {
  onBack: () => void;
}

export const Login: React.FC<LoginProps> = ({ onBack }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('admin@nautilus.com');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    const success = await login(email, password);
    if (!success) {
      setError('Invalid email or password');
      setLoading(false);
    }
    // If success, AuthContext state changes, triggering App re-render to Dashboard
  };

  const setDemoCreds = (role: 'Admin' | 'Analyst' | 'Viewer') => {
      if (role === 'Admin') { setEmail('admin@nautilus.com'); setPassword('admin123'); }
      if (role === 'Analyst') { setEmail('analyst@nautilus.com'); setPassword('analyst123'); }
      if (role === 'Viewer') { setEmail('viewer@nautilus.com'); setPassword('viewer123'); }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center cursor-pointer" onClick={onBack}>
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900">Sign in to your account</h2>
        <p className="mt-2 text-center text-sm text-slate-600">
           Or <button onClick={onBack} className="font-medium text-blue-600 hover:text-blue-500">return to home page</button>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-slate-200">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700">Email address</label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700">Password</label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="flex">
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">{error}</h3>
                  </div>
                </div>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-slate-500">Quick Demo Login</span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-3">
              <button onClick={() => setDemoCreds('Admin')} className="w-full inline-flex justify-center py-2 px-4 border border-slate-300 rounded-md shadow-sm bg-white text-xs font-medium text-slate-500 hover:bg-slate-50">
                Admin
              </button>
              <button onClick={() => setDemoCreds('Analyst')} className="w-full inline-flex justify-center py-2 px-4 border border-slate-300 rounded-md shadow-sm bg-white text-xs font-medium text-slate-500 hover:bg-slate-50">
                Analyst
              </button>
              <button onClick={() => setDemoCreds('Viewer')} className="w-full inline-flex justify-center py-2 px-4 border border-slate-300 rounded-md shadow-sm bg-white text-xs font-medium text-slate-500 hover:bg-slate-50">
                Viewer
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
