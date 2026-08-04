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
} from "lucide-react";
import { toast } from "sonner";

import { Card } from "@client/src/components/ui/card";
import { Button } from "@client/src/components/ui/button";
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
}) => (
  <div className="space-y-1.5">
    <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
      <Icon className="size-3.5" />
      {label}
    </div>
    <div className="relative group px-3 py-2 pr-9 rounded-sm bg-background border border-border text-xs leading-relaxed text-foreground/90">
      {prompt}
      <button
        onClick={() => onCopy(prompt, copyId)}
        className="absolute top-1.5 right-1.5 flex items-center justify-center size-6 rounded-sm text-muted-foreground hover:text-foreground hover-elevate"
        aria-label={`复制${label}`}
      >
        {copiedId === copyId ? (
          <Check className="size-3.5 text-success" />
        ) : (
          <Copy className="size-3.5" />
        )}
      </button>
    </div>
  </div>
);

interface UseCaseCardProps {
  item: UseCaseItem;
  copiedId: string | null;
  onCopy: (text: string, id: string) => void;
}

const UseCaseCard: React.FC<UseCaseCardProps> = ({
  item,
  copiedId,
  onCopy,
}) => (
  <Card className="p-4 border border-border rounded-sm bg-card flex flex-col gap-3">
    <div className="space-y-1">
      <div className="text-sm font-semibold">{item.title}</div>
      <p className="text-xs text-muted-foreground leading-relaxed">
        {item.pain}
      </p>
    </div>

    <div className="flex flex-wrap items-center gap-1.5">
      {item.blocks.map((block) => {
        const meta = BLOCK_META[block];
        return (
          <span
            key={block}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm bg-accent text-accent-foreground text-[11px] font-medium"
          >
            <span
              className={`size-1.5 rounded-full bg-current ${meta.dotClass}`}
            />
            {meta.label}
          </span>
        );
      })}
    </div>

    <div className="text-[11px] text-muted-foreground">
      <span className="text-foreground/70">交给：</span>
      {item.audience}
    </div>

    <div className="space-y-3 pt-1 border-t border-border/60">
      <div className="pt-3">
        <PromptRow
          icon={PackagePlus}
          label="打包提示词"
          prompt={item.packPrompt}
          copyId={`${item.id}-pack`}
          copiedId={copiedId}
          onCopy={onCopy}
        />
      </div>
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
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Lightbulb className="size-5 text-primary" />
          典型使用案例
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
          extoken 让 AI Agent 之间安全交接任务上下文。下面按场景整理了常见用法，
          每个案例都给了「打包」和「取件」两句现成提示词，接入后直接发给你的 Agent 即可。
        </p>
      </header>

      <Tabs defaultValue={USE_CASE_CATEGORIES[0].key} className="gap-4">
        <TabsList className="flex flex-wrap h-auto w-full justify-start gap-1 bg-card border border-border p-1">
          {USE_CASE_CATEGORIES.map((cat) => {
            const Icon = CATEGORY_ICON[cat.iconName];
            return (
              <TabsTrigger
                key={cat.key}
                value={cat.key}
                className="flex-none gap-1.5 data-[state=active]:bg-accent data-[state=active]:text-primary"
              >
                <Icon className="size-4" />
                {cat.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {USE_CASE_CATEGORIES.map((cat) => (
          <TabsContent key={cat.key} value={cat.key} className="space-y-4">
            <p className="text-xs text-muted-foreground leading-relaxed">
              {cat.desc}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {cat.cases.map((item) => (
                <UseCaseCard
                  key={item.id}
                  item={item}
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
