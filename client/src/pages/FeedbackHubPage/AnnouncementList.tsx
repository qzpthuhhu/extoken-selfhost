import React, { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import dayjs from "dayjs";
import { motion } from "framer-motion";
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
      <Card className="glass-panel rounded-2xl p-8">
        <p className="text-base text-muted-foreground">加载产品通知中...</p>
      </Card>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border/60 py-16 text-center">
        <Bell className="size-8 text-muted-foreground/50" />
        <p className="text-base text-muted-foreground">暂无产品通知</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {items.map((item: AnnouncementItem, index: number) => {
        const meta = CATEGORY_META[item.category];
        return (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.4,
              delay: index * 0.07,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <Card className="group glass-panel space-y-4 rounded-2xl p-7 transition-all duration-300 hover:-translate-y-1 hover:border-primary/35 hover:shadow-xl hover:shadow-primary/10">
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Bell className="size-[18px]" />
                  </span>
                  <h3 className="break-words text-lg font-semibold tracking-tight text-foreground">
                    {item.title}
                  </h3>
                </div>
                <StatusBadge label={meta.label} className={meta.className} />
              </div>
              <p className="font-mono text-xs text-muted-foreground">
                {dayjs(item.createdAt).format("YYYY-MM-DD HH:mm")}
              </p>
              <div className="border-t border-border/40 pt-4 text-[15px] leading-8">
                <MarkdownDoc content={item.content} />
              </div>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
};

export default AnnouncementList;
