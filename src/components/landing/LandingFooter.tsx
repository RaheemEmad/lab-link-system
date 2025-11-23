import { Link } from "react-router-dom";

const LandingFooter = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="py-6 sm:py-8 lg:py-12 bg-secondary/30 border-t border-border">
      <div className="container px-4 sm:px-6 lg:px-8 mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center gap-3 sm:gap-4 md:gap-6">
          <div className="text-xs sm:text-sm text-muted-foreground text-center md:text-left">
            © {currentYear} LabLink. All rights reserved.
          </div>
          
          <nav className="flex flex-wrap justify-center gap-3 sm:gap-4 md:gap-8">
            <Link 
              to="/privacy" 
              className="text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Privacy Policy
            </Link>
            <Link 
              to="/terms" 
              className="text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Terms of Service
            </Link>
            <Link 
              to="/contact" 
              className="text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Contact
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
};

export default LandingFooter;
