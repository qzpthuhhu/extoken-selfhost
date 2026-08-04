import React from "react";

/**
 * Cyber 环境背景：动态网格 + 径向光晕 + SVG 噪点纹理。
 * fixed 全屏、pointer-events:none，仅作视觉底层，动画在 reduced-motion 下自动停止。
 */
const CyberBackground: React.FC = () => {
  return (
    <>
      <div className="cyber-ambient" aria-hidden="true" />
      <div className="cyber-noise" aria-hidden="true" />
    </>
  );
};

export default CyberBackground;
