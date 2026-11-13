import React, { useState } from 'react';
import { Sparkles, Heart, Calendar, Menu, X, ShieldCheck, ChevronDown, PlusCircle } from 'lucide-react';
import { UserProfile } from '../types';

interface HeaderProps {
  currentTab: string;
  onNavigate: (tab: string) => void;
  favoritesCount: number;
  bookingsCount: number;
  user: UserProfile;
  isAuthenticated: boolean;
  onSignOut: () => void;
  onOpenListProperty: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onNavigate,
  favoritesCount,
  bookingsCount,
  user,
  isAuthenticated,
  onSignOut,
  onOpenListProperty,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const dashboardPath = user.role === 'owner' ? '/manage-rentals' : user.role === 'renter' || user.role === 'tenant' ? '/renter-dashboard' : '/dashboard';
  const dashboardLabel = user.role === 'owner' ? 'Landlord Dashboard' : user.role === 'renter' || user.role === 'tenant' ? 'Tenant Dashboard' : user.role === 'agent' ? 'Agent Dashboard' : user.role === 'property_manager' ? 'Manager Dashboard' : user.role === 'admin' ? 'Admin Dashboard' : user.role === 'super_admin' ? 'Super Admin' : 'Buyer Dashboard';
  const navLinks = [
    { id: '/', label: 'Home' },
    { id: '/search', label: 'Properties' },
    { id: '/buy', label: 'Buy' },
    { id: '/rent', label: 'Rent' },
    { id: '/mortgage', label: 'Mortgage' },
    { id: '/agents', label: 'About & Contact' },
    ...(isAuthenticated ? [
      { id: dashboardPath, label: dashboardLabel },
      ...(!['renter', 'tenant'].includes(user.role) ? [{ id: '/renter-dashboard', label: 'Applicant Hub' }] : []),
    ] : [{ id: '/login', label: 'Login' }, { id: '/login?mode=register', label: 'Register' }]),
  ];
  const visibleNavLinks = navLinks;

