import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import LandingNav from "@/components/landing/LandingNav";
import LandingFooter from "@/components/landing/LandingFooter";
import { ScrollToTop } from "@/components/ui/scroll-to-top";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Search,
  Filter,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { LabCard } from "@/components/labs/LabCard";

interface Lab {
  id: string;
  name: string;
  description: string | null;
  contact_email: string;
  contact_phone: string | null;
  address: string | null;
  is_active: boolean;
  max_capacity: number;
  current_load: number;
  standard_sla_days: number;
  urgent_sla_days: number;
  pricing_tier: 'budget' | 'standard' | 'premium';
  performance_score: number;
  logo_url: string | null;
  website_url: string | null;
}

interface LabSpecialization {
  restoration_type: string;
  expertise_level: 'basic' | 'intermediate' | 'expert';
  turnaround_days: number;
  is_preferred: boolean;
}

const ITEMS_PER_PAGE = 9;

const Labs = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Get state from URL or defaults
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [selectedPricingTier, setSelectedPricingTier] = useState<'budget' | 'standard' | 'premium' | null>(
    searchParams.get('pricing') as any || null
  );
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>(
    searchParams.get('specialty') || 'all'
  );
  const [sortBy, setSortBy] = useState<'name' | 'rating' | 'turnaround'>(
    (searchParams.get('sort') as any) || 'rating'
  );
  const [currentPage, setCurrentPage] = useState(
    parseInt(searchParams.get('page') || '1', 10)
  );
  const [minRating, setMinRating] = useState(
    parseFloat(searchParams.get('minRating') || '0')
  );
  const [maxTurnaround, setMaxTurnaround] = useState(
    parseInt(searchParams.get('maxTurnaround') || '999')
  );
  const [availableOnly, setAvailableOnly] = useState(
    searchParams.get('available') === 'true'
  );
  
  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('search', searchQuery);
    if (selectedPricingTier) params.set('pricing', selectedPricingTier);
    if (selectedSpecialty !== 'all') params.set('specialty', selectedSpecialty);
    if (sortBy !== 'rating') params.set('sort', sortBy);
    if (currentPage > 1) params.set('page', currentPage.toString());
    if (minRating > 0) params.set('minRating', minRating.toString());
    if (maxTurnaround < 999) params.set('maxTurnaround', maxTurnaround.toString());
    if (availableOnly) params.set('available', 'true');
    
    setSearchParams(params, { replace: true });
  }, [searchQuery, selectedPricingTier, selectedSpecialty, sortBy, currentPage, minRating, maxTurnaround, availableOnly, setSearchParams]);

  // Fetch all active labs
  const { data: allLabs, isLoading } = useQuery({
    queryKey: ["labs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("labs")
        .select("*")
        .eq("is_active", true);

      if (error) throw error;
      return data as Lab[];
    },
  });

  // Fetch user roles to check which labs have completed profiles
  const { data: labUserRoles } = useQuery({
    queryKey: ["lab-user-roles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("lab_id, user_id, profiles!inner(onboarding_completed)")
        .eq("role", "lab_staff")
        .not("lab_id", "is", null);
      
      if (error) throw error;
      return data;
    },
  });

  // Set up realtime subscription for labs
  const queryClient = useQueryClient();
  useEffect(() => {
    const channel = supabase
      .channel('labs-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'labs'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["labs"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Fetch specializations for all labs
  const { data: specializations } = useQuery({
    queryKey: ["lab-specializations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lab_specializations")
        .select("*");
      if (error) throw error;
      return data as (LabSpecialization & { lab_id: string })[];
    },
  });

  // Check if a lab has completed profile
  const hasCompletedProfile = (labId: string) => {
    const labUsers = labUserRoles?.filter(role => role.lab_id === labId);
    if (!labUsers || labUsers.length === 0) return false;
    return labUsers.some(user => (user.profiles as any)?.onboarding_completed === true);
  };

  const getLabSpecializations = (labId: string) => {
    return specializations?.filter(s => s.lab_id === labId) || [];
  };
  
  // Get unique specialties for filter
  const availableSpecialties = useMemo(() => {
    if (!specializations) return [];
    const unique = new Set(specializations.map(s => s.restoration_type));
    return Array.from(unique).sort();
  }, [specializations]);
  
  // Separate labs into verified and unverified
  const { verifiedLabs, unverifiedLabs } = useMemo(() => {
    if (!allLabs) return { verifiedLabs: [], unverifiedLabs: [] };
    
    let filtered = [...allLabs];
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(lab => 
        lab.name.toLowerCase().includes(query) ||
        lab.description?.toLowerCase().includes(query) ||
        lab.contact_email.toLowerCase().includes(query) ||
        lab.address?.toLowerCase().includes(query)
      );
    }
    
    // Apply pricing tier filter
    if (selectedPricingTier) {
      filtered = filtered.filter(lab => lab.pricing_tier === selectedPricingTier);
    }
    
    // Apply specialty filter
    if (selectedSpecialty !== 'all') {
      filtered = filtered.filter(lab => {
        const labSpecs = getLabSpecializations(lab.id);
        return labSpecs.some(s => s.restoration_type === selectedSpecialty);
      });
    }

    // Apply rating filter
    if (minRating > 0) {
      filtered = filtered.filter(lab => (lab.performance_score || 0) >= minRating);
    }

    // Apply turnaround filter
    if (maxTurnaround < 999) {
      filtered = filtered.filter(lab => lab.standard_sla_days <= maxTurnaround);
    }

    // Apply capacity filter
    if (availableOnly) {
      filtered = filtered.filter(lab => lab.current_load < lab.max_capacity);
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'rating':
          return (b.performance_score || 0) - (a.performance_score || 0);
        case 'turnaround':
          return a.standard_sla_days - b.standard_sla_days;
        default:
          return 0;
      }
    });
    
    // Separate verified and unverified
    const verified = filtered.filter(lab => hasCompletedProfile(lab.id));
    const unverified = filtered.filter(lab => !hasCompletedProfile(lab.id));
    
    return { verifiedLabs: verified, unverifiedLabs: unverified };
  }, [allLabs, searchQuery, selectedPricingTier, selectedSpecialty, sortBy, minRating, maxTurnaround, availableOnly, specializations, labUserRoles]);

  const filteredAndSortedLabs = useMemo(() => {
    return [...verifiedLabs, ...unverifiedLabs];
  }, [verifiedLabs, unverifiedLabs]);
  
  // Pagination
  const totalPages = Math.ceil(filteredAndSortedLabs.length / ITEMS_PER_PAGE);
  const paginatedLabs = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAndSortedLabs.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredAndSortedLabs, currentPage]);

  // Separate paginated labs into verified and unverified
  const paginatedVerified = useMemo(() => {
    return paginatedLabs.filter(lab => verifiedLabs.some(v => v.id === lab.id));
  }, [paginatedLabs, verifiedLabs]);

  const paginatedUnverified = useMemo(() => {
    return paginatedLabs.filter(lab => unverifiedLabs.some(u => u.id === lab.id));
  }, [paginatedLabs, unverifiedLabs]);
  
  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedPricingTier, selectedSpecialty, sortBy, minRating, maxTurnaround, availableOnly]);
  
  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedPricingTier(null);
    setSelectedSpecialty('all');
    setSortBy('rating');
    setCurrentPage(1);
    setMinRating(0);
    setMaxTurnaround(999);
    setAvailableOnly(false);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <LandingNav />
      <div className="flex-1 bg-secondary/30">
        <div className="container px-4 py-8 sm:py-12 max-w-7xl mx-auto">
          
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold mb-2">Partner Labs</h1>
            <p className="text-muted-foreground">
              Browse our network of {allLabs?.length || 0} certified dental laboratories
            </p>
          </div>

          {/* Search and Filters */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="space-y-4">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by lab name, description, location..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                {/* Filter Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Pricing Tier */}
                  <Select
                    value={selectedPricingTier || 'all'}
                    onValueChange={(value) => setSelectedPricingTier(value === 'all' ? null : value as any)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pricing Tier" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Tiers</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="budget">Budget</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {/* Specialty */}
                  <Select
                    value={selectedSpecialty}
                    onValueChange={setSelectedSpecialty}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Specialty" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Specialties</SelectItem>
                      {availableSpecialties.map(specialty => (
                        <SelectItem key={specialty} value={specialty}>
                          {specialty}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {/* Sort By */}
                  <Select
                    value={sortBy}
                    onValueChange={(value) => setSortBy(value as any)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sort By" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rating">Highest Rated</SelectItem>
                      <SelectItem value="name">Name (A-Z)</SelectItem>
                      <SelectItem value="turnaround">Fastest Turnaround</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {/* Min Rating */}
                  <Select
                    value={minRating.toString()}
                    onValueChange={(value) => setMinRating(parseFloat(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Min Rating" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Any Rating</SelectItem>
                      <SelectItem value="3">3+ Stars</SelectItem>
                      <SelectItem value="4">4+ Stars</SelectItem>
                      <SelectItem value="4.5">4.5+ Stars</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Second Filter Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {/* Max Turnaround */}
                  <Select
                    value={maxTurnaround.toString()}
                    onValueChange={(value) => setMaxTurnaround(parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Max Turnaround" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="999">Any Turnaround</SelectItem>
                      <SelectItem value="3">3 Days or Less</SelectItem>
                      <SelectItem value="5">5 Days or Less</SelectItem>
                      <SelectItem value="7">7 Days or Less</SelectItem>
                      <SelectItem value="10">10 Days or Less</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Available Capacity */}
                  <div className="flex items-center space-x-2 px-3 border rounded-md">
                    <input
                      type="checkbox"
                      id="available"
                      checked={availableOnly}
                      onChange={(e) => setAvailableOnly(e.target.checked)}
                      className="h-4 w-4 rounded border-border"
                    />
                    <label htmlFor="available" className="text-sm font-medium cursor-pointer">
                      Available Capacity Only
                    </label>
                  </div>
                  
                  {/* Clear Filters */}
                  <Button 
                    variant="outline" 
                    onClick={handleClearFilters}
                    className="w-full"
                  >
                    Clear Filters
                  </Button>
                </div>
                
                {/* Results Summary */}
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>
                    Showing {paginatedLabs.length} of {filteredAndSortedLabs.length} labs
                  </span>
                  {(searchQuery || selectedPricingTier || selectedSpecialty !== 'all' || minRating > 0 || maxTurnaround < 999 || availableOnly) && (
                    <span className="text-xs">
                      Filters active
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Labs Grid */}
          {isLoading ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i}>
                  <CardContent className="pt-6">
                    <Skeleton className="h-40 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : paginatedLabs.length > 0 ? (
            <>
              {/* Verified Labs Section */}
              {paginatedVerified.length > 0 && (
                <div className="mb-12">
                  <div className="flex items-center gap-2 mb-4">
                    <Badge variant="default" className="text-sm">Verified</Badge>
                    <h2 className="text-xl font-semibold">Verified Labs ({verifiedLabs.length})</h2>
                  </div>
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {paginatedVerified.map((lab) => (
                      <LabCard 
                        key={lab.id} 
                        lab={lab} 
                        specializations={getLabSpecializations(lab.id)}
                        isVerified={true}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Unverified Labs Section */}
              {paginatedUnverified.length > 0 && (
                <div className="mb-8">
                  <div className="flex items-center gap-2 mb-4">
                    <Badge variant="outline" className="text-sm">Pending Verification</Badge>
                    <h2 className="text-xl font-semibold">Other Labs ({unverifiedLabs.length})</h2>
                  </div>
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {paginatedUnverified.map((lab) => (
                      <LabCard 
                        key={lab.id} 
                        lab={lab} 
                        specializations={getLabSpecializations(lab.id)}
                        isVerified={false}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-8">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <div className="flex items-center gap-2">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        className="w-10"
                      >
                        {page}
                      </Button>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">
                  No labs found matching your criteria. Try adjusting your filters.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
        <ScrollToTop />
      </div>
      <LandingFooter />
    </div>
  );
};

export default Labs;
