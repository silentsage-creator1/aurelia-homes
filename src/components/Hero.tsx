import React, { useState } from 'react';
import { Search, MapPin, Home, DollarSign, Bed, ShieldCheck, ArrowRight } from 'lucide-react';
import { ListingType } from '../types';

interface HeroProps {
  onSearch: (params: {
    type: ListingType;
    location: string;
    propertyType: string;
    maxPrice: number;
    minBeds: number;
  }) => void;
  onExploreMap: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onSearch, onExploreMap }) => {
  const [activeTab, setActiveTab] = useState<ListingType>('buy');
  const [location, setLocation] = useState('');
  const [propertyType, setPropertyType] = useState('all');
  const [maxPrice, setMaxPrice] = useState<number>(0);
  const [minBeds, setMinBeds] = useState<number>(0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch({
      type: activeTab,
      location,
      propertyType,
      maxPrice,
      minBeds
    });
  };

  const quickPicks = [
    { label: 'Kensington Historic', loc: 'Kensington' },
    { label: 'Tribeca Lofts', loc: 'Tribeca' },
    { label: 'Riviera Waterfront', loc: 'Côte d\'Azur' },
    { label: 'Bel Air Modern', loc: 'Bel Air' },
  ];

  return (
    <section className="relative bg-[#142D4E] text-white overflow-hidden py-16 sm:py-24 border-b border-[#263445]">
      {/* Background architectural image with deep navy atmospheric scrim */}
      <div className="absolute inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1920&q=80"
          alt="Luxury Architecture"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover object-center scale-105 opacity-25"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0D1E35] via-[#142D4E]/90 to-[#142D4E]/80" />
        <div className="absolute inset-0 bg-[radial-gradient(#C5A46D_1px,transparent_1px)] opacity-10 [background-size:24px_24px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          {/* Trust badge kicker */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-[#C5A46D]/20 border border-[#C5A46D]/40 text-[#C5A46D] text-xs font-medium mb-4">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Explore the Aurelia Homes demo</span>
          </div>

          <h1 className="font-serif text-3xl sm:text-5xl lg:text-6xl text-white font-semibold tracking-tight leading-[1.15] text-balance mb-5">
            Discover Exceptional Living
          </h1>

          <p className="text-base sm:text-lg text-slate-300 font-normal leading-relaxed max-w-2xl mb-8">
            Browse sample listings and explore the features in this interactive Aurelia Homes prototype.
          </p>
        </div>

        {/* Search Console Container */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-2xl border border-[#E4DFD3] text-[#263445] max-w-5xl">
          {/* Segmented Buy / Rent Switcher */}
          <div className="flex items-center justify-between pb-4 border-b border-[#E4DFD3] mb-5">
            <div className="flex items-center gap-1 p-1 bg-[#F7F5F0] rounded-xl border border-[#E4DFD3]/60">
              <button
                type="button"
                onClick={() => setActiveTab('buy')}
                className={`px-6 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                  activeTab === 'buy'
                    ? 'bg-[#142D4E] text-white shadow-sm'
                    : 'text-[#263445] hover:text-[#142D4E]'
                }`}
              >
                Buy A Residence
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('rent')}
                className={`px-6 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                  activeTab === 'rent'
                    ? 'bg-[#142D4E] text-white shadow-sm'
                    : 'text-[#263445] hover:text-[#142D4E]'
                }`}
              >
                Rent Luxury
              </button>
            </div>

            <button
              type="button"
              onClick={onExploreMap}
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-[#142D4E] hover:text-[#9C7C3E] transition-colors"
            >
              <MapPin className="w-3.5 h-3.5 text-[#C5A46D]" />
              <span>Explore on Interactive Map</span>
            </button>
          </div>

          {/* Search Fields Form */}
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
            {/* Location input */}
            <div className="lg:col-span-4">
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                Location or Neighborhood
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-[#C5A46D] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Kensington, Tribeca, Riviera..."
                  className="w-full pl-9 pr-3 py-2.5 bg-[#F7F5F0] border border-[#E4DFD3] rounded-xl text-sm text-[#263445] focus:outline-none focus:border-[#C5A46D] focus:ring-1 focus:ring-[#C5A46D] transition-colors"
                />
              </div>
            </div>

            {/* Property Type */}
            <div className="lg:col-span-3">
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                Property Architecture
              </label>
              <div className="relative">
                <Home className="w-4 h-4 text-[#C5A46D] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <select
                  value={propertyType}
                  onChange={(e) => setPropertyType(e.target.value)}
                  className="w-full pl-9 pr-8 py-2.5 bg-[#F7F5F0] border border-[#E4DFD3] rounded-xl text-sm text-[#263445] focus:outline-none focus:border-[#C5A46D] appearance-none transition-colors"
                >
                  <option value="all">All Architectural Types</option>
                  <option value="Penthouse">Penthouse</option>
                  <option value="Historic Estate">Historic Estate</option>
                  <option value="Villa">Villa</option>
                  <option value="Waterfront">Waterfront</option>
                  <option value="Luxury Apartment">Luxury Apartment</option>
                  <option value="Townhouse">Townhouse</option>
                </select>
              </div>
            </div>

            {/* Price Limit */}
            <div className="lg:col-span-2">
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                Max Budget
              </label>
              <div className="relative">
                <DollarSign className="w-4 h-4 text-[#C5A46D] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <select
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(Number(e.target.value))}
                  className="w-full pl-9 pr-8 py-2.5 bg-[#F7F5F0] border border-[#E4DFD3] rounded-xl text-sm text-[#263445] focus:outline-none focus:border-[#C5A46D] appearance-none transition-colors"
                >
                  <option value="0">Any Price</option>
                  {activeTab === 'buy' ? (
                    <>
                      <option value="7000000">Up to $7.0M</option>
                      <option value="10000000">Up to $10.0M</option>
                      <option value="15000000">Up to $15.0M</option>
                    </>
                  ) : (
                    <>
                      <option value="10000">Up to $10k/mo</option>
                      <option value="15000">Up to $15k/mo</option>
                      <option value="25000">Up to $25k/mo</option>
                    </>
                  )}
                </select>
              </div>
            </div>

            {/* Bedrooms */}
            <div className="lg:col-span-1">
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                Beds
              </label>
              <div className="relative">
                <Bed className="w-4 h-4 text-[#C5A46D] absolute left-2.5 top-1/2 -translate-y-1/2" />
                <select
                  value={minBeds}
                  onChange={(e) => setMinBeds(Number(e.target.value))}
                  className="w-full pl-7 pr-2 py-2.5 bg-[#F7F5F0] border border-[#E4DFD3] rounded-xl text-sm text-[#263445] focus:outline-none focus:border-[#C5A46D] appearance-none transition-colors"
                >
                  <option value="0">Any</option>
                  <option value="2">2+</option>
                  <option value="3">3+</option>
                  <option value="4">4+</option>
                  <option value="5">5+</option>
                </select>
              </div>
            </div>

            {/* Submit Button */}
            <div className="lg:col-span-2">
              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-[#C5A46D] text-[#142D4E] hover:bg-[#B8975A] font-semibold text-xs tracking-wide rounded-xl shadow-md transition-all flex items-center justify-center gap-2 group"
              >
                <Search className="w-4 h-4 text-[#142D4E]" />
                <span>Search Homes</span>
              </button>
            </div>
          </form>

          {/* Quick recommendations */}
          <div className="mt-4 pt-3 border-t border-[#E4DFD3]/60 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="font-medium text-slate-700">Popular curated searches:</span>
            {quickPicks.map((pick) => (
              <button
                key={pick.label}
                type="button"
                onClick={() => {
                  setLocation(pick.loc);
                  onSearch({
                    type: activeTab,
                    location: pick.loc,
                    propertyType: 'all',
                    maxPrice: 0,
                    minBeds: 0,
                  });
                }}
                className="px-2.5 py-1 bg-[#F7F5F0] hover:bg-[#E4DFD3] text-[#263445] rounded-md transition-colors border border-[#E4DFD3]"
              >
                {pick.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
