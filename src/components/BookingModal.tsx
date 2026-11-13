import React, { useState } from 'react';
import { Property, ViewingBooking, UserProfile } from '../types';
import { ImageWithFallback } from './ImageWithFallback';
import {
  X,
  Calendar,
  Clock,
  Video,
  User,
  ShieldCheck,
  CheckCircle2,
  CalendarPlus,
  ArrowRight
} from 'lucide-react';

interface BookingModalProps {
  property: Property;
  user: UserProfile;
  onConfirmBooking: (booking: ViewingBooking) => void;
  onGoToDashboard: () => void;
  onClose: () => void;
}

export const BookingModal: React.FC<BookingModalProps> = ({
  property,
  user,
  onConfirmBooking,
  onGoToDashboard,
  onClose,
}) => {
  const [viewingType, setViewingType] = useState<'in-person' | 'virtual-360'>('in-person');
  const [selectedDate, setSelectedDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const year = tomorrow.getFullYear();
    const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const day = String(tomorrow.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [selectedSlot, setSelectedSlot] = useState('11:00 AM');
  const [fullName, setFullName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [phone, setPhone] = useState('+44 20 7946 0881');
  const [notes, setNotes] = useState('');
  const [submittedBooking, setSubmittedBooking] = useState<ViewingBooking | null>(null);

  const availableSlots = [
    '09:30 AM',
    '11:00 AM',
    '01:30 PM',
    '03:00 PM',
    '04:30 PM',
    '06:00 PM (Twilight Tour)',
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newBooking: ViewingBooking = {
      id: `viewing-${Date.now()}`,
      propertyId: property.id,
      propertyTitle: property.title,
      propertyAddress: property.address,
      propertyPrice: property.priceFormatted,
      propertyImage: property.images[0],
      viewingType,
      date: selectedDate,
      timeSlot: selectedSlot,
      guestName: fullName,
      guestEmail: email,
      guestPhone: phone,
      notes,
      agentName: 'Aurelia Senior Private Client Advisor',
      status: 'Pending',
      createdAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    };

    onConfirmBooking(newBooking);
    setSubmittedBooking(newBooking);
  };

  return (
    <div className="fixed inset-0 z-60 overflow-y-auto bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-[#F7F5F0] text-[#263445] w-full max-w-xl rounded-3xl overflow-hidden shadow-2xl border border-[#E4DFD3] relative">
        {/* Header */}
        <div className="bg-[#142D4E] text-white px-6 py-4 flex items-center justify-between border-b border-[#263445]">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#C5A46D]" />
            <h3 className="font-serif text-lg font-bold">
              {submittedBooking ? 'Viewing Request Submitted' : 'Request a Private Viewing'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {submittedBooking ? (
          /* Confirmation Screen */
          <div className="p-6 sm:p-8 space-y-6 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 border border-emerald-200 text-[#2E7D5B] flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <span className="inline-block px-3 py-1 bg-[#142D4E] text-[#C5A46D] text-xs font-bold rounded-md mb-2">
                Booking ID: {submittedBooking.id}
              </span>
              <h4 className="font-serif text-2xl font-bold text-[#142D4E]">
                Your Viewing Request Is Saved
              </h4>
              <p className="text-xs text-slate-600 mt-2 max-w-md mx-auto leading-relaxed">
                No email or appointment has been sent. This request is saved in this browser only. Contact an advisor directly to arrange a viewing.
              </p>
            </div>

            {/* Booking Summary Box */}
            <div className="bg-white rounded-2xl p-4 border border-[#E4DFD3] text-left text-xs space-y-2">
              <div className="flex items-center justify-between border-b border-[#E4DFD3]/60 pb-2">
                <span className="text-slate-500">Property:</span>
                <span className="font-semibold text-[#142D4E]">{submittedBooking.propertyTitle}</span>
              </div>
              <div className="flex items-center justify-between border-b border-[#E4DFD3]/60 pb-2">
                <span className="text-slate-500">Format:</span>
                <span className="font-semibold text-[#142D4E]">
                  {submittedBooking.viewingType === 'in-person' ? 'In-Person Escorted Tour' : 'Live 360° Walkthrough'}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-[#E4DFD3]/60 pb-2">
                <span className="text-slate-500">Date & Slot:</span>
                <span className="font-semibold text-[#142D4E]">
                  {submittedBooking.date} at {submittedBooking.timeSlot}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-slate-500">Status:</span>
                <span className="font-bold text-amber-700">Awaiting advisor confirmation</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  const date = submittedBooking.date.replace(/-/g, '');
                  const event = [
                    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Aurelia Homes//Viewing Request//EN',
                    'BEGIN:VEVENT', `UID:${submittedBooking.id}@aurelia-homes`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}`,
                    `DTSTART:${date}T${(() => { const match = submittedBooking.timeSlot.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i); if (!match) return '110000'; let hours = Number(match[1]) % 12; if (match[3].toUpperCase() === 'PM') hours += 12; return `${String(hours).padStart(2, '0')}${match[2]}00`; })()}`, `SUMMARY:Viewing request - ${submittedBooking.propertyTitle.replace(/[\\,;]/g, ' ')}`,
                    `DESCRIPTION:Appointment pending advisor confirmation. ${submittedBooking.propertyAddress.replace(/[\\,;]/g, ' ')}`,
                    'END:VEVENT', 'END:VCALENDAR',
                  ].join('\r\n');
                  const url = URL.createObjectURL(new Blob([event], { type: 'text/calendar;charset=utf-8' }));
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = `aurelia-viewing-${date}.ics`;
                  link.click();
                  URL.revokeObjectURL(url);
                }}
                className="flex-1 py-2.5 px-4 rounded-xl border border-[#142D4E] text-[#142D4E] text-xs font-semibold hover:bg-white flex items-center justify-center gap-2"
              >
                <CalendarPlus className="w-4 h-4" />
                <span>Add to Calendar (.ics)</span>
              </button>
              <button
                type="button"
                onClick={onGoToDashboard}
                className="flex-1 py-2.5 px-4 rounded-xl bg-[#142D4E] text-white hover:bg-[#0D1E35] text-xs font-bold flex items-center justify-center gap-2 shadow-sm"
              >
                <span>View in Dashboard</span>
                <ArrowRight className="w-4 h-4 text-[#C5A46D]" />
              </button>
            </div>
          </div>
        ) : (
          /* Form Body */
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Property mini-card summary */}
            <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-[#E4DFD3]">
              <div className="w-16 h-12 rounded-lg overflow-hidden shrink-0">
                <ImageWithFallback
                  src={property.images[0]}
                  alt={property.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="font-serif font-bold text-sm text-[#142D4E] truncate">
                  {property.title}
                </h4>
                <p className="text-[11px] text-slate-500 truncate">{property.address}</p>
                <p className="font-semibold text-xs text-[#9C7C3E] tabular-nums mt-0.5">
                  {property.priceFormatted}
                </p>
              </div>
            </div>

            {/* Viewing Type Selector */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600 mb-2">
                Viewing Format
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setViewingType('in-person')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    viewingType === 'in-person'
                      ? 'border-[#C5A46D] bg-[#142D4E] text-white shadow-sm'
                      : 'border-[#E4DFD3] bg-white text-[#263445] hover:border-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-[#C5A46D]" />
                    <span className="font-bold text-xs">In-Person Tour</span>
                  </div>
                  <p className="text-[10px] text-slate-300 mt-1">
                    Escorted by senior licensed advisor
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setViewingType('virtual-360')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    viewingType === 'virtual-360'
                      ? 'border-[#C5A46D] bg-[#142D4E] text-white shadow-sm'
                      : 'border-[#E4DFD3] bg-white text-[#263445] hover:border-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Video className="w-4 h-4 text-[#C5A46D]" />
                    <span className="font-bold text-xs">Live 360° Walkthrough</span>
                  </div>
                  <p className="text-[10px] text-slate-300 mt-1">
                    High-definition video tour with live Q&A
                  </p>
                </button>
              </div>
            </div>

            {/* Date & Time Slot */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Preferred Date
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-[#C5A46D] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="date"
                    required
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white border border-[#E4DFD3] rounded-xl text-xs text-[#263445] focus:outline-none focus:border-[#C5A46D]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Time Slot
                </label>
                <div className="relative">
                  <Clock className="w-4 h-4 text-[#C5A46D] absolute left-3 top-1/2 -translate-y-1/2" />
                  <select
                    value={selectedSlot}
                    onChange={(e) => setSelectedSlot(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white border border-[#E4DFD3] rounded-xl text-xs text-[#263445] focus:outline-none focus:border-[#C5A46D] appearance-none"
                  >
                    {availableSlots.map((slot) => (
                      <option key={slot} value={slot}>
                        {slot}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Frictionless Contact Info (Late sign-up / auto-filled from session) */}
            <div className="space-y-3 pt-2 border-t border-[#E4DFD3]">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                  Contact Information
                </span>
                <span className="text-[10px] text-slate-500">Frictionless Instant Booking</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  required
                  placeholder="Full Legal Name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#E4DFD3] rounded-xl text-xs focus:outline-none focus:border-[#C5A46D]"
                />
                <input
                  type="email"
                  required
                  placeholder="Email Address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#E4DFD3] rounded-xl text-xs focus:outline-none focus:border-[#C5A46D]"
                />
              </div>

              <input
                type="tel"
                required
                placeholder="Phone Number for Advisor Confirmation"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#E4DFD3] rounded-xl text-xs focus:outline-none focus:border-[#C5A46D]"
              />

              <textarea
                placeholder="Any specific architectural aspects you would like surveyed (optional)..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full h-16 px-3 py-2 bg-white border border-[#E4DFD3] rounded-xl text-xs focus:outline-none focus:border-[#C5A46D]"
              />
            </div>

            {/* Trust disclaimer */}
            <div className="flex items-start gap-2 text-[11px] text-slate-500 pt-1">
              <ShieldCheck className="w-4 h-4 text-[#2E7D5B] shrink-0 mt-0.5" />
              <span>
                This demo saves your viewing request in this browser. No escrow, payment, or appointment confirmation is created.
              </span>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E4DFD3]">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl font-bold text-xs bg-[#C5A46D] text-[#142D4E] hover:bg-[#B8975A] shadow-md transition-all"
              >
                Confirm Viewing Appointment
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
