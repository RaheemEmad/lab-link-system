import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export const LanguageToggle = () => {
  const { language, setLanguage } = useLanguage();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLanguage(language === "en" ? "ar" : "en")}
          className="h-9 w-9 transition-all duration-200 hover:bg-primary/10"
        >
          <Globe className="h-4 w-4" />
          <span className="sr-only">
            {language === "en" ? "Switch to Arabic" : "Switch to English"}
          </span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{language === "en" ? "العربية" : "English"}</p>
      </TooltipContent>
    </Tooltip>
  );
};
