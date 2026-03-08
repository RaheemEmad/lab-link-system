import { Link } from "react-router-dom";
import { useLanguage } from "@/lib/i18n/LanguageContext";

const LandingFooter = () => {
  const currentYear = new Date().getFullYear();
  const { t } = useLanguage();

  return (
    <footer className="py-6 sm:py-8 lg:py-12 bg-secondary/30 border-t border-border">
      <div className="container px-4 sm:px-6 lg:px-8 mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center gap-3 sm:gap-4 md:gap-6">
          <div className="text-xs sm:text-sm text-muted-foreground text-center md:text-start">
            © {currentYear} {t.footer.copyright}
          </div>
          
          <nav className="flex flex-wrap justify-center gap-3 sm:gap-4 md:gap-8">
            <Link 
              to="/privacy" 
              className="text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {t.footer.privacy}
            </Link>
            <Link 
              to="/terms" 
              className="text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {t.footer.terms}
            </Link>
            <Link 
              to="/contact" 
              className="text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {t.footer.contact}
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
};

export default LandingFooter;
