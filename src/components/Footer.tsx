import React from 'react';
import { Sparkles, ShieldCheck, Mail, Phone, MapPin, AlertCircle, ArrowUp } from 'lucide-react';

interface FooterProps {
  onNavigate: (tab: string) => void;
  onOpenListProperty: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate, onOpenListProperty }) => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-[#142D4E] text-white border-t border-[#263445]">
      {/* Top Banner on Navy */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-b border-white/10">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#C5A46D] flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-[#142D4E]" />
              </div>
              <span className="font-serif text-2xl font-bold tracking-tight">
                Aurelia <span className="italic text-[#C5A46D]">Homes</span>
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Derived from the Latin <em className="text-[#C5A46D]">aurum</em> (gold). The standard of audited architectural acquisitions and high-integrity tenancy across prime global capitals.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={onOpenListProperty}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#C5A46D] text-[#142D4E] hover:bg-[#B8975A] transition-all shadow-md"
            >
              List Your Property With Us
            </button>
            <button
              onClick={scrollToTop}
              title="Scroll to Top"
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
            >
              <ArrowUp className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Link Columns */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {/* Col 1: Exploration */}
        <div className="space-y-3">
          <h4 className="font-serif text-sm font-bold text-[#C5A46D] uppercase tracking-wider">
            Curated Portfolios
          </h4>
          <ul className="space-y-2 text-xs text-slate-300">
            <li>
              <button onClick={() => onNavigate('buy')} className="hover:text-[#C5A46D] transition-colors">
                Kensington & Chelsea Mansions
              </button>
            </li>
            <li>
              <button onClick={() => onNavigate('buy')} className="hover:text-[#C5A46D] transition-colors">
                Tribeca & SoHo Cast-Iron Lofts
              </button>
            </li>
            <li>
              <button onClick={() => onNavigate('buy')} className="hover:text-[#C5A46D] transition-colors">
                French Riviera Waterfront Sanctuaries
              </button>
            </li>
            <li>
              <button onClick={() => onNavigate('buy')} className="hover:text-[#C5A46D] transition-colors">
                Bel Air & Hollywood Hills Compounds
              </button>
            </li>
            <li>
              <button onClick={() => onNavigate('rent')} className="hover:text-[#C5A46D] transition-colors">
                Prime Luxury Long-Term Leases
              </button>
            </li>
          </ul>
        </div>

        {/* Col 2: Financial Intelligence */}
        <div className="space-y-3">
          <h4 className="font-serif text-sm font-bold text-[#C5A46D] uppercase tracking-wider">
            Advisory Tools
          </h4>
          <ul className="space-y-2 text-xs text-slate-300">
            <li>
              <button onClick={() => onNavigate('tools')} className="hover:text-[#C5A46D] transition-colors">
                Mortgage Payment Amortization
              </button>
            </li>
            <li>
              <button onClick={() => onNavigate('tools')} className="hover:text-[#C5A46D] transition-colors">
                Automated Property Valuation Model
              </button>
            </li>
            <li>
              <button onClick={() => onNavigate('agents')} className="hover:text-[#C5A46D] transition-colors">
                Find a Senior Fiduciary Advisor
              </button>
            </li>
            <li>
              <button onClick={() => onNavigate('dashboard')} className="hover:text-[#C5A46D] transition-colors">
                Buyer Portfolio & Viewings Tracker
              </button>
            </li>
          </ul>
        </div>

        {/* Col 3: Trust & Anti-Scam Assurance (Section 9) */}
        <div className="space-y-3">
          <h4 className="font-serif text-sm font-bold text-[#C5A46D] uppercase tracking-wider">
            Aurelia Trust Standard
          </h4>
          <p className="text-xs text-slate-300 leading-relaxed">
            All residences undergo independent physical inspection and HM Land Registry / ACRIS deed authentication.
          </p>
          <div className="p-3 bg-[#0D1E35] rounded-xl border border-white/10 text-[11px] text-slate-300 space-y-1">
            <span className="font-bold text-[#C5A46D] block">Anti-Scam Protocol:</span>
            <span>Never wire funds outside verified escrow. All transactions are backed by bonded title guarantees.</span>
          </div>
        </div>

        {/* Col 4: Global Salons & Contact */}
        <div className="space-y-3">
          <h4 className="font-serif text-sm font-bold text-[#C5A46D] uppercase tracking-wider">
            Private Client Salons
          </h4>
          <div className="space-y-2 text-xs text-slate-300">
            <p className="flex items-start gap-2">
              <MapPin className="w-3.5 h-3.5 text-[#C5A46D] shrink-0 mt-0.5" />
              <span>London: 12 Berkeley Square, Mayfair</span>
            </p>
            <p className="flex items-start gap-2">
              <MapPin className="w-3.5 h-3.5 text-[#C5A46D] shrink-0 mt-0.5" />
              <span>New York: 72 Franklin Street, Tribeca</span>
            </p>
            <p className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-[#C5A46D] shrink-0" />
              <span>+44 20 7946 0912 / +1 (212) 555-0194</span>
            </p>
            <p className="flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-[#C5A46D] shrink-0" />
              <span>concierge@aureliahomes.com</span>
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Sub-bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 border-t border-white/10 text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          © {new Date().getFullYear()} Aurelia Homes International Ltd. All rights reserved.
        </div>
        <div className="flex flex-wrap items-center gap-6">
          <a href="#privacy" className="hover:text-[#C5A46D] transition-colors">Privacy Policy</a>
          <a href="#terms" className="hover:text-[#C5A46D] transition-colors">Terms of Representation</a>
          <a href="#accessibility" className="hover:text-[#C5A46D] transition-colors">WCAG 2.2 AA Conformance</a>
          <a href="#fiduciary" className="hover:text-[#C5A46D] transition-colors">Fiduciary Registry</a>
        </div>
      </div>
    </footer>
  );
};
