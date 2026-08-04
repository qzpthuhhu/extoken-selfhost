import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";

import { logger } from "@lark-apaas/client-toolkit/logger";
import { Card } from "@client/src/components/ui/card";
import StatusBadge from "@client/src/components/StatusBadge";
import { Button } from "@client/src/components/ui/button";
import { Spinner } from "@client/src/components/ui/spinner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@client/src/components/ui/alert-dialog";
import type { RoadmapItem } from "@shared/api.interface";
import { fetchRoadmap, deleteRoadmapItem } from "@client/src/api";
import RoadmapFormDialog from "./RoadmapFormDialog";
import {
  ROADMAP_TYPE_META,
  ROADMAP_STATUS_META,
  ROADMAP_PRIORITY_META,
} from "./roadmap-constants";

interface RoadmapCardProps {
  item: RoadmapItem;
  onEdit: (item: RoadmapItem) => void;
  onChanged: () => void;
}

const RoadmapCard: React.FC<RoadmapCardProps> = ({
  item,
  onEdit,
  onChanged,
}) => {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const typeMeta = ROADMAP_TYPE_META[item.itemType];
  const statusMeta = ROADMAP_STATUS_META[item.status];
  const priorityMeta = ROADMAP_PRIORITY_META[item.priority];

  const handleDelete = async (): Promise<void> => {
    setBusy(true);
    try {
      await deleteRoadmapItem(item.id);
      toast.success("路线项已删除");
      setConfirmOpen(false);
      onChanged();
    } catch (error) {
      logger.error("删除路线项失败", String(error));
      toast.error("删除失败，请重试");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-4 border border-border rounded-sm bg-card space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <StatusBadge label={typeMeta.label} className={typeMeta.className} />
          <h3 className="text-sm font-medium truncate">{item.title}</h3>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge label={statusMeta.label} className={statusMeta.className} />
          <StatusBadge label={`优先级·${priorityMeta.label}`} className={priorityMeta.className} />
        </div>
      </div>

      {item.description ? (
        <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">
          {item.description}
        </p>
      ) : null}

      <div className="flex justify-end items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => onEdit(item)}>
          <Pencil className="size-3.5" />
          编辑
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setConfirmOpen(true)}
        >
          <Trash2 className="size-3.5" />
          删除
        </Button>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除路线项</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除「{item.title}」吗？此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e: React.MouseEvent) => {
                e.preventDefault();
                void handleDelete();
              }}
              disabled={busy}
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

const AdminRoadmapPanel: React.FC = () => {
  const [items, setItems] = useState<RoadmapItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<RoadmapItem | null>(null);

  const load = async (): Promise<void> => {
    setLoading(true);
    try {
      const res = await fetchRoadmap();
      setItems(res.items);
    } catch (error) {
      logger.error("加载路线图失败", String(error));
      toast.error("加载路线图失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const openCreate = (): void => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (item: RoadmapItem): void => {
    setEditing(item);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" onClick={openCreate}>
          <Plus className="size-4" />
          新增路线项
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner className="size-6" />
        </div>
      ) : items.length === 0 ? (
        <Card className="p-8 border border-border rounded-sm bg-card text-center">
          <p className="text-sm text-muted-foreground">暂无路线项</p>
        </Card>
      ) : (
        items.map((item: RoadmapItem) => (
          <RoadmapCard
            key={item.id}
            item={item}
            onEdit={openEdit}
            onChanged={load}
          />
        ))
      )}

      <RoadmapFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        onSaved={load}
      />
    </div>
  );
};

export default AdminRoadmapPanel;
