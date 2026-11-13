import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Property, Agent, ViewingBooking, SavedSearch, UserProfile, FilterState, ListingType, RentalApplication, RentalApplicationStatus } from './types';
import { PROPERTIES } from './data/properties';
import { AGENTS } from './data/agents';
import { readStoredValue, sanitizeInternalRedirect, writeStoredValue } from './utils/auth';
import { LandingPage } from './components/LandingPage';
import { LoginPage } from './components/LoginPage';
import { InfoModal } from './components/InfoModal';
import { Header } from './components/Header';
import { PropertyCard } from './components/PropertyCard';
import { PropertyDetailModal } from './components/PropertyDetailModal';
import { BookingModal } from './components/BookingModal';
import { InteractiveMap } from './components/InteractiveMap';
import { FilterBar } from './components/FilterBar';
import { MortgageCalculator } from './components/MortgageCalculator';
import { CompareDrawer } from './components/CompareDrawer';
import { ListPropertyModal } from './components/ListPropertyModal';
import { UserDashboard } from './components/UserDashboard';
import { AgentsDirectory } from './components/AgentsDirectory';
import { AgentContactModal } from './components/AgentContactModal';
import { ManageRentalsView } from './components/ManageRentalsView';
import { RentalWorkflowDashboard } from './components/RentalWorkflowDashboard';
import { TenantDashboard } from './components/TenantDashboard';
import { AgentDashboard } from './components/AgentDashboard';
import { PropertyManagerDashboard } from './components/PropertyManagerDashboard';
import { TechnicianDashboard } from './components/TechnicianDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { SuperAdminDashboard } from './components/SuperAdminDashboard';
import { RentalApplicationModal } from './components/RentalApplicationModal';
import { Footer } from './components/Footer';
import { deleteWorkflowRows, hasSupabaseSession, insertWorkflowRow, invokeWorkflow, isSupabaseConfigured, loadCurrentSupabaseProfile, selectWorkflowRows, signOutSupabase } from './services/supabaseWorkflow';
import {
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Building2,
  Compass,
  CheckCircle2,
  Quote,
  Star,
  MapPin,
  Scale,
  PlusCircle,
  HelpCircle,
  Lock
} from 'lucide-react';

const isPropertyList = (value: unknown): value is Property[] =>
  Array.isArray(value) && value.every((item) => {
    if (!item || typeof item !== 'object') return false;
    const property = item as Property;
    return typeof property.id === 'string' && typeof property.title === 'string' &&
      typeof property.address === 'string' && typeof property.neighborhood === 'string' &&
      typeof property.city === 'string' && typeof property.price === 'number' &&
      typeof property.bedrooms === 'number' && typeof property.bathrooms === 'number' &&
      Array.isArray(property.images) && property.images.every((image) => typeof image === 'string') &&
      Array.isArray(property.amenities) && property.amenities.every((amenity) => typeof amenity === 'string');
  });

const isBookingList = (value: unknown): value is ViewingBooking[] =>
  Array.isArray(value) && value.every((item) => {
    if (!item || typeof item !== 'object') return false;
    const booking = item as ViewingBooking;
    return typeof booking.id === 'string' && typeof booking.propertyId === 'string' &&
      typeof booking.propertyTitle === 'string' && typeof booking.date === 'string' &&
      typeof booking.timeSlot === 'string' &&
      ['Pending', 'Confirmed', 'Completed', 'Rescheduled', 'Cancelled'].includes(booking.status);
  });

const isRentalApplicationList = (value: unknown): value is RentalApplication[] =>
  Array.isArray(value) && value.every((item) => {
    if (!item || typeof item !== 'object') return false;
    const application = item as RentalApplication;
    return typeof application.id === 'string' && typeof application.propertyId === 'string' &&
      typeof application.applicantId === 'string' && typeof application.applicantName === 'string' &&
      typeof application.applicantEmail === 'string' && typeof application.phone === 'string' &&
      typeof application.occupation === 'string' && typeof application.desiredMoveIn === 'string' &&
      ['Draft', 'Submitted', 'Under Review', 'Additional Information Required', 'Approved', 'Rejected', 'Withdrawn'].includes(application.status);
  });

// Remove the old browser-only demo records once. Keep auth/session state so
// registered accounts can continue to sign in after the sample reset.
function clearLegacyDemoRecords() {
  if (typeof window === 'undefined') return;
  const marker = 'aurelia_demo_records_cleared_v1';
  try {
    if (window.localStorage.getItem(marker) === 'true') return;
    [
      'aurelia_custom_properties',
      'aurelia_my_properties',
      'aurelia_favorites',
      'aurelia_bookings',
      'aurelia_rental_applications',
    ].forEach((key) => window.localStorage.removeItem(key));
    window.localStorage.setItem(marker, 'true');
  } catch {
    // Storage can be unavailable; the app can still load without local records.
  }
}

