import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import LandingNav from "@/components/landing/LandingNav";
import LandingFooter from "@/components/landing/LandingFooter";
import { ScrollToTop } from "@/components/ui/scroll-to-top";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Building2, 
  Mail, 
  Phone, 
  MapPin, 
  Star, 
  Clock, 
  Zap,
  TrendingUp,
  Award,
  ExternalLink,
  Search,
  Filter,
  ArrowUpDown
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

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
  
  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('search', searchQuery);
    if (selectedPricingTier) params.set('pricing', selectedPricingTier);
    if (selectedSpecialty !== 'all') params.set('specialty', selectedSpecialty);
    if (sortBy !== 'rating') params.set('sort', sortBy);
    if (currentPage > 1) params.set('page', currentPage.toString());
    
    setSearchParams(params, { replace: true });
  }, [searchQuery, selectedPricingTier, selectedSpecialty, sortBy, currentPage, setSearchParams]);

  // Fetch all active labs (no server-side filtering for search/specialty - we'll do client-side)
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

  const getLabSpecializations = (labId: string) => {
    return specializations?.filter(s => s.lab_id === labId) || [];
  };
  
  // Get unique specialties for filter
  const availableSpecialties = useMemo(() => {
    if (!specializations) return [];
    const unique = new Set(specializations.map(s => s.restoration_type));
    return Array.from(unique).sort();
  }, [specializations]);
  
  // Filter, search, and sort labs
  const filteredAndSortedLabs = useMemo(() => {
    if (!allLabs) return [];
    
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
    
    return filtered;
  }, [allLabs, searchQuery, selectedPricingTier, selectedSpecialty, sortBy, specializations]);
  
  // Pagination
  const totalPages = Math.ceil(filteredAndSortedLabs.length / ITEMS_PER_PAGE);
  const paginatedLabs = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAndSortedLabs.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredAndSortedLabs, currentPage]);
  
  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedPricingTier, selectedSpecialty, sortBy]);
  
  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedPricingTier(null);
    setSelectedSpecialty('all');
    setSortBy('rating');
    setCurrentPage(1);
  };

  const getPricingBadgeVariant = (tier: string) => {
    switch (tier) {
      case 'premium': return 'default';
      case 'standard': return 'secondary';
      case 'budget': return 'outline';
      default: return 'secondary';
    }
  };

  const getExpertiseBadgeVariant = (level: string) => {
    switch (level) {
      case 'expert': return 'default';
      case 'intermediate': return 'secondary';
      case 'basic': return 'outline';
      default: return 'secondary';
    }
  };

  const getCapacityColor = (currentLoad: number, maxCapacity: number) => {
    const percentage = (currentLoad / maxCapacity) * 100;
    if (percentage < 50) return 'text-green-600';
    if (percentage < 80) return 'text-orange-600';
    return 'text-red-600';
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
                  {(searchQuery || selectedPricingTier || selectedSpecialty !== 'all') && (
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
                  <CardHeader>
                    <Skeleton className="h-6 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-full" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-20 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : paginatedLabs.length > 0 ? (
            <>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {paginatedLabs.map((lab) => {
                const labSpecs = getLabSpecializations(lab.id);
                const capacityPercentage = (lab.current_load / lab.max_capacity) * 100;

                return (
                  <Card key={lab.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-3 flex-1">
                          {lab.logo_url ? (
                            <img src={lab.logo_url} alt={lab.name} className="w-12 h-12 rounded-lg object-cover" />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Building2 className="h-6 w-6 text-primary" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-lg mb-1 truncate">{lab.name}</CardTitle>
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant={getPricingBadgeVariant(lab.pricing_tier)}>
                                {lab.pricing_tier}
                              </Badge>
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                                <span className="font-medium">{lab.performance_score?.toFixed(1)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      {lab.description && (
                        <CardDescription className="line-clamp-2 mt-2">
                          {lab.description}
                        </CardDescription>
                      )}
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {/* SLA */}
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Standard SLA:</span>
                        </div>
                        <span className="font-medium">{lab.standard_sla_days} days</span>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <Zap className="h-4 w-4 text-orange-500" />
                          <span className="text-muted-foreground">Urgent SLA:</span>
                        </div>
                        <span className="font-medium">{lab.urgent_sla_days} days</span>
                      </div>

                      {/* Capacity */}
                      <div>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-muted-foreground">Current Capacity:</span>
                          <span className={`font-medium ${getCapacityColor(lab.current_load, lab.max_capacity)}`}>
                            {lab.current_load}/{lab.max_capacity}
                          </span>
                        </div>
                        <div className="w-full bg-secondary rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full transition-all"
                            style={{ width: `${capacityPercentage}%` }}
                          />
                        </div>
                      </div>

                      {/* Specializations */}
                      {labSpecs.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Award className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Specializations:</span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {labSpecs.slice(0, 3).map((spec, idx) => (
                              <Badge 
                                key={idx} 
                                variant={getExpertiseBadgeVariant(spec.expertise_level)}
                                className="text-xs"
                              >
                                {spec.restoration_type}
                              </Badge>
                            ))}
                            {labSpecs.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{labSpecs.length - 3} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Contact Info */}
                      <div className="pt-3 border-t space-y-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          <span className="truncate">{lab.contact_email}</span>
                        </div>
                        {lab.contact_phone && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            <span>{lab.contact_phone}</span>
                          </div>
                        )}
                        {lab.address && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            <span className="truncate">{lab.address}</span>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      {lab.website_url && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full"
                          onClick={() => window.open(lab.website_url!, '_blank')}
                        >
                          <ExternalLink className="h-3 w-3 mr-2" />
                          Visit Website
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                    // Show first, last, current, and adjacent pages
                    if (
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    ) {
                      return (
                        <Button
                          key={page}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                          className="w-10"
                        >
                          {page}
                        </Button>
                      );
                    } else if (page === currentPage - 2 || page === currentPage + 2) {
                      return <span key={page} className="px-2">...</span>;
                    }
                    return null;
                  })}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
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
                <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">No Labs Found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery 
                    ? `No labs match your search: "${searchQuery}"`
                    : selectedPricingTier || selectedSpecialty !== 'all'
                    ? 'No labs match your selected filters.'
                    : 'No labs available at this time.'}
                </p>
                {(searchQuery || selectedPricingTier || selectedSpecialty !== 'all') && (
                  <Button variant="outline" onClick={handleClearFilters}>
                    Clear All Filters
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      <LandingFooter />
      <ScrollToTop />
    </div>
  );
};

export default Labs;
