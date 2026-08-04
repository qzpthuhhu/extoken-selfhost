import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { logger } from "@lark-apaas/client-toolkit/logger";
import { Button } from "@client/src/components/ui/button";
import { Input } from "@client/src/components/ui/input";
import { Textarea } from "@client/src/components/ui/textarea";
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
  RoadmapItem,
  RoadmapItemType,
  RoadmapStatus,
  RoadmapPriority,
  CreateRoadmapRequest,
} from "@shared/api.interface";
import { createRoadmapItem, updateRoadmapItem } from "@client/src/api";
import {
  ROADMAP_TYPE_META,
  ROADMAP_STATUS_META,
  ROADMAP_PRIORITY_META,
  ROADMAP_TYPE_ORDER,
  ROADMAP_STATUS_ORDER,
  ROADMAP_PRIORITY_ORDER,
} from "./roadmap-constants";

interface RoadmapFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: RoadmapItem | null;
  onSaved: () => void;
}

const RoadmapFormDialog: React.FC<RoadmapFormDialogProps> = ({
  open,
  onOpenChange,
  editing,
  onSaved,
}) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [itemType, setItemType] = useState<RoadmapItemType>("feature");
  const [status, setStatus] = useState<RoadmapStatus>("planned");
  const [priority, setPriority] = useState<RoadmapPriority>("medium");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(editing?.title ?? "");
      setDescription(editing?.description ?? "");
      setItemType(editing?.itemType ?? "feature");
      setStatus(editing?.status ?? "planned");
      setPriority(editing?.priority ?? "medium");
    }
  }, [open, editing]);

  const handleSubmit = async (): Promise<void> => {
    if (!title.trim()) {
      toast.error("标题不能为空");
      return;
    }
    setSaving(true);
    try {
      const payload: CreateRoadmapRequest = {
        title: title.trim(),
        description: description.trim(),
        itemType,
        status,
        priority,
      };
      if (editing) {
        await updateRoadmapItem(editing.id, payload);
        toast.success("路线项已更新");
      } else {
        await createRoadmapItem(payload);
        toast.success("路线项已创建");
      }
      onOpenChange(false);
      onSaved();
    } catch (error) {
      logger.error("保存路线项失败", String(error));
      toast.error("保存失败，请重试");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "编辑路线项" : "新增路线项"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-sm text-muted-foreground">标题</Label>
            <Input
              value={title}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setTitle(e.target.value)
              }
              placeholder="路线项标题"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-sm text-muted-foreground">描述</Label>
            <Textarea
              value={description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setDescription(e.target.value)
              }
              placeholder="详细描述…"
              rows={4}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-sm text-muted-foreground">类型</Label>
              <Select
                value={itemType}
                onValueChange={(v: string) => setItemType(v as RoadmapItemType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROADMAP_TYPE_ORDER.map((t: RoadmapItemType) => (
                    <SelectItem key={t} value={t}>
                      {ROADMAP_TYPE_META[t].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-sm text-muted-foreground">状态</Label>
              <Select
                value={status}
                onValueChange={(v: string) => setStatus(v as RoadmapStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROADMAP_STATUS_ORDER.map((s: RoadmapStatus) => (
                    <SelectItem key={s} value={s}>
                      {ROADMAP_STATUS_META[s].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-sm text-muted-foreground">优先级</Label>
              <Select
                value={priority}
                onValueChange={(v: string) =>
                  setPriority(v as RoadmapPriority)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROADMAP_PRIORITY_ORDER.map((p: RoadmapPriority) => (
                    <SelectItem key={p} value={p}>
                      {ROADMAP_PRIORITY_META[p].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
            {editing ? "保存" : "创建"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RoadmapFormDialog;
