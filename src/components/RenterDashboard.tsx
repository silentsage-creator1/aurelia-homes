import React, { useState } from 'react';
import { CalendarDays, Check, ClipboardList, FileText, Heart, Home, MessageSquareText, Search } from 'lucide-react';
import { Property, RentalApplication, UserProfile, ViewingBooking } from '../types';
import { ImageWithFallback } from './ImageWithFallback';

interface RenterDashboardProps {
  user: UserProfile;
  rentalListings: Property[];
  savedRentalProperties: Property[];
  bookings: ViewingBooking[];
  applications: RentalApplication[];
  onSelectProperty: (property: Property) => void;
  onRemoveFavorite: (propertyId: string) => void;
  onBrowseRentals: () => void;
}

export const RenterDashboard: React.FC<RenterDashboardProps> = ({
  user,
  rentalListings,
  savedRentalProperties,
  bookings,
  applications,
  onSelectProperty,
  onRemoveFavorite,
  onBrowseRentals,
}) => {
  const applicantSections = [
    ['overview', 'Overview'], ['applications', 'Applications'], ['saved-rentals', 'Saved Rentals'],
    ['viewings', 'Viewing Requests'], ['preparation', 'Application Prep'], ['settings', 'Profile & Settings'],
  ];
  const rentalIds = new Set(rentalListings.map((property) => property.id));
  const viewingRequests = bookings.filter((booking) => rentalIds.has(booking.propertyId) && booking.status !== 'Cancelled');

  return (
    <div className="max-w-[1600px] mx-auto px-3 sm:px-5 lg:px-8 py-6 lg:py-8">
      <div className="grid lg:grid-cols-[240px_minmax(0,1fr)] gap-5 lg:gap-8">
       <aside className="h-fit rounded-2xl border border-[#E4DFD3] bg-white p-3 lg:sticky lg:top-28">
        <p className="px-3 py-3 border-b border-[#E4DFD3] mb-2 text-xs font-bold uppercase tracking-wider text-[#9C7C3E]">Applicant workspace</p>
        <nav aria-label="Applicant dashboard navigation" className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible">
          {applicantSections.map(([id, label]) => <button key={id} onClick={() => document.getElementById(`renter-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="shrink-0 lg:w-full rounded-xl px-3 py-2.5 text-left text-xs font-semibold text-slate-600 hover:bg-[#F7F5F0] hover:text-[#142D4E]">{label}</button>)}
        </nav>
        <p className="hidden lg:block border-t border-[#E4DFD3] mt-3 pt-3 px-3 text-[10px] text-slate-500">Rental applications do not create an active tenancy.</p>
       </aside>
       <main className="min-w-0 space-y-7">
      <section id="renter-overview" className="scroll-mt-28 rounded-3xl bg-[#142D4E] text-white p-6 sm:p-9 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#D8BD8C]">Applicant dashboard · demo account</p>
            <h1 className="font-heading text-3xl sm:text-4xl font-bold mt-2">Your rental search, {user.name.split(' ')[0]}.</h1>
            <p className="text-sm text-slate-300 mt-2 max-w-2xl">Keep your rental search, applications, saved places, and viewing requests together. Sample information stays in this browser and does not contact a landlord.</p>
          </div>
          <button onClick={onBrowseRentals} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#C5A46D] px-5 py-3 text-sm font-bold text-[#142D4E] hover:bg-[#B8975A]">
            <Search className="h-4 w-4" /> Find a rental
          </button>
        </div>
      </section>

      <div id="renter-overview-cards" className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-[#E4DFD3] p-5">
          <div className="flex items-center gap-3"><span className="rounded-xl bg-[#F7F5F0] p-2.5 text-[#9C7C3E]"><CalendarDays className="h-5 w-5" /></span><span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Viewing requests</span></div>
          <p className="font-heading text-3xl font-bold text-[#142D4E] mt-4">{viewingRequests.length}</p>
          <p className="text-xs text-slate-500 mt-1">Saved in your demo dashboard</p>
        </div>
        <div className="bg-white rounded-2xl border border-[#E4DFD3] p-5">
          <div className="flex items-center gap-3"><span className="rounded-xl bg-[#F7F5F0] p-2.5 text-[#9C7C3E]"><Heart className="h-5 w-5" /></span><span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Saved rentals</span></div>
          <p className="font-heading text-3xl font-bold text-[#142D4E] mt-4">{savedRentalProperties.length}</p>
          <p className="text-xs text-slate-500 mt-1">Compare places you like</p>
        </div>
        <div className="bg-white rounded-2xl border border-[#E4DFD3] p-5">
          <div className="flex items-center gap-3"><span className="rounded-xl bg-[#F7F5F0] p-2.5 text-[#9C7C3E]"><ClipboardList className="h-5 w-5" /></span><span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Rental applications</span></div>
          <p className="font-heading text-3xl font-bold text-[#142D4E] mt-4">{applications.length}</p>
          <p className="text-xs text-slate-500 mt-1">Saved in your demo dashboard</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-6">
        <section id="renter-saved-rentals" className="scroll-mt-28 bg-white rounded-3xl border border-[#E4DFD3] p-5 sm:p-7">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div><p className="text-xs font-semibold uppercase tracking-wide text-[#9C7C3E]">Your rental shortlist</p><h2 className="font-heading text-xl font-bold text-[#142D4E] mt-1">Places to consider</h2></div>
            <button onClick={onBrowseRentals} className="text-xs font-bold text-[#9C7C3E] hover:underline">Browse all</button>
          </div>
          {savedRentalProperties.length ? <div className="space-y-3">
            {savedRentalProperties.map((property) => <article key={property.id} className="flex gap-4 rounded-2xl border border-[#E4DFD3] p-3">
              <button className="w-28 sm:w-36 h-24 rounded-xl overflow-hidden shrink-0" onClick={() => onSelectProperty(property)} aria-label={`View ${property.title}`}><ImageWithFallback src={property.images[0]} alt={property.title} className="w-full h-full object-cover" /></button>
              <div className="min-w-0 flex-1 py-1">
                <p className="text-xs text-slate-500">{property.neighborhood}, {property.city}</p>
                <button onClick={() => onSelectProperty(property)} className="block text-left font-heading font-bold text-[#142D4E] truncate hover:underline">{property.title}</button>
                <p className="text-sm font-bold text-[#9C7C3E] mt-1">{property.priceFormatted}</p>
                <p className="text-xs text-slate-500 mt-1">{property.bedrooms} beds · {property.bathrooms} baths</p>
              </div>
              <button onClick={() => onRemoveFavorite(property.id)} className="self-start p-2 text-rose-700 hover:bg-rose-50 rounded-lg" aria-label={`Remove ${property.title} from saved rentals`}><Heart className="h-4 w-4 fill-current" /></button>
            </article>)}
          </div> : <div className="rounded-2xl bg-[#F7F5F0] p-6 text-center">
            <Home className="h-8 w-8 text-[#9C7C3E] mx-auto" /><h3 className="font-semibold text-[#142D4E] mt-2">Start your rental shortlist</h3><p className="text-xs text-slate-500 mt-1">Save rentals you like and they will appear here.</p><button onClick={onBrowseRentals} className="mt-4 rounded-xl bg-[#142D4E] px-4 py-2 text-xs font-bold text-white">Explore rentals</button>
          </div>}
        </section>

        <section id="renter-preparation" className="scroll-mt-28 bg-white rounded-3xl border border-[#E4DFD3] p-5 sm:p-7">
          <div className="flex items-center gap-3 mb-4"><span className="rounded-xl bg-[#F7F5F0] p-2.5 text-[#9C7C3E]"><ClipboardList className="h-5 w-5" /></span><div><p className="text-xs font-semibold uppercase tracking-wide text-[#9C7C3E]">Before you apply</p><h2 className="font-heading text-xl font-bold text-[#142D4E]">Application preparation</h2></div></div>
          <ul className="space-y-3 text-xs leading-relaxed text-slate-600"><li>Confirm the rent, deposit, move-in date, and other costs with the property owner.</li><li>Keep identity and income documents private until a secure application channel is available.</li><li>Ask the owner or agent how they handle applications, references, and decisions.</li></ul>
          <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-950">This prototype does not collect or transmit application documents.</p>
        </section>
      </div>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div id="renter-applications" className="scroll-mt-28 bg-white rounded-3xl border border-[#E4DFD3] p-5 sm:p-7 md:col-span-2">
          <div className="flex items-center gap-3"><ClipboardList className="h-5 w-5 text-[#9C7C3E]" /><h2 className="font-heading text-xl font-bold text-[#142D4E]">Rental applications</h2></div>
          {applications.length ? <div className="mt-4 grid sm:grid-cols-2 gap-3">{applications.map((application) => {
            const property = rentalListings.find((item) => item.id === application.propertyId);
            return <div key={application.id} className="rounded-xl border border-[#E4DFD3] p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-[#142D4E]">{property?.title || 'Rental listing'}</p><p className="text-xs text-slate-500 mt-1">Applied {new Date(application.createdAt).toLocaleDateString()}</p></div><span className="rounded-full bg-[#F7F5F0] px-2.5 py-1 text-[10px] font-bold text-[#142D4E]">{application.status}</span></div><p className="text-xs text-slate-500 mt-3">Preferred move-in: {application.desiredMoveIn}</p></div>;
          })}</div> : <p className="text-xs text-slate-500 mt-4">Your rental applications and their progress will appear here.</p>}
          <p className="mt-4 text-[11px] text-slate-500">Demo status only. The Owner demo can review this in the same browser. It is not shared with another device, and approval does not create a tenancy.</p>
        </div>
        <div id="renter-viewings" className="scroll-mt-28 bg-white rounded-3xl border border-[#E4DFD3] p-5 sm:p-7">
          <div className="flex items-center gap-3"><CalendarDays className="h-5 w-5 text-[#9C7C3E]" /><h2 className="font-heading text-xl font-bold text-[#142D4E]">Viewing activity</h2></div>
          {viewingRequests.length ? <div className="mt-4 space-y-3">{viewingRequests.slice(0, 4).map((booking) => <div key={booking.id} className="flex justify-between gap-4 rounded-xl bg-[#F7F5F0] p-3"><div><p className="text-sm font-semibold text-[#142D4E]">{booking.propertyTitle}</p><p className="text-xs text-slate-500 mt-1">{booking.date} · {booking.timeSlot}</p></div><span className="h-fit rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-semibold text-amber-900">{booking.status === 'Pending' ? 'Saved locally · pending' : booking.status}</span></div>)}</div> : <p className="text-xs text-slate-500 mt-4">No rental viewing requests yet. Browse rentals to find a place.</p>}
          <button onClick={onBrowseRentals} className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-[#9C7C3E]"><Search className="h-4 w-4" />Find a place</button>
        </div>
        <div id="renter-essentials" className="scroll-mt-28 bg-white rounded-3xl border border-[#E4DFD3] p-5 sm:p-7">
          <div className="flex items-center gap-3"><FileText className="h-5 w-5 text-[#9C7C3E]" /><h2 className="font-heading text-xl font-bold text-[#142D4E]">Renter essentials</h2></div>
          <ul className="mt-4 space-y-3 text-sm text-slate-600">
            <li className="flex gap-3"><Check className="h-4 w-4 text-[#2E7D5B] shrink-0 mt-0.5" /><span>Compare monthly rent, deposit, and move-in costs before applying.</span></li>
            <li className="flex gap-3"><Check className="h-4 w-4 text-[#2E7D5B] shrink-0 mt-0.5" /><span>Keep a copy of your signed lease and payment receipts.</span></li>
            <li className="flex gap-3"><Check className="h-4 w-4 text-[#2E7D5B] shrink-0 mt-0.5" /><span>Report urgent safety issues directly to your property manager or local emergency service.</span></li>
          </ul>
          <div className="mt-5 rounded-xl border border-[#E4DFD3] bg-[#F7F5F0] p-3 text-xs text-slate-600 flex gap-2"><MessageSquareText className="h-4 w-4 text-[#9C7C3E] shrink-0" /><span>For a real tenancy, contact your landlord directly; this prototype is not connected to property managers.</span></div>
        </div>
      </section>
      <section id="renter-settings" className="scroll-mt-28 bg-white rounded-3xl border border-[#E4DFD3] p-5 sm:p-7">
        <h2 className="font-heading text-xl font-bold text-[#142D4E]">Profile & settings</h2>
        <p className="text-sm text-slate-500 mt-2">{user.name} · {user.email}</p>
        <p className="text-xs text-slate-500 mt-2">Account settings are not connected in this demo.</p>
      </section>
       </main>
      </div>
    </div>
  );
};
