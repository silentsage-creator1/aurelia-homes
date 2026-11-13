import React, { useState } from 'react';
import { FilterState, ListingType } from '../types';
import { Search, SlidersHorizontal, Map, Grid, Check, RotateCcw, ShieldCheck } from 'lucide-react';

interface FilterBarProps {
  filters: FilterState;
  onChangeFilters: (newFilters: FilterState) => void;
  viewMode: 'grid' | 'map';
  onChangeViewMode: (mode: 'grid' | 'map') => void;
  onNavigateType: (type: ListingType | 'all') => void;
  totalResults: number;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onChangeFilters,
  viewMode,
  onChangeViewMode,
  onNavigateType,
  totalResults,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const amenityOptions = [
    'Private Garden',
    'Wine Cellar',
    'Infinity Pool',
    '24/7 Concierge',
    'Home Cinema',
    'Private Elevator',
    'Keyed Elevator',
    'Smart Security',
    'Underground Parking',
  ];

  const handleAmenityToggle = (amenity: string) => {
    const exists = filters.selectedAmenities.includes(amenity);
    const updated = exists
      ? filters.selectedAmenities.filter((a) => a !== amenity)
      : [...filters.selectedAmenities, amenity];
    onChangeFilters({ ...filters, selectedAmenities: updated });
  };

