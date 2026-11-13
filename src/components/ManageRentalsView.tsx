import React, { useState } from 'react';
import { Property, RentalApplication, RentalApplicationStatus, UserProfile, ViewingBooking } from '../types';
import { ImageWithFallback } from './ImageWithFallback';
import {
  Building2,
  Key,
  DollarSign,
  Users,
  ShieldCheck,
  CheckCircle2,
  FileText,
  Clock,
  PlusCircle,
  TrendingUp,
  AlertCircle
} from 'lucide-react';

interface ManageRentalsViewProps {
  user: UserProfile;
  properties: Property[];
  applications: RentalApplication[];
  bookings: ViewingBooking[];
  onUpdateApplication: (applicationId: string, status: RentalApplicationStatus) => void;
  onSubmitListingForReview: (propertyId: string) => void;
  onUpdateViewing: (bookingId: string, status: ViewingBooking['status']) => void;
  onOpenListProperty: () => void;
  onSelectProperty: (property: Property) => void;
}

export const ManageRentalsView: React.FC<ManageRentalsViewProps> = ({
  user,
  properties,
  applications,
  bookings,
  onUpdateApplication,
  onSubmitListingForReview,
  onUpdateViewing,
  onOpenListProperty,
  onSelectProperty,
}) => {
  const rentalProperties = properties;
  const activeListings = properties.filter((property) => property.listingStatus === 'published' || (!property.listingStatus && property.verified)).length;

  const rentalBookings = bookings.filter((booking) => rentalProperties.some((property) => property.id === booking.propertyId) && booking.status !== 'Cancelled');
  type LandlordSection = 'overview' | 'units' | 'listings' | 'applications' | 'viewings' | 'tenants' | 'sales' | 'payments' | 'expenses' | 'maintenance' | 'reports' | 'notifications' | 'settings' | 'leases';
  const [activeTab, setActiveTab] = useState<LandlordSection>('overview');
  const pendingApplications = applications.filter((application) => ['Submitted', 'Under Review', 'Additional Information Required'].includes(application.status)).length;

  return (
    <div className="max-w-[1600px] mx-auto px-3 sm:px-5 lg:px-8 py-6 lg:py-8">
      <div className="grid lg:grid-cols-[250px_minmax(0,1fr)] gap-5 lg:gap-8">
       <aside className="h-fit rounded-2xl border border-[#E4DFD3] bg-white p-3 lg:sticky lg:top-28">
        <p className="px-3 py-3 border-b border-[#E4DFD3] mb-2 text-xs font-bold uppercase tracking-wider text-[#9C7C3E]">Landlord workspace</p>
        <nav aria-label="Landlord dashboard navigation" className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible">
         {([
           ['overview', 'Overview'], ['units', 'My Properties'], ['listings', 'Listings'], ['applications', 'Applications'], ['leases', 'Agreements & Leases'], ['viewings', 'Viewing Requests'], ['tenants', 'Tenants'], ['sales', 'Sales Enquiries'], ['payments', 'Payments & Income'], ['expenses', 'Expenses'], ['maintenance', 'Maintenance'], ['reports', 'Reports'], ['notifications', 'Notifications'], ['settings', 'Settings'],
         ] as [LandlordSection, string][]).map(([section, label]) => <button key={section} onClick={() => setActiveTab(section)} aria-current={activeTab === section ? 'page' : undefined} className={`shrink-0 lg:w-full rounded-xl px-3 py-2.5 text-left text-xs font-semibold ${activeTab === section ? 'bg-[#142D4E] text-white' : 'text-slate-600 hover:bg-[#F7F5F0]'}`}>{label}{section === 'applications' ? ` (${applications.length})` : section === 'viewings' ? ` (${rentalBookings.length})` : ''}</button>)}
        </nav>
       </aside>
       <main className="min-w-0 space-y-7">
      {/* Top Banner */}
      <div className="bg-[#142D4E] text-white rounded-3xl p-6 sm:p-8 border border-[#263445] shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#C5A46D]/20 text-[#C5A46D] text-xs font-semibold mb-2">
            <ShieldCheck className="w-4 h-4" />
            <span>Aurelia Landlord & Asset Management</span>
          </div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight">
            Manage Prime Rental Residences
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Demo interface only. Tenant verification, lease coordination, and rent collection are not available.
          </p>
        </div>

        <button
          onClick={onOpenListProperty}
          className="px-5 py-3 rounded-xl text-xs font-bold bg-[#C5A46D] text-[#142D4E] hover:bg-[#B8975A] transition-all shadow-md flex items-center gap-2 self-start md:self-auto shrink-0"
        >
          <PlusCircle className="w-4 h-4 text-[#142D4E]" />
          <span>Add Rental Residence</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {[
          ['Total Properties', properties.length],
          ['Active Listings', activeListings],
          ['Occupied Properties', '—'],
          ['Vacant Properties', '—'],
          ['Monthly Rental Income', '—'],
          ['Pending Applications', pendingApplications],
        ].map(([label, value]) => <div key={label} className="rounded-2xl border border-[#E4DFD3] bg-white p-5"><p className="text-xs font-semibold text-slate-500">{label}</p><p className="font-heading text-2xl font-bold text-[#142D4E] mt-3">{value}</p><p className="text-[10px] text-slate-400 mt-1">{value === '—' ? 'Not connected' : 'Demo data'}</p></div>)}
      </div>

      {/* Content */}
      {activeTab === 'overview' && <section className="grid md:grid-cols-2 gap-5"><div className="rounded-2xl border border-[#E4DFD3] bg-white p-5"><h2 className="font-heading font-bold text-[#142D4E]">Property portfolio</h2><p className="text-xs text-slate-500 mt-2">{properties.length} property records available in this demo. Listing publication is a separate step.</p><button onClick={() => setActiveTab('units')} className="mt-4 text-xs font-bold text-[#9C7C3E]">View properties →</button></div><div className="rounded-2xl border border-[#E4DFD3] bg-white p-5"><h2 className="font-heading font-bold text-[#142D4E]">Applications awaiting review</h2><p className="font-heading text-2xl font-bold text-[#142D4E] mt-2">{pendingApplications}</p><button onClick={() => setActiveTab('applications')} className="mt-4 text-xs font-bold text-[#9C7C3E]">Review applications →</button></div></section>}

      {(activeTab === 'units' || activeTab === 'listings') && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {rentalProperties.map((prop) => (
            <div
              key={prop.id}
              className="bg-white rounded-2xl p-5 border border-[#E4DFD3] shadow-xs flex flex-col justify-between"
            >
              <div className="flex gap-4">
                <div className="w-24 h-20 rounded-xl overflow-hidden shrink-0">
                  <ImageWithFallback src={prop.images[0]} alt={prop.title} className="w-full h-full object-cover" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-[#142D4E] text-[#C5A46D] text-[10px] font-bold">
                      {prop.listingStatus === 'draft' ? 'Owned · Not Listed' : prop.listingStatus === 'pending_review' ? 'Listing review pending' : prop.listingStatus === 'rejected' ? 'Listing needs changes' : prop.verified ? 'Verified Listing' : 'Pending review'}
                    </span>
                    <span className="text-xs text-slate-400">Cadastral Ref: {prop.cadastralId}</span>
                  </div>
                  <h3 className="font-heading font-bold text-base text-[#142D4E] mt-1">
                    {prop.title}
                  </h3>
                  <p className="text-xs text-slate-500">{prop.address}</p>
                  <p className="font-heading font-bold text-base text-[#9C7C3E] mt-1 tabular-nums">
                    {prop.priceFormatted}
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#E4DFD3] flex items-center justify-between text-xs">
                <span className="text-slate-500">
                  {prop.bedrooms} Beds · {prop.bathrooms} Baths · {prop.sqft} sqft
                </span>
                <div className="flex gap-2">{(prop.listingStatus === 'draft' || prop.listingStatus === 'rejected') && <button onClick={() => onSubmitListingForReview(prop.id)} className="px-3 py-1.5 rounded-lg bg-[#142D4E] text-white font-semibold">Create listing · Submit for review</button>}<button onClick={() => onSelectProperty(prop)} className="px-3 py-1.5 rounded-lg bg-[#F7F5F0] hover:bg-[#E4DFD3] font-semibold text-[#142D4E]">View Details</button></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'applications' && (
        <div className="space-y-4">
          <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">Demo workflow: applications for sample rental listings are shared with the Owner demo account. Status changes stay in this browser; applicants are not notified and no tenancy or lease is created.</p>
          {applications.length === 0 ? <div className="rounded-2xl border border-[#E4DFD3] bg-white p-8 text-center"><h3 className="font-heading font-bold text-[#142D4E]">No applications yet</h3><p className="text-xs text-slate-500 mt-2">Applications appear here after a renter submits one for a demo rental listing in this browser. This demo does not sync applications from other devices.</p></div> : applications.map((application) => {
            const property = rentalProperties.find((item) => item.id === application.propertyId);
            const canReview = !['Approved', 'Rejected', 'Withdrawn'].includes(application.status);
            return <article key={application.id} className="rounded-2xl border border-[#E4DFD3] bg-white p-5">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div><div className="flex items-center gap-2"><span className="rounded-full bg-[#F7F5F0] px-2.5 py-1 text-[10px] font-bold text-[#142D4E]">{application.status}</span><span className="text-[11px] text-slate-400">{new Date(application.createdAt).toLocaleDateString()}</span></div><h3 className="font-heading text-lg font-bold text-[#142D4E] mt-2">{property?.title || 'Property listing'}</h3><p className="text-sm text-slate-600">Applicant: {application.applicantName} · {application.applicantEmail}</p><p className="text-xs text-slate-500 mt-2">Phone: {application.phone} · Occupation: {application.occupation}</p><p className="text-xs text-slate-500">Preferred move-in: {application.desiredMoveIn}</p>{application.message && <p className="text-sm text-slate-600 mt-3">“{application.message}”</p>}</div>
                {canReview && <div className="flex flex-wrap gap-2"><button onClick={() => onUpdateApplication(application.id, 'Under Review')} className="rounded-lg border border-[#E4DFD3] px-3 py-2 text-xs font-semibold text-[#142D4E]">Mark reviewing</button><button onClick={() => onUpdateApplication(application.id, 'Additional Information Required')} className="rounded-lg border border-[#E4DFD3] px-3 py-2 text-xs font-semibold text-[#142D4E]">Request info</button><button onClick={() => onUpdateApplication(application.id, 'Approved')} className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white">Approve</button><button onClick={() => onUpdateApplication(application.id, 'Rejected')} className="rounded-lg bg-rose-700 px-3 py-2 text-xs font-bold text-white">Reject</button></div>}
              </div>
            </article>;
          })}
        </div>
      )}

      {activeTab === 'viewings' && (
        <section className="space-y-4">
          <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">These are viewing requests, not rental applications. Requests are saved in this browser and are not automatically confirmed with the renter.</p>
          {rentalBookings.length === 0 ? <div className="rounded-2xl border border-[#E4DFD3] bg-white p-8 text-center"><h3 className="font-heading font-bold text-[#142D4E]">No viewing requests yet</h3><p className="text-xs text-slate-500 mt-2">Renter viewing requests for your properties will appear here.</p></div> : rentalBookings.map((booking) => <article key={booking.id} className="rounded-2xl border border-[#E4DFD3] bg-white p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><span className="rounded-full bg-[#F7F5F0] px-2.5 py-1 text-[10px] font-bold text-[#142D4E]">{booking.status === 'Pending' ? 'Pending confirmation' : booking.status}</span><h3 className="font-heading text-lg font-bold text-[#142D4E] mt-2">{booking.propertyTitle}</h3><p className="text-sm text-slate-600">Requested by {booking.guestName} · {booking.guestEmail}</p><p className="text-xs text-slate-500 mt-1">{booking.guestPhone}</p></div><div className="rounded-xl bg-[#F7F5F0] px-4 py-3 text-sm text-[#142D4E]"><p className="font-semibold">{booking.date} · {booking.timeSlot}</p><p className="text-xs text-slate-500 mt-1">{booking.viewingType === 'in-person' ? 'In-person viewing' : 'Virtual tour'}</p></div></div>{booking.status === 'Pending' && <button onClick={() => onUpdateViewing(booking.id, 'Confirmed')} className="mt-4 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-800">Accept viewing request</button>}</article>)}
        </section>
      )}

      {activeTab === 'leases' && (
        <section className="rounded-2xl border border-[#E4DFD3] bg-white p-6 sm:p-8"><h2 className="font-heading text-xl font-bold text-[#142D4E]">Agreements & leases</h2><p className="text-sm text-slate-500 mt-2">No agreement or lease records are connected. Approving an application does not create a lease or activate a tenant.</p><p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">Agreement generation, signatures, secure document storage, payment verification, and tenancy activation require a shared backend and configured providers.</p></section>
      )}
      {['tenants', 'sales', 'payments', 'expenses', 'maintenance', 'reports', 'notifications', 'settings'].includes(activeTab) && <section className="rounded-2xl border border-[#E4DFD3] bg-white p-6"><h2 className="font-heading text-xl font-bold text-[#142D4E]">{activeTab === 'sales' ? 'Sales Enquiries' : activeTab === 'payments' ? 'Payments & Income' : activeTab[0].toUpperCase() + activeTab.slice(1)}</h2><p className="text-sm text-slate-500 mt-2">This section will populate when the shared records and backend workflows are connected.</p></section>}
       </main>
      </div>
    </div>
  );
};
