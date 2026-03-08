import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import lablinkLogo from "@/assets/lablink-logo.png";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export const NavLogo = () => {
  const navigate = useNavigate();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <motion.div
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => navigate("/")}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <motion.img
            src={lablinkLogo}
            alt="LabLink Logo"
            className="h-8 sm:h-10 w-auto object-contain"
            initial={{ opacity: 0, rotate: -10 }}
            animate={{ opacity: 1, rotate: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
          />
          <motion.span
            className="text-lg sm:text-xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent bg-[length:200%_auto] transition-all duration-500 group-hover:bg-[length:100%_auto] hidden xs:inline"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
          >
            LabLink
          </motion.span>
        </motion.div>
      </TooltipTrigger>
      <TooltipContent>
        <p>Home</p>
      </TooltipContent>
    </Tooltip>
  );
};
