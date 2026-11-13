import React, { useState } from 'react';
import { Property } from '../types';
import { ShieldCheck, Bed, Bath, Maximize2, X, ArrowUpRight, ZoomIn, ZoomOut, Layers } from 'lucide-react';
import { ImageWithFallback } from './ImageWithFallback';

interface InteractiveMapProps {
  properties: Property[];
  selectedProperty: Property | null;
  onSelectProperty: (property: Property) => void;
  onBookViewing: (property: Property) => void;
}

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  properties,
  selectedProperty,
  onSelectProperty,
  onBookViewing,
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [activePin, setActivePin] = useState<Property | null>(selectedProperty || properties[0] || null);

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.25, 2.0));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 0.25, 0.75));

  return (
    <div className="relative w-full h-[620px] bg-[#142D4E] rounded-2xl overflow-hidden border border-[#E4DFD3] shadow-lg">
      {/* Map Canvas Background (Simulated Architectural Cartography) */}
      <div
        className="absolute inset-0 transition-transform duration-300 origin-center"
        style={{ transform: `scale(${zoomLevel})` }}
      >
        <svg
          viewBox="0 0 1000 600"
          className="w-full h-full object-cover select-none"
          preserveAspectRatio="none"
        >
          {/* Subtle cartographic grid */}
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#263445" strokeWidth="0.5" strokeOpacity="0.4" />
            </pattern>
            <linearGradient id="waterGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0B1A2F" />
              <stop offset="100%" stopColor="#142D4E" />
            </linearGradient>
            <linearGradient id="parkGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1b362c" />
              <stop offset="100%" stopColor="#12251e" />
            </linearGradient>
          </defs>

          {/* Map Base Field */}
          <rect width="1000" height="600" fill="#0D1E35" />
          <rect width="1000" height="600" fill="url(#grid)" />

          {/* Simulated River / Waterway */}
          <path
            d="M -10,320 C 150,300 280,360 450,310 C 620,260 780,340 1020,290 L 1020,400 C 800,430 600,360 430,420 C 260,470 120,410 -10,430 Z"
            fill="url(#waterGrad)"
            stroke="#C5A46D"
            strokeWidth="0.5"
            strokeOpacity="0.3"
          />

          {/* Parks & Enclaves */}
          <path
            d="M 180,120 Q 240,100 290,160 T 260,260 T 170,240 Z"
            fill="url(#parkGrad)"
            opacity="0.6"
            stroke="#2E7D5B"
            strokeWidth="0.5"
          />
          <text x="210" y="190" fill="#2E7D5B" fontSize="11" opacity="0.8" fontFamily="sans-serif">
            Kensington Gardens Reserve
          </text>

          <path
            d="M 680,140 Q 780,120 830,190 T 790,290 T 670,260 Z"
            fill="url(#parkGrad)"
            opacity="0.6"
            stroke="#2E7D5B"
            strokeWidth="0.5"
          />
          <text x="710" y="210" fill="#2E7D5B" fontSize="11" opacity="0.8" fontFamily="sans-serif">
            Central Historic Enclave
          </text>

          {/* Arterial Avenues */}
          <path d="M 0,180 L 1000,200" stroke="#263445" strokeWidth="2.5" />
          <path d="M 0,470 L 1000,490" stroke="#263445" strokeWidth="2.5" />
          <path d="M 330,0 L 370,600" stroke="#263445" strokeWidth="3" />
          <path d="M 650,0 L 610,600" stroke="#263445" strokeWidth="3" />
          <path d="M 150,0 L 220,600" stroke="#263445" strokeWidth="1.5" strokeDasharray="6,4" />
          <path d="M 850,0 L 780,600" stroke="#263445" strokeWidth="1.5" strokeDasharray="6,4" />

          {/* District Labels */}
          <text x="140" y="70" fill="#C5A46D" fontSize="12" letterSpacing="2" fontWeight="600" opacity="0.7">
            KENSINGTON & CHELSEA
          </text>
          <text x="560" y="70" fill="#C5A46D" fontSize="12" letterSpacing="2" fontWeight="600" opacity="0.7">
            TRIBECA & SOHO
          </text>
          <text x="680" y="540" fill="#C5A46D" fontSize="12" letterSpacing="2" fontWeight="600" opacity="0.7">
            RIVIERA COASTAL CORRIDOR
          </text>
          <text x="120" y="540" fill="#C5A46D" fontSize="12" letterSpacing="2" fontWeight="600" opacity="0.7">
            BEL AIR & BEVERLY HILLS
          </text>
        </svg>

        {/* Property Map Pins */}
        {properties.map((prop) => {
          const isSelected = activePin?.id === prop.id;
          return (
            <div
              key={prop.id}
              style={{
                left: `${prop.coordinates.x}%`,
                top: `${prop.coordinates.y}%`,
              }}
              className="absolute -translate-x-1/2 -translate-y-1/2 z-20"
            >
              <button
                type="button"
                onClick={() => setActivePin(prop)}
                className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-lg ${
                  isSelected
                    ? 'bg-[#C5A46D] text-[#142D4E] scale-110 ring-4 ring-[#C5A46D]/40'
                    : 'bg-[#142D4E] text-white hover:bg-[#C5A46D] hover:text-[#142D4E] border border-[#C5A46D]/50 hover:scale-105'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="tabular-nums whitespace-nowrap">{prop.priceFormatted}</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Map Utility Controls (Top-Right) */}
      <div className="absolute top-4 right-4 z-30 flex flex-col gap-2">
        <div className="bg-[#142D4E]/90 backdrop-blur-md rounded-xl p-1 border border-[#E4DFD3]/20 flex flex-col shadow-lg">
          <button
            onClick={handleZoomIn}
            title="Zoom In"
            className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomOut}
            title="Zoom Out"
            className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
        </div>

        <div className="bg-[#142D4E]/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-[#E4DFD3]/20 text-[11px] text-slate-300 flex items-center gap-1.5 shadow-lg">
          <Layers className="w-3.5 h-3.5 text-[#C5A46D]" />
          <span>{properties.length} Active Pins</span>
        </div>
      </div>

      {/* Selected Property Floating Preview Card (Bottom-Left) */}
      {activePin && (
        <div className="absolute bottom-4 left-4 right-4 sm:right-auto sm:w-96 z-30 bg-white rounded-2xl p-4 shadow-2xl border border-[#E4DFD3] text-[#263445] animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#142D4E] text-[#C5A46D] text-[10px] font-semibold border border-[#C5A46D]/30">
                <ShieldCheck className="w-3 h-3 text-[#C5A46D]" />
                <span>Verified Inspection</span>
              </span>
              <span className="text-[10px] text-slate-500 uppercase tracking-wide">
                {activePin.propertyType}
              </span>
            </div>
            <button
              onClick={() => setActivePin(null)}
              className="p-1 text-slate-400 hover:text-slate-700 rounded-md"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex gap-3">
            <div className="w-24 h-20 rounded-xl overflow-hidden shrink-0">
              <ImageWithFallback
                src={activePin.images[0]}
                alt={activePin.title}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-serif text-lg font-bold text-[#142D4E] tabular-nums">
                {activePin.priceFormatted}
              </p>
              <h4 className="font-semibold text-xs text-slate-800 truncate">
                {activePin.title}
              </h4>
              <p className="text-[11px] text-slate-500 truncate">
                {activePin.address}
              </p>

              <div className="flex items-center gap-3 text-[11px] text-slate-600 mt-2">
                <span className="flex items-center gap-1">
                  <Bed className="w-3 h-3 text-[#C5A46D]" /> {activePin.bedrooms}
                </span>
                <span className="flex items-center gap-1">
                  <Bath className="w-3 h-3 text-[#C5A46D]" /> {activePin.bathrooms}
                </span>
                <span className="flex items-center gap-1">
                  <Maximize2 className="w-3 h-3 text-[#C5A46D]" /> {activePin.sqft.toLocaleString()} sqft
                </span>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-[#E4DFD3] flex items-center justify-end gap-2">
            <button
              onClick={() => onSelectProperty(activePin)}
              className="px-3 py-1.5 text-xs font-semibold text-[#142D4E] hover:bg-[#F7F5F0] border border-[#142D4E]/30 rounded-lg transition-colors flex items-center gap-1"
            >
              <span>Full Details</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onBookViewing(activePin)}
              className="px-3 py-1.5 text-xs font-semibold bg-[#C5A46D] text-[#142D4E] hover:bg-[#B8975A] rounded-lg transition-colors shadow-xs"
            >
              Book Viewing
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
