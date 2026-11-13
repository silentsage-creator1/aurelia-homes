import React, { useState } from 'react';
import { Agent, Property } from '../types';
import { ImageWithFallback } from './ImageWithFallback';
import { ShieldCheck, Phone, Mail, Award, CheckCircle2, Star, Sparkles } from 'lucide-react';

interface AgentsDirectoryProps {
  agents: Agent[];
  onContactAgent: (agent: Agent) => void;
  onFilterByAdvisorProperties: (agentId: string) => void;
}

export const AgentsDirectory: React.FC<AgentsDirectoryProps> = ({
  agents,
  onContactAgent,
  onFilterByAdvisorProperties,
}) => {
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('all');

  const specialties = ['all', 'London', 'New York', 'Riviera', 'Los Angeles'];

  const filteredAgents = agents.filter((agent) => {
    if (selectedSpecialty === 'all') return true;
    return (
      agent.specialty.toLowerCase().includes(selectedSpecialty.toLowerCase()) ||
      agent.bio.toLowerCase().includes(selectedSpecialty.toLowerCase())
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Directory Title */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-[#142D4E] text-[#C5A46D] text-xs font-semibold">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Vetted Senior Advisors</span>
        </div>
        <h1 className="font-serif text-3xl sm:text-5xl font-bold text-[#142D4E] tracking-tight">
          Private Client Advisory Board
        </h1>
        <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
          Every Aurelia advisor has a minimum of 10 years representing ultra-prime acquisitions. Bonded, verified, and bound by fiduciary non-disclosure.
        </p>

        {/* Filter chips */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
          {specialties.map((spec) => (
            <button
              key={spec}
              onClick={() => setSelectedSpecialty(spec)}
              className={`px-4 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all ${
                selectedSpecialty === spec
                  ? 'bg-[#142D4E] text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-[#E4DFD3] hover:border-[#C5A46D]'
              }`}
            >
              {spec === 'all' ? 'All Global Advisors' : `${spec} Specialists`}
            </button>
          ))}
        </div>
      </div>

      {/* Agents Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {filteredAgents.map((agent) => (
          <div
            key={agent.id}
            className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E4DFD3] shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-[#C5A46D] shrink-0 shadow-sm">
                    <ImageWithFallback
                      src={agent.avatar}
                      alt={agent.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-serif text-xl font-bold text-[#142D4E]">
                        {agent.name}
                      </h3>
                      <span title="Verified Licensed Advisor">
                        <ShieldCheck className="w-4 h-4 text-[#C5A46D]" />
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium">{agent.role}</p>
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                      Lic. {agent.licenseNumber}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <div className="flex items-center gap-1 text-amber-500 justify-end">
                    <Star className="w-4 h-4 fill-current" />
                    <span className="font-bold text-xs text-[#142D4E] tabular-nums">{agent.rating}</span>
                  </div>
                  <span className="text-[11px] text-slate-400">({agent.reviewsCount} reviews)</span>
                </div>
              </div>

              <div className="mt-5 p-3 bg-[#F7F5F0] rounded-xl border border-[#E4DFD3]/80">
                <span className="text-[10px] uppercase font-bold text-[#9C7C3E] block mb-0.5">
                  Focus Territory & Specialty
                </span>
                <p className="text-xs font-semibold text-[#142D4E]">{agent.specialty}</p>
              </div>

              <p className="text-xs text-slate-600 mt-4 leading-relaxed font-normal">
                {agent.bio}
              </p>

              {/* Metrics row */}
              <div className="mt-5 pt-4 border-t border-[#E4DFD3] grid grid-cols-3 gap-2 text-center text-xs">
                <div>
                  <span className="font-serif font-bold text-base text-[#142D4E] tabular-nums block">
                    {agent.salesVolume}
                  </span>
                  <span className="text-[10px] text-slate-500 uppercase">Career Volume</span>
                </div>
                <div>
                  <span className="font-serif font-bold text-base text-[#142D4E] tabular-nums block">
                    {agent.experienceYears} Years
                  </span>
                  <span className="text-[10px] text-slate-500 uppercase">Experience</span>
                </div>
                <div>
                  <span className="font-serif font-bold text-base text-[#142D4E] tabular-nums block">
                    {agent.activeListingsCount}
                  </span>
                  <span className="text-[10px] text-slate-500 uppercase">Audited Homes</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 pt-4 border-t border-[#E4DFD3] flex items-center gap-3">
              <a
                href={`tel:${agent.phone}`}
                className="p-2.5 rounded-xl bg-[#F7F5F0] hover:bg-[#E4DFD3] text-[#142D4E] transition-colors border border-[#E4DFD3]"
                title="Direct Phone"
              >
                <Phone className="w-4 h-4 text-[#C5A46D]" />
              </a>

              <button
                onClick={() => onFilterByAdvisorProperties(agent.id)}
                className="flex-1 py-2.5 px-3 rounded-xl border border-[#142D4E] text-[#142D4E] hover:bg-[#142D4E] hover:text-white text-xs font-semibold transition-all"
              >
                View {agent.name.split(' ')[0]}’s Listings
              </button>

              <button
                onClick={() => onContactAgent(agent)}
                className="flex-1 py-2.5 px-3 rounded-xl bg-[#C5A46D] text-[#142D4E] hover:bg-[#B8975A] text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5"
              >
                <Mail className="w-3.5 h-3.5 text-[#142D4E]" />
                <span>Private Inquiry</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