export default function App() {
  clearLegacyDemoRecords();
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return isSupabaseConfigured && hasSupabaseSession();
  });

  const [user, setUser] = useState<UserProfile | null>(() => {
    return null;
  });

  useEffect(() => {
    if (!isSupabaseConfigured || !hasSupabaseSession()) return;
    let cancelled = false;
    void loadCurrentSupabaseProfile().then((profile) => {
      if (!cancelled && profile) {
        setUser(profile);
        writeStoredValue('aurelia_auth_user', profile);
      }
    }).catch(() => {
      if (!cancelled) { setUser(null); setIsAuthenticated(false); writeStoredValue('aurelia_is_authenticated', false); void signOutSupabase(); }
    });
    return () => { cancelled = true; };
  }, []);

  // Current URL route state
  const [currentRoute, setCurrentRoute] = useState<string>(() => {
    const path = window.location.pathname;
    const search = window.location.search;
    return path ? path + search : '/';
  });

  // Info modal state
  const [infoModalType, setInfoModalType] = useState<'help' | 'privacy' | 'terms' | null>(null);

  // Property & Bookings State
  const [properties, setProperties] = useState<Property[]>(() => {
    const saved = readStoredValue<Property[]>('aurelia_custom_properties', [], isPropertyList);
    return [...saved, ...PROPERTIES];
  });
  const [rentalProperties, setRentalProperties] = useState<Property[]>([]);
  const [rentalListingsLoading, setRentalListingsLoading] = useState(false);
  const [rentalListingsError, setRentalListingsError] = useState('');

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let cancelled = false;
    setRentalListingsLoading(true);
    const query = new URLSearchParams({
      select: 'id,external_key,rent_amount_minor,rent_frequency,deposit_amount_minor,currency,status,properties!inner(id,title,address,neighborhood,city,country,description,image_urls,bedrooms,bathrooms,property_type,owner_id)',
      status: 'eq.published', order: 'created_at.desc',
    });
    void selectWorkflowRows<any>('rental_listings', query).then((rows) => {
      if (cancelled) return;
      const mapped: Property[] = rows.map((listing) => {
        const home = Array.isArray(listing.properties) ? listing.properties[0] : listing.properties;
        const amount = Number(listing.rent_amount_minor || 0) / 100;
        const currency = String(listing.currency || 'NGN');
        const propertyTypes: Property['propertyType'][] = ['Penthouse', 'Villa', 'Historic Estate', 'Waterfront', 'Luxury Apartment', 'Townhouse', 'Other'];
        const rawType = String(home.property_type || 'Other');
        return {
          id: String(listing.id), ownerId: home.owner_id, listingStatus: 'published', title: home.title || 'Rental property',
          tagline: '', type: 'rent', propertyType: propertyTypes.includes(rawType as Property['propertyType']) ? rawType as Property['propertyType'] : 'Other',
          price: amount, priceFormatted: `${new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount)} / ${String(listing.rent_frequency || 'monthly')}`,
          rentFrequency: listing.rent_frequency, depositAmountMinor: Number(listing.deposit_amount_minor || 0), currency,
          period: ['annually', 'yearly'].includes(String(listing.rent_frequency)) ? 'year' : 'month',
          address: home.address || '', neighborhood: home.neighborhood || '', city: home.city || '', country: home.country || '',
          bedrooms: Number(home.bedrooms ?? 0), bathrooms: Number(home.bathrooms ?? 0),
          sqft: 0, yearBuilt: 0, parkingSpaces: 0, verified: true, featured: false, inspectionDate: '', cadastralId: listing.external_key || listing.id,
          images: Array.isArray(home.image_urls) ? home.image_urls : [], description: home.description || '', architecturalHighlights: [], amenities: [],
          coordinates: { lat: 0, lng: 0, x: 50, y: 50 }, agentId: '', priceHistory: [],
          neighborhoodInsights: { walkScore: 0, transitScore: 0, safetyRating: 'Not available', topSchools: [], nearestTransit: 'Not available', popularDining: 'Not available' },
        };
      });
      setRentalProperties(mapped);
      setRentalListingsError('');
    }).catch((error) => { if (!cancelled) setRentalListingsError(error instanceof Error ? error.message : 'Could not load published rental listings.'); })
      .finally(() => { if (!cancelled) setRentalListingsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const [myProperties, setMyProperties] = useState<Property[]>(() => {
    return readStoredValue<Property[]>('aurelia_my_properties', [], isPropertyList);
  });

  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => {
    return readStoredValue<string[]>('aurelia_favorites', [], (value): value is string[] => Array.isArray(value) && value.every((item) => typeof item === 'string'));
  });

  useEffect(() => {
    if (!isSupabaseConfigured || !user || !['renter', 'tenant'].includes(user.role)) return;
    let cancelled = false;
    void selectWorkflowRows<{ listing_id: string }>('saved_rentals', new URLSearchParams({ select: 'listing_id', renter_id: `eq.${user.id}` }))
      .then((rows) => { if (!cancelled) setFavoriteIds(rows.map((row) => row.listing_id)); })
      .catch(() => { if (!cancelled) setFavoriteIds([]); });
    return () => { cancelled = true; };
  }, [user?.id, user?.role]);

  useEffect(() => {
    writeStoredValue('aurelia_favorites', favoriteIds);
  }, [favoriteIds]);

  const [bookings, setBookings] = useState<ViewingBooking[]>(() => {
    return readStoredValue<ViewingBooking[]>('aurelia_bookings', [], isBookingList);
  });

  const [rentalApplications, setRentalApplications] = useState<RentalApplication[]>(() =>
    readStoredValue<RentalApplication[]>('aurelia_rental_applications', [], isRentalApplicationList)
  );

  useEffect(() => {
    writeStoredValue('aurelia_rental_applications', rentalApplications);
  }, [rentalApplications]);

  useEffect(() => {
    const syncRentalApplications = (event: StorageEvent) => {
      if (event.key === 'aurelia_rental_applications') {
        setRentalApplications(readStoredValue<RentalApplication[]>('aurelia_rental_applications', [], isRentalApplicationList));
      }
    };
    window.addEventListener('storage', syncRentalApplications);
    return () => window.removeEventListener('storage', syncRentalApplications);
  }, []);

  useEffect(() => {
    writeStoredValue('aurelia_bookings', bookings);
  }, [bookings]);

  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([
    {
      id: 'search-1',
      name: 'Kensington & Chelsea Verified Estates',
      location: 'Kensington',
      type: 'buy',
      bedrooms: 4,
      alertsActive: true,
      frequency: 'daily',
      dateCreated: 'Oct 25, 2026',
    },
    {
      id: 'search-2',
      name: 'Tribeca Cast-Iron Lofts & Penthouses',
      location: 'Tribeca',
      type: 'buy',
      bedrooms: 3,
      alertsActive: true,
      frequency: 'instant',
      dateCreated: 'Oct 29, 2026',
    },
  ]);

  // View state inside catalog
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');
  const [comparedProperties, setComparedProperties] = useState<Property[]>([]);
  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [bookingProperty, setBookingProperty] = useState<Property | null>(null);
  const [contactAgent, setContactAgent] = useState<{ agent: Agent; property?: Property | null } | null>(null);
  const [listModalOpen, setListModalOpen] = useState(false);
  const [mortgageTargetProperty, setMortgageTargetProperty] = useState<Property | null>(null);

  // Search & Filter State
  const [filters, setFilters] = useState<FilterState>({
    searchQuery: '',
    type: 'all',
    location: '',
    propertyType: 'all',
    minPrice: 0,
    maxPrice: 0,
    minBeds: 0,
    minBaths: 0,
    verifiedOnly: false,
    virtualTourOnly: false,
    selectedAmenities: [],
    sortBy: 'featured',
  });

  // Protected route checking logic (Route Guard Middleware)
  const isProtectedRoute = (pathWithQuery: string): boolean => {
    const path = pathWithQuery.split('?')[0];
    const protectedPrefixes = [
      '/sell',
      '/manage-rentals',
      '/dashboard',
      '/renter-dashboard',
      '/apply-to-rent',
      '/demo-action',
    ];
    if (protectedPrefixes.some((p) => path === p || path.startsWith(p + '/'))) {
      return true;
    }
    return false;
  };

  // Safe navigation function with middleware authentication enforcement
  const navigateTo = useCallback(
    (target: string, replace = false) => {
      const sanitized = sanitizeInternalRedirect(target);

      // Check if target requires authentication
      if (isProtectedRoute(sanitized) && !isAuthenticated) {
        const loginUrl = `/login?next=${encodeURIComponent(sanitized)}`;
        if (replace) {
          window.history.replaceState({}, '', loginUrl);
        } else {
          window.history.pushState({}, '', loginUrl);
        }
        setCurrentRoute(loginUrl);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      // If user is authenticated and navigating to /login, redirect to /buy or dashboard
      if (sanitized.startsWith('/login') && isAuthenticated) {
        const urlParams = new URLSearchParams(sanitized.split('?')[1] || '');
        const nextParam = urlParams.get('next');
        const finalDest = nextParam ? sanitizeInternalRedirect(nextParam) : '/buy';
        navigateTo(finalDest, true);
        return;
      }

      // Perform navigation
      if (replace) {
        window.history.replaceState({}, '', sanitized);
      } else {
        window.history.pushState({}, '', sanitized);
      }
      setCurrentRoute(sanitized);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [isAuthenticated]
  );

  // Listen to popstate (browser back/forward button)
  useEffect(() => {
    const handlePopState = () => {
      const full = window.location.pathname + window.location.search;
      if (isProtectedRoute(full) && !isAuthenticated) {
        const loginUrl = `/login?next=${encodeURIComponent(full)}`;
        window.history.replaceState({}, '', loginUrl);
        setCurrentRoute(loginUrl);
      } else {
        setCurrentRoute(full || '/');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isAuthenticated]);

  // Initial Route Guard check on mount
  useEffect(() => {
    const full = window.location.pathname + window.location.search;
    if (isProtectedRoute(full) && !isAuthenticated) {
      const loginUrl = `/login?next=${encodeURIComponent(full)}`;
      window.history.replaceState({}, '', loginUrl);
      setCurrentRoute(loginUrl);
    }
  }, [isAuthenticated]);

  // Keep the search control's selected transaction type in sync with its route.
  useEffect(() => {
    if (currentRoute.startsWith('/search') || currentRoute.startsWith('/buy') || currentRoute.startsWith('/rent')) {
      const queryString = currentRoute.split('?')[1];
      const params = new URLSearchParams(queryString || '');
      const q = params.get('q');
      const typeParam = params.get('type');
      const listingType: ListingType | 'all' = typeParam === 'buy' || typeParam === 'rent'
        ? typeParam
        : currentRoute.startsWith('/rent')
        ? 'rent'
        : currentRoute.startsWith('/buy')
        ? 'buy'
        : 'all';

      setFilters((prev) => ({
        ...prev,
        searchQuery: q === null ? prev.searchQuery : q,
        location: q === null ? prev.location : q,
        type: listingType,
      }));
    }

    // Public property details are viewable without signing in.
    if (currentRoute.startsWith('/property/')) {
      const propId = currentRoute.split('/property/')[1]?.split('?')[0];
      if (propId) {
        const found = [...rentalProperties, ...properties].find((p) => p.id === propId);
        if (found) {
          setSelectedProperty(found);
        }
      }
    }
  }, [currentRoute, properties, rentalProperties]);

  useEffect(() => {
    if (!isAuthenticated || !currentRoute.startsWith('/demo-action/')) return;
    const [actionPath, queryString = ''] = currentRoute.split('?');
    const [, , action, propertyId] = actionPath.split('/');
    const property = [...rentalProperties, ...properties].find((item) => item.id === propertyId);
    if (property && action === 'favorite') {
      if (property.type === 'rent' && isSupabaseConfigured && user) {
        const query = new URLSearchParams({ select: 'listing_id', renter_id: `eq.${user.id}`, listing_id: `eq.${property.id}`, limit: '1' });
        void selectWorkflowRows<{ listing_id: string }>('saved_rentals', query).then(async (rows) => {
          if (!rows.length) await insertWorkflowRow('saved_rentals', { renter_id: user.id, listing_id: property.id });
          setFavoriteIds((previous) => previous.includes(property.id) ? previous : [...previous, property.id]);
        }).catch((error) => alert(error instanceof Error ? error.message : 'Could not save this rental'));
      } else setFavoriteIds((previous) => previous.includes(property.id) ? previous : [...previous, property.id]);
    }
    if (property && action === 'viewing') setBookingProperty(property);
    const returnTo = new URLSearchParams(queryString).get('return');
    navigateTo(sanitizeInternalRedirect(returnTo), true);
  }, [currentRoute, isAuthenticated, properties, rentalProperties, user?.id, navigateTo]);

  // Authentication Handlers
  const handleLoginSuccess = (authenticatedUser: UserProfile, destination: string) => {
    setIsAuthenticated(true);
    setUser(authenticatedUser);
    writeStoredValue('aurelia_is_authenticated', true);
    writeStoredValue('aurelia_auth_user', authenticatedUser);

    // Redirect to preserved intended destination
    const safeTarget = sanitizeInternalRedirect(destination);
    navigateTo(safeTarget, true);
  };

  const handleSignOut = () => {
    void signOutSupabase();
    setIsAuthenticated(false);
    setUser(null);
    try {
      window.localStorage.removeItem('aurelia_is_authenticated');
      window.localStorage.removeItem('aurelia_auth_user');
    } catch { /* Storage may be unavailable. */ }
    navigateTo('/', true);
  };

  // Property Filters Logic
  const filteredProperties = useMemo(() => {
    const isRentCatalog = currentRoute.startsWith('/rent');
    const isBuyCatalog = currentRoute.startsWith('/buy');
    const catalog = isRentCatalog ? rentalProperties : properties;

    return catalog.filter((prop) => {
      if (prop.listingStatus && prop.listingStatus !== 'published') return false;
      if (isRentCatalog && prop.type !== 'rent') return false;
      if (isBuyCatalog && prop.type !== 'buy') return false;
      if (filters.type !== 'all' && prop.type !== filters.type) return false;

      if (filters.searchQuery.trim()) {
        const q = filters.searchQuery.toLowerCase();
        const matchesQuery =
          prop.title.toLowerCase().includes(q) ||
          prop.address.toLowerCase().includes(q) ||
          prop.neighborhood.toLowerCase().includes(q) ||
          prop.city.toLowerCase().includes(q) ||
          prop.amenities.some((a) => a.toLowerCase().includes(q));
        if (!matchesQuery) return false;
      }

      if (filters.location.trim()) {
        const loc = filters.location.toLowerCase();
        const matchesLoc =
          prop.neighborhood.toLowerCase().includes(loc) ||
          prop.city.toLowerCase().includes(loc) ||
          prop.address.toLowerCase().includes(loc);
        if (!matchesLoc) return false;
      }

      if (filters.propertyType !== 'all' && prop.propertyType !== filters.propertyType) {
        return false;
      }

      if (filters.maxPrice > 0 && prop.price > filters.maxPrice) return false;
      if (filters.minPrice > 0 && prop.price < filters.minPrice) return false;
      if (filters.minBeds > 0 && prop.bedrooms < filters.minBeds) return false;
      if (filters.minBaths > 0 && prop.bathrooms < filters.minBaths) return false;
      if (filters.verifiedOnly && !prop.verified) return false;
      if (filters.virtualTourOnly && !prop.hasVirtualTour) return false;

      if (filters.selectedAmenities.length > 0) {
        const hasAll = filters.selectedAmenities.every((amenity) => prop.amenities.includes(amenity));
        if (!hasAll) return false;
      }

      return true;
    }).sort((a, b) => {
      if (filters.sortBy === 'price-asc') return a.price - b.price;
      if (filters.sortBy === 'price-desc') return b.price - a.price;
      if (filters.sortBy === 'sqft-desc') return b.sqft - a.sqft;
      if (filters.sortBy === 'newest') return b.yearBuilt - a.yearBuilt;
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
      return 0;
    });
  }, [properties, rentalProperties, currentRoute, filters]);

  // Card interaction handlers
  const handleToggleFavorite = (id: string) => {
    if (!isAuthenticated) {
      const action = `/demo-action/favorite/${id}?return=${encodeURIComponent(currentRoute)}`;
      navigateTo(`/login?next=${encodeURIComponent(action)}`);
      return;
    }
    if (currentRoute.startsWith('/rent')) {
      void (favoriteIds.includes(id)
        ? deleteWorkflowRows('saved_rentals', new URLSearchParams({ renter_id: `eq.${user!.id}`, listing_id: `eq.${id}` }))
        : insertWorkflowRow('saved_rentals', { renter_id: user!.id, listing_id: id }))
        .then(() => {
        setFavoriteIds((previous) => previous.includes(id) ? previous.filter((item) => item !== id) : [...previous, id]);
        }).catch((error) => alert(error instanceof Error ? error.message : 'Could not save this rental'));
      return;
    }
    setFavoriteIds((prev) => prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]);
  };

  const handleToggleCompare = (property: Property) => {
    if (!isAuthenticated) {
      navigateTo(`/login?next=${encodeURIComponent(currentRoute)}`);
      return;
    }
    setComparedProperties((prev) => {
      const exists = prev.find((p) => p.id === property.id);
      if (exists) return prev.filter((p) => p.id !== property.id);
      if (prev.length >= 3) {
        alert('You can compare a maximum of 3 properties side by side.');
        return prev;
      }
      return [...prev, property];
    });
  };

  const handleSelectProperty = (property: Property) => {
    setSelectedProperty(property);
    navigateTo(`/property/${property.id}`);
  };

  const handleApplyToRent = (property: Property) => {
    setSelectedProperty(null);
    const applicationRoute = `/apply-to-rent/${property.id}`;
    if (!isAuthenticated) {
      navigateTo(`/login?next=${encodeURIComponent(applicationRoute)}`);
      return;
    }
    navigateTo(applicationRoute);
  };

  const handleSubmitRentalApplication = async (application: RentalApplication) => {
    if (isSupabaseConfigured) {
      await invokeWorkflow('submit-rental-application', {
        listingId: application.propertyId,
        desiredMoveIn: application.desiredMoveIn,
        occupation: application.occupation,
        phone: application.phone,
        message: application.message,
      });
      navigateTo('/renter-dashboard');
      return;
    }
    throw new Error('Rental applications are unavailable until the shared Supabase database is connected.');
  };

  const handleUpdateRentalApplication = (applicationId: string, status: RentalApplicationStatus) => {
    setRentalApplications((previous) => previous.map((application) => application.id === applicationId
      ? { ...application, status, updatedAt: new Date().toISOString() }
      : application));
  };

  const handleQuickBook = (property: Property) => {
    if (!isAuthenticated) {
      const action = `/demo-action/viewing/${property.id}?return=${encodeURIComponent(currentRoute)}`;
      navigateTo(`/login?next=${encodeURIComponent(action)}`);
      return;
    }
    setBookingProperty(property);
  };

  const handleConfirmBooking = (newBooking: ViewingBooking) => {
    setBookings((prev) => [newBooking, ...prev]);
  };

  const handleUpdateViewing = (bookingId: string, status: ViewingBooking['status']) => {
    setBookings((previous) => previous.map((booking) => booking.id === bookingId ? { ...booking, status } : booking));
  };

  const handleAddProperty = (newProperty: Property) => {
    const ownedProperty: Property = { ...newProperty, ownerId: user?.id, listingStatus: 'draft' };
    setProperties((previous) => {
      const updated = [ownedProperty, ...previous];
      writeStoredValue('aurelia_custom_properties', updated.filter((property) => property.ownerId));
      return updated;
    });
    setMyProperties((previous) => [ownedProperty, ...previous]);
  };

  const handleSubmitListingForReview = (propertyId: string) => {
    setProperties((previous) => {
      const updated = previous.map((property) => property.id === propertyId
        ? { ...property, listingStatus: 'pending_review' as const }
        : property);
      writeStoredValue('aurelia_custom_properties', updated.filter((property) => property.ownerId));
      return updated;
    });
  };

  const savedPropertiesList = useMemo(() => {
    return properties.filter((p) => favoriteIds.includes(p.id));
  }, [properties, favoriteIds]);

  const getAgentForProperty = (agentId: string) => AGENTS.find((a) => a.id === agentId);

  // Route extraction
  const routePath = currentRoute.split('?')[0];
  const isLoginPage = routePath === '/login';
  const isLandingPage = routePath === '/' || routePath === '';

  // Extract next parameter for login page
  const nextParam = useMemo(() => {
    if (isLoginPage) {
      const params = new URLSearchParams(currentRoute.split('?')[1] || '');
      return params.get('next') || '/buy';
    }
    return '/buy';
  }, [isLoginPage, currentRoute]);

  // If user is at /sell and authenticated, trigger listing modal or page
  useEffect(() => {
    if (routePath === '/sell' && isAuthenticated) {
      setListModalOpen(true);
    }
  }, [routePath, isAuthenticated]);

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F5F0] text-[#263445]">
      {/* ROUTE VIEW 1: PUBLIC LANDING PAGE AT "/" */}
      {isLandingPage && (
        <LandingPage
          properties={[...properties.filter((property) => property.type !== 'rent'), ...rentalProperties]}
          agents={AGENTS}
          isAuthenticated={isAuthenticated}
          user={user}
          onNavigateToProtected={(dest) => navigateTo(dest)}
          onOpenSignIn={() => navigateTo('/login?next=/dashboard')}
          onSignOut={handleSignOut}
          onOpenHelp={() => setInfoModalType('help')}
          onOpenPrivacy={() => setInfoModalType('privacy')}
          onOpenTerms={() => setInfoModalType('terms')}
        />
      )}

      {/* ROUTE VIEW 2: SIGN IN & REGISTRATION PAGE AT "/login" */}
      {isLoginPage && (
        <LoginPage
          nextDestination={nextParam}
          onLoginSuccess={handleLoginSuccess}
          onCancel={() => navigateTo('/')}
        />
      )}

      {/* ROUTE VIEW 3: PROTECTED APP APPLICATION ROUTES */}
      {!isLandingPage && !isLoginPage && (
        <>
          {/* Top Header inside Protected App */}
          <Header
            currentTab={routePath}
            onNavigate={(tab) => navigateTo(tab)}
            favoritesCount={favoriteIds.length}
            bookingsCount={bookings.length}
            user={user || { id: 'guest', name: 'Member', email: '', role: 'buyer', avatarInitials: 'M' }}
            isAuthenticated={isAuthenticated}
            onSignOut={handleSignOut}
            onOpenListProperty={() => {
              if (!isAuthenticated) {
                navigateTo('/login?next=/sell');
                return;
              }
              setListModalOpen(true);
            }}
          />

          {/* Floating Comparison Tray */}
          {comparedProperties.length > 0 && (
            <aside
              aria-label="Comparison Tray"
              className="fixed bottom-6 right-6 z-40 bg-[#142D4E] text-white rounded-2xl p-4 shadow-2xl border border-[#C5A46D]/40 flex items-center gap-4 animate-in slide-in-from-bottom-5"
            >
              <div className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-[#C5A46D]" />
                <span className="text-xs font-semibold">
                  Comparing {comparedProperties.length}/3 Residences
                </span>
              </div>
              <button
                onClick={() => setCompareModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-[#C5A46D] text-[#142D4E] font-bold text-xs hover:bg-[#B8975A] transition-colors"
              >
                Open Side-by-Side
              </button>
              <button
                onClick={() => setComparedProperties([])}
                className="text-xs text-slate-400 hover:text-white"
              >
                Clear
              </button>
            </aside>
          )}

          {/* Protected Main Router Content */}
          <main className="flex-1">
            {/* PROTECTED ROUTE: /buy OR /rent OR /search */}
            {(routePath === '/buy' || routePath === '/rent' || routePath === '/search' || routePath === '/sell') && (
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                  <div>
                    <span className="text-xs uppercase tracking-wider text-[#9C7C3E] font-bold">
                      {routePath === '/rent' ? 'Available Rentals' : routePath === '/buy' ? 'Homes for Sale' : 'Property Search'}
                    </span>
                    <h1 className="font-heading text-3xl sm:text-4xl font-bold text-[#142D4E] mt-1">
                      {routePath === '/rent'
                        ? 'Find a place to rent'
                        : routePath === '/buy' ? 'Find a place to buy' : 'Search homes and rentals'}
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-600 mt-1">
                      {routePath === '/rent' ? 'Published rental homes from Aurelia Homes.' : 'Browse properties and refine your search.'}
                    </p>
                  </div>

                  {comparedProperties.length > 0 && (
                    <button
                      onClick={() => setCompareModalOpen(true)}
                      className="px-4 py-2 rounded-xl bg-[#142D4E] text-white text-xs font-semibold hover:bg-[#0D1E35] flex items-center gap-1.5"
                    >
                      <Scale className="w-4 h-4 text-[#C5A46D]" />
                      <span>Compare Selected ({comparedProperties.length})</span>
                    </button>
                  )}
                </div>

                {/* Filter Console */}
                <FilterBar
                  filters={filters}
                  onChangeFilters={setFilters}
                  onNavigateType={(type) => {
                    setFilters((previous) => ({ ...previous, type }));
                    navigateTo(type === 'all' ? '/search' : `/${type}`);
                  }}
                  viewMode={viewMode}
                  onChangeViewMode={setViewMode}
                  totalResults={filteredProperties.length}
                />

                {/* Grid or Map View */}
                {viewMode === 'map' ? (
                  <InteractiveMap
                    properties={filteredProperties}
                    selectedProperty={selectedProperty}
                    onSelectProperty={(property) => setSelectedProperty(property)}
                    onBookViewing={(property) => setBookingProperty(property)}
                  />
                ) : (
                  <div>
                    {filteredProperties.length === 0 ? (
                      <div className="bg-white rounded-3xl p-12 text-center border border-[#E4DFD3] space-y-4">
                        <Compass className="w-12 h-12 text-slate-300 mx-auto" />
                        <h2 className="font-heading text-xl font-bold text-[#142D4E]">
                          {routePath === '/rent' && rentalListingsLoading ? 'Loading available rentals' : routePath === '/rent' && rentalListingsError ? 'Rentals could not be loaded' : routePath === '/rent' && !isSupabaseConfigured ? 'Rental database not connected' : 'No Matching Residences Found'}
                        </h2>
                        <p className="text-xs text-slate-500 max-w-sm mx-auto">
                          {routePath === '/rent' && rentalListingsError ? rentalListingsError : routePath === '/rent' && !isSupabaseConfigured ? 'Connect Supabase to view published rentals and submit applications.' : routePath === '/rent' && rentalListingsLoading ? 'Checking published rental listings…' : 'Try searching for a different neighborhood or clearing your filter criteria.'}
                        </p>
                        <button
                          onClick={() =>
                            setFilters({
                              searchQuery: '',
                              type: 'all',
                              location: '',
                              propertyType: 'all',
                              minPrice: 0,
                              maxPrice: 0,
                              minBeds: 0,
                              minBaths: 0,
                              verifiedOnly: false,
                              virtualTourOnly: false,
                              selectedAmenities: [],
                              sortBy: 'featured',
                            })
                          }
                          className="px-5 py-2 rounded-xl bg-[#142D4E] text-white text-xs font-semibold"
                        >
                          Reset Filters
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {filteredProperties.map((prop) => (
                          <PropertyCard
                            key={prop.id}
                            property={prop}
                            isFavorite={favoriteIds.includes(prop.id)}
                            isCompared={comparedProperties.some((p) => p.id === prop.id)}
                            onToggleFavorite={handleToggleFavorite}
                            onToggleCompare={handleToggleCompare}
                            onSelect={handleSelectProperty}
                            onQuickBook={handleQuickBook}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* PROTECTED ROUTE: /mortgage OR /tools */}
            {(routePath === '/mortgage' || routePath === '/tools') && (
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
                <div className="text-center max-w-2xl mx-auto space-y-2">
                  <span className="text-xs uppercase tracking-wider text-[#9C7C3E] font-bold">
                    Financial Planning
                  </span>
                  <h1 className="font-heading text-3xl sm:text-4xl font-bold text-[#142D4E]">
                    Mortgage Amortization & Property Valuation
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-600">
                    Calculate monthly commitments, loan terms, and equity yields before booking private inspections.
                  </p>
                </div>

                <MortgageCalculator
                  initialProperty={mortgageTargetProperty || properties[0]}
                  onConsultAdvisor={() => navigateTo('/agents')}
                />
              </div>
            )}

            {/* PROTECTED ROUTE: /agents */}
            {routePath === '/agents' && (
              <AgentsDirectory
                agents={AGENTS}
                onContactAgent={(agent) => setContactAgent({ agent })}
                onFilterByAdvisorProperties={(agentId) => {
                  const matched = properties.find((p) => p.agentId === agentId);
                  if (matched) {
                    setFilters((prev) => ({ ...prev, location: matched.neighborhood, type: 'all' }));
                    navigateTo('/buy');
                  } else {
                    navigateTo('/buy');
                  }
                }}
              />
            )}

            {/* PROTECTED ROUTE: /manage-rentals */}
            {isSupabaseConfigured && routePath === '/manage-rentals' && user?.role === 'owner' && <RentalWorkflowDashboard user={user} role="landlord" />}

            {!isSupabaseConfigured && routePath === '/manage-rentals' && user?.role === 'owner' && (
              <ManageRentalsView
                user={user || { id: 'guest', name: 'Member', email: '', role: 'owner', avatarInitials: 'M' }}
                properties={properties.filter((property) => property.ownerId === user?.id || (!property.ownerId && property.type === 'rent' && property.verified))}
                applications={rentalApplications.filter((application) => properties.some((property) => property.id === application.propertyId && (property.ownerId === user?.id || (!property.ownerId && property.type === 'rent' && property.verified))))}
                bookings={bookings.filter((booking) => properties.some((property) => property.id === booking.propertyId && property.type === 'rent' && (property.ownerId === user?.id || (!property.ownerId && property.verified))))}
                onUpdateApplication={handleUpdateRentalApplication}
                onUpdateViewing={handleUpdateViewing}
                onSubmitListingForReview={handleSubmitListingForReview}
                onOpenListProperty={() => setListModalOpen(true)}
                onSelectProperty={handleSelectProperty}
              />
            )}

            {/* PROTECTED ROUTE: /dashboard */}
            {routePath === '/dashboard' && user?.role === 'buyer' && (
              <UserDashboard
                user={user || { id: 'guest', name: 'Member', email: '', role: 'buyer', avatarInitials: 'M' }}
                savedProperties={savedPropertiesList}
                bookings={bookings}
                savedSearches={savedSearches}
                myProperties={myProperties}
                onSelectProperty={handleSelectProperty}
                onRemoveFavorite={handleToggleFavorite}
                onCancelBooking={(id) => setBookings((prev) => prev.filter((b) => b.id !== id))}
                onToggleAlert={(id) =>
                  setSavedSearches((prev) =>
                    prev.map((s) => (s.id === id ? { ...s, alertsActive: !s.alertsActive } : s))
                  )
                }
                onOpenListProperty={() => setListModalOpen(true)}
                onBrowseHomes={() => navigateTo('/buy')}
              />
            )}

            {isSupabaseConfigured && routePath === '/dashboard' && user?.role === 'owner' && <RentalWorkflowDashboard user={user} role="landlord" />}

            {!isSupabaseConfigured && routePath === '/dashboard' && user?.role === 'owner' && (
              <ManageRentalsView
                user={user}
                properties={properties.filter((property) => property.ownerId === user.id || (!property.ownerId && property.type === 'rent' && property.verified))}
                applications={rentalApplications.filter((application) => properties.some((property) => property.id === application.propertyId && (property.ownerId === user.id || (!property.ownerId && property.type === 'rent' && property.verified))))}
                bookings={bookings.filter((booking) => properties.some((property) => property.id === booking.propertyId && property.type === 'rent' && (property.ownerId === user.id || (!property.ownerId && property.verified))))}
                onUpdateApplication={handleUpdateRentalApplication}
                onUpdateViewing={handleUpdateViewing}
                onSubmitListingForReview={handleSubmitListingForReview}
                onOpenListProperty={() => setListModalOpen(true)}
                onSelectProperty={handleSelectProperty}
              />
            )}

            {isSupabaseConfigured && (routePath === '/dashboard' || routePath === '/renter-dashboard') && user && ['renter', 'tenant'].includes(user.role) && <TenantDashboard user={user} onSignOut={handleSignOut} onBrowseRentals={() => navigateTo('/rent')} />}

            {!isSupabaseConfigured && (routePath === '/dashboard' || routePath === '/renter-dashboard') && user && ['renter', 'tenant'].includes(user.role) && <TenantDashboard user={user} onSignOut={handleSignOut} onBrowseRentals={() => navigateTo('/rent')} />}

            {routePath === '/dashboard' && user?.role === 'agent' && <AgentDashboard user={user} onSignOut={handleSignOut} />}

            {routePath === '/dashboard' && user?.role === 'property_manager' && <PropertyManagerDashboard user={user} onSignOut={handleSignOut} />}

            {routePath === '/dashboard' && user?.role === 'contractor' && <TechnicianDashboard user={user} onSignOut={handleSignOut} />}

            {routePath === '/dashboard' && user?.role === 'admin' && <AdminDashboard user={user} onSignOut={handleSignOut} />}

            {routePath === '/dashboard' && user?.role === 'super_admin' && (
              <SuperAdminDashboard user={user} onSignOut={handleSignOut} />
            )}

            {(routePath === '/manage-rentals' && user?.role !== 'owner') && (
              <div className="max-w-2xl mx-auto py-16 px-4 text-center"><h1 className="font-heading text-2xl font-bold text-[#142D4E]">This workspace is for property owners</h1><p className="text-sm text-slate-500 mt-2">Use the dashboard for your account role.</p><button onClick={() => navigateTo('/dashboard')} className="mt-5 rounded-xl bg-[#142D4E] px-5 py-3 text-sm font-bold text-white">Open my dashboard</button></div>
            )}

            {routePath.startsWith('/apply-to-rent/') && (() => {
              const propertyId = routePath.split('/apply-to-rent/')[1];
              const property = rentalProperties.find((item) => item.id === propertyId);
              if (!property) return <div className="max-w-3xl mx-auto p-10 text-center"><h1 className="font-heading text-2xl font-bold text-[#142D4E]">Rental listing unavailable</h1><button onClick={() => navigateTo('/rent')} className="mt-4 rounded-xl bg-[#142D4E] px-5 py-3 text-sm font-bold text-white">Browse rentals</button></div>;
              const existingApplication = rentalApplications.find((item) => item.propertyId === property.id && item.applicantId === user?.id && !['Rejected', 'Withdrawn'].includes(item.status));
              return <RentalApplicationModal
                property={property}
                user={user || { id: 'guest', name: 'Renter', email: '', role: 'renter', avatarInitials: 'R' }}
                existingApplication={existingApplication}
                onSubmit={handleSubmitRentalApplication}
                onCancel={() => navigateTo('/rent')}
              />;
            })()}
          </main>

          {/* Footer in Protected App */}
          <Footer
            onNavigate={(tab) => navigateTo(tab)}
            onOpenListProperty={() => {
              if (!isAuthenticated) {
                navigateTo('/login?next=/sell');
                return;
              }
              setListModalOpen(true);
            }}
          />
        </>
      )}

      {/* PUBLIC INFORMATIONAL MODAL */}
      {infoModalType && (
        <InfoModal type={infoModalType} onClose={() => setInfoModalType(null)} />
      )}

      {/* DETAIL MODAL */}
      {selectedProperty && (
        <PropertyDetailModal
          property={selectedProperty}
          agent={getAgentForProperty(selectedProperty.agentId)}
          isFavorite={favoriteIds.includes(selectedProperty.id)}
          onToggleFavorite={handleToggleFavorite}
          onBookViewing={(prop) => {
            setSelectedProperty(null);
            handleQuickBook(prop);
          }}
          onApplyToRent={handleApplyToRent}
          onContactAgent={(prop, agent) => {
            if (agent) setContactAgent({ agent, property: prop });
          }}
          onOpenMortgageCalculator={(prop) => {
            setMortgageTargetProperty(prop);
            setSelectedProperty(null);
            navigateTo('/mortgage');
          }}
          onClose={() => {
            setSelectedProperty(null);
            if (currentRoute.startsWith('/property/')) {
              navigateTo('/buy', true);
            }
          }}
        />
      )}

      {/* BOOKING MODAL */}
      {bookingProperty && (
        <BookingModal
          property={bookingProperty}
          user={user || { id: 'guest', name: 'Member', email: 'member@aureliahomes.com', role: 'buyer', avatarInitials: 'M' }}
          onConfirmBooking={handleConfirmBooking}
          onGoToDashboard={() => {
            setBookingProperty(null);
            navigateTo('/dashboard');
          }}
          onClose={() => setBookingProperty(null)}
        />
      )}

      {/* COMPARE DRAWER */}
      {compareModalOpen && (
        <CompareDrawer
          properties={comparedProperties}
          onRemove={(id) => setComparedProperties((prev) => prev.filter((p) => p.id !== id))}
          onClear={() => {
            setComparedProperties([]);
            setCompareModalOpen(false);
          }}
          onSelectProperty={(prop) => {
            setCompareModalOpen(false);
            handleSelectProperty(prop);
          }}
          onBookViewing={(prop) => {
            setCompareModalOpen(false);
            handleQuickBook(prop);
          }}
          onClose={() => setCompareModalOpen(false)}
        />
      )}

      {/* AGENT INQUIRY MODAL */}
      {contactAgent && (
        <AgentContactModal
          agent={contactAgent.agent}
          property={contactAgent.property}
          onClose={() => setContactAgent(null)}
        />
      )}

      {/* LIST PROPERTY WIZARD MODAL */}
      {listModalOpen && (
        <ListPropertyModal
          onAddProperty={handleAddProperty}
          onClose={() => {
            setListModalOpen(false);
            if (routePath === '/sell') {
              navigateTo('/buy', true);
            }
          }}
        />
      )}
    </div>
  );
}
