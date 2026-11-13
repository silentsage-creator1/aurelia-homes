import React, { useState } from 'react';
import { Property, ViewingBooking, SavedSearch, UserProfile } from '../types';
import { ImageWithFallback } from './ImageWithFallback';
import {
  Heart,
  Calendar,
  Bell,
  Building,
  ShieldCheck,
  Trash2,
  Eye,
  Clock,
  MapPin,
  ExternalLink,
  PlusCircle,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface UserDashboardProps {
  user: UserProfile;
  savedProperties: Property[];
  bookings: ViewingBooking[];
  savedSearches: SavedSearch[];
  myProperties: Property[];
  onSelectProperty: (property: Property) => void;
  onRemoveFavorite: (propertyId: string) => void;
  onCancelBooking: (bookingId: string) => void;
  onToggleAlert: (searchId: string) => void;
  onOpenListProperty: () => void;
  onBrowseHomes: () => void;
}

export const UserDashboard: React.FC<UserDashboardProps> = ({
  user,
  savedProperties,
  bookings,
  savedSearches,
  myProperties,
  onSelectProperty,
  onRemoveFavorite,
  onCancelBooking,
  onToggleAlert,
  onOpenListProperty,
  onBrowseHomes,
}) => {
  type BuyerSection = 'overview' | 'favorites' | 'enquiries' | 'viewings' | 'offers' | 'transactions' | 'documents' | 'notifications' | 'settings' | 'searches' | 'my-listings';
  const [activeTab, setActiveTab] = useState<BuyerSection>('overview');
  const today = new Date().toISOString().slice(0, 10);
  const upcomingViewings = bookings.filter((booking) => booking.date >= today && booking.status !== 'Cancelled');

  return (
    <div className="max-w-[1600px] mx-auto px-3 sm:px-5 lg:px-8 py-6 lg:py-8">
      <div className="grid lg:grid-cols-[240px_minmax(0,1fr)] gap-5 lg:gap-8">
        <aside className="h-fit rounded-2xl border border-[#E4DFD3] bg-white p-3 lg:sticky lg:top-28">
          <p className="px-3 py-3 border-b border-[#E4DFD3] mb-2 text-xs font-bold uppercase tracking-wider text-[#9C7C3E]">Buyer workspace</p>
          <nav aria-label="Buyer dashboard navigation" className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible">
            {([
              ['overview', 'Overview'], ['favorites', 'Saved Properties'], ['enquiries', 'My Enquiries'], ['viewings', 'Viewings'], ['offers', 'Purchase Offers'], ['transactions', 'Transactions'], ['documents', 'Documents'], ['notifications', 'Notifications'], ['settings', 'Profile & Settings'],
            ] as [BuyerSection, string][]).map(([section, label]) => <button key={section} onClick={() => setActiveTab(section)} aria-current={activeTab === section ? 'page' : undefined} className={`shrink-0 lg:w-full rounded-xl px-3 py-2.5 text-left text-xs font-semibold ${activeTab === section ? 'bg-[#142D4E] text-white' : 'text-slate-600 hover:bg-[#F7F5F0]'}`}>{label}{section === 'favorites' ? ` (${savedProperties.length})` : section === 'viewings' ? ` (${upcomingViewings.length})` : ''}</button>)}
          </nav>
        </aside>
        <main className="min-w-0 space-y-7">
      {/* Top Welcome Card */}
      <div className="bg-[#142D4E] text-white rounded-3xl p-6 sm:p-8 border border-[#263445] shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#C5A46D] to-[#9C7C3E] text-[#142D4E] font-serif font-bold text-2xl flex items-center justify-center shrink-0 shadow-md">
            {user.avatarInitials}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight">
                {user.name}’s Sanctuary
              </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-[#C5A46D]/20 text-[#C5A46D] text-[11px] font-semibold border border-[#C5A46D]/30">
                Demo Account
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              {user.email} · Demo portfolio
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onBrowseHomes}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-colors"
          >
            Browse Properties
          </button>
          <button onClick={() => setActiveTab('favorites')} className="px-4 py-2.5 rounded-xl text-xs font-bold bg-[#C5A46D] text-[#142D4E] hover:bg-[#B8975A] transition-colors">View Saved</button>
        </div>
      </div>

      {activeTab === 'overview' && <>
        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[['Saved Properties', savedProperties.length], ['Active Enquiries', 0], ['Upcoming Viewings', upcomingViewings.length], ['Active Offers', 0]].map(([label, value]) => <div key={label} className="rounded-2xl border border-[#E4DFD3] bg-white p-5"><p className="text-xs font-semibold text-slate-500">{label}</p><p className="font-heading text-3xl font-bold text-[#142D4E] mt-3">{value}</p></div>)}
        </div>
        <div className="grid md:grid-cols-2 gap-5">
          <section className="rounded-2xl border border-[#E4DFD3] bg-white p-5"><h2 className="font-heading font-bold text-[#142D4E]">Recently saved properties</h2>{savedProperties.length ? savedProperties.slice(0, 3).map((property) => <button key={property.id} onClick={() => onSelectProperty(property)} className="mt-3 block w-full text-left rounded-xl bg-[#F7F5F0] px-3 py-2 text-xs font-semibold text-[#142D4E]">{property.title} · {property.priceFormatted}</button>) : <p className="text-xs text-slate-500 mt-2">Save homes from the marketplace to see them here.</p>}</section>
          <section className="rounded-2xl border border-[#E4DFD3] bg-white p-5"><h2 className="font-heading font-bold text-[#142D4E]">Upcoming inspections</h2>{upcomingViewings.length ? upcomingViewings.slice(0, 3).map((booking) => <p key={booking.id} className="mt-3 rounded-xl bg-[#F7F5F0] px-3 py-2 text-xs text-slate-700">{booking.propertyTitle} · {booking.date} · {booking.status}</p>) : <p className="text-xs text-slate-500 mt-2">No upcoming viewing requests are recorded.</p>}</section>
        </div>
        <div className="flex flex-wrap gap-2"><button onClick={onBrowseHomes} className="rounded-xl bg-[#142D4E] px-4 py-2.5 text-xs font-bold text-white">Browse Properties</button><button onClick={() => setActiveTab('favorites')} className="rounded-xl border border-[#E4DFD3] px-4 py-2.5 text-xs font-bold text-[#142D4E]">View Saved Properties</button><button onClick={() => savedProperties[0] && onSelectProperty(savedProperties[0])} disabled={!savedProperties.length} className="rounded-xl border border-[#E4DFD3] px-4 py-2.5 text-xs font-bold text-[#142D4E] disabled:opacity-50">Open Home to Request Viewing</button><button onClick={() => savedProperties[0] && onSelectProperty(savedProperties[0])} disabled={!savedProperties.length} className="rounded-xl border border-[#E4DFD3] px-4 py-2.5 text-xs font-bold text-[#142D4E] disabled:opacity-50">Open Saved Home to Enquire</button></div>
      </>}

      {/* Tab 1: Saved Properties */}
      {activeTab === 'favorites' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-xl font-bold text-[#142D4E]">
              Your Curated Shortlist
            </h2>
            <span className="text-xs text-slate-500">
              Shortlisted homes are monitored 24/7 for price changes
            </span>
          </div>

          {savedProperties.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-[#E4DFD3] space-y-4">
              <Heart className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="font-serif text-lg font-bold text-[#142D4E]">
                No Shortlisted Properties Yet
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Explore our verified luxury collection and tap the heart icon on any residence to compare and track it here.
              </p>
              <button
                onClick={onBrowseHomes}
                className="px-6 py-2.5 rounded-xl bg-[#142D4E] text-white text-xs font-bold hover:bg-[#0D1E35]"
              >
                Browse Residences
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {savedProperties.map((prop) => (
                <div
                  key={prop.id}
                  className="bg-white rounded-2xl border border-[#E4DFD3] overflow-hidden shadow-xs flex flex-col justify-between"
                >
                  <div>
                    <div className="aspect-[16/10] relative">
                      <ImageWithFallback
                        src={prop.images[0]}
                        alt={prop.title}
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={() => onRemoveFavorite(prop.id)}
                        title="Remove from favorites"
                        className="absolute top-3 right-3 p-1.5 rounded-full bg-white/90 text-[#B3402F] hover:bg-white shadow-sm"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="p-4">
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
                      <p className="text-xs text-slate-500 truncate">{prop.address}</p>
                      <p className="font-serif text-xl font-bold text-[#142D4E] tabular-nums mt-2">
                        {prop.priceFormatted}
                      </p>
                    </div>
                  </div>

                  <div className="p-4 pt-0">
                    <button
                      onClick={() => onSelectProperty(prop)}
                      className="w-full py-2 rounded-xl text-xs font-semibold bg-[#F7F5F0] hover:bg-[#E4DFD3] text-[#142D4E] border border-[#E4DFD3] flex items-center justify-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Open Dossier & Book Tour</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Scheduled Viewings */}
      {activeTab === 'viewings' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-xl font-bold text-[#142D4E]">
              Viewing Requests
            </h2>
            <span className="text-xs text-slate-500">
              Escorted by Aurelia Certified Advisors
            </span>
          </div>

          {bookings.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-[#E4DFD3] space-y-4">
              <Calendar className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="font-serif text-lg font-bold text-[#142D4E]">
                No Appointments Scheduled
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Request a viewing from a property page. Requests remain pending until an advisor confirms them.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {bookings.map((booking) => (
                <div
                  key={booking.id}
                  className="bg-white rounded-2xl p-5 border border-[#E4DFD3] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-16 rounded-xl overflow-hidden shrink-0">
                      <ImageWithFallback
                        src={booking.propertyImage}
                        alt={booking.propertyTitle}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${booking.status === 'Pending' ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-emerald-50 text-[#2E7D5B] border-emerald-200'}`}>
                          {booking.status === 'Pending' ? 'Awaiting confirmation' : booking.status}
                        </span>
                        <span className="text-xs text-slate-400">Ref: {booking.id}</span>
                      </div>
                      <h4 className="font-serif text-base font-bold text-[#142D4E] mt-0.5">
                        {booking.propertyTitle}
                      </h4>
                      <p className="text-xs text-slate-500">{booking.propertyAddress}</p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 text-xs">
                    <div className="p-2.5 bg-[#F7F5F0] rounded-xl border border-[#E4DFD3]">
                      <span className="text-slate-500 block text-[10px] uppercase font-semibold">Appointment</span>
                      <span className="font-bold text-[#142D4E]">
                        {booking.date} · {booking.timeSlot}
                      </span>
                      <span className="block text-[11px] text-slate-600 mt-0.5">
                        {booking.viewingType === 'in-person' ? '🏛️ In-person request' : '📹 360° tour request'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => alert('Rescheduling is unavailable in this demo. Please contact an advisor directly.')}
                        className="px-3 py-2 text-xs font-medium text-slate-700 hover:bg-[#F7F5F0] border border-[#E4DFD3] rounded-xl"
                      >
                        Reschedule
                      </button>
                      <button
                        onClick={() => onCancelBooking(booking.id)}
                        className="px-3 py-2 text-xs font-medium text-[#B3402F] hover:bg-red-50 rounded-xl"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Saved Searches */}
      {activeTab === 'searches' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-xl font-bold text-[#142D4E]">
              Custom Search Radar & Alerts
            </h2>
            <span className="text-xs text-slate-500">
              Get notified immediately when new audited properties match your criteria
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {savedSearches.map((search) => (
              <div
                key={search.id}
                className="bg-white rounded-2xl p-5 border border-[#E4DFD3] shadow-xs flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-serif font-bold text-base text-[#142D4E]">
                      {search.name}
                    </h4>
                    <span className="text-[10px] uppercase font-bold text-slate-500 bg-[#F7F5F0] px-2 py-0.5 rounded-sm">
                      For {search.type}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Location: {search.location} · Frequency: {search.frequency}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Saved on {search.dateCreated}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => onToggleAlert(search.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                      search.alertsActive
                        ? 'bg-[#142D4E] text-[#C5A46D] border-[#142D4E]'
                        : 'bg-[#F7F5F0] text-slate-500 border-[#E4DFD3]'
                    }`}
                  >
                    {search.alertsActive ? 'Alerts On' : 'Alerts Paused'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: My Listed Properties */}
      {activeTab === 'my-listings' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-xl font-bold text-[#142D4E]">
              Properties Represented / Submitted
            </h2>
            <button
              onClick={onOpenListProperty}
              className="text-xs font-bold text-[#9C7C3E] hover:underline"
            >
              + Submit Another Property
            </button>
          </div>

          {myProperties.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-[#E4DFD3] space-y-4">
              <Building className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="font-serif text-lg font-bold text-[#142D4E]">
                No Listed Properties
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Have a residence in London, New York, or Paris to represent? Submit your property for our verified audit.
              </p>
              <button
                onClick={onOpenListProperty}
                className="px-6 py-2.5 rounded-xl bg-[#C5A46D] text-[#142D4E] font-bold text-xs"
              >
                List a Residence
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {myProperties.map((prop) => (
                <div
                  key={prop.id}
                  className="bg-white rounded-2xl p-5 border border-[#E4DFD3] shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-14 rounded-xl overflow-hidden shrink-0">
                      <ImageWithFallback
                        src={prop.images[0]}
                        alt={prop.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-[#142D4E] text-[#C5A46D] text-[10px] font-bold">
                          {prop.verified ? 'Verified' : 'Pending review'}
                        </span>
                        <span className="text-xs text-slate-400">Plot: {prop.cadastralId}</span>
                      </div>
                      <h4 className="font-serif text-base font-bold text-[#142D4E] mt-0.5">
                        {prop.title}
                      </h4>
                      <p className="text-xs text-slate-500">{prop.address}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center">
                    <span className="font-serif text-lg font-bold text-[#142D4E] tabular-nums">
                      {prop.priceFormatted}
                    </span>
                    <button
                      onClick={() => onSelectProperty(prop)}
                      className="px-3 py-1.5 rounded-xl bg-[#F7F5F0] text-xs font-semibold hover:bg-[#E4DFD3] text-[#142D4E]"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {['enquiries', 'offers', 'transactions', 'documents', 'notifications', 'settings'].includes(activeTab) && (
        <section className="rounded-2xl border border-[#E4DFD3] bg-white p-6 sm:p-8">
          <h2 className="font-heading text-xl font-bold text-[#142D4E]">{activeTab === 'enquiries' ? 'My Enquiries' : activeTab === 'offers' ? 'Purchase Offers' : activeTab === 'transactions' ? 'Transactions' : activeTab === 'documents' ? 'Documents' : activeTab === 'notifications' ? 'Notifications' : 'Profile & Settings'}</h2>
          <p className="text-sm text-slate-500 mt-2">No records are connected to this demo section yet.</p>
        </section>
      )}
        </main>
      </div>
    </div>
  );
};
