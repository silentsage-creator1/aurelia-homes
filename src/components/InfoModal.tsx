import React from 'react';
import { X, ShieldCheck, HelpCircle, FileText, CheckCircle2 } from 'lucide-react';

interface InfoModalProps {
  type: 'help' | 'privacy' | 'terms';
  onClose: () => void;
}

export const InfoModal: React.FC<InfoModalProps> = ({ type, onClose }) => {
  return (
    <div className="fixed inset-0 z-60 overflow-y-auto bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-[#F7F5F0] text-[#263445] w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl border border-[#E4DFD3] relative">
        <div className="bg-[#142D4E] text-white px-6 py-4 flex items-center justify-between border-b border-[#263445]">
          <div className="flex items-center gap-2">
            {type === 'help' && <HelpCircle className="w-5 h-5 text-[#C5A46D]" />}
            {type === 'privacy' && <ShieldCheck className="w-5 h-5 text-[#C5A46D]" />}
            {type === 'terms' && <FileText className="w-5 h-5 text-[#C5A46D]" />}
            <h3 className="font-heading text-lg font-bold">
              {type === 'help' && 'Aurelia Homes Concierge & Help Center'}
              {type === 'privacy' && 'Privacy Policy & Data Fiduciary'}
              {type === 'terms' && 'Terms of Representation & Fair Housing'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-300 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 sm:p-8 overflow-y-auto max-h-[75vh] space-y-5 text-xs text-slate-700 leading-relaxed">
          {type === 'help' && (
            <>
              <div>
                <h4 className="font-heading font-bold text-sm text-[#142D4E] mb-1">
                  How does the Aurelia Verification Standard work?
                </h4>
                <p>
                  Every residence on Aurelia Homes is physically surveyed by an accredited surveyor and validated against official Cadastral / HM Land Registry records before public indexing. This eliminates ghost listings, outdated pricing, and fraudulent deposits.
                </p>
              </div>

              <div>
                <h4 className="font-heading font-bold text-sm text-[#142D4E] mb-1">
                  How do I book a private viewing?
                </h4>
                <p>
                  Click "Book Viewing" on any property. Choose between an escorted In-Person Tour or a Live 360° Walkthrough. Once selected, your dedicated advisor will confirm your access badge and security protocols.
                </p>
              </div>

              <div>
                <h4 className="font-heading font-bold text-sm text-[#142D4E] mb-1">
                  Are mortgage calculations guaranteed?
                </h4>
                <p>
                  Our mortgage planner calculates principal, interest, localized property taxes, and HOA assessments based on current bank indices. For institutional pre-approval, connect directly with our private wealth advisory desk.
                </p>
              </div>
            </>
          )}

          {type === 'privacy' && (
            <>
              <p>
                <strong>Last Updated: October 2026</strong>. Aurelia Homes International Ltd. respects the confidentiality of high-net-worth buyers, family offices, and property owners.
              </p>
              <div className="space-y-3">
                <div className="p-3 bg-white rounded-xl border border-[#E4DFD3]">
                  <strong className="text-[#142D4E] block mb-1">1. Fiduciary Data Privacy</strong>
                  <span>We never sell or distribute your search queries, property shortlists, or financial profiles to third-party ad networks or lead brokers.</span>
                </div>
                <div className="p-3 bg-white rounded-xl border border-[#E4DFD3]">
                  <strong className="text-[#142D4E] block mb-1">2. Strict Non-Disclosure</strong>
                  <span>All buyer inquiries and deed reviews are executed under standard bilateral non-disclosure protocols.</span>
                </div>
                <div className="p-3 bg-white rounded-xl border border-[#E4DFD3]">
                  <strong className="text-[#142D4E] block mb-1">3. Escrow Security</strong>
                  <span>Financial escrow verification operates under 256-bit bank-grade encryption with multi-signature authorization.</span>
                </div>
              </div>
            </>
          )}

          {type === 'terms' && (
            <>
              <p>
                Aurelia Homes operates in compliance with international real estate brokerage standards, the Fair Housing Act, and Equal Housing Opportunity regulations.
              </p>
              <div className="space-y-2">
                <p>
                  <strong>Equal Housing Opportunity:</strong> We conduct business in accordance with Federal, State, and International Fair Housing Laws. We do not discriminate on the basis of race, color, religion, sex, handicap, familial status, or national origin.
                </p>
                <p>
                  <strong>Demo data notice:</strong> Listings, advisor profiles, and verification labels are sample content. This prototype does not verify ownership, provide legal advice, or arrange transactions.
                </p>
              </div>
            </>
          )}

          <div className="pt-4 border-t border-[#E4DFD3] flex justify-end">
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-[#142D4E] text-white hover:bg-[#0D1E35]"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
