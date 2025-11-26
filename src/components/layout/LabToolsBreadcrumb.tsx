import { Link } from "react-router-dom";
import { ChevronRight, Star, LayoutDashboard } from "lucide-react";

interface LabToolsBreadcrumbProps {
  currentPage: string;
}

export const LabToolsBreadcrumb = ({ currentPage }: LabToolsBreadcrumbProps) => {
  return (
    <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
      <Link 
        to="/dashboard" 
        className="flex items-center gap-1.5 hover:text-foreground transition-colors"
      >
        <LayoutDashboard className="h-4 w-4" />
        <span>Dashboard</span>
      </Link>
      
      <ChevronRight className="h-4 w-4" />
      
      <span className="flex items-center gap-1.5 text-amber-500">
        <Star className="h-4 w-4 fill-amber-500" />
        <span>Lab Tools</span>
      </span>
      
      <ChevronRight className="h-4 w-4" />
      
      <span className="text-foreground font-medium">{currentPage}</span>
    </nav>
  );
};
