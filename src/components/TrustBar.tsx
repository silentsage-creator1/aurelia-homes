import React from 'react';
import { ShieldCheck, UserCheck, Globe, DollarSign } from 'lucide-react';
import { TRUST_METRICS } from '../data/trust';

export const TrustBar: React.FC = () => {
  const icons = [
    <ShieldCheck className="w-6 h-6 text-[#C5A46D]" key="1" />,
    <UserCheck className="w-6 h-6 text-[#C5A46D]" key="2" />,
    <Globe className="w-6 h-6 text-[#C5A46D]" key="3" />,
    <DollarSign className="w-6 h-6 text-[#C5A46D]" key="4" />
  ];

  return (
    <section className="bg-white border-b border-[#E4DFD3] py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 lg:gap-8">
          {TRUST_METRICS.map((metric, idx) => (
            <div
              key={metric.label}
              className="flex items-start gap-3.5 p-3 rounded-xl hover:bg-[#F7F5F0]/60 transition-colors"
            >
              <div className="w-12 h-12 rounded-xl bg-[#142D4E] flex items-center justify-center shrink-0 shadow-xs">
                {icons[idx]}
              </div>
              <div>
                <p className="font-serif text-2xl font-bold text-[#142D4E] tracking-tight tabular-nums">
                  {metric.value}
                </p>
                <p className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
                  {metric.label}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                  {metric.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
