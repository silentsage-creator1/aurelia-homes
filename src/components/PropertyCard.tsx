import React from 'react';
import { Heart, ShieldCheck, Bed, Bath, Maximize2, MapPin, Video, Eye, Scale } from 'lucide-react';
import { Property } from '../types';
import { ImageWithFallback } from './ImageWithFallback';

interface PropertyCardProps {
  property: Property;
  isFavorite: boolean;
  isCompared: boolean;
  onToggleFavorite: (propertyId: string) => void;
  onToggleCompare: (property: Property) => void;
  onSelect: (property: Property) => void;
  onQuickBook: (property: Property) => void;
}

export const PropertyCard: React.FC<PropertyCardProps> = ({
  property,
  isFavorite,
  isCompared,
  onToggleFavorite,
  onToggleCompare,
  onSelect,
  onQuickBook,
}) => {
  return (
    <div className="group bg-white rounded-2xl border border-[#E4DFD3] overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col h-full relative">
      {/* Visual Asset Container */}
      <div className="relative aspect-[16/10] overflow-hidden bg-slate-900">
        <ImageWithFallback
          src={property.images[0]}
          alt={property.title}
          fallbackTitle={property.title}
          className="w-full h-full group-hover:scale-105 transition-transform duration-500 ease-out"
        />

        {/* Gradient scrim for badge readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 pointer-events-none" />

        {/* Top Badges Row */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
          {/* Verified Listing Badge (Core MVP Trust Feature) */}
          <div className="pointer-events-auto inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#142D4E] text-[#C5A46D] text-[11px] font-semibold tracking-wide shadow-sm border border-[#C5A46D]/30">
            <ShieldCheck className="w-3.5 h-3.5 text-[#C5A46D]" />
            <span>Verified Listing</span>
          </div>

          <div className="flex items-center gap-1.5 pointer-events-auto">
            {property.hasVirtualTour && (
              <span
                title="360° Live Tour Available"
                className="p-1.5 rounded-lg bg-black/50 backdrop-blur-xs text-white text-[11px] border border-white/20 flex items-center"
              >
                <Video className="w-3.5 h-3.5" />
              </span>
            )}
            {/* Favorite button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(property.id);
              }}
              title={isFavorite ? 'Remove from saved' : 'Save to favorites'}
              className={`p-2 rounded-xl backdrop-blur-md transition-all ${
                isFavorite
                  ? 'bg-white text-[#B3402F] shadow-sm'
                  : 'bg-black/40 text-white hover:bg-white hover:text-[#B3402F]'
              }`}
            >
              <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
            </button>
          </div>
        </div>

        {/* Bottom Property Type & Location Kicker on photo */}
        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between text-white pointer-events-none">
          <span className="text-xs font-medium tracking-wide uppercase px-2 py-0.5 rounded-sm bg-black/40 backdrop-blur-xs border border-white/10">
            {property.propertyType}
          </span>
          <span className="text-[11px] font-sans text-slate-200 bg-black/40 px-2 py-0.5 rounded-sm">
            {property.city}
          </span>
        </div>
      </div>

      {/* Card Content Body */}
      <div className="p-5 flex flex-col flex-1 justify-between">
        <div>
          {/* Price Header */}
          <div className="flex items-baseline justify-between mb-1.5">
            <span className="font-serif text-2xl font-bold text-[#142D4E] tracking-tight tabular-nums">
              {property.priceFormatted}
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              For {property.type === 'buy' ? 'Sale' : 'Lease'}
            </span>
          </div>

          {/* Title and Address */}
          <button
            onClick={() => onSelect(property)}
            className="text-left group/title focus:outline-none w-full"
          >
            <h3 className="font-serif text-lg font-semibold text-[#142D4E] group-hover/title:text-[#9C7C3E] transition-colors line-clamp-1">
              {property.title}
            </h3>
          </button>
          <p className="flex items-center gap-1 text-xs text-slate-500 mt-1 line-clamp-1">
            <MapPin className="w-3.5 h-3.5 text-[#C5A46D] shrink-0" />
            <span>{property.address}</span>
          </p>

          <p className="text-xs text-slate-600 mt-2.5 line-clamp-2 leading-relaxed">
            {property.tagline}
          </p>
        </div>

        {/* Specs Grid */}
        <div className="mt-4 pt-3 border-t border-[#E4DFD3] grid grid-cols-3 gap-2 text-center text-xs text-slate-600">
          <div className="flex flex-col items-center justify-center p-1.5 bg-[#F7F5F0] rounded-lg">
            <span className="flex items-center gap-1 font-semibold text-[#142D4E]">
              <Bed className="w-3.5 h-3.5 text-[#C5A46D]" />
              <span className="tabular-nums">{property.bedrooms}</span>
            </span>
            <span className="text-[10px] text-slate-500 uppercase">Beds</span>
          </div>
          <div className="flex flex-col items-center justify-center p-1.5 bg-[#F7F5F0] rounded-lg">
            <span className="flex items-center gap-1 font-semibold text-[#142D4E]">
              <Bath className="w-3.5 h-3.5 text-[#C5A46D]" />
              <span className="tabular-nums">{property.bathrooms}</span>
            </span>
            <span className="text-[10px] text-slate-500 uppercase">Baths</span>
          </div>
          <div className="flex flex-col items-center justify-center p-1.5 bg-[#F7F5F0] rounded-lg">
            <span className="flex items-center gap-1 font-semibold text-[#142D4E]">
              <Maximize2 className="w-3.5 h-3.5 text-[#C5A46D]" />
              <span className="tabular-nums">{property.sqft.toLocaleString()}</span>
            </span>
            <span className="text-[10px] text-slate-500 uppercase">Sq Ft</span>
          </div>
        </div>

        {/* Card Actions & Compare Switcher */}
        <div className="mt-4 pt-3 border-t border-[#E4DFD3]/60 flex items-center justify-between gap-2">
          {/* Compare toggle */}
          <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none hover:text-[#142D4E]">
            <input
              type="checkbox"
              checked={isCompared}
              onChange={() => onToggleCompare(property)}
              className="rounded border-[#E4DFD3] text-[#142D4E] focus:ring-[#C5A46D]"
            />
            <span className="flex items-center gap-1 text-[11px]">
              <Scale className="w-3 h-3 text-[#C5A46D]" /> Compare
            </span>
          </label>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onSelect(property)}
              className="px-3 py-1.5 text-xs font-semibold text-[#142D4E] hover:bg-[#F7F5F0] border border-[#142D4E]/30 rounded-lg transition-colors flex items-center gap-1"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Details</span>
            </button>
            <button
              onClick={() => onQuickBook(property)}
              className="px-3 py-1.5 text-xs font-semibold bg-[#C5A46D] text-[#142D4E] hover:bg-[#B8975A] rounded-lg transition-colors shadow-xs"
            >
              Book Viewing
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
