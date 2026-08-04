import React, { useEffect, useState } from "react";
import { ShieldAlert, LogIn, Send, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import dayjs from "dayjs";
import { logger } from "@lark-apaas/client-toolkit/logger";
import { getDataloom } from "@lark-apaas/client-toolkit/dataloom";

import { Card } from "@client/src/components/ui/card";
import { Button } from "@client/src/components/ui/button";
import { Input } from "@client/src/components/ui/input";
import StatusBadge from "@client/src/components/StatusBadge";
import { Textarea } from "@client/src/components/ui/textarea";
import { submitFeedback, fetchMyFeedback } from "@client/src/api";
import type { MyFeedbackItem, FeedbackStatus } from "@shared/api.interface";

interface StatusMeta {
  label: string;
  className: string;
}

const STATUS_META: Record<FeedbackStatus, StatusMeta> = {
  open: {
    label: "待处理",
    className: "text-[hsl(32_95%_55%)] bg-[hsl(32_95%_55%)]/15",
  },
  in_progress: { label: "处理中", className: "bg-primary/15 text-primary" },
  resolved: {
    label: "已解决",
    className: "text-[hsl(152_68%_45%)] bg-[hsl(152_68%_45%)]/15",
  },
  closed: { label: "已关闭", className: "bg-muted text-muted-foreground" },
};

const MyFeedbackPanel: React.FC = () => {
  const [items, setItems] = useState<MyFeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [needLogin, setNeedLogin] = useState(false);
  const [content, setContent] = useState("");
  const [contact, setContact] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadFeedback = async () => {
    try {
      const res = await fetchMyFeedback();
      setItems(res.items);
      setNeedLogin(false);
    } catch (error) {
      logger.error("加载我的反馈失败", String(error));
      setNeedLogin(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeedback();
  }, []);

  const handleLogin = async () => {
    const dataloom = await getDataloom();
    dataloom.service.session.redirectToLogin();
  };

  const handleSubmit = async () => {
    const trimmed = content.trim();
    if (!trimmed) {
      toast.error("请先填写反馈内容");
      return;
    }
    setSubmitting(true);
    try {
      await submitFeedback({ content: trimmed, contact: contact.trim() });
      toast.success("反馈已提交，感谢你的建议");
      setContent("");
      setContact("");
      await loadFeedback();
    } catch (error) {
      logger.error("提交反馈失败", String(error));
      toast.error("提交失败，请稍后重试");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-4 border border-border rounded-sm bg-card">
        <p className="text-sm text-muted-foreground">加载中...</p>
      </Card>
    );
  }

  if (needLogin) {
    return (
      <Card className="p-6 border border-border rounded-sm bg-card flex flex-col items-center gap-4 text-center">
        <ShieldAlert className="size-8 text-primary" />
        <p className="text-sm font-medium">请先登录飞书账号</p>
        <Button className="gap-1" onClick={handleLogin}>
          <LogIn className="size-4" />
          飞书登录
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="p-4 border border-border rounded-sm bg-card space-y-3">
        <div className="space-y-1.5">
          <label className="text-sm text-muted-foreground">反馈内容</label>
          <Textarea
            value={content}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              setContent(e.target.value)
            }
            placeholder="说说你遇到的问题或建议..."
            rows={4}
          />
        </div>
        <Input
          value={contact}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setContact(e.target.value)
          }
          placeholder="联系方式（选填）"
        />
        <div className="flex justify-end">
          <Button className="gap-1" onClick={handleSubmit} disabled={submitting}>
            <Send className="size-4" />
            {submitting ? "提交中..." : "提交反馈"}
          </Button>
        </div>
      </Card>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <MessageSquare className="size-4 text-primary" />
          我提交过的反馈
        </h3>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center border border-dashed border-border rounded-sm">
            你还没有提交过反馈
          </p>
        ) : (
          <div className="space-y-3">
            {items.map((item: MyFeedbackItem) => {
              const meta = STATUS_META[item.status];
              return (
                <Card
                  key={item.id}
                  className="p-4 border border-border rounded-sm bg-card space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm text-foreground/90 break-words min-w-0">
                      {item.content}
                    </p>
                    <StatusBadge label={meta.label} className={meta.className} />
                  </div>
                  <p className="text-xs font-mono text-muted-foreground">
                    {dayjs(item.createdAt).format("YYYY-MM-DD HH:mm")}
                  </p>
                  {item.adminReply && (
                    <div className="px-3 py-2 rounded-sm bg-accent border border-border space-y-1">
                      <p className="text-xs font-medium text-primary">
                        官方回复
                      </p>
                      <p className="text-sm text-accent-foreground break-words">
                        {item.adminReply}
                      </p>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyFeedbackPanel;
