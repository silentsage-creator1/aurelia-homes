import React, { useState } from 'react';
import { ArrowLeft, ClipboardList, LockKeyhole } from 'lucide-react';
import { Property, RentalApplication, UserProfile } from '../types';
import { isSupabaseConfigured } from '../services/supabaseWorkflow';

interface RentalApplicationModalProps {
  property: Property;
  user: UserProfile;
  existingApplication?: RentalApplication;
  onSubmit: (application: RentalApplication) => void | Promise<void>;
  onCancel: () => void;
}

export const RentalApplicationModal: React.FC<RentalApplicationModalProps> = ({ property, user, existingApplication, onSubmit, onCancel }) => {
  const [phone, setPhone] = useState(user.phone || '');
  const [occupation, setOccupation] = useState('');
  const [desiredMoveIn, setDesiredMoveIn] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true); setSubmitError('');
    try { await onSubmit({
      id: `application-${Date.now()}`,
      propertyId: property.id,
      applicantId: user.id,
      applicantName: user.name,
      applicantEmail: user.email,
      phone: phone.trim(),
      occupation: occupation.trim(),
      desiredMoveIn,
      message: message.trim(),
      status: 'Submitted',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }); } catch (cause) { setSubmitError(cause instanceof Error ? cause.message : 'Could not submit your application'); }
    finally { setIsSubmitting(false); }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <button onClick={onCancel} className="inline-flex items-center gap-2 text-sm font-semibold text-[#9C7C3E] hover:underline"><ArrowLeft className="h-4 w-4" />Back to rental listings</button>
      <section className="mt-5 rounded-3xl bg-white border border-[#E4DFD3] shadow-sm overflow-hidden">
        <div className="bg-[#142D4E] p-6 sm:p-8 text-white">
          <div className="flex items-center gap-3"><span className="rounded-xl bg-white/10 p-2.5 text-[#D8BD8C]"><ClipboardList className="h-5 w-5" /></span><div><p className="text-xs uppercase tracking-wider text-[#D8BD8C]">Rental application{isSupabaseConfigured ? '' : ' · demo'}</p><h1 className="font-heading text-2xl sm:text-3xl font-bold mt-1">Apply for {property.title}</h1></div></div>
          <p className="text-sm text-slate-300 mt-3">{property.neighborhood}, {property.city} · {property.priceFormatted}</p>
        </div>
        {existingApplication ? (
          <div className="p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#9C7C3E]">Application already on file</p>
            <h2 className="font-heading text-xl font-bold text-[#142D4E] mt-2">Status: {existingApplication.status}</h2>
            <p className="text-sm text-slate-600 mt-2">You can follow this status in your Tenant Dashboard. Contact the property owner through your dashboard if your application details need an update.</p>
            <button onClick={onCancel} className="mt-5 rounded-xl bg-[#142D4E] px-5 py-3 text-sm font-bold text-white">Return to rentals</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-5">
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-950 flex gap-2"><LockKeyhole className="h-4 w-4 shrink-0 mt-0.5" /><span>Your application is sent securely to the property owner. Avoid putting sensitive identity or financial information in the optional message.</span></div>
            {submitError && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-xs text-rose-800">{submitError}</p>}
            <div className="grid sm:grid-cols-2 gap-4">
              <label className="text-xs font-semibold text-slate-700">Full name<input value={user.name} readOnly className="mt-1 w-full rounded-xl border border-[#E4DFD3] bg-slate-50 px-3 py-2.5 text-sm text-slate-500" /></label>
              <label className="text-xs font-semibold text-slate-700">Email<input value={user.email} readOnly className="mt-1 w-full rounded-xl border border-[#E4DFD3] bg-slate-50 px-3 py-2.5 text-sm text-slate-500" /></label>
              <label className="text-xs font-semibold text-slate-700">Phone number<input required value={phone} onChange={(event) => setPhone(event.target.value)} type="tel" maxLength={30} className="mt-1 w-full rounded-xl border border-[#E4DFD3] px-3 py-2.5 text-sm" /></label>
              <label className="text-xs font-semibold text-slate-700">Occupation<input required value={occupation} onChange={(event) => setOccupation(event.target.value)} maxLength={100} className="mt-1 w-full rounded-xl border border-[#E4DFD3] px-3 py-2.5 text-sm" /></label>
              <label className="text-xs font-semibold text-slate-700">Preferred move-in date<input required min={new Date().toISOString().slice(0, 10)} value={desiredMoveIn} onChange={(event) => setDesiredMoveIn(event.target.value)} type="date" className="mt-1 w-full rounded-xl border border-[#E4DFD3] px-3 py-2.5 text-sm" /></label>
            </div>
            <label className="block text-xs font-semibold text-slate-700">Note to the property owner (optional)<textarea value={message} onChange={(event) => setMessage(event.target.value)} maxLength={1000} rows={4} placeholder="Introduce yourself and share any questions about the home." className="mt-1 w-full rounded-xl border border-[#E4DFD3] px-3 py-2.5 text-sm font-normal" /></label>
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 border-t border-[#E4DFD3] pt-5"><button type="button" onClick={onCancel} className="rounded-xl border border-[#E4DFD3] px-5 py-3 text-sm font-semibold text-slate-700">Cancel</button><button type="submit" disabled={isSubmitting} className="rounded-xl bg-[#C5A46D] px-5 py-3 text-sm font-bold text-[#142D4E] hover:bg-[#B8975A] disabled:opacity-50">{isSubmitting ? 'Submitting…' : isSupabaseConfigured ? 'Submit application' : 'Save demo application'}</button></div>
          </form>
        )}
      </section>
    </div>
  );
};
