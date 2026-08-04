import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { logger } from "@lark-apaas/client-toolkit/logger";
import { Button } from "@client/src/components/ui/button";
import { Input } from "@client/src/components/ui/input";
import { Textarea } from "@client/src/components/ui/textarea";
import { Switch } from "@client/src/components/ui/switch";
import { Label } from "@client/src/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@client/src/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@client/src/components/ui/dialog";
import type {
  AnnouncementItem,
  AnnouncementCategory,
  CreateAnnouncementRequest,
} from "@shared/api.interface";
import { createAnnouncement, updateAnnouncement } from "@client/src/api";
import {
  ANNOUNCEMENT_CATEGORY_META,
  ANNOUNCEMENT_CATEGORY_ORDER,
} from "./announcement-constants";

interface AnnouncementFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: AnnouncementItem | null;
  onSaved: () => void;
}

const AnnouncementFormDialog: React.FC<AnnouncementFormDialogProps> = ({
  open,
  onOpenChange,
  editing,
  onSaved,
}) => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] =
    useState<AnnouncementCategory>("announcement");
  const [published, setPublished] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(editing?.title ?? "");
      setContent(editing?.content ?? "");
      setCategory(editing?.category ?? "announcement");
      setPublished(editing ? editing.published : true);
    }
  }, [open, editing]);

  const handleSubmit = async (): Promise<void> => {
    if (!title.trim() || !content.trim()) {
      toast.error("标题和正文不能为空");
      return;
    }
    setSaving(true);
    try {
      const payload: CreateAnnouncementRequest = {
        title: title.trim(),
        content: content.trim(),
        category,
        published,
      };
      if (editing) {
        await updateAnnouncement(editing.id, payload);
        toast.success("公告已更新");
      } else {
        await createAnnouncement(payload);
        toast.success("公告已发布");
      }
      onOpenChange(false);
      onSaved();
    } catch (error) {
      logger.error("保存公告失败", String(error));
      toast.error("保存失败，请重试");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "编辑公告" : "发布新公告"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-sm text-muted-foreground">标题</Label>
            <Input
              value={title}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setTitle(e.target.value)
              }
              placeholder="公告标题"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-sm text-muted-foreground">类型</Label>
            <Select
              value={category}
              onValueChange={(v: string) =>
                setCategory(v as AnnouncementCategory)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ANNOUNCEMENT_CATEGORY_ORDER.map((c: AnnouncementCategory) => (
                  <SelectItem key={c} value={c}>
                    {ANNOUNCEMENT_CATEGORY_META[c].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-sm text-muted-foreground">
              正文（支持 Markdown）
            </Label>
            <Textarea
              value={content}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setContent(e.target.value)
              }
              placeholder="公告正文…"
              rows={5}
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="announcement-published"
              checked={published}
              onCheckedChange={setPublished}
            />
            <Label
              htmlFor="announcement-published"
              className="text-sm text-muted-foreground"
            >
              立即发布
            </Label>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            {editing ? "保存" : "发布"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AnnouncementFormDialog;
