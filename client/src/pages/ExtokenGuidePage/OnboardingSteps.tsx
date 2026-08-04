import React, { useEffect, useState } from "react";
import { Check, X, Sparkles } from "lucide-react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from "framer-motion";

import { Card } from "@client/src/components/ui/card";
import { Button } from "@client/src/components/ui/button";

interface OnboardingStep {
  title: string;
  desc: string;
}

const STEPS: OnboardingStep[] = [
  {
    title: "创建专属账户",
    desc: "飞书登录后已自动生成，下方即为你的账号与 Key",
  },
  {
    title: "复制接入指令给 Agent",
    desc: "复制下方接入指令，发给 Cursor / Codex / Aily 等 Agent",
  },
  {
    title: "发出第一个交换包",
    desc: "让 Agent 打包一次任务上下文，记录会归到你的账户",
  },
];

const PARTICLES = Array.from({ length: 10 }, (_, i) => {
  const angle = (i / 10) * Math.PI * 2;
  return { x: Math.cos(angle) * 34, y: Math.sin(angle) * 34, id: i };
});

interface ProgressRingProps {
  doneCount: number;
  total: number;
  reduced: boolean;
}

const ProgressRing: React.FC<ProgressRingProps> = ({
  doneCount,
  total,
  reduced,
}) => {
  const size = 52;
  const stroke = 4;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const pct = doneCount / total;
  const complete = doneCount === total;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="hsl(var(--cyber-cyan) / 0.14)"
          strokeWidth={stroke}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="url(#ringGrad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ * (1 - pct) }}
          transition={{ duration: reduced ? 0 : 0.8, ease: "easeOut" }}
        />
        {/* 流动光弧 */}
        {!reduced && !complete && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="hsl(var(--cyber-cyan))"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray="8 92"
            className="cyber-ring-flow"
            opacity={0.6}
          />
        )}
        <defs>
          <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="hsl(190 100% 50%)" />
            <stop offset="100%" stopColor="hsl(271 91% 65%)" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-mono font-semibold text-primary">
          {doneCount}/{total}
        </span>
      </div>
      {/* 完成粒子爆发 */}
      <AnimatePresence>
        {complete && !reduced && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {PARTICLES.map((p) => (
              <motion.span
                key={p.id}
                className="absolute size-1 rounded-full bg-primary"
                initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                animate={{ x: p.x, y: p.y, opacity: 0, scale: 0.4 }}
                transition={{ duration: 0.7, ease: "easeOut" }}
              />
            ))}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface OnboardingStepsProps {
  hasCopiedCmd: boolean;
  hasSentPackage: boolean;
  onDismiss: () => void;
}

const OnboardingSteps: React.FC<OnboardingStepsProps> = ({
  hasCopiedCmd,
  hasSentPackage,
  onDismiss,
}) => {
  const reduced = useReducedMotion();
  const done = [true, hasCopiedCmd, hasSentPackage];
  const doneCount = done.filter(Boolean).length;

  // 记录上一次完成数，用于触发粒子爆发的 key 变化
  const [burstKey, setBurstKey] = useState(0);
  useEffect(() => {
    if (doneCount === STEPS.length) {
      setBurstKey((k) => k + 1);
    }
  }, [doneCount]);

  return (
    <Card className="glass-panel p-4 rounded-sm space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div key={burstKey}>
            <ProgressRing
              doneCount={doneCount}
              total={STEPS.length}
              reduced={Boolean(reduced)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            <h2 className="text-sm font-semibold">新手引导</h2>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 gap-1 text-muted-foreground cyber-magnetic"
          onClick={onDismiss}
        >
          <X className="size-3.5" />
          跳过
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {STEPS.map((step, index) => {
          const isDone = done[index];
          return (
            <motion.div
              key={step.title}
              initial={reduced ? false : { opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, ease: "easeOut", delay: index * 0.1 }}
              className={`flex gap-3 p-3 rounded-sm border transition-colors ${
                isDone
                  ? "border-success/50 bg-success/5"
                  : "border-primary/15 bg-background/40"
              }`}
            >
              <motion.span
                animate={
                  isDone && !reduced
                    ? { scale: [1, 1.25, 1] }
                    : { scale: 1 }
                }
                transition={{ duration: 0.4 }}
                className={`flex items-center justify-center size-6 shrink-0 rounded-full text-xs font-mono font-semibold ${
                  isDone
                    ? "bg-success text-success-foreground"
                    : "bg-accent text-accent-foreground"
                }`}
              >
                {isDone ? <Check className="size-3.5" /> : index + 1}
              </motion.span>
              <div className="space-y-0.5 min-w-0">
                <p className="text-sm font-medium">{step.title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {step.desc}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </Card>
  );
};

export default OnboardingSteps;
