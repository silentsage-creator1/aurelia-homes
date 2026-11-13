import React, { useState } from 'react';
import { Agent, Property } from '../types';
import { ImageWithFallback } from './ImageWithFallback';
import { X, Send, ShieldCheck, CheckCircle2, Phone, Mail } from 'lucide-react';

interface AgentContactModalProps {
  agent: Agent;
  property?: Property | null;
  onClose: () => void;
}

export const AgentContactModal: React.FC<AgentContactModalProps> = ({
  agent,
  property,
  onClose,
}) => {
  const [senderName, setSenderName] = useState('');
  const [senderEmail, setSenderEmail] = useState('');
  const [senderPhone, setSenderPhone] = useState('');
  const [message, setMessage] = useState(
    property
      ? `Dear ${agent.name},\n\nI am evaluating ${property.title} (${property.priceFormatted}). Could you please share the surveyor's cadastral report and confirmed HOA bylaws?\n\nKind regards,\nTolu`
      : `Dear ${agent.name},\n\nI am seeking guidance on prime properties in your specialty. When would be a convenient time for a confidential consultation?\n\nKind regards,\nTolu`
  );
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
    setTimeout(() => {
      // auto close or keep open with confirmation
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-60 overflow-y-auto bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-[#F7F5F0] text-[#263445] w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl border border-[#E4DFD3] relative">
        <div className="bg-[#142D4E] text-white px-6 py-4 flex items-center justify-between border-b border-[#263445]">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#C5A46D]" />
            <h3 className="font-serif text-lg font-bold">
              Inquire with {agent.name}
            </h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-300 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {sent ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-[#2E7D5B] flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h4 className="font-serif text-2xl font-bold text-[#142D4E]">
              Message Dispatched
            </h4>
            <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
              Your inquiry has been routed directly to {agent.name}’s private client terminal. Expect an encrypted response or phone call within 2 hours.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl bg-[#142D4E] text-white text-xs font-bold hover:bg-[#0D1E35]"
              >
                Close Window
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Agent Mini Profile */}
            <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-[#E4DFD3]">
              <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 border border-[#C5A46D]">
                <ImageWithFallback src={agent.avatar} alt={agent.name} className="w-full h-full object-cover" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="font-serif font-bold text-sm text-[#142D4E]">{agent.name}</h4>
                  <ShieldCheck className="w-3.5 h-3.5 text-[#C5A46D]" />
                </div>
                <p className="text-[11px] text-slate-500">{agent.role}</p>
                <p className="text-[10px] text-slate-400">License: {agent.licenseNumber}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Your Name</label>
                <input
                  type="text"
                  required
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#E4DFD3] rounded-xl text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Your Phone</label>
                <input
                  type="tel"
                  required
                  value={senderPhone}
                  onChange={(e) => setSenderPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#E4DFD3] rounded-xl text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                required
                value={senderEmail}
                onChange={(e) => setSenderEmail(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#E4DFD3] rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Confidential Inquiry</label>
              <textarea
                rows={5}
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full p-3 bg-white border border-[#E4DFD3] rounded-xl text-xs leading-relaxed"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-slate-500 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-[#2E7D5B]" />
                Avoid sharing sensitive information in this demo
              </span>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-[#C5A46D] text-[#142D4E] hover:bg-[#B8975A] flex items-center gap-1.5 shadow-sm"
                >
                  <Send className="w-3.5 h-3.5 text-[#142D4E]" />
                  <span>Send Inquiry</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
