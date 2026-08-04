import React, { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import dayjs from "dayjs";
import { logger } from "@lark-apaas/client-toolkit/logger";

import { Card } from "@client/src/components/ui/card";
import StatusBadge from "@client/src/components/StatusBadge";
import MarkdownDoc from "@client/src/components/cyber/MarkdownDoc";
import { fetchAnnouncements } from "@client/src/api";
import type {
  AnnouncementItem,
  AnnouncementCategory,
} from "@shared/api.interface";

interface CategoryMeta {
  label: string;
  className: string;
}

const CATEGORY_META: Record<AnnouncementCategory, CategoryMeta> = {
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

const AnnouncementList: React.FC = () => {
  const [items, setItems] = useState<AnnouncementItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const res = await fetchAnnouncements();
        if (mounted) setItems(res.items);
      } catch (error) {
        logger.error("加载产品通知失败", String(error));
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <Card className="p-4 border border-border rounded-sm bg-card">
        <p className="text-sm text-muted-foreground">加载产品通知中...</p>
      </Card>
    );
  }

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-6 text-center border border-dashed border-border rounded-sm">
        暂无产品通知
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item: AnnouncementItem) => {
        const meta = CATEGORY_META[item.category];
        return (
          <Card
            key={item.id}
            className="glass-panel p-4 rounded-sm space-y-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <Bell className="size-4 text-primary shrink-0" />
                <h3 className="text-sm font-semibold break-words">
                  {item.title}
                </h3>
              </div>
              <StatusBadge label={meta.label} className={meta.className} />
            </div>
            <p className="text-xs font-mono text-muted-foreground">
              {dayjs(item.createdAt).format("YYYY-MM-DD HH:mm")}
            </p>
            <MarkdownDoc content={item.content} />
          </Card>
        );
      })}
    </div>
  );
};

export default AnnouncementList;
