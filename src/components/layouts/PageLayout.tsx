import { ReactNode } from "react";
import LandingNav from "@/components/landing/LandingNav";
import LandingFooter from "@/components/landing/LandingFooter";
import { ScrollToTop } from "@/components/ui/scroll-to-top";

interface PageLayoutProps {
  children: ReactNode;
  /** Background class, defaults to "bg-background" */
  bgClass?: string;
  /** Max width class, defaults to "max-w-6xl" */
  maxWidth?: string;
  /** Whether to show nav/footer, defaults to true */
  showNav?: boolean;
  showFooter?: boolean;
}

const PageLayout = ({
  children,
  bgClass = "bg-background",
  maxWidth = "max-w-6xl",
  showNav = true,
  showFooter = true,
}: PageLayoutProps) => {
  return (
    <div className="min-h-screen flex flex-col">
      {showNav && <LandingNav />}
      <div className={`flex-1 ${bgClass}`}>
        <div className={`container px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-12 ${maxWidth} mx-auto`}>
          {children}
        </div>
      </div>
      {showFooter && <LandingFooter />}
      <ScrollToTop />
    </div>
  );
};

export default PageLayout;