  const handleReset = () => {
    onChangeFilters({
      searchQuery: '',
      type: 'all',
      location: '',
      propertyType: 'all',
      minPrice: 0,
      maxPrice: 0,
      minBeds: 0,
      minBaths: 0,
      verifiedOnly: false,
      virtualTourOnly: false,
      selectedAmenities: [],
      sortBy: 'featured',
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E4DFD3] p-4 sm:p-5 shadow-xs mb-8">
      {/* Primary Row */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Left: Quick search query & type switch */}
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Text search */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={filters.searchQuery}
              onChange={(e) => onChangeFilters({ ...filters, searchQuery: e.target.value })}
              placeholder="Search by neighborhood, street, or feature..."
              className="w-full pl-9 pr-3 py-2 bg-[#F7F5F0] border border-[#E4DFD3] rounded-xl text-xs sm:text-sm text-[#263445] focus:outline-none focus:border-[#C5A46D]"
            />
          </div>

          {/* Segmented Buy / Rent / All filter tabs */}
          <div className="flex items-center gap-1 p-1 bg-[#F7F5F0] rounded-xl border border-[#E4DFD3]">
            <button
              onClick={() => onNavigateType('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                filters.type === 'all'
                  ? 'bg-[#142D4E] text-white shadow-xs'
                  : 'text-[#263445] hover:text-[#142D4E]'
              }`}
            >
              All
            </button>
            <button
              onClick={() => onNavigateType('buy')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                filters.type === 'buy'
                  ? 'bg-[#142D4E] text-white shadow-xs'
                  : 'text-[#263445] hover:text-[#142D4E]'
              }`}
            >
              Buy
            </button>
            <button
              onClick={() => onNavigateType('rent')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                filters.type === 'rent'
                  ? 'bg-[#142D4E] text-white shadow-xs'
                  : 'text-[#263445] hover:text-[#142D4E]'
              }`}
            >
              Rent
            </button>
          </div>

          {/* Property Type select */}
          <select
            value={filters.propertyType}
            onChange={(e) => onChangeFilters({ ...filters, propertyType: e.target.value })}
            className="py-2 px-3 bg-[#F7F5F0] border border-[#E4DFD3] rounded-xl text-xs text-[#263445] focus:outline-none focus:border-[#C5A46D]"
          >
            <option value="all">All Styles</option>
            <option value="Penthouse">Penthouse</option>
            <option value="Historic Estate">Historic Estate</option>
            <option value="Villa">Villa</option>
            <option value="Waterfront">Waterfront</option>
            <option value="Luxury Apartment">Luxury Apartment</option>
            <option value="Townhouse">Townhouse</option>
          </select>

          {/* Min Bedrooms */}
          <select
            value={filters.minBeds}
            onChange={(e) => onChangeFilters({ ...filters, minBeds: Number(e.target.value) })}
            className="py-2 px-3 bg-[#F7F5F0] border border-[#E4DFD3] rounded-xl text-xs text-[#263445] focus:outline-none focus:border-[#C5A46D]"
          >
            <option value="0">Any Beds</option>
            <option value="2">2+ Beds</option>
            <option value="3">3+ Beds</option>
            <option value="4">4+ Beds</option>
            <option value="5">5+ Beds</option>
          </select>
        </div>

        {/* Right: Controls & View switcher */}
        <div className="flex items-center gap-2.5 shrink-0 self-end lg:self-center">
          {/* Sort By */}
          <select
            value={filters.sortBy}
            onChange={(e) => onChangeFilters({ ...filters, sortBy: e.target.value as any })}
            className="py-2 px-3 bg-[#F7F5F0] border border-[#E4DFD3] rounded-xl text-xs text-[#263445] focus:outline-none focus:border-[#C5A46D]"
          >
            <option value="featured">Featured First</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
            <option value="sqft-desc">Largest Space</option>
            <option value="newest">Recently Inspected</option>
          </select>

          {/* More Filters toggle */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-colors ${
              showAdvanced || filters.selectedAmenities.length > 0 || filters.verifiedOnly
                ? 'bg-[#142D4E] text-white border-[#142D4E]'
                : 'bg-[#F7F5F0] text-[#263445] border-[#E4DFD3] hover:border-[#C5A46D]'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filters</span>
            {filters.selectedAmenities.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-[#C5A46D] text-[#142D4E] font-bold text-[10px] flex items-center justify-center">
                {filters.selectedAmenities.length}
              </span>
            )}
          </button>

          {/* Grid vs Map Toggle */}
          <div className="flex items-center p-1 bg-[#F7F5F0] rounded-xl border border-[#E4DFD3]">
            <button
              onClick={() => onChangeViewMode('grid')}
              title="Grid View"
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'grid'
                  ? 'bg-white text-[#142D4E] shadow-xs'
                  : 'text-slate-500 hover:text-[#142D4E]'
              }`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => onChangeViewMode('map')}
              title="Map View"
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'map'
                  ? 'bg-white text-[#142D4E] shadow-xs'
                  : 'text-slate-500 hover:text-[#142D4E]'
              }`}
            >
              <Map className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Advanced Expandable Filters Panel */}
      {showAdvanced && (
        <div className="mt-4 pt-4 border-t border-[#E4DFD3] space-y-4 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Verified & Tour Toggles */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
                Aurelia Quality Standards
              </p>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.verifiedOnly}
                    onChange={(e) => onChangeFilters({ ...filters, verifiedOnly: e.target.checked })}
                    className="rounded border-[#E4DFD3] text-[#142D4E] focus:ring-[#C5A46D]"
                  />
                  <span className="flex items-center gap-1 font-medium">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#C5A46D]" /> Verified flag only
                  </span>
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.virtualTourOnly}
                    onChange={(e) => onChangeFilters({ ...filters, virtualTourOnly: e.target.checked })}
                    className="rounded border-[#E4DFD3] text-[#142D4E] focus:ring-[#C5A46D]"
                  />
                  <span>Live 360° Virtual Walkthrough Available</span>
                </label>
              </div>
            </div>

            {/* Bathrooms */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
                Bathrooms Minimum
              </p>
              <div className="flex items-center gap-1.5">
                {[0, 2, 3, 4, 5].map((baths) => (
                  <button
                    key={baths}
                    onClick={() => onChangeFilters({ ...filters, minBaths: baths })}
                    className={`px-3 py-1 text-xs rounded-lg border transition-colors ${
                      filters.minBaths === baths
                        ? 'bg-[#142D4E] text-white border-[#142D4E]'
                        : 'bg-[#F7F5F0] text-slate-700 border-[#E4DFD3] hover:border-[#C5A46D]'
                    }`}
                  >
                    {baths === 0 ? 'Any' : `${baths}+`}
                  </button>
                ))}
              </div>
            </div>

            {/* Reset Actions */}
            <div className="flex items-end justify-end">
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-600 hover:text-[#B3402F] transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset All Filters</span>
              </button>
            </div>
          </div>

          {/* Amenities Chips */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
              Bespoke Amenities
            </p>
            <div className="flex flex-wrap gap-2">
              {amenityOptions.map((amenity) => {
                const isSelected = filters.selectedAmenities.includes(amenity);
                return (
                  <button
                    key={amenity}
                    onClick={() => handleAmenityToggle(amenity)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-[#C5A46D] text-[#142D4E] border-[#C5A46D] font-semibold'
                        : 'bg-[#F7F5F0] text-slate-700 border-[#E4DFD3] hover:border-[#C5A46D]'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 text-[#142D4E]" />}
                    <span>{amenity}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Results Count Bar */}
      <div className="mt-3 pt-3 border-t border-[#E4DFD3]/60 flex items-center justify-between text-xs text-slate-500">
        <div>
          Showing <span className="font-semibold text-[#142D4E]">{totalResults}</span> verified residences
        </div>
        <div className="text-[11px]">
          Targeting WCAG 2.2 AA · 4.5:1 High Contrast Standards
        </div>
      </div>
    </div>
  );
};
