// Futty v2.0 — PageTransition: fade + leve deslize vertical entre páginas.
// Respeita prefers-reduced-motion (useReducedMotion) → só opacidade, sem y.
import { motion, useReducedMotion } from 'framer-motion';

export default function PageTransition({ children }) {
  const reduzir = useReducedMotion();
  const dist = reduzir ? 0 : 8;

  const variants = {
    initial: { opacity: 0, y: dist },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -dist },
  };

  return (
    <motion.div
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: reduzir ? 0.12 : 0.18, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}
