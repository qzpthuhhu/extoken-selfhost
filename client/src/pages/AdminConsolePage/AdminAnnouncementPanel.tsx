import React, { useEffect, useState } from "react";
import dayjs from "dayjs";
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
import type { AnnouncementItem } from "@shared/api.interface";
import {
  fetchAdminAnnouncements,
  updateAnnouncement,
  deleteAnnouncement,
} from "@client/src/api";
import AnnouncementFormDialog from "./AnnouncementFormDialog";
import { ANNOUNCEMENT_CATEGORY_META } from "./announcement-constants";

const formatTime = (iso: string): string =>
  dayjs(iso).format("YYYY-MM-DD HH:mm");

interface AnnouncementCardProps {
  item: AnnouncementItem;
  onEdit: (item: AnnouncementItem) => void;
  onChanged: () => void;
}

const AnnouncementCard: React.FC<AnnouncementCardProps> = ({
  item,
  onEdit,
  onChanged,
}) => {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const meta = ANNOUNCEMENT_CATEGORY_META[item.category];

  const handleTogglePublish = async (): Promise<void> => {
    setBusy(true);
    try {
      await updateAnnouncement(item.id, { published: !item.published });
      toast.success(item.published ? "已下架" : "已发布");
      onChanged();
    } catch (error) {
      logger.error("切换发布状态失败", String(error));
      toast.error("操作失败，请重试");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (): Promise<void> => {
    setBusy(true);
    try {
      await deleteAnnouncement(item.id);
      toast.success("公告已删除");
      setConfirmOpen(false);
      onChanged();
    } catch (error) {
      logger.error("删除公告失败", String(error));
      toast.error("删除失败，请重试");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-4 border border-border rounded-sm bg-card space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <StatusBadge label={meta.label} className={meta.className} />
          <h3 className="text-sm font-medium truncate">{item.title}</h3>
        </div>
        <StatusBadge
          label={item.published ? "已发布" : "草稿"}
          className={
            item.published
              ? "text-[hsl(152_68%_45%)] bg-[hsl(152_68%_45%)]/15"
              : "bg-muted text-muted-foreground"
          }
        />
      </div>

      <p className="text-sm text-muted-foreground line-clamp-2 whitespace-pre-wrap break-words">
        {item.content}
      </p>

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground font-mono">
          {formatTime(item.updatedAt)}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleTogglePublish}
            disabled={busy}
          >
            {item.published ? "下架" : "发布"}
          </Button>
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
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除公告</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除公告「{item.title}」吗？此操作不可撤销。
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

const AdminAnnouncementPanel: React.FC = () => {
  const [items, setItems] = useState<AnnouncementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AnnouncementItem | null>(null);

  const load = async (): Promise<void> => {
    setLoading(true);
    try {
      const res = await fetchAdminAnnouncements();
      setItems(res.items);
    } catch (error) {
      logger.error("加载公告列表失败", String(error));
      toast.error("加载公告失败");
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

  const openEdit = (item: AnnouncementItem): void => {
    setEditing(item);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" onClick={openCreate}>
          <Plus className="size-4" />
          发布新公告
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner className="size-6" />
        </div>
      ) : items.length === 0 ? (
        <Card className="p-8 border border-border rounded-sm bg-card text-center">
          <p className="text-sm text-muted-foreground">暂无公告</p>
        </Card>
      ) : (
        items.map((item: AnnouncementItem) => (
          <AnnouncementCard
            key={item.id}
            item={item}
            onEdit={openEdit}
            onChanged={load}
          />
        ))
      )}

      <AnnouncementFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        onSaved={load}
      />
    </div>
  );
};

export default AdminAnnouncementPanel;
