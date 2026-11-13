export type ListingType = 'buy' | 'rent';

export interface Property {
  id: string;
  ownerId?: string;
  listingStatus?: 'draft' | 'pending_review' | 'published' | 'rejected';
  title: string;
  tagline: string;
  type: ListingType;
  propertyType: 'Penthouse' | 'Villa' | 'Historic Estate' | 'Waterfront' | 'Luxury Apartment' | 'Townhouse' | 'Other';
  price: number; // In USD
  priceFormatted: string;
  period?: 'month' | 'year';
  rentFrequency?: 'weekly' | 'monthly' | 'quarterly' | 'annually';
  depositAmountMinor?: number;
  currency?: string;
  address: string;
  neighborhood: string;
  city: string;
  country: string;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  yearBuilt: number;
  parkingSpaces: number;
  verified: boolean;
  featured: boolean;
  inspectionDate: string;
  cadastralId: string;
  images: string[];
  description: string;
  architecturalHighlights: string[];
  amenities: string[];
  coordinates: {
    lat: number;
    lng: number;
    x: number; // SVG map percentage coordinate (0-100)
    y: number; // SVG map percentage coordinate (0-100)
  };
  agentId: string;
  priceHistory: {
    year: number;
    event: string;
    price: number;
    priceFormatted: string;
  }[];
  neighborhoodInsights: {
    walkScore: number;
    transitScore: number;
    safetyRating: string;
    topSchools: string[];
    nearestTransit: string;
    popularDining: string;
  };
  hoaFeeMonthly?: number;
  propertyTaxAnnual?: number;
  hasVirtualTour?: boolean;
}

export interface Agent {
  id: string;
  name: string;
  role: string;
  licenseNumber: string;
  verified: boolean;
  phone: string;
  email: string;
  avatar: string;
  specialty: string;
  experienceYears: number;
  salesVolume: string;
  activeListingsCount: number;
  rating: number;
  reviewsCount: number;
  languages: string[];
  bio: string;
}

export interface ViewingBooking {
  id: string;
  propertyId: string;
  propertyTitle: string;
  propertyAddress: string;
  propertyPrice: string;
  propertyImage: string;
  viewingType: 'in-person' | 'virtual-360';
  date: string;
  timeSlot: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  notes?: string;
  agentName: string;
  status: 'Pending' | 'Confirmed' | 'Completed' | 'Rescheduled' | 'Cancelled';
  createdAt: string;
}

export type RentalApplicationStatus = 'Draft' | 'Submitted' | 'Under Review' | 'Additional Information Required' | 'Approved' | 'Rejected' | 'Withdrawn';

export interface RentalApplication {
  id: string;
  propertyId: string;
  applicantId: string;
  applicantName: string;
  applicantEmail: string;
  phone: string;
  occupation: string;
  desiredMoveIn: string;
  message: string;
  status: RentalApplicationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface SavedSearch {
  id: string;
  name: string;
  location: string;
  type: ListingType;
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  alertsActive: boolean;
  frequency: 'instant' | 'daily' | 'weekly';
  dateCreated: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'buyer' | 'renter' | 'tenant' | 'agent' | 'owner' | 'property_manager' | 'contractor' | 'admin' | 'super_admin';
  avatarInitials: string;
}

export interface FilterState {
  searchQuery: string;
  type: ListingType | 'all';
  location: string;
  propertyType: string;
  minPrice: number;
  maxPrice: number;
  minBeds: number;
  minBaths: number;
  verifiedOnly: boolean;
  virtualTourOnly: boolean;
  selectedAmenities: string[];
  sortBy: 'featured' | 'price-asc' | 'price-desc' | 'sqft-desc' | 'newest';
}
