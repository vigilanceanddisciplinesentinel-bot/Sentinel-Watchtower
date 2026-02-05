import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { client } from '../lib/youbase';
import { useStore } from '../store';
import { Shield, ArrowRight, AlertTriangle } from 'lucide-react';

export default function Landing() {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const setInviteCode = useStore((state) => state.setInviteCode);

  const handleValidate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await client.api.fetch('/api/public/invites/validate', {
        method: 'POST',
        body: JSON.stringify({ code }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Invalid code');
      }

      const data = await res.json();
      if (data.valid) {
        setInviteCode(code);
        navigate('/register');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 border border-slate-200">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 text-center">SENTINEL WATCHTOWER</h1>
          <p className="text-slate-500 text-center mt-2">Secure Infraction Tracking System</p>
        </div>

        <form onSubmit={handleValidate} className="space-y-6">
          <div>
            <label htmlFor="code" className="block text-sm font-medium text-slate-700 mb-2">
              Invitation Code
            </label>
            <input
              type="text"
              id="code"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase());
                setError('');
              }}
              className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-mono text-center text-lg tracking-widest uppercase"
              placeholder="ENTER-CODE"
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? 'Validating...' : 'Access System'}
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>

          <div className="text-center mt-4">
            <a href="/auth" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
              Already have an account? Sign In
            </a>
          </div>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-200 text-center space-y-3">
          <p className="text-xs text-slate-400">
            Restricted Access. Unauthorized entry is prohibited.
          </p>
          <div className="bg-gradient-to-r from-blue-50 to-slate-50 rounded-lg py-3 px-4">
            <p className="text-sm text-slate-700 font-semibold">
              Developed & Engineered by <span className="text-blue-600">Paul Joaquin Cinco</span>
            </p>
            <p className="text-xs text-slate-500 mt-1">© 2026 All Rights Reserved</p>
          </div>
        </div>
      </div>
    </div>
  );
}
