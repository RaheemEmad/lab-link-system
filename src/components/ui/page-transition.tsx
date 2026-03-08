import { motion, useReducedMotion } from "framer-motion";
import { ReactNode } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

export const PageTransition = ({ children, className }: PageTransitionProps) => {
  const isMobile = useIsMobile();
  const prefersReduced = useReducedMotion();

  const shouldSimplify = isMobile || prefersReduced;

  const variants = {
    initial: {
      opacity: 0,
      ...(shouldSimplify ? {} : { y: 20, scale: 0.98 }),
    },
    animate: {
      opacity: 1,
      ...(shouldSimplify ? {} : { y: 0, scale: 1 }),
    },
    exit: {
      opacity: 0,
      ...(shouldSimplify ? {} : { y: -20, scale: 0.98 }),
    },
  };

  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={variants}
      transition={{
        duration: shouldSimplify ? 0.25 : 0.5,
        ease: [0.22, 1, 0.36, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};
