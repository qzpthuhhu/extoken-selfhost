import type {
  RoadmapItemType,
  RoadmapStatus,
  RoadmapPriority,
} from "@shared/api.interface";

export interface RoadmapBadgeMeta {
  label: string;
  className: string;
}

export const ROADMAP_TYPE_META: Record<RoadmapItemType, RoadmapBadgeMeta> = {
  feature: { label: "需求", className: "bg-primary/15 text-primary" },
  bug: {
    label: "Bug",
    className: "text-[hsl(0_72%_58%)] bg-[hsl(0_72%_58%)]/15",
  },
};

export const ROADMAP_STATUS_META: Record<RoadmapStatus, RoadmapBadgeMeta> = {
  planned: {
    label: "规划中",
    className: "text-[hsl(32_95%_55%)] bg-[hsl(32_95%_55%)]/15",
  },
  in_progress: { label: "进行中", className: "bg-primary/15 text-primary" },
  done: {
    label: "已完成",
    className: "text-[hsl(152_68%_45%)] bg-[hsl(152_68%_45%)]/15",
  },
  wontfix: { label: "不做", className: "bg-muted text-muted-foreground" },
};

export const ROADMAP_PRIORITY_META: Record<RoadmapPriority, RoadmapBadgeMeta> =
  {
    high: {
      label: "高",
      className: "text-[hsl(0_72%_58%)] bg-[hsl(0_72%_58%)]/15",
    },
    medium: {
      label: "中",
      className: "text-[hsl(32_95%_55%)] bg-[hsl(32_95%_55%)]/15",
    },
    low: { label: "低", className: "bg-muted text-muted-foreground" },
  };

export const ROADMAP_TYPE_ORDER: RoadmapItemType[] = ["feature", "bug"];

export const ROADMAP_STATUS_ORDER: RoadmapStatus[] = [
  "planned",
  "in_progress",
  "done",
  "wontfix",
];

export const ROADMAP_PRIORITY_ORDER: RoadmapPriority[] = [
  "low",
  "medium",
  "high",
];
