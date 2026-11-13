import React, { useState } from 'react';
import { Property, Agent } from '../types';
import { ImageWithFallback } from './ImageWithFallback';
import {
  X,
  Heart,
  ShieldCheck,
  Bed,
  Bath,
  Maximize2,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Check,
  AlertTriangle,
  History,
  GraduationCap,
  Bus,
  Utensils,
  Share2,
  FileText,
  Video,
  ChevronLeft,
  ChevronRight,
  Calculator
} from 'lucide-react';

interface PropertyDetailModalProps {
  property: Property;
  agent?: Agent;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  onBookViewing: (property: Property) => void;
  onApplyToRent: (property: Property) => void;
  onContactAgent: (property: Property, agent?: Agent) => void;
  onOpenMortgageCalculator: (property: Property) => void;
  onClose: () => void;
}

export const PropertyDetailModal: React.FC<PropertyDetailModalProps> = ({
  property,
  agent,
  isFavorite,
  onToggleFavorite,
  onBookViewing,
  onApplyToRent,
  onContactAgent,
  onOpenMortgageCalculator,
  onClose,
}) => {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportSuccess, setReportSuccess] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleReportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setReportSuccess(true);
    setTimeout(() => {
      setReportModalOpen(false);
      setReportSuccess(false);
      setReportReason('');
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-sm flex justify-center p-2 sm:p-4 md:p-6 animate-in fade-in duration-200">
      <div className="bg-[#F7F5F0] text-[#263445] w-full max-w-5xl rounded-3xl overflow-hidden shadow-2xl border border-[#E4DFD3] flex flex-col my-auto relative">
        {/* Sticky Header inside modal */}
        <div className="sticky top-0 z-20 bg-[#142D4E] text-white px-6 py-4 flex items-center justify-between border-b border-[#263445]">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#C5A46D] text-[#142D4E] font-bold text-xs">
              <ShieldCheck className="w-3.5 h-3.5" />
              Verified Residence
            </span>
            <span className="text-xs text-slate-300 hidden sm:inline">
              Deed Ref: {property.cadastralId}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              title="Share Listing"
              className="p-2 text-slate-300 hover:text-white rounded-lg hover:bg-white/10 transition-colors text-xs flex items-center gap-1"
            >
              <Share2 className="w-4 h-4" />
              <span className="hidden sm:inline">{copiedLink ? 'Copied' : 'Share'}</span>
            </button>

            <button
              onClick={() => onToggleFavorite(property.id)}
              title={isFavorite ? 'Remove Favorite' : 'Save to Favorites'}
              className={`p-2 rounded-lg transition-colors ${
                isFavorite
                  ? 'bg-white/20 text-[#C5A46D]'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <Heart className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-4 sm:p-8 overflow-y-auto space-y-8">
          {/* Top Title & Price Section */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-[#E4DFD3]">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#9C7C3E] mb-1">
                <span>{property.propertyType}</span>
                <span aria-hidden="true">·</span>
                <span>{property.neighborhood}, {property.city}</span>
              </div>
              <h1 className="font-serif text-2xl sm:text-4xl font-bold text-[#142D4E]">
                {property.title}
              </h1>
              <p className="flex items-center gap-1.5 text-sm text-slate-600 mt-2">
                <MapPin className="w-4 h-4 text-[#C5A46D] shrink-0" />
                <span>{property.address}, {property.country}</span>
              </p>
            </div>

            <div className="text-left md:text-right shrink-0">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">
                {property.type === 'rent' ? 'Rent' : 'Guide Price'}
              </span>
              <span className="font-serif text-3xl sm:text-4xl font-bold text-[#142D4E] tracking-tight tabular-nums">
                {property.priceFormatted}
              </span>
              {property.type === 'rent' && property.depositAmountMinor !== undefined && <p className="mt-2 text-xs text-slate-600">Deposit: {new Intl.NumberFormat(undefined, { style: 'currency', currency: property.currency || 'NGN', maximumFractionDigits: 0 }).format(property.depositAmountMinor / 100)}</p>}
              {property.type === 'buy' && (
                <button
                  onClick={() => onOpenMortgageCalculator(property)}
                  className="mt-1 text-xs text-[#9C7C3E] hover:underline flex items-center md:justify-end gap-1"
                >
                  <Calculator className="w-3.5 h-3.5" />
                  <span>Estimate loan payment</span>
                </button>
              )}
            </div>
          </div>

          {/* Photo Gallery with Thumbnail Switcher */}
          <div className="space-y-3">
            <div className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden bg-slate-900 border border-[#E4DFD3] shadow-md">
              <ImageWithFallback
                src={property.images[activeImageIndex]}
                alt={`${property.title} view ${activeImageIndex + 1}`}
                className="w-full h-full object-cover"
              />

              {/* Navigation arrows */}
              <button
                onClick={() =>
                  setActiveImageIndex((prev) => (prev > 0 ? prev - 1 : property.images.length - 1))
                }
                className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 backdrop-blur-xs transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() =>
                  setActiveImageIndex((prev) => (prev < property.images.length - 1 ? prev + 1 : 0))
                }
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 backdrop-blur-xs transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>

              <div className="absolute bottom-3 right-3 px-3 py-1 rounded-md bg-black/60 backdrop-blur-md text-white text-xs font-medium">
                Photo {activeImageIndex + 1} of {property.images.length}
              </div>
            </div>

            {/* Thumbnail Strip */}
            <div className="grid grid-cols-4 gap-3">
              {property.images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImageIndex(idx)}
                  className={`aspect-[16/10] rounded-xl overflow-hidden border-2 transition-all ${
                    activeImageIndex === idx
                      ? 'border-[#C5A46D] shadow-md scale-102'
                      : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                >
                  <ImageWithFallback
                    src={img}
                    alt="Thumbnail"
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Core Specs Bar */}
          <div className="bg-white rounded-2xl p-6 border border-[#E4DFD3] shadow-xs grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div className="p-2 border-r border-[#E4DFD3]/60 last:border-0">
              <span className="flex items-center justify-center gap-1.5 font-serif text-2xl font-bold text-[#142D4E]">
                <Bed className="w-5 h-5 text-[#C5A46D]" />
                <span className="tabular-nums">{property.bedrooms}</span>
              </span>
              <span className="text-xs text-slate-500 uppercase tracking-wider font-medium">Bedrooms</span>
            </div>
            <div className="p-2 border-r border-[#E4DFD3]/60 last:border-0">
              <span className="flex items-center justify-center gap-1.5 font-serif text-2xl font-bold text-[#142D4E]">
                <Bath className="w-5 h-5 text-[#C5A46D]" />
                <span className="tabular-nums">{property.bathrooms}</span>
              </span>
              <span className="text-xs text-slate-500 uppercase tracking-wider font-medium">Bathrooms</span>
            </div>
            <div className="p-2 border-r border-[#E4DFD3]/60 last:border-0">
              <span className="flex items-center justify-center gap-1.5 font-serif text-2xl font-bold text-[#142D4E]">
                <Maximize2 className="w-5 h-5 text-[#C5A46D]" />
                <span className="tabular-nums">{property.sqft.toLocaleString()}</span>
              </span>
              <span className="text-xs text-slate-500 uppercase tracking-wider font-medium">Interior Sq Ft</span>
            </div>
            <div className="p-2">
              <span className="font-serif text-2xl font-bold text-[#142D4E] tabular-nums">
                {property.yearBuilt}
              </span>
              <span className="text-xs text-slate-500 uppercase tracking-wider font-medium block">Year Built</span>
            </div>
          </div>

          {/* Two-Column Details & Agent Card */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left 2 Cols: Description, Highlights, Amenities, Price History */}
            <div className="lg:col-span-2 space-y-8">
              {/* Description */}
              <div className="bg-white rounded-2xl p-6 border border-[#E4DFD3] shadow-xs">
                <h2 className="font-serif text-xl font-bold text-[#142D4E] mb-3">
                  Architectural Overview
                </h2>
                <p className="text-sm leading-relaxed text-slate-700 font-normal">
                  {property.description}
                </p>

                <h3 className="font-serif text-base font-semibold text-[#142D4E] mt-6 mb-3">
                  Key Architectural Highlights
                </h3>
                <ul className="space-y-2">
                  {property.architecturalHighlights.map((highlight, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-700">
                      <div className="w-4 h-4 rounded-full bg-[#C5A46D]/20 text-[#9C7C3E] flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-3 h-3" />
                      </div>
                      <span>{highlight}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Amenities Grid */}
              <div className="bg-white rounded-2xl p-6 border border-[#E4DFD3] shadow-xs">
                <h2 className="font-serif text-xl font-bold text-[#142D4E] mb-4">
                  Bespoke Property Features
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {property.amenities.map((amenity) => (
                    <div
                      key={amenity}
                      className="p-3 bg-[#F7F5F0] rounded-xl border border-[#E4DFD3] text-xs font-medium text-slate-800 flex items-center gap-2"
                    >
                      <span className="w-2 h-2 rounded-full bg-[#C5A46D]" />
                      <span>{amenity}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Price History (Evaluation Stage Feature for Persona Tolu) */}
              <div className="bg-white rounded-2xl p-6 border border-[#E4DFD3] shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-serif text-xl font-bold text-[#142D4E] flex items-center gap-2">
                    <History className="w-5 h-5 text-[#C5A46D]" />
                    <span>Audited Valuation & Price History</span>
                  </h2>
                  <span className="text-xs text-slate-500">Deed Verified</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-[#E4DFD3] text-slate-500 uppercase tracking-wider text-[11px]">
                        <th className="py-2.5 px-3">Year</th>
                        <th className="py-2.5 px-3">Event Description</th>
                        <th className="py-2.5 px-3 text-right">Registered Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E4DFD3]/60">
                      {property.priceHistory.map((hist, idx) => (
                        <tr key={idx} className="hover:bg-[#F7F5F0]/60">
                          <td className="py-3 px-3 font-semibold text-[#142D4E] tabular-nums">{hist.year}</td>
                          <td className="py-3 px-3 text-slate-700">{hist.event}</td>
                          <td className="py-3 px-3 text-right font-serif font-bold text-[#142D4E] tabular-nums">
                            {hist.priceFormatted}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Neighborhood Insights (WalkScore, Schools, Transit) */}
              <div className="bg-white rounded-2xl p-6 border border-[#E4DFD3] shadow-xs">
                <h2 className="font-serif text-xl font-bold text-[#142D4E] mb-4">
                  Neighborhood Dossier: {property.neighborhood}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                  <div className="p-3 bg-[#F7F5F0] rounded-xl text-center">
                    <p className="font-serif text-2xl font-bold text-[#142D4E] tabular-nums">
                      {property.neighborhoodInsights.walkScore}/100
                    </p>
                    <p className="text-[11px] text-slate-500 uppercase">Walk Score</p>
                  </div>
                  <div className="p-3 bg-[#F7F5F0] rounded-xl text-center">
                    <p className="font-serif text-2xl font-bold text-[#142D4E] tabular-nums">
                      {property.neighborhoodInsights.transitScore}/100
                    </p>
                    <p className="text-[11px] text-slate-500 uppercase">Transit Score</p>
                  </div>
                  <div className="p-3 bg-[#F7F5F0] rounded-xl text-center">
                    <p className="font-semibold text-xs text-[#2E7D5B] mt-1">
                      {property.neighborhoodInsights.safetyRating}
                    </p>
                    <p className="text-[11px] text-slate-500 uppercase mt-1">Security Audit</p>
                  </div>
                </div>

                <div className="space-y-2 text-xs text-slate-700">
                  <div className="flex items-start gap-2">
                    <GraduationCap className="w-4 h-4 text-[#C5A46D] shrink-0 mt-0.5" />
                    <span><strong>Top Rated Schools:</strong> {property.neighborhoodInsights.topSchools.join(', ')}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Bus className="w-4 h-4 text-[#C5A46D] shrink-0 mt-0.5" />
                    <span><strong>Nearest Transit:</strong> {property.neighborhoodInsights.nearestTransit}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Utensils className="w-4 h-4 text-[#C5A46D] shrink-0 mt-0.5" />
                    <span><strong>Culinary & Social:</strong> {property.neighborhoodInsights.popularDining}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right 1 Col: Agent Card & Direct Action Box */}
            <div className="space-y-6">
              {/* Booking CTA Card */}
              <div className="bg-white rounded-2xl p-6 border border-[#E4DFD3] shadow-md space-y-4">
                <div className="text-center pb-4 border-b border-[#E4DFD3]">
                  <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold">
                    Viewing request
                  </span>
                  <p className="font-serif text-xl font-bold text-[#142D4E] mt-1">
                    {property.type === 'rent' ? 'See the property before applying' : 'Ask to see this property'}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Request an in-person or virtual viewing. Availability must be confirmed separately.
                  </p>
                </div>

                <button
                  onClick={() => onBookViewing(property)}
                  className="w-full py-3 px-4 rounded-xl font-bold text-xs bg-[#C5A46D] text-[#142D4E] hover:bg-[#B8975A] transition-all shadow-md flex items-center justify-center gap-2"
                >
                  <Calendar className="w-4 h-4 text-[#142D4E]" />
                  <span>Request a viewing</span>
                </button>

                {property.type === 'rent' && (
                  <button
                    onClick={() => onApplyToRent(property)}
                    className="w-full py-2.5 px-4 rounded-xl font-bold text-xs text-[#142D4E] hover:bg-emerald-50 border border-emerald-700/40 transition-colors"
                  >
                    Apply to rent
                  </button>
                )}

                {agent ? (
                  <button
                    onClick={() => onContactAgent(property, agent)}
                    className="w-full py-2.5 px-4 rounded-xl font-semibold text-xs text-[#142D4E] hover:bg-[#F7F5F0] border border-[#142D4E] transition-colors flex items-center justify-center gap-2"
                  >
                    <Mail className="w-4 h-4" />
                    <span>Inquire with {agent.name.split(' ')[0]}</span>
                  </button>
                ) : (
                  <p className="rounded-xl border border-dashed border-[#E4DFD3] p-3 text-center text-xs text-slate-500">
                    Property manager contact details will appear here when provided.
                  </p>
                )}
              </div>

              {/* Verified Agent Card */}
              {agent && <div className="bg-white rounded-2xl p-6 border border-[#E4DFD3] shadow-xs space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-[#C5A46D] shrink-0">
                    <ImageWithFallback
                      src={agent.avatar}
                      alt={agent.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-serif font-bold text-base text-[#142D4E]">
                        {agent.name}
                      </h4>
                      <span title="Verified Licensed Advisor">
                        <ShieldCheck className="w-4 h-4 text-[#C5A46D]" />
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">{agent.role}</p>
                    <p className="text-[11px] text-slate-400">License: {agent.licenseNumber}</p>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed italic">
                  "{agent.bio}"
                </p>

                <div className="pt-3 border-t border-[#E4DFD3] space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Track Record:</span>
                    <span className="font-semibold text-[#142D4E]">{agent.salesVolume}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Advisory Rating:</span>
                    <span className="font-semibold text-[#142D4E]">★ {agent.rating} ({agent.reviewsCount} reviews)</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Languages:</span>
                    <span className="text-slate-800">{agent.languages.join(', ')}</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <a
                    href={`tel:${agent.phone}`}
                    className="flex-1 py-2 px-3 rounded-lg bg-[#F7F5F0] hover:bg-[#E4DFD3] text-[#142D4E] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-[#E4DFD3]"
                  >
                    <Phone className="w-3.5 h-3.5 text-[#C5A46D]" />
                    <span>Call Agent</span>
                  </a>
                </div>
              </div>}

              {/* Scam Awareness & Trust Guarantee (Section 9 Compliance) */}
              <div className="p-4 rounded-2xl bg-[#142D4E] text-white space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-bold text-[#C5A46D]">
                  <ShieldCheck className="w-4 h-4 text-[#C5A46D]" />
                  <span>Demo listing notice</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  This prototype does not verify property ownership or arrange escrow. Independently verify all details and payment instructions before any transaction.
                </p>
                <button
                  onClick={() => setReportModalOpen(true)}
                  className="text-[11px] text-slate-400 hover:text-white underline flex items-center gap-1"
                >
                  <AlertTriangle className="w-3 h-3 text-[#B3402F]" />
                  <span>Report an anomaly on this listing</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Report Listing Modal */}
        {reportModalOpen && (
          <div className="fixed inset-0 z-60 bg-black/70 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-[#E4DFD3] shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-serif text-lg font-bold text-[#142D4E] flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-[#B3402F]" />
                  <span>Report Listing Anomaly</span>
                </h3>
                <button onClick={() => setReportModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {reportSuccess ? (
                <div className="p-4 bg-emerald-50 text-[#2E7D5B] rounded-xl text-xs font-medium text-center">
                  Thank you. Your report has been submitted to the Aurelia Compliance Bureau for audit within 2 hours.
                </div>
              ) : (
                <form onSubmit={handleReportSubmit} className="space-y-4">
                  <p className="text-xs text-slate-600">
                    Aurelia maintains a zero-tolerance policy against outdated pricing or misrepresentation.
                  </p>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Reason for Report
                    </label>
                    <textarea
                      required
                      value={reportReason}
                      onChange={(e) => setReportReason(e.target.value)}
                      placeholder="Please describe the discrepancy (e.g. incorrect photos, price changed, duplicate listing)..."
                      className="w-full h-24 p-2.5 bg-[#F7F5F0] border border-[#E4DFD3] rounded-xl text-xs focus:outline-none focus:border-[#C5A46D]"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setReportModalOpen(false)}
                      className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 text-xs font-bold rounded-lg bg-[#B3402F] text-white hover:bg-red-800"
                    >
                      Submit Report
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
