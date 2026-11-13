import React from 'react';
import { Property } from '../types';
import { ImageWithFallback } from './ImageWithFallback';
import { X, Scale, Bed, Bath, Maximize2, ShieldCheck, Check, Calendar } from 'lucide-react';

interface CompareDrawerProps {
  properties: Property[];
  onRemove: (id: string) => void;
  onClear: () => void;
  onSelectProperty: (property: Property) => void;
  onBookViewing: (property: Property) => void;
  onClose: () => void;
}

export const CompareDrawer: React.FC<CompareDrawerProps> = ({
  properties,
  onRemove,
  onClear,
  onSelectProperty,
  onBookViewing,
  onClose,
}) => {
  if (properties.length === 0) return null;

  return (
    <div className="fixed inset-0 z-55 overflow-y-auto bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-[#F7F5F0] text-[#263445] w-full max-w-5xl rounded-3xl overflow-hidden shadow-2xl border border-[#E4DFD3] flex flex-col my-auto max-h-[90vh]">
        {/* Top bar */}
        <div className="bg-[#142D4E] text-white px-6 py-4 flex items-center justify-between border-b border-[#263445]">
          <div className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-[#C5A46D]" />
            <h3 className="font-serif text-lg font-bold">
              Side-by-Side Property Comparison ({properties.length}/3)
            </h3>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClear}
              className="text-xs text-slate-300 hover:text-white underline"
            >
              Clear All
            </button>
            <button
              onClick={onClose}
              className="p-1 text-slate-300 hover:text-white rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Table / Grid */}
        <div className="p-6 overflow-y-auto space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {properties.map((prop) => {
              const ppsqft = Math.round(prop.price / prop.sqft);
              return (
                <div
                  key={prop.id}
                  className="bg-white rounded-2xl border border-[#E4DFD3] p-5 shadow-xs flex flex-col justify-between relative"
                >
                  <button
                    onClick={() => onRemove(prop.id)}
                    title="Remove from comparison"
                    className="absolute top-3 right-3 z-10 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/90 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>

                  <div>
                    <div className="aspect-[16/10] rounded-xl overflow-hidden mb-3">
                      <ImageWithFallback
                        src={prop.images[0]}
                        alt={prop.title}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="flex items-center gap-1.5 mb-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#C5A46D]" />
                      <span className="text-[10px] uppercase font-bold text-[#9C7C3E]">
                        {prop.propertyType}
                      </span>
                    </div>

                    <h4
                      onClick={() => onSelectProperty(prop)}
                      className="font-serif font-bold text-base text-[#142D4E] hover:text-[#9C7C3E] cursor-pointer truncate"
                    >
                      {prop.title}
                    </h4>
                    <p className="text-xs text-slate-500 truncate mb-2">{prop.address}</p>

                    <p className="font-serif text-2xl font-bold text-[#142D4E] tabular-nums mb-4 pb-3 border-b border-[#E4DFD3]">
                      {prop.priceFormatted}
                    </p>

                    {/* Comparison matrix */}
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between py-1 border-b border-[#E4DFD3]/60">
                        <span className="text-slate-500">Price / Sq Ft:</span>
                        <span className="font-semibold text-[#142D4E] tabular-nums">${ppsqft.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-[#E4DFD3]/60">
                        <span className="text-slate-500">Bedrooms:</span>
                        <span className="font-semibold text-[#142D4E] tabular-nums">{prop.bedrooms} Beds</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-[#E4DFD3]/60">
                        <span className="text-slate-500">Bathrooms:</span>
                        <span className="font-semibold text-[#142D4E] tabular-nums">{prop.bathrooms} Baths</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-[#E4DFD3]/60">
                        <span className="text-slate-500">Total Sq Footage:</span>
                        <span className="font-semibold text-[#142D4E] tabular-nums">{prop.sqft.toLocaleString()} sqft</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-[#E4DFD3]/60">
                        <span className="text-slate-500">Year Built:</span>
                        <span className="font-semibold text-[#142D4E] tabular-nums">{prop.yearBuilt}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-[#E4DFD3]/60">
                        <span className="text-slate-500">Walk Score:</span>
                        <span className="font-semibold text-[#142D4E] tabular-nums">{prop.neighborhoodInsights.walkScore}/100</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-[#E4DFD3]/60">
                        <span className="text-slate-500">Monthly HOA:</span>
                        <span className="font-semibold text-[#142D4E] tabular-nums">${prop.hoaFeeMonthly || 0}/mo</span>
                      </div>
                    </div>

                    <div className="mt-4 pt-2">
                      <span className="text-[11px] font-semibold text-slate-600 block mb-1">Key Features:</span>
                      <div className="flex flex-wrap gap-1">
                        {prop.amenities.slice(0, 3).map((a) => (
                          <span key={a} className="text-[10px] bg-[#F7F5F0] border border-[#E4DFD3] px-2 py-0.5 rounded-sm">
                            {a}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-[#E4DFD3] flex gap-2">
                    <button
                      onClick={() => onSelectProperty(prop)}
                      className="flex-1 py-2 text-xs font-semibold text-[#142D4E] hover:bg-[#F7F5F0] border border-[#142D4E] rounded-xl transition-colors"
                    >
                      Dossier
                    </button>
                    <button
                      onClick={() => onBookViewing(prop)}
                      className="flex-1 py-2 text-xs font-bold bg-[#C5A46D] text-[#142D4E] hover:bg-[#B8975A] rounded-xl shadow-xs"
                    >
                      Book Tour
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