  return (
    <header className="sticky top-0 z-40 bg-[#142D4E] text-white border-b border-[#263445]/60 shadow-md">
      {/* Top subtle trust guarantee ribbon */}
      <div className="bg-[#0D1E35] text-[11px] py-1 px-4 border-b border-[#263445] text-slate-300 flex items-center justify-between">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-[#C5A46D]" />
            <span>Demo catalog with sample property data</span>
          </div>
          <div className="hidden md:flex items-center gap-4 text-slate-400">
            <span>Demo experience</span>
            <span aria-hidden="true">·</span>
            <span>London · New York · Paris · Los Angeles</span>
          </div>
        </div>
      </div>

      {/* Main Header Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Wordmark */}
        <button
          onClick={() => {
            onNavigate('/');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="flex items-center gap-3 text-left group focus:outline-none"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#C5A46D] to-[#9C7C3E] flex items-center justify-center shadow-sm">
            <Sparkles className="w-5 h-5 text-[#142D4E]" />
          </div>
          <div className="flex flex-col">
            <span className="font-heading text-2xl font-bold tracking-tight text-white group-hover:text-[#C5A46D] transition-colors">
              Aurelia <span className="font-light italic text-[#C5A46D]">Homes</span>
            </span>
          </div>
        </button>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden lg:flex items-center gap-4 text-xs font-medium">
          {visibleNavLinks.map((link) => {
            const isActive = link.id.includes('?') ? currentTab === '/login' : currentTab === link.id;
            return (
              <button
                key={link.id}
                onClick={() => onNavigate(link.id)}
                className={`relative py-1 whitespace-nowrap transition-colors ${
                  isActive
                    ? 'text-[#C5A46D] font-semibold'
                    : 'text-slate-200 hover:text-white'
                }`}
              >
                {link.label}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#C5A46D] rounded-full" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Primary Actions & User Status */}
        <div className="flex items-center gap-3 sm:gap-4 shrink-0">
          {/* Favorites quick link */}
          {isAuthenticated && <button
            onClick={() => onNavigate('/dashboard')}
            title="Saved Properties"
            className="relative p-2 text-slate-200 hover:text-[#C5A46D] hover:bg-white/5 rounded-lg transition-colors"
          >
            <Heart className="w-5 h-5" />
            {favoritesCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#C5A46D] text-[#142D4E] font-bold text-[10px] rounded-full flex items-center justify-center">
                {favoritesCount}
              </span>
            )}
          </button>}

          {/* Booked viewings quick link */}
          {isAuthenticated && <button
            onClick={() => onNavigate('/dashboard')}
            title="Scheduled Viewings"
            className="relative p-2 text-slate-200 hover:text-[#C5A46D] hover:bg-white/5 rounded-lg transition-colors"
          >
            <Calendar className="w-5 h-5" />
            {bookingsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#2E7D5B] text-white font-bold text-[10px] rounded-full flex items-center justify-center">
                {bookingsCount}
              </span>
            )}
          </button>}

          {/* User Profile Switcher */}
          {isAuthenticated ? <div className="relative">
            <button
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs text-white transition-colors border border-white/10"
            >
              <div className="w-6 h-6 rounded-full bg-[#C5A46D] text-[#142D4E] font-bold text-[11px] flex items-center justify-center">
                {user.avatarInitials}
              </div>
              <span className="hidden sm:inline font-medium">{user.name.split(' ')[0]}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-300" />
            </button>

            {userDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-[#142D4E] border border-[#E4DFD3]/30 rounded-xl shadow-2xl py-2 z-50 text-slate-200">
                <div className="px-4 py-2 border-b border-white/10">
                  <p className="text-xs text-[#C5A46D] font-medium uppercase tracking-wider">Current Account</p>
                  <p className="text-sm font-semibold text-white">{user.name}</p>
                  <p className="text-xs text-slate-400">{user.email}</p>
                  <span className="inline-block mt-1 text-[10px] text-[#C5A46D] bg-[#C5A46D]/15 px-2 py-0.5 rounded-sm">
                    {user.role.replace('_', ' ')} account
                  </span>
                </div>
                <button
                  onClick={() => {
                    onNavigate(dashboardPath);
                    setUserDropdownOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 text-xs hover:bg-white/10 text-white flex items-center justify-between"
                >
                  <span>{dashboardLabel}</span>
                  <span className="text-[#C5A46D]">→</span>
                </button>
                <button
                  onClick={() => {
                    onNavigate('/');
                    setUserDropdownOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 text-xs hover:bg-white/10 text-slate-300 flex items-center justify-between"
                >
                  <span>Back to Public Landing</span>
                  <span className="text-slate-400">↗</span>
                </button>
                <button
                  onClick={() => {
                    onSignOut();
                    setUserDropdownOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 text-xs hover:bg-red-500/20 text-[#B3402F] font-bold border-t border-white/10"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div> : <button onClick={() => onNavigate('/login')} className="rounded-xl border border-white/30 px-4 py-2 text-xs font-semibold text-white hover:bg-white/10">Sign in</button>}

          {/* Gold "List a Property" Button (Section 7 Block 1) */}
          {(!isAuthenticated || user.role === 'owner') && <button
            onClick={onOpenListProperty}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold bg-[#C5A46D] text-[#142D4E] hover:bg-[#B8975A] transition-all shadow-sm hover:shadow"
          >
            <PlusCircle className="w-4 h-4 text-[#142D4E]" />
            <span className="whitespace-nowrap">List a property</span>
          </button>}

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 text-slate-200 hover:text-white"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#0D1E35] border-t border-white/10 px-4 pt-3 pb-6 space-y-2">
          {visibleNavLinks.map((link) => (
            <button
              key={link.id}
              onClick={() => {
                onNavigate(link.id);
                setMobileMenuOpen(false);
              }}
              className={`block w-full text-left px-3 py-2 text-sm rounded-lg ${
                currentTab === link.id
                  ? 'bg-[#C5A46D]/20 text-[#C5A46D] font-semibold'
                  : 'text-slate-200 hover:bg-white/5'
              }`}
            >
              {link.label}
            </button>
          ))}
          <div className="pt-2">
            <button
              onClick={() => {
                onOpenListProperty();
                setMobileMenuOpen(false);
              }}
              className="w-full py-2.5 px-4 text-center text-xs font-bold rounded-xl bg-[#C5A46D] text-[#142D4E]"
            >
              + List a Property
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
