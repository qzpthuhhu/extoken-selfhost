import React, { useState } from "react";
import {
  Repeat,
  Users,
  GraduationCap,
  Library,
  Copy,
  Check,
  PackagePlus,
  PackageOpen,
  Lightbulb,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

import { Card } from "@client/src/components/ui/card";
import { Badge } from "@client/src/components/ui/badge";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@client/src/components/ui/tabs";
import {
  USE_CASE_CATEGORIES,
  BLOCK_META,
  type UseCaseItem,
  type UseCaseCategory,
} from "./use-cases.data";

const CATEGORY_ICON: Record<UseCaseCategory["iconName"], React.ElementType> = {
  repeat: Repeat,
  users: Users,
  graduationCap: GraduationCap,
  library: Library,
};

interface PromptRowProps {
  icon: React.ElementType;
  label: string;
  prompt: string;
  copyId: string;
  copiedId: string | null;
  onCopy: (text: string, id: string) => void;
}

const PromptRow: React.FC<PromptRowProps> = ({
  icon: Icon,
  label,
  prompt,
  copyId,
  copiedId,
  onCopy,
}) => {
  const copied = copiedId === copyId;
  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground/85">
        <Icon className="size-4 text-primary" />
        {label}
      </div>
      <div className="group/prompt relative rounded-xl border border-border/60 bg-background/50 px-4 py-3.5 pr-12 text-[13.5px] leading-relaxed text-foreground/90 transition-colors hover:border-primary/35">
        {prompt}
        <button
          onClick={() => onCopy(prompt, copyId)}
          className={`absolute right-2.5 top-2.5 flex size-8 items-center justify-center rounded-lg border transition-all ${
            copied
              ? "border-success/40 bg-success/10 text-success"
              : "border-border/60 bg-card/70 text-muted-foreground hover:border-primary/40 hover:text-primary"
          }`}
          aria-label={`复制${label}`}
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
        </button>
      </div>
    </div>
  );
};

interface UseCaseCardProps {
  item: UseCaseItem;
  index: number;
  copiedId: string | null;
  onCopy: (text: string, id: string) => void;
}

const UseCaseCard: React.FC<UseCaseCardProps> = ({
  item,
  index,
  copiedId,
  onCopy,
}) => (
  <motion.div
    initial={{ opacity: 0, y: 22 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
    className="h-full"
  >
    <Card className="group glass-panel relative flex h-full flex-col gap-5 overflow-hidden rounded-2xl p-7 transition-all duration-300 hover:-translate-y-1.5 hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/10">
      {/* 顶部渐变高光条 */}
      <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      <div className="space-y-2.5">
        <h3 className="text-xl font-semibold tracking-tight text-foreground">
          {item.title}
        </h3>
        <p className="text-[15px] leading-7 text-muted-foreground">
          {item.pain}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {item.blocks.map((block) => {
          const meta = BLOCK_META[block];
          return (
            <span
              key={block}
              className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-accent/50 px-3 py-1 text-xs font-medium text-accent-foreground"
            >
              <span className={`size-2 rounded-full bg-current ${meta.dotClass}`} />
              {meta.label}
            </span>
          );
        })}
      </div>

      <div className="flex items-start gap-2.5 rounded-xl bg-background/40 px-3.5 py-2.5 text-[13px] leading-6 text-muted-foreground">
        <ArrowRight className="mt-0.5 size-4 shrink-0 text-primary/70" />
        <span>
          <span className="text-foreground/70">交给：</span>
          {item.audience}
        </span>
      </div>

      <div className="mt-auto space-y-4 border-t border-border/40 pt-5">
        <PromptRow
          icon={PackagePlus}
          label="打包提示词"
          prompt={item.packPrompt}
          copyId={`${item.id}-pack`}
          copiedId={copiedId}
          onCopy={onCopy}
        />
        <PromptRow
          icon={PackageOpen}
          label="取件提示词"
          prompt={item.redeemPrompt}
          copyId={`${item.id}-redeem`}
          copiedId={copiedId}
          onCopy={onCopy}
        />
      </div>
    </Card>
  </motion.div>
);

const UseCasesPage: React.FC = () => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      toast.success("已复制提示词");
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error("复制失败，请手动复制");
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-12">
      <header className="space-y-5">
        <Badge
          variant="outline"
          className="border-primary/25 bg-primary/8 px-3 py-1 text-sm text-primary"
        >
          <Lightbulb className="mr-1.5 size-4" />
          典型使用案例
        </Badge>
        <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          按场景拿来即用的接力剧本
        </h1>
        <p className="max-w-3xl text-lg leading-9 text-muted-foreground">
          Extoken 让 AI Agent 之间安全交接任务上下文。下面按场景整理了常见用法，每个案例都配好了「打包」和「取件」两句现成提示词，接入后直接发给你的
          Agent 即可。
        </p>
      </header>

      <Tabs defaultValue={USE_CASE_CATEGORIES[0].key} className="gap-8">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-2 rounded-2xl border border-border/60 bg-card/50 p-2 backdrop-blur-md">
          {USE_CASE_CATEGORIES.map((cat) => {
            const Icon = CATEGORY_ICON[cat.iconName];
            return (
              <TabsTrigger
                key={cat.key}
                value={cat.key}
                className="flex-none gap-2 rounded-xl px-5 py-2.5 text-[15px] font-medium text-muted-foreground transition-all data-[state=active]:bg-primary/12 data-[state=active]:text-primary data-[state=active]:shadow-[0_0_0_1px_hsl(var(--cyber-cyan)/0.25),0_4px_20px_-8px_hsl(var(--cyber-cyan)/0.5)]"
              >
                <Icon className="size-[18px]" />
                {cat.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {USE_CASE_CATEGORIES.map((cat) => (
          <TabsContent
            key={cat.key}
            value={cat.key}
            className="space-y-7 focus-visible:outline-none"
          >
            <motion.p
              key={`${cat.key}-desc`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="text-base leading-8 text-muted-foreground"
            >
              {cat.desc}
            </motion.p>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {cat.cases.map((item, index) => (
                <UseCaseCard
                  key={item.id}
                  item={item}
                  index={index}
                  copiedId={copiedId}
                  onCopy={handleCopy}
                />
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default UseCasesPage;
