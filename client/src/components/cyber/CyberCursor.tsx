import React, { useEffect, useRef } from "react";

/**
 * 自定义磁吸光标：主体小圆点 + 跟随环。
 * - 悬停可点击元素（a/button/[role=button]/.cyber-magnetic）时环放大变色（磁吸反馈）。
 * - 触摸设备 / reduced-motion 下由 CSS 隐藏，并恢复系统光标（见 index.css）。
 */
const CyberCursor: React.FC = () => {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const isCoarse =
      window.matchMedia("(hover: none)").matches ||
      window.matchMedia("(pointer: coarse)").matches;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (isCoarse || reduced) return;

    document.body.classList.add("cyber-cursor-active");

    let dotX = window.innerWidth / 2;
    let dotY = window.innerHeight / 2;
    let ringX = dotX;
    let ringY = dotY;
    let raf = 0;

    const dot = dotRef.current;
    const ring = ringRef.current;

    const onMove = (e: MouseEvent) => {
      dotX = e.clientX;
      dotY = e.clientY;
      if (dot) {
        dot.style.transform = `translate(${dotX}px, ${dotY}px)`;
      }
      const target = e.target as HTMLElement | null;
      const interactive = target?.closest(
        'a, button, [role="button"], input, select, textarea, .cyber-magnetic',
      );
      if (ring) {
        ring.classList.toggle("is-hover", Boolean(interactive));
      }
    };

    const tick = () => {
      ringX += (dotX - ringX) * 0.18;
      ringY += (dotY - ringY) * 0.18;
      if (ring) {
        ring.style.transform = `translate(${ringX}px, ${ringY}px)`;
      }
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener("mousemove", onMove);
    raf = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
      document.body.classList.remove("cyber-cursor-active");
    };
  }, []);

  return (
    <>
      <div ref={ringRef} className="cyber-cursor-ring" aria-hidden="true" />
      <div ref={dotRef} className="cyber-cursor-dot" aria-hidden="true" />
    </>
  );
};

export default CyberCursor;
