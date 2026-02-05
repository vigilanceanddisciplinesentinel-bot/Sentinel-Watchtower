import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { client } from '../lib/youbase';
import { useStore } from '../store';
import { Shield, User, ArrowRight } from 'lucide-react';

export default function Setup() {
  const navigate = useNavigate();
  const { inviteCode, setAppUser } = useStore();
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    checkStatus();
  }, []);

  const completeProfile = async (code: string, name: string) => {
    setSubmitting(true);
    try {
      const res = await client.api.fetch('/api/auth/complete-profile', {
        method: 'POST',
        body: JSON.stringify({
          code,
          fullName: name
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to complete setup');
      }

      const meRes = await client.api.fetch('/api/me');
      const meData = await meRes.json();
      setAppUser(meData.user.appUser);
      navigate('/dashboard');

    } catch (err: any) {
      setError(err.message);
      setSubmitting(false);
      setLoading(false); // Show form on error
    }
  };

  const checkStatus = async () => {
    try {
      const session = await client.auth.getSession();
      if (!session.data?.user) {
        navigate('/auth');
        return;
      }

      const res = await client.api.fetch('/api/me');
      const data = await res.json();

      if (data.user?.appUser) {
        setAppUser(data.user.appUser);
        navigate('/dashboard');
        return;
      }

      if (!inviteCode) {
        navigate('/');
        return;
      }

      // Auto-complete if name is available from Auth
      if (session.data.user.name) {
        setFullName(session.data.user.name);
        await completeProfile(inviteCode, session.data.user.name);
        return;
      }

      setLoading(false);
    } catch (err) {
      console.error(err);
      setError("Failed to verify status");
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode) return;
    await completeProfile(inviteCode, fullName);
  };

  if (loading || submitting) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-slate-500">Finalizing your account...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 border border-slate-200">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Complete Setup</h1>
          <p className="text-slate-500 text-center mt-2">Enter your full name to finalize your account.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-slate-700 mb-2">
              Full Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="John Doe"
                required
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {submitting ? 'Setting up...' : 'Enter Dashboard'}
            {!submitting && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>
      </div>
    </div>
  );
}
