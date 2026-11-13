import React, { useState } from 'react';
import { Property, Agent, UserProfile } from '../types';
import { ImageWithFallback } from './ImageWithFallback';
import {
  Search,
  MapPin,
  Home,
  Key,
  DollarSign,
  ShieldCheck,
  CheckCircle2,
  Star,
  ArrowRight,
  Sparkles,
  Bed,
  Bath,
  Maximize2,
  Heart,
  Phone,
  Mail,
  Menu,
  X,
  Compass,
  FileCheck,
  Clock,
  UserCheck,
  HelpCircle,
  Building2,
  SlidersHorizontal,
  ChevronRight
} from 'lucide-react';

interface LandingPageProps {
  properties: Property[];
  agents: Agent[];
  isAuthenticated: boolean;
  user: UserProfile | null;
  onNavigateToProtected: (route: string) => void;
  onOpenSignIn: () => void;
  onSignOut: () => void;
  onOpenHelp: () => void;
  onOpenPrivacy: () => void;
  onOpenTerms: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  properties,
  agents,
  isAuthenticated,
  user,
  onNavigateToProtected,
  onOpenSignIn,
  onSignOut,
  onOpenHelp,
  onOpenPrivacy,
  onOpenTerms,
}) => {
  // Hero Search State
  const [searchTab, setSearchTab] = useState<'buy' | 'rent' | 'sold'>('buy');
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const handleHeroSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    const targetRoute = `/search?type=${searchTab}&q=${encodeURIComponent(query)}`;
    onNavigateToProtected(targetRoute);
  };

  const popularLocations: { city: string; district: string; image: string; activeCount: string; medianPrice: string; query: string }[] = [];
  const quickLocations = Array.from(new Set(properties.map((property) => property.city).filter(Boolean)))
    .slice(0, 4)
    .map((city) => ({ name: city, query: city }));

  const previewProperties = properties.slice(0, 3);
  const previewAgents = agents.slice(0, 4);

  return (
    <div className="min-h-screen bg-[#F7F5F0] text-[#263445] flex flex-col font-sans">
      {/* 1. PREMIUM WHITE NAVIGATION BAR (Zillow-inspired clean layout) */}
      <header className="sticky top-0 z-40 bg-white border-b border-[#E4DFD3] shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-6">
          {/* Left Navigation Zone */}
          <nav className="hidden lg:flex items-center gap-6 text-xs sm:text-sm font-medium text-slate-700">
            <button
              onClick={() => onNavigateToProtected('/buy')}
              className="hover:text-[#142D4E] transition-colors whitespace-nowrap py-2"
            >
              Buy
            </button>
            <button
              onClick={() => onNavigateToProtected('/rent')}
              className="hover:text-[#142D4E] transition-colors whitespace-nowrap py-2"
            >
              Rent
            </button>
            <button
              onClick={() => onNavigateToProtected('/sell')}
              className="hover:text-[#142D4E] transition-colors whitespace-nowrap py-2"
            >
              Sell
            </button>
            <button
              onClick={() => onNavigateToProtected('/mortgage')}
              className="hover:text-[#142D4E] transition-colors whitespace-nowrap py-2"
            >
              Get a Mortgage
            </button>
            <button
              onClick={() => onNavigateToProtected('/agents')}
              className="hover:text-[#142D4E] transition-colors whitespace-nowrap py-2"
            >
              Find an Agent
            </button>
          </nav>

          {/* Center Brand Logo */}
          <a
            href="/"
            className="flex items-center gap-2.5 focus:outline-none group shrink-0"
          >
            <div className="w-10 h-10 rounded-xl bg-[#142D4E] flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5 text-[#C5A46D]" />
            </div>
            <div className="flex flex-col">
              <span className="font-heading font-extrabold text-xl sm:text-2xl tracking-tight text-[#142D4E]">
                Aurelia <span className="font-normal text-[#9C7C3E]">Homes</span>
              </span>
            </div>
          </a>

          {/* Right Zone: Manage Rentals, Help, Sign In / Profile */}
          <div className="hidden lg:flex items-center gap-5 text-xs sm:text-sm font-medium">
            <button
              onClick={() => onNavigateToProtected('/manage-rentals')}
              className="text-slate-700 hover:text-[#142D4E] transition-colors whitespace-nowrap py-2"
            >
              Manage Rentals
            </button>
            <button
              onClick={onOpenHelp}
              className="text-slate-600 hover:text-[#142D4E] transition-colors whitespace-nowrap py-2"
            >
              Help
            </button>

            {isAuthenticated && user ? (
              <div className="flex items-center gap-3 pl-2 border-l border-[#E4DFD3]">
                <button
                  onClick={() => onNavigateToProtected('/dashboard')}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#F7F5F0] hover:bg-[#E4DFD3] text-xs font-semibold text-[#142D4E] border border-[#E4DFD3]"
                >
                  <div className="w-6 h-6 rounded-full bg-[#142D4E] text-[#C5A46D] font-bold text-[10px] flex items-center justify-center">
                    {user.avatarInitials}
                  </div>
                  <span>{user.name.split(' ')[0]}</span>
                </button>
                <button
                  onClick={onSignOut}
                  className="text-xs text-slate-500 hover:text-[#B3402F]"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2.5 pl-2 border-l border-[#E4DFD3]">
                <button
                  onClick={onOpenSignIn}
                  className="px-4 py-2 text-xs font-semibold text-[#142D4E] hover:text-[#9C7C3E] transition-colors whitespace-nowrap"
                >
                  Sign In
                </button>
                <button
                  onClick={onOpenSignIn}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#C5A46D] text-[#142D4E] hover:bg-[#B8975A] transition-all shadow-xs whitespace-nowrap"
                >
                  Join / Register
                </button>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex lg:hidden items-center gap-2">
            {!isAuthenticated && (
              <button
                onClick={onOpenSignIn}
                className="px-3 py-1.5 text-xs font-bold rounded-lg bg-[#C5A46D] text-[#142D4E]"
              >
                Sign In
              </button>
            )}
            <button
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              className="p-2 text-slate-700 hover:text-[#142D4E]"
            >
              {mobileNavOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileNavOpen && (
          <div className="lg:hidden bg-white border-t border-[#E4DFD3] px-4 py-6 space-y-3 animate-in fade-in">
            <button
              onClick={() => {
                setMobileNavOpen(false);
                onNavigateToProtected('/buy');
              }}
              className="block w-full text-left py-2 text-sm font-semibold text-slate-800"
            >
              Buy Homes
            </button>
            <button
              onClick={() => {
                setMobileNavOpen(false);
                onNavigateToProtected('/rent');
              }}
              className="block w-full text-left py-2 text-sm font-semibold text-slate-800"
            >
              Rent Residences
            </button>
            <button
              onClick={() => {
                setMobileNavOpen(false);
                onNavigateToProtected('/sell');
              }}
              className="block w-full text-left py-2 text-sm font-semibold text-slate-800"
            >
              Sell a Property
            </button>
            <button
              onClick={() => {
                setMobileNavOpen(false);
                onNavigateToProtected('/mortgage');
              }}
              className="block w-full text-left py-2 text-sm font-semibold text-slate-800"
            >
              Get a Mortgage
            </button>
            <button
              onClick={() => {
                setMobileNavOpen(false);
                onNavigateToProtected('/agents');
              }}
              className="block w-full text-left py-2 text-sm font-semibold text-slate-800"
            >
              Find an Agent
            </button>
            <button
              onClick={() => {
                setMobileNavOpen(false);
                onNavigateToProtected('/manage-rentals');
              }}
              className="block w-full text-left py-2 text-sm font-semibold text-slate-800"
            >
              Manage Rentals
            </button>
            <button
              onClick={() => {
                setMobileNavOpen(false);
                onOpenHelp();
              }}
              className="block w-full text-left py-2 text-sm font-semibold text-slate-600"
            >
              Help & Concierge
            </button>

            <div className="pt-3 border-t border-[#E4DFD3]">
              {isAuthenticated && user ? (
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      setMobileNavOpen(false);
                      onNavigateToProtected('/dashboard');
                    }}
                    className="w-full py-2.5 text-center text-xs font-bold rounded-xl bg-[#142D4E] text-white"
                  >
                    Open Client Sanctuary ({user.name.split(' ')[0]})
                  </button>
                  <button
                    onClick={() => {
                      setMobileNavOpen(false);
                      onSignOut();
                    }}
                    className="w-full py-2 text-center text-xs text-[#B3402F]"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setMobileNavOpen(false);
                    onOpenSignIn();
                  }}
                  className="w-full py-2.5 text-center text-xs font-bold rounded-xl bg-[#C5A46D] text-[#142D4E]"
                >
                  Sign In / Join
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* 2. LARGE ARCHITECTURAL HERO IMAGE WITH PROMINENT SEARCH */}
      <section className="relative overflow-hidden bg-[#142D4E] text-white py-20 sm:py-28 lg:py-32">
        {/* Background architectural image */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=2000&q=80"
            alt="Modern Luxury Architecture"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-center opacity-35"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0D1E35] via-[#142D4E]/85 to-[#142D4E]/60" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center max-w-4xl">
          {/* Trust Kicker */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-[#C5A46D] text-xs font-semibold mb-6">
            <ShieldCheck className="w-4 h-4 text-[#C5A46D]" />
            <span>Homes and rentals</span>
          </div>

          <h1 className="font-heading text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white mb-6 leading-[1.1] text-balance">
            Find a place to call yours.
          </h1>

          <p className="text-base sm:text-xl text-slate-200 font-normal max-w-2xl mx-auto leading-relaxed mb-10">
            Search available properties and rentals in your preferred area.
          </p>

          {/* Prominent Search Console with Buy / Rent / Sold Tabs (Zillow signature layout) */}
          <div className="bg-white rounded-3xl p-3 sm:p-5 shadow-2xl border border-white/20 text-[#263445] max-w-3xl mx-auto">
            {/* Tabs */}
            <div className="flex items-center justify-center gap-2 pb-3 border-b border-[#E4DFD3] mb-4">
              <button
                type="button"
                onClick={() => setSearchTab('buy')}
                className={`px-5 py-2 rounded-xl text-xs sm:text-sm font-bold tracking-wide transition-all ${
                  searchTab === 'buy'
                    ? 'bg-[#142D4E] text-white shadow-sm'
                    : 'text-slate-600 hover:text-[#142D4E]'
                }`}
              >
                Buy
              </button>
              <button
                type="button"
                onClick={() => setSearchTab('rent')}
                className={`px-5 py-2 rounded-xl text-xs sm:text-sm font-bold tracking-wide transition-all ${
                  searchTab === 'rent'
                    ? 'bg-[#142D4E] text-white shadow-sm'
                    : 'text-slate-600 hover:text-[#142D4E]'
                }`}
              >
                Rent
              </button>
              <button
                type="button"
                onClick={() => setSearchTab('sold')}
                className={`px-5 py-2 rounded-xl text-xs sm:text-sm font-bold tracking-wide transition-all ${
                  searchTab === 'sold'
                    ? 'bg-[#142D4E] text-white shadow-sm'
                    : 'text-slate-600 hover:text-[#142D4E]'
                }`}
              >
                Sold
              </button>
            </div>

            {/* Search Input Bar */}
            <form onSubmit={handleHeroSearchSubmit} className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <MapPin className="w-5 h-5 text-[#C5A46D] absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Enter an address, neighborhood, city, or ZIP code..."
                  className="w-full pl-12 pr-4 py-3.5 bg-[#F7F5F0] border border-[#E4DFD3] rounded-2xl text-xs sm:text-sm text-[#263445] focus:outline-none focus:border-[#C5A46D] focus:ring-1 focus:ring-[#C5A46D]"
                />
              </div>

              <button
                type="submit"
                className="w-full sm:w-auto px-8 py-3.5 rounded-2xl font-bold text-xs sm:text-sm bg-[#C5A46D] text-[#142D4E] hover:bg-[#B8975A] shadow-md transition-all flex items-center justify-center gap-2 shrink-0"
              >
                <Search className="w-4 h-4 text-[#142D4E]" />
                <span>Search</span>
              </button>
            </form>

            {/* Quick Suggestions */}
            <div className="mt-3 pt-3 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-500">
              <span className="font-semibold text-slate-600">Popular:</span>
              {quickLocations.map((item) => (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => onNavigateToProtected(`/search?type=${searchTab}&q=${encodeURIComponent(item.query)}`)}
                  className="px-2.5 py-1 rounded-lg bg-[#F7F5F0] hover:bg-[#E4DFD3] text-slate-700 transition-colors"
                >
                  {item.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 3. THREE VISUALLY APPEALING ACTION CARDS (Buy, Rent, Sell) */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="text-xs uppercase tracking-wider text-[#9C7C3E] font-bold">
            Demo features
          </span>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-[#142D4E] mt-1">
            Discover How Aurelia Can Help You
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-2">
            Seamless guidance whether acquiring, leasing, or representing prime property.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Card 1: Buy a Home */}
          <div className="bg-white rounded-3xl p-8 border border-[#E4DFD3] shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between text-center group">
            <div>
              <div className="w-20 h-20 rounded-2xl bg-[#F7F5F0] group-hover:bg-[#142D4E] flex items-center justify-center mx-auto mb-6 transition-colors shadow-xs">
                <Home className="w-10 h-10 text-[#C5A46D]" />
              </div>
              <h3 className="font-heading text-2xl font-bold text-[#142D4E] mb-3">
                Buy a Home
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Find your place with an immersive photo experience and the most listings, including things you won't find anywhere else.
              </p>
            </div>
            <div className="pt-8">
              <button
                onClick={() => onNavigateToProtected('/buy')}
                className="w-full py-3 px-4 rounded-xl text-xs font-bold bg-[#F7F5F0] hover:bg-[#142D4E] text-[#142D4E] hover:text-white border border-[#E4DFD3] transition-all"
              >
                Browse homes
              </button>
            </div>
          </div>

          {/* Card 2: Rent a Home */}
          <div className="bg-white rounded-3xl p-8 border border-[#E4DFD3] shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between text-center group">
            <div>
              <div className="w-20 h-20 rounded-2xl bg-[#F7F5F0] group-hover:bg-[#142D4E] flex items-center justify-center mx-auto mb-6 transition-colors shadow-xs">
                <Key className="w-10 h-10 text-[#C5A46D]" />
              </div>
              <h3 className="font-heading text-2xl font-bold text-[#142D4E] mb-3">
                Rent a Home
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                We’re creating a seamless online experience – from shopping on the largest rental network, to applying, to paying rent.
              </p>
            </div>
            <div className="pt-8">
              <button
                onClick={() => onNavigateToProtected('/rent')}
                className="w-full py-3 px-4 rounded-xl text-xs font-bold bg-[#F7F5F0] hover:bg-[#142D4E] text-[#142D4E] hover:text-white border border-[#E4DFD3] transition-all"
              >
                Find rentals
              </button>
            </div>
          </div>

          {/* Card 3: Sell a Property */}
          <div className="bg-white rounded-3xl p-8 border border-[#E4DFD3] shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between text-center group">
            <div>
              <div className="w-20 h-20 rounded-2xl bg-[#F7F5F0] group-hover:bg-[#142D4E] flex items-center justify-center mx-auto mb-6 transition-colors shadow-xs">
                <DollarSign className="w-10 h-10 text-[#C5A46D]" />
              </div>
              <h3 className="font-heading text-2xl font-bold text-[#142D4E] mb-3">
                Sell a Property
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                No matter what path you take to sell your home, we can help you navigate a successful sale with title verification and senior advisors.
              </p>
            </div>
            <div className="pt-8">
              <button
                onClick={() => onNavigateToProtected('/sell')}
                className="w-full py-3 px-4 rounded-xl text-xs font-bold bg-[#F7F5F0] hover:bg-[#142D4E] text-[#142D4E] hover:text-white border border-[#E4DFD3] transition-all"
              >
                See your options
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 4. FEATURED PROPERTIES PREVIEW SECTION (Clearly identified sample data) */}
      <section className="py-20 bg-white border-y border-[#E4DFD3]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-[#142D4E] text-[#C5A46D] text-[11px] font-semibold mb-2">
                <ShieldCheck className="w-3.5 h-3.5 text-[#C5A46D]" />
                <span>Property listings</span>
              </div>
              <h2 className="font-heading text-3xl sm:text-4xl font-bold text-[#142D4E]">
                Available Properties
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                Browse current listings and details provided by property owners.
              </p>
            </div>

            <button
              onClick={() => onNavigateToProtected('/buy')}
              className="text-xs font-bold text-[#142D4E] hover:text-[#9C7C3E] flex items-center gap-1 transition-colors self-start sm:self-auto"
            >
              <span>Explore All Listings</span>
              <ArrowRight className="w-4 h-4 text-[#C5A46D]" />
            </button>
          </div>

          {previewProperties.length > 0 ? <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {previewProperties.map((prop) => (
              <div
                key={prop.id}
                onClick={() => onNavigateToProtected(`/property/${prop.id}`)}
                className="group bg-white rounded-3xl border border-[#E4DFD3] overflow-hidden shadow-xs hover:shadow-2xl transition-all duration-300 flex flex-col justify-between cursor-pointer"
              >
                <div>
                  <div className="relative aspect-[16/10] overflow-hidden bg-slate-900">
                    <ImageWithFallback
                      src={prop.images[0]}
                      alt={prop.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                    />
                    <div className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-[#142D4E] text-[#C5A46D] text-[10px] font-bold border border-[#C5A46D]/30 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-[#C5A46D]" />
                      <span>Verified Title</span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigateToProtected(`/property/${prop.id}`);
                      }}
                      className="absolute top-3 right-3 p-2 rounded-xl bg-black/40 text-white hover:bg-white hover:text-[#B3402F] backdrop-blur-xs transition-colors"
                    >
                      <Heart className="w-4 h-4" />
                    </button>

                    <div className="absolute bottom-3 left-3 text-white text-[11px] font-semibold bg-black/40 px-2 py-0.5 rounded-sm backdrop-blur-xs">
                      {prop.city} · {prop.propertyType}
                    </div>
                  </div>

                  <div className="p-6">
                    <p className="font-heading text-2xl font-extrabold text-[#142D4E] tabular-nums">
                      {prop.priceFormatted}
                    </p>
                    <h3 className="font-heading text-lg font-bold text-[#142D4E] group-hover:text-[#9C7C3E] transition-colors mt-1 truncate">
                      {prop.title}
                    </h3>
                    <p className="text-xs text-slate-500 truncate mt-1">
                      {prop.address}
                    </p>

                    <div className="mt-4 pt-3 border-t border-[#E4DFD3] grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="p-1.5 bg-[#F7F5F0] rounded-lg">
                        <span className="font-bold text-[#142D4E] block">{prop.bedrooms}</span>
                        <span className="text-[10px] text-slate-500 uppercase">Beds</span>
                      </div>
                      <div className="p-1.5 bg-[#F7F5F0] rounded-lg">
                        <span className="font-bold text-[#142D4E] block">{prop.bathrooms}</span>
                        <span className="text-[10px] text-slate-500 uppercase">Baths</span>
                      </div>
                      <div className="p-1.5 bg-[#F7F5F0] rounded-lg">
                        <span className="font-bold text-[#142D4E] block">{prop.sqft.toLocaleString()}</span>
                        <span className="text-[10px] text-slate-500 uppercase">Sq Ft</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6 pt-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onNavigateToProtected(`/property/${prop.id}`);
                    }}
                    className="w-full py-2.5 rounded-xl text-xs font-bold bg-[#C5A46D] text-[#142D4E] hover:bg-[#B8975A] transition-colors shadow-xs"
                  >
                    View Verified Dossier
                  </button>
                </div>
              </div>
            ))}
          </div> : <p className="rounded-2xl border border-dashed border-[#E4DFD3] bg-[#F7F5F0] p-8 text-center text-sm text-slate-600">No properties have been added yet. Available listings will appear here.</p>}
        </div>
      </section>

      {/* 5. EXPLORE POPULAR LOCATIONS SECTION */}
      {popularLocations.length > 0 && <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="text-xs uppercase tracking-wider text-[#9C7C3E] font-bold">
            Global Enclaves
          </span>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-[#142D4E] mt-1">
            Explore Popular Locations
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-2">
            From historic London garden crescents to New York lofts and Mediterranean coastline retreats.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {popularLocations.map((loc) => (
            <div
              key={loc.district}
              onClick={() => onNavigateToProtected(`/search?q=${encodeURIComponent(loc.query)}`)}
              className="group relative rounded-3xl overflow-hidden aspect-[4/5] shadow-md hover:shadow-2xl transition-all duration-300 cursor-pointer"
            >
              <img
                src={loc.image}
                alt={loc.district}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

              <div className="absolute bottom-6 left-6 right-6 text-white">
                <span className="text-xs uppercase tracking-wider text-[#C5A46D] font-bold block mb-1">
                  {loc.city}
                </span>
                <h3 className="font-heading text-xl font-bold leading-snug">
                  {loc.district}
                </h3>
                <div className="flex items-center justify-between text-xs text-slate-200 mt-2 pt-2 border-t border-white/20">
                  <span>{loc.activeCount}</span>
                  <span className="font-semibold text-[#C5A46D]">{loc.medianPrice}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>}

      {/* 6. WHY CHOOSE US SECTION */}
      <section className="py-20 bg-white border-y border-[#E4DFD3]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs uppercase tracking-wider text-[#9C7C3E] font-bold">
              The Aurelia Standard
            </span>
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-[#142D4E] mt-1">
              Why Discerning Buyers Choose Us
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-2">
              Engineered from the ground up to solve the most pervasive trust and safety issues in real estate.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="p-6 bg-[#F7F5F0] rounded-3xl border border-[#E4DFD3] space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#142D4E] flex items-center justify-center text-[#C5A46D]">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="font-heading text-lg font-bold text-[#142D4E]">
                Uncompromising Trust
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Property details shown here are sample data for this prototype. Ownership, condition, and listing status have not been independently verified.
              </p>
            </div>

            <div className="p-6 bg-[#F7F5F0] rounded-3xl border border-[#E4DFD3] space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#142D4E] flex items-center justify-center text-[#C5A46D]">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="font-heading text-lg font-bold text-[#142D4E]">
                Effortless Simplicity
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Clean search filters, transparent price history records, and instant side-by-side spec comparison to eliminate information asymmetry.
              </p>
            </div>

            <div className="p-6 bg-[#F7F5F0] rounded-3xl border border-[#E4DFD3] space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#142D4E] flex items-center justify-center text-[#C5A46D]">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="font-heading text-lg font-bold text-[#142D4E]">
                Total Convenience
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Schedule private in-person inspections or live 360° video walk-throughs in seconds, synchronized directly with your personal calendar.
              </p>
            </div>

            <div className="p-6 bg-[#F7F5F0] rounded-3xl border border-[#E4DFD3] space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#142D4E] flex items-center justify-center text-[#C5A46D]">
                <UserCheck className="w-6 h-6" />
              </div>
              <h3 className="font-heading text-lg font-bold text-[#142D4E]">
                Fiduciary Support
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Direct access to top 1% licensed senior advisors who operate with confidentiality, accredited experience, and escrow protection.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. AGENT DIRECTORY PREVIEW */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12">
          <div>
            <span className="text-xs uppercase tracking-wider text-[#9C7C3E] font-bold">Property team</span>
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-[#142D4E] mt-1">Meet the Team</h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">Agent and manager profiles will appear here when their details are added.</p>
          </div>

          <button
            onClick={() => onNavigateToProtected('/agents')}
            className="text-xs font-bold text-[#142D4E] hover:text-[#9C7C3E] flex items-center gap-1 transition-colors self-start sm:self-auto"
          >
            <span>View All Advisors</span>
            <ArrowRight className="w-4 h-4 text-[#C5A46D]" />
          </button>
        </div>

        {previewAgents.length > 0 && <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {previewAgents.map((agent) => (
            <div
              key={agent.id}
              className="bg-white rounded-3xl p-6 border border-[#E4DFD3] shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-[#C5A46D] mx-auto mb-4 shadow-sm">
                  <ImageWithFallback src={agent.avatar} alt={agent.name} className="w-full h-full object-cover" />
                </div>
                <div className="text-center">
                  <div className="inline-flex items-center gap-1 font-heading text-base font-bold text-[#142D4E]">
                    <span>{agent.name}</span>
                    <ShieldCheck className="w-3.5 h-3.5 text-[#C5A46D]" />
                  </div>
                  <p className="text-[11px] text-slate-500">{agent.role}</p>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">Lic. {agent.licenseNumber}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-[#E4DFD3] text-xs space-y-1.5">
                  <div className="flex justify-between text-slate-600">
                    <span>Career Sales:</span>
                    <span className="font-semibold text-[#142D4E]">{agent.salesVolume}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Client Rating:</span>
                    <span className="font-semibold text-[#142D4E]">★ {agent.rating}</span>
                  </div>
                </div>
              </div>

              <div className="pt-5">
                <button
                  onClick={() => onNavigateToProtected('/agents')}
                  className="w-full py-2.5 rounded-xl text-xs font-bold bg-[#142D4E] text-white hover:bg-[#0D1E35] transition-colors"
                >
                  Connect with {agent.name.split(' ')[0]}
                </button>
              </div>
            </div>
          ))}
        </div>}
      </section>

      {/* 8. FINAL CALL-TO-ACTION SECTION (Deep Navy #142D4E Background) */}
      <section className="bg-[#142D4E] text-white py-20 sm:py-24 border-t border-[#263445]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center max-w-3xl space-y-6">
          <div className="w-12 h-12 rounded-2xl bg-[#C5A46D]/20 border border-[#C5A46D]/40 flex items-center justify-center mx-auto text-[#C5A46D]">
            <Sparkles className="w-6 h-6" />
          </div>

          <h2 className="font-heading text-3xl sm:text-5xl font-extrabold tracking-tight">
            Ready to find your sanctuary?
          </h2>

          <p className="text-sm sm:text-lg text-slate-300 leading-relaxed">
            Join thousands of verified buyers and property owners who experience complete transparency, legal deed audits, and dedicated fiduciary care.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <button
              onClick={() => onNavigateToProtected('/buy')}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl text-xs sm:text-sm font-bold bg-[#C5A46D] text-[#142D4E] hover:bg-[#B8975A] shadow-xl transition-all"
            >
              Start Your Search
            </button>
            <button
              onClick={() => onNavigateToProtected('/agents')}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl text-xs sm:text-sm font-bold bg-transparent hover:bg-white/10 text-white border border-white/30 transition-all"
            >
              Speak with an Advisor
            </button>
          </div>
        </div>
      </section>

      {/* 9. COMPREHENSIVE PROFESSIONAL FOOTER */}
      <footer className="bg-white border-t border-[#E4DFD3] text-[#263445] text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
          {/* Brand info */}
          <div className="col-span-2 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#142D4E] flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-[#C5A46D]" />
              </div>
              <span className="font-heading text-xl font-bold text-[#142D4E]">
                Aurelia <span className="text-[#9C7C3E]">Homes</span>
              </span>
            </div>
            <p className="text-xs text-slate-600 max-w-sm leading-relaxed">
              Derived from the Latin <em className="text-[#9C7C3E]">aurum</em> (gold). The standard of title-audited architectural acquisitions and high-integrity tenancy across prime global capitals.
            </p>
            <div className="pt-2 text-slate-500 space-y-1">
              <p>London Salon: 12 Berkeley Square, Mayfair</p>
              <p>New York Salon: 72 Franklin Street, Tribeca</p>
              <p>Global Hotline: +44 20 7946 0912 / +1 (212) 555-0194</p>
            </div>
          </div>

          {/* Real Estate Services */}
          <div className="space-y-3">
            <h4 className="font-heading font-bold text-xs uppercase tracking-wider text-slate-900">
              Real Estate
            </h4>
            <ul className="space-y-2 text-slate-600">
              <li>
                <button onClick={() => onNavigateToProtected('/buy')} className="hover:text-[#142D4E]">
                  Browse Homes for Sale
                </button>
              </li>
              <li>
                <button onClick={() => onNavigateToProtected('/rent')} className="hover:text-[#142D4E]">
                  Luxury Rental Network
                </button>
              </li>
              <li>
                <button onClick={() => onNavigateToProtected('/sell')} className="hover:text-[#142D4E]">
                  Sell with Title Audit
                </button>
              </li>
              <li>
                <button onClick={() => onNavigateToProtected('/manage-rentals')} className="hover:text-[#142D4E]">
                  Manage Rentals
                </button>
              </li>
            </ul>
          </div>

          {/* Financial Tools */}
          <div className="space-y-3">
            <h4 className="font-heading font-bold text-xs uppercase tracking-wider text-slate-900">
              Advisory & Tools
            </h4>
            <ul className="space-y-2 text-slate-600">
              <li>
                <button onClick={() => onNavigateToProtected('/mortgage')} className="hover:text-[#142D4E]">
                  Mortgage Amortization
                </button>
              </li>
              <li>
                <button onClick={() => onNavigateToProtected('/tools')} className="hover:text-[#142D4E]">
                  Automated Valuation Model
                </button>
              </li>
              <li>
                <button onClick={() => onNavigateToProtected('/agents')} className="hover:text-[#142D4E]">
                  Find a Licensed Advisor
                </button>
              </li>
              <li>
                <button onClick={onOpenHelp} className="hover:text-[#142D4E]">
                  Help Center & FAQ
                </button>
              </li>
            </ul>
          </div>

          {/* Legal & Governance */}
          <div className="space-y-3">
            <h4 className="font-heading font-bold text-xs uppercase tracking-wider text-slate-900">
              Trust & Legal
            </h4>
            <ul className="space-y-2 text-slate-600">
              <li>
                <button onClick={onOpenPrivacy} className="hover:text-[#142D4E]">
                  Privacy Policy
                </button>
              </li>
              <li>
                <button onClick={onOpenTerms} className="hover:text-[#142D4E]">
                  Terms of Representation
                </button>
              </li>
              <li>
                <button onClick={onOpenTerms} className="hover:text-[#142D4E]">
                  Equal Housing Opportunity
                </button>
              </li>
              <li>
                <button onClick={onOpenHelp} className="hover:text-[#142D4E]">
                  Accessibility (WCAG 2.2 AA)
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Sub-footer */}
        <div className="border-t border-[#E4DFD3] py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-500 text-[11px]">
          <div>
            © {new Date().getFullYear()} Aurelia Homes International Ltd. All rights reserved. Equal Housing Opportunity.
          </div>
          <div className="flex items-center gap-4">
            <span>Prototype demo · No escrow services</span>
            <span aria-hidden="true">·</span>
            <span>London · New York · Paris · Los Angeles</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
