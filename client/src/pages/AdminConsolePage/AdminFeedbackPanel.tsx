import React, { useEffect, useState } from "react";
import dayjs from "dayjs";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { logger } from "@lark-apaas/client-toolkit/logger";
import { Card } from "@client/src/components/ui/card";
import StatusBadge from "@client/src/components/StatusBadge";
import { Button } from "@client/src/components/ui/button";
import { Textarea } from "@client/src/components/ui/textarea";
import { Spinner } from "@client/src/components/ui/spinner";
import { Label } from "@client/src/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@client/src/components/ui/select";
import { UserDisplay } from "@client/src/components/business-ui/user-display";
import type {
  AdminFeedbackItem,
  FeedbackStatus,
} from "@shared/api.interface";
import { fetchAdminFeedback, updateFeedback } from "@client/src/api";

interface StatusMeta {
  label: string;
  className: string;
}

const FEEDBACK_STATUS_META: Record<FeedbackStatus, StatusMeta> = {
  open: {
    label: "待处理",
    className: "text-[hsl(32_95%_55%)] bg-[hsl(32_95%_55%)]/15",
  },
  in_progress: {
    label: "处理中",
    className: "bg-primary/15 text-primary",
  },
  resolved: {
    label: "已解决",
    className: "text-[hsl(152_68%_45%)] bg-[hsl(152_68%_45%)]/15",
  },
  closed: {
    label: "已关闭",
    className: "bg-muted text-muted-foreground",
  },
};

const FEEDBACK_STATUS_ORDER: FeedbackStatus[] = [
  "open",
  "in_progress",
  "resolved",
  "closed",
];

const formatTime = (iso: string | null): string =>
  iso ? dayjs(iso).format("YYYY-MM-DD HH:mm") : "—";

interface FeedbackRowProps {
  item: AdminFeedbackItem;
  onSaved: () => void;
}

const FeedbackRow: React.FC<FeedbackRowProps> = ({ item, onSaved }) => {
  const [status, setStatus] = useState<FeedbackStatus>(item.status);
  const [reply, setReply] = useState<string>(item.adminReply || "");
  const [saving, setSaving] = useState(false);

  const meta = FEEDBACK_STATUS_META[item.status];

  const handleSave = async (): Promise<void> => {
    setSaving(true);
    try {
      await updateFeedback(item.id, { status, adminReply: reply });
      toast.success("反馈已更新");
      onSaved();
    } catch (error) {
      logger.error("保存反馈失败", String(error));
      toast.error("保存失败，请重试");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-4 border border-border rounded-sm bg-card space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          {item.submitterUserId ? (
            <UserDisplay value={[item.submitterUserId]} size="small" />
          ) : (
            <span className="text-sm text-muted-foreground">
              {item.submitterName || "匿名用户"}
            </span>
          )}
          <span className="text-xs text-muted-foreground font-mono">
            {formatTime(item.createdAt)}
          </span>
        </div>
        <StatusBadge label={meta.label} className={meta.className} />
      </div>

      <p className="text-sm text-foreground whitespace-pre-wrap break-words">
        {item.content}
      </p>

      {item.contact ? (
        <p className="text-xs text-muted-foreground">
          联系方式：
          <span className="font-mono text-foreground">{item.contact}</span>
        </p>
      ) : null}

      <div className="grid gap-3 md:grid-cols-[160px_1fr] items-start">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">处理状态</Label>
          <Select
            value={status}
            onValueChange={(v: string) => setStatus(v as FeedbackStatus)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FEEDBACK_STATUS_ORDER.map((s: FeedbackStatus) => (
                <SelectItem key={s} value={s}>
                  {FEEDBACK_STATUS_META[s].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">管理员回复</Label>
          <Textarea
            value={reply}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              setReply(e.target.value)
            }
            placeholder="填写给用户的回复…"
            rows={2}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : null}
          保存
        </Button>
      </div>
    </Card>
  );
};

const AdminFeedbackPanel: React.FC = () => {
  const [items, setItems] = useState<AdminFeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async (): Promise<void> => {
    setLoading(true);
    try {
      const res = await fetchAdminFeedback();
      setItems(res.items);
    } catch (error) {
      logger.error("加载反馈列表失败", String(error));
      toast.error("加载反馈失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner className="size-6" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <Card className="p-8 border border-border rounded-sm bg-card text-center">
        <p className="text-sm text-muted-foreground">暂无用户反馈</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item: AdminFeedbackItem) => (
        <FeedbackRow key={item.id} item={item} onSaved={load} />
      ))}
    </div>
  );
};

export default AdminFeedbackPanel;
