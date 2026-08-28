import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldAlert, LogIn, Send, MessageSquare, Inbox } from "lucide-react";
import { toast } from "sonner";
import dayjs from "dayjs";
import { motion } from "framer-motion";

import { Card } from "@client/src/components/ui/card";
import { Button } from "@client/src/components/ui/button";
import { Input } from "@client/src/components/ui/input";
import StatusBadge from "@client/src/components/StatusBadge";
import { Textarea } from "@client/src/components/ui/textarea";
import { logger, submitFeedback, fetchMyFeedback } from "@client/src/api";
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
  const navigate = useNavigate();
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

  const handleLogin = () => {
    navigate("/login");
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
      <Card className="glass-panel rounded-2xl p-8">
        <p className="text-base text-muted-foreground">加载中...</p>
      </Card>
    );
  }

  if (needLogin) {
    return (
      <Card className="glass-panel flex flex-col items-center gap-5 rounded-2xl p-12 text-center">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <ShieldAlert className="size-7" />
        </span>
        <div className="space-y-1.5">
          <p className="text-lg font-semibold text-foreground">
            登录后即可提交反馈
          </p>
          <p className="text-sm text-muted-foreground">
            登录本站账号，查看你的反馈进度与官方回复。
          </p>
        </div>
        <Button size="lg" className="gap-1.5" onClick={handleLogin}>
          <LogIn className="size-4" />
          去登录
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <Card className="glass-panel space-y-5 rounded-2xl p-7">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Send className="size-[18px]" />
          </span>
          <div>
            <h3 className="text-lg font-semibold tracking-tight text-foreground">
              提交新反馈
            </h3>
            <p className="text-sm text-muted-foreground">
              问题、建议或想要的功能，都可以告诉我们。
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground/85">
            反馈内容
          </label>
          <Textarea
            value={content}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              setContent(e.target.value)
            }
            placeholder="说说你遇到的问题或建议..."
            rows={4}
            className="rounded-xl text-[15px] leading-relaxed"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground/85">
            联系方式（选填）
          </label>
          <Input
            value={contact}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setContact(e.target.value)
            }
            placeholder="邮箱 / 微信，方便我们回复你"
            className="rounded-xl text-[15px]"
          />
        </div>
        <div className="flex justify-end">
          <Button
            size="lg"
            className="gap-1.5"
            onClick={handleSubmit}
            disabled={submitting}
          >
            <Send className="size-4" />
            {submitting ? "提交中..." : "提交反馈"}
          </Button>
        </div>
      </Card>

      <div className="space-y-5">
        <h3 className="flex items-center gap-2 text-lg font-semibold tracking-tight text-foreground">
          <MessageSquare className="size-5 text-primary" />
          我提交过的反馈
        </h3>
        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border/60 py-16 text-center">
            <Inbox className="size-8 text-muted-foreground/50" />
            <p className="text-base text-muted-foreground">
              你还没有提交过反馈
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {items.map((item: MyFeedbackItem, index: number) => {
              const meta = STATUS_META[item.status];
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
                      <p className="min-w-0 break-words text-[15px] leading-8 text-foreground/90">
                        {item.content}
                      </p>
                      <StatusBadge
                        label={meta.label}
                        className={meta.className}
                      />
                    </div>
                    <p className="font-mono text-xs text-muted-foreground">
                      {dayjs(item.createdAt).format("YYYY-MM-DD HH:mm")}
                    </p>
                    {item.adminReply && (
                      <div className="space-y-1.5 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3.5">
                        <p className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                          <MessageSquare className="size-3.5" />
                          官方回复
                        </p>
                        <p className="break-words text-sm leading-7 text-foreground/85">
                          {item.adminReply}
                        </p>
                      </div>
                    )}
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyFeedbackPanel;
