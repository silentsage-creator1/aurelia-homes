export interface Testimonial {
  id: string;
  name: string;
  persona: string;
  roleOrLocation: string;
  avatar: string;
  quote: string;
  purchaseContext: string;
  verifiedTransaction: boolean;
  rating: number;
}

export const TESTIMONIALS: Testimonial[] = [
  {
    id: 'test-1',
    name: 'Tolu Adeleke',
    persona: 'First-time luxury buyer',
    roleOrLocation: 'Acquired in Kensington, London',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    quote: 'As a first-time buyer entering the high-end market, I was paralyzed by concerns over title accuracy and undisclosed fees. Aurelia’s physically verified badges and side-by-side evaluation tools gave me complete certainty. Eleanor arranged our private viewing within hours.',
    purchaseContext: 'Purchased 3-Bedroom Mews Residence',
    verifiedTransaction: true,
    rating: 5
  },
  {
    id: 'test-2',
    name: 'Julian & Claire Montgomery',
    persona: 'Historic home collectors',
    roleOrLocation: 'Tribeca, New York',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
    quote: 'Marcus knew the provenance of every cast-iron column in the building. No pressure, no speculative valuations—just pristine architectural documentation and flawless legal coordination.',
    purchaseContext: 'Purchased 4,200 sq ft Duplex Loft',
    verifiedTransaction: true,
    rating: 5
  },
  {
    id: 'test-3',
    name: 'Dr. Helene Rostova',
    persona: 'International relocation',
    roleOrLocation: 'Cap d\'Ail, French Riviera',
    avatar: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=400&q=80',
    quote: 'The 360° live walkthrough with Camille Delacroix was so thorough that we submitted our offer before flying in. Having verified surveyor reports accessible on the listing saved us weeks of back-and-forth.',
    purchaseContext: 'Acquired Modernist Coastal Villa',
    verifiedTransaction: true,
    rating: 5
  }
];

export const TRUST_METRICS = [
  { label: 'Sample Listings', value: 'Demo', description: 'Illustrative property data; not independently verified' },
  { label: 'Advisor Profiles', value: 'Demo', description: 'Illustrative profiles; credentials not independently verified' },
  { label: 'Sample Locations', value: 'Demo', description: 'Example locations shown for the prototype' },
  { label: 'Transactions', value: 'Unavailable', description: 'No payments, escrow, or buyer protection are provided by this demo' }
];

export const HOW_IT_WORKS_STEPS = [
  {
    step: '01',
    title: 'Curated Discovery',
    description: 'Explore rigorously inspected properties with cadastral deed confirmation, high-res galleries, and verified price history.'
  },
  {
    step: '02',
    title: 'Verified Viewing',
    description: 'Book a private viewing or live 360° video walk-through with licensed senior advisors. Zero ghost listings, guaranteed.'
  },
  {
    step: '03',
    title: 'Protected Closing',
    description: 'Transparent contract guidance, mortgage evaluation tools, and dedicated closing specialists from offer to key handover.'
  }
];
