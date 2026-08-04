import type { AnnouncementCategory } from "@shared/api.interface";

export interface AnnouncementCategoryMeta {
  label: string;
  className: string;
}

export const ANNOUNCEMENT_CATEGORY_META: Record<
  AnnouncementCategory,
  AnnouncementCategoryMeta
> = {
  update: { label: "更新", className: "bg-primary/15 text-primary" },
  announcement: {
    label: "公告",
    className: "text-[hsl(152_68%_45%)] bg-[hsl(152_68%_45%)]/15",
  },
  maintenance: {
    label: "维护",
    className: "text-[hsl(32_95%_55%)] bg-[hsl(32_95%_55%)]/15",
  },
};

export const ANNOUNCEMENT_CATEGORY_ORDER: AnnouncementCategory[] = [
  "update",
  "announcement",
  "maintenance",
];
