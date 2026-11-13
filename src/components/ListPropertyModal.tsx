import React, { useState } from 'react';
import { Property } from '../types';
import { X, CheckCircle2, ShieldCheck, Upload, Building, ArrowRight, ArrowLeft } from 'lucide-react';

interface ListPropertyModalProps {
  onAddProperty: (property: Property) => void;
  onClose: () => void;
}

export const ListPropertyModal: React.FC<ListPropertyModalProps> = ({
  onAddProperty,
  onClose,
}) => {
  const [step, setStep] = useState<number>(1);
  const [listingType, setListingType] = useState<'buy' | 'rent'>('buy');
  const [title, setTitle] = useState('');
  const [tagline, setTagline] = useState('');
  const [propertyType, setPropertyType] = useState<'Penthouse' | 'Villa' | 'Historic Estate' | 'Waterfront' | 'Luxury Apartment' | 'Townhouse' | 'Other'>('Other');
  const [price, setPrice] = useState<number>(0);
  const [address, setAddress] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [bedrooms, setBedrooms] = useState(0);
  const [bathrooms, setBathrooms] = useState(0);
  const [sqft, setSqft] = useState(0);
  const [yearBuilt, setYearBuilt] = useState(0);
  const [parkingSpaces, setParkingSpaces] = useState(0);
  const [description, setDescription] = useState('');
  const [deedReference, setDeedReference] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newProp: Property = {
      id: `prop-${Date.now()}`,
      title,
      tagline,
      type: listingType,
      propertyType,
      price,
      priceFormatted: price.toLocaleString(),
      address,
      neighborhood,
      city,
      country,
      bedrooms,
      bathrooms,
      sqft,
      yearBuilt,
      parkingSpaces,
      verified: false,
      featured: false,
      inspectionDate: 'Pending review',
      cadastralId: deedReference,
      images: [],
      description,
      architecturalHighlights: [],
      amenities: [],
      coordinates: { lat: 0, lng: 0, x: 50, y: 50 },
      agentId: '',
      priceHistory: [],
      neighborhoodInsights: {
        walkScore: 95,
        transitScore: 96,
        safetyRating: 'Verified (9.9/10)',
        topSchools: ['Local Renowned Academy'],
        nearestTransit: 'Central Underground (3 min walk)',
        popularDining: 'Prime Michelin Enclave'
      },
    };

    onAddProperty(newProp);
    setIsSubmitted(true);
  };

  return (
    <div className="fixed inset-0 z-60 overflow-y-auto bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-[#F7F5F0] text-[#263445] w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl border border-[#E4DFD3] relative">
        {/* Header */}
        <div className="bg-[#142D4E] text-white px-6 py-4 flex items-center justify-between border-b border-[#263445]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#C5A46D]" />
            <h3 className="font-serif text-lg font-bold">
              Add a Property to Your Portfolio
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-300 hover:text-white rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isSubmitted ? (
          <div className="p-8 text-center space-y-5">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-[#2E7D5B] flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div>
              <span className="inline-block px-3 py-1 bg-[#142D4E] text-[#C5A46D] text-xs font-bold rounded-md mb-2">
                Pending Review
              </span>
              <h4 className="font-serif text-2xl font-bold text-[#142D4E]">
                Property Saved to Your Portfolio
              </h4>
              <p className="text-xs text-slate-600 mt-2 max-w-md mx-auto leading-relaxed">
                Your property is saved privately and is not a public listing. Open My Properties in your landlord dashboard when you are ready to create a listing and submit it for review.
              </p>
            </div>
            <div className="pt-3">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl bg-[#142D4E] text-white hover:bg-[#0D1E35] text-xs font-bold shadow-md"
              >
                Close & View My Properties
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Step Indicators */}
            <div className="flex items-center justify-between text-xs text-slate-500 pb-3 border-b border-[#E4DFD3]">
              <span className={step === 1 ? 'font-bold text-[#142D4E]' : ''}>1. Basic Details</span>
              <span>·</span>
              <span className={step === 2 ? 'font-bold text-[#142D4E]' : ''}>2. Specs & Dimensions</span>
              <span>·</span>
              <span className={step === 3 ? 'font-bold text-[#142D4E]' : ''}>3. Deed & Verification</span>
            </div>

            {/* Step 1: Basic info */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="flex gap-2 p-1 bg-white rounded-xl border border-[#E4DFD3]">
                  <button
                    type="button"
                    onClick={() => setListingType('buy')}
                    className={`flex-1 py-2 text-xs font-semibold rounded-lg ${
                      listingType === 'buy' ? 'bg-[#142D4E] text-white' : 'text-slate-700'
                    }`}
                  >
                    Offer For Sale
                  </button>
                  <button
                    type="button"
                    onClick={() => setListingType('rent')}
                    className={`flex-1 py-2 text-xs font-semibold rounded-lg ${
                      listingType === 'rent' ? 'bg-[#142D4E] text-white' : 'text-slate-700'
                    }`}
                  >
                    Offer For Lease
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Residence Title
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. The Chester Square Mansion"
                    className="w-full px-3 py-2 bg-white border border-[#E4DFD3] rounded-xl text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Architectural Typology
                    </label>
                    <select
                      value={propertyType}
                      onChange={(e) => setPropertyType(e.target.value as any)}
                      className="w-full px-3 py-2 bg-white border border-[#E4DFD3] rounded-xl text-xs"
                    >
                      <option value="Penthouse">Penthouse</option>
                      <option value="Historic Estate">Historic Estate</option>
                      <option value="Villa">Villa</option>
                      <option value="Waterfront">Waterfront</option>
                      <option value="Luxury Apartment">Luxury Apartment</option>
                      <option value="Townhouse">Townhouse</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {listingType === 'buy' ? 'Asking price' : 'Rent amount'}
                    </label>
                    <input
                      type="number"
                      min="0.01"
                      required
                      step={listingType === 'buy' ? 50000 : 500}
                      value={price}
                      onChange={(e) => setPrice(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-[#E4DFD3] rounded-xl text-xs font-semibold tabular-nums"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Street Address
                  </label>
                  <input
                    type="text"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. 24 Chester Square"
                    className="w-full px-3 py-2 bg-white border border-[#E4DFD3] rounded-xl text-xs"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Neighborhood</label>
                    <input
                      type="text"
                      value={neighborhood}
                      onChange={(e) => setNeighborhood(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-[#E4DFD3] rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-[#E4DFD3] rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Country</label>
                    <input
                      type="text"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-[#E4DFD3] rounded-xl text-xs"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Specs & dimensions */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Bedrooms</label>
                    <input
                      type="number"
                      value={bedrooms}
                      onChange={(e) => setBedrooms(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-[#E4DFD3] rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Bathrooms</label>
                    <input
                      type="number"
                      value={bathrooms}
                      onChange={(e) => setBathrooms(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-[#E4DFD3] rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Sq Footage</label>
                    <input
                      type="number"
                      value={sqft}
                      onChange={(e) => setSqft(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-[#E4DFD3] rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Year Built</label>
                    <input
                      type="number"
                      value={yearBuilt}
                      onChange={(e) => setYearBuilt(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-[#E4DFD3] rounded-xl text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tagline</label>
                  <input
                    type="text"
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    placeholder="e.g. Masterwork of Regency Architecture with Private Courtyard"
                    className="w-full px-3 py-2 bg-white border border-[#E4DFD3] rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Architectural Narrative</label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe interior materials, historical provenance, and bespoke appointments..."
                    className="w-full px-3 py-2 bg-white border border-[#E4DFD3] rounded-xl text-xs"
                  />
                </div>
              </div>
            )}

            {/* Step 3: Verification & Deed */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="p-4 bg-[#142D4E] text-white rounded-2xl space-y-2">
                  <div className="flex items-center gap-2 text-[#C5A46D] font-bold text-xs">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Review Required Before Publication</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    This demo cannot verify deeds or ownership. Provide a reference for review; the listing stays private until a real review process approves it.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Cadastral Registry Deed Reference
                  </label>
                  <input
                    type="text"
                    required
                    value={deedReference}
                    onChange={(e) => setDeedReference(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#E4DFD3] rounded-xl text-xs font-mono"
                  />
                </div>

                <div className="p-6 border-2 border-dashed border-[#E4DFD3] rounded-2xl bg-white text-center cursor-pointer hover:bg-slate-50 transition-colors">
                  <Upload className="w-8 h-8 text-[#C5A46D] mx-auto mb-2" />
                  <p className="text-xs font-semibold text-[#142D4E]">
                    Document upload is unavailable in this demo
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    No files are uploaded or stored here. Contact Aurelia directly to submit documents securely.
                  </p>
                </div>
              </div>
            )}

            {/* Step Navigation Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-[#E4DFD3]">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={() => setStep(step - 1)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </button>
              ) : (
                <div />
              )}

              {step < 3 ? (
                <button
                  type="button"
                  onClick={() => setStep(step + 1)}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-[#142D4E] text-white hover:bg-[#0D1E35] flex items-center gap-1.5"
                >
                  <span>Next Step</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#C5A46D]" />
                </button>
              ) : (
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl text-xs font-bold bg-[#C5A46D] text-[#142D4E] hover:bg-[#B8975A] shadow-md flex items-center gap-1.5"
                >
                  <ShieldCheck className="w-4 h-4 text-[#142D4E]" />
                  <span>Submit for Aurelia Verification Audit</span>
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
