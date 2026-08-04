import React from "react";
import { motion, useReducedMotion } from "framer-motion";

interface RevealProps {
  children: React.ReactNode;
  className?: string;
  /** 进入延迟（秒），用于错峰 */
  delay?: number;
  /** 是否在滚动进入视口时才触发，默认 true */
  onView?: boolean;
}

/**
 * 进入视口淡入 + 轻微缩放上移。
 * reduced-motion 下直接静态呈现（无位移无缩放），仅用 transform/opacity 满足性能要求。
 */
const Reveal: React.FC<RevealProps> = ({
  children,
  className,
  delay = 0,
  onView = true,
}) => {
  const reduced = useReducedMotion();

  if (reduced) {
    return <div className={className}>{children}</div>;
  }

  const animateProps = onView
    ? {
        initial: { opacity: 0, y: 18, scale: 0.98 },
        whileInView: { opacity: 1, y: 0, scale: 1 },
        viewport: { once: true, amount: 0.2 },
      }
    : {
        initial: { opacity: 0, y: 18, scale: 0.98 },
        animate: { opacity: 1, y: 0, scale: 1 },
      };

  return (
    <motion.div
      {...animateProps}
      transition={{ duration: 0.5, ease: "easeOut", delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

export default Reveal;
