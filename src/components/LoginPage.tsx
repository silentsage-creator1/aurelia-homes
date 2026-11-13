import React, { useState } from 'react';
import { sanitizeInternalRedirect } from '../utils/auth';
import { UserProfile } from '../types';
import { Sparkles, ShieldCheck, Lock, Mail, User, ArrowRight, ArrowLeft } from 'lucide-react';
import { isSupabaseConfigured, registerWithSupabase, signInWithSupabase } from '../services/supabaseWorkflow';

interface LoginPageProps {
  nextDestination?: string;
  onLoginSuccess: (user: UserProfile, destination: string) => void;
  onCancel: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  nextDestination = '/buy',
  onLoginSuccess,
  onCancel,
}) => {
  const [tab, setTab] = useState<'signin' | 'register'>(() => new URLSearchParams(window.location.search).get('mode') === 'register' ? 'register' : 'signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  const safeTarget = sanitizeInternalRedirect(nextDestination !== '/buy' ? nextDestination : sessionStorage.getItem('aurelia_pending_renter_destination') || nextDestination);

  // Human-readable feature name based on next parameter
  const getFeatureLabel = (target: string) => {
    if (target.startsWith('/renter-dashboard')) return 'Renter Hub';
    if (target.startsWith('/buy')) return 'Buy & Search Properties';
    if (target.startsWith('/rent')) return 'Rental Residences Collection';
    if (target.startsWith('/sell')) return 'List Your Property & Valuation';
    if (target.startsWith('/search')) return 'Live Property Search';
    if (target.startsWith('/agents')) return 'Private Client Advisory Directory';
    if (target.startsWith('/tools') || target.startsWith('/mortgage')) return 'Financial Intelligence & Amortization';
    if (target.startsWith('/manage-rentals')) return 'Rental Management Console';
    if (target.startsWith('/dashboard')) return 'Personal Client Sanctuary';
    if (target.startsWith('/property/')) return 'Verified Residence Dossier & Virtual Tour';
    return 'Exclusive Client Features';
  };

  const featureLabel = getFeatureLabel(safeTarget);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (!isSupabaseConfigured) {
      setAuthError('Account access is unavailable until Supabase is connected. Configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then try again.');
      return;
    }
    setIsLoading(true);

    void (async () => {
        try {
          if (tab === 'register') {
            sessionStorage.setItem('aurelia_pending_renter_destination', safeTarget);
            const result = await registerWithSupabase(email, password, fullName, phone);
            if (result.verificationRequired) {
              setAuthError('Your renter account was created. Confirm your email, then sign in; we will return you to the rental application you selected.');
              setTab('signin');
              return;
            }
            sessionStorage.removeItem('aurelia_pending_renter_destination');
            onLoginSuccess(result.user, safeTarget);
          } else {
            const profile = await signInWithSupabase(email, password);
            sessionStorage.removeItem('aurelia_pending_renter_destination');
            onLoginSuccess(profile, safeTarget);
          }
        } catch (error) {
          setAuthError(error instanceof Error ? error.message : 'Could not sign in. Check your details and try again.');
        } finally { setIsLoading(false); }
      })();
  };

  return (
    <div className="min-h-screen bg-[#F7F5F0] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Back to Landing Page link */}
      <div className="max-w-md w-full mx-auto mb-6">
        <button
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#142D4E] hover:text-[#9C7C3E] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Aurelia Homes Home</span>
        </button>
      </div>

      <div className="max-w-md w-full mx-auto bg-white rounded-3xl border border-[#E4DFD3] shadow-2xl p-6 sm:p-8 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-[#142D4E] flex items-center justify-center mx-auto shadow-sm">
            <Sparkles className="w-6 h-6 text-[#C5A46D]" />
          </div>
          <h2 className="font-heading text-2xl font-bold text-[#142D4E]">
            {tab === 'signin' ? 'Sign in to Aurelia Homes' : 'Create your renter account'}
          </h2>
          <p className="text-xs text-slate-500">
            {isSupabaseConfigured ? 'Sign in or create your renter account.' : 'Renter accounts are not available until the rental database is connected.'}
          </p>
        </div>

        <div role="note" className="p-3 rounded-xl border border-amber-300 bg-amber-50 text-[11px] leading-relaxed text-amber-900">
          {isSupabaseConfigured ? 'New accounts start as renter accounts. Landlord and staff workspaces are assigned by an administrator.' : 'Connect Supabase to create an account or sign in.'}
        </div>
        {authError && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">{authError}</div>}

        {/* Intended Protected Destination Alert */}
        <div className="p-3.5 bg-[#F7F5F0] rounded-2xl border border-[#C5A46D]/40 text-xs text-slate-700 flex items-start gap-2.5">
          <ShieldCheck className="w-5 h-5 text-[#C5A46D] shrink-0 mt-0.5" />
          <div>
          <span className="font-bold text-[#142D4E] block">Renter account:</span>
            <span>
              Sign in to proceed to <strong className="text-[#142D4E]">{featureLabel}</strong>. You will be automatically redirected.
            </span>
          </div>
        </div>

        {/* Tab Switcher: Sign In vs Register */}
        <div className="flex p-1 bg-[#F7F5F0] rounded-xl border border-[#E4DFD3]">
          <button
            type="button"
            onClick={() => setTab('signin')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              tab === 'signin'
                ? 'bg-[#142D4E] text-white shadow-xs'
                : 'text-slate-600 hover:text-[#142D4E]'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setTab('register')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              tab === 'register'
                ? 'bg-[#142D4E] text-white shadow-xs'
                : 'text-slate-600 hover:text-[#142D4E]'
            }`}
          >
            Register / Join
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {tab === 'register' && (
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Full Legal Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Tolu Adeleke"
                  className="w-full pl-9 pr-3 py-2.5 bg-[#F7F5F0] border border-[#E4DFD3] rounded-xl text-xs text-[#263445] focus:outline-none focus:border-[#C5A46D]"
                />
              </div>
            </div>
          )}

          {tab === 'register' && (
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600 mb-1">Phone number</label>
              <input type="tel" required maxLength={30} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Your contact number" className="w-full px-3 py-2.5 bg-[#F7F5F0] border border-[#E4DFD3] rounded-xl text-xs text-[#263445] focus:outline-none focus:border-[#C5A46D]" />
            </div>
          )}

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full pl-9 pr-3 py-2.5 bg-[#F7F5F0] border border-[#E4DFD3] rounded-xl text-xs text-[#263445] focus:outline-none focus:border-[#C5A46D]"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                Password
              </label>
              {tab === 'signin' && (
                <button
                  type="button"
                  onClick={() => setAuthError('Password reset requires the connected Supabase email configuration. Contact support to reset your account.')}
                  className="text-[11px] text-[#9C7C3E] hover:underline"
                >
                  Forgot password?
                </button>
              )}
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-9 pr-3 py-2.5 bg-[#F7F5F0] border border-[#E4DFD3] rounded-xl text-xs text-[#263445] focus:outline-none focus:border-[#C5A46D]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-xl font-bold text-xs bg-[#C5A46D] text-[#142D4E] hover:bg-[#B8975A] transition-all shadow-md flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <span>{tab === 'signin' ? 'Sign In & Continue' : 'Create Account & Continue'}</span>
                <ArrowRight className="w-4 h-4 text-[#142D4E]" />
              </>
            )}
          </button>
        </form>

        {/* Fiduciary Privacy note */}
        <p className="text-[11px] text-slate-400 text-center leading-relaxed">
          Protected by 256-bit SSL encryption. We never sell your personal contact records or financial data.
        </p>
      </div>
    </div>
  );
};
