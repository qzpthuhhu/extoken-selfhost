import React, { useEffect, useState } from "react";
import {
  ShieldCheck,
  LayoutDashboard,
  MessageSquare,
  Megaphone,
  ListChecks,
} from "lucide-react";

import type { AdminOverviewResponse } from "@shared/api.interface";
import { Spinner } from "@client/src/components/ui/spinner";
import { useAuth, ROLE_SUBJECT } from "@lark-apaas/client-toolkit/auth";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@client/src/components/ui/tabs";
import { fetchAdminOverview } from "@client/src/api";
import AdminStatCards from "./AdminStatCards";
import AdminAccountTable from "./AdminAccountTable";
import AdminFeedbackPanel from "./AdminFeedbackPanel";
import AdminAnnouncementPanel from "./AdminAnnouncementPanel";
import AdminRoadmapPanel from "./AdminRoadmapPanel";

const AdminConsolePage: React.FC = () => {
  const { ability, isLoading: authLoading } = useAuth();
  const isAdmin = !authLoading && ability.can("admin", ROLE_SUBJECT);
  const [data, setData] = useState<AdminOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!isAdmin) {
      setDenied(true);
      setLoading(false);
      return;
    }
    let mounted = true;
    fetchAdminOverview()
      .then((res) => {
        if (mounted) setData(res);
      })
      .catch(() => {
        if (mounted) setDenied(true);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [authLoading, isAdmin]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner className="size-6" />
      </div>
    );
  }

  if (denied || !data) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-2">
        <ShieldCheck className="size-8 text-muted-foreground mx-auto" />
        <p className="text-sm text-muted-foreground">
          无权访问管理台，此页面仅对平台管理员开放。
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <ShieldCheck className="size-5 text-primary" />
        <h1 className="text-lg font-semibold">管理台</h1>
        <span className="text-xs text-muted-foreground">
          谁在使用本平台 · 仅管理员可见
        </span>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">
            <LayoutDashboard className="size-4" />
            概览
          </TabsTrigger>
          <TabsTrigger value="feedback">
            <MessageSquare className="size-4" />
            用户反馈
          </TabsTrigger>
          <TabsTrigger value="announcement">
            <Megaphone className="size-4" />
            公告管理
          </TabsTrigger>
          <TabsTrigger value="roadmap">
            <ListChecks className="size-4" />
            路线图
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <AdminStatCards stats={data.stats} />
          <AdminAccountTable accounts={data.accounts} />
        </TabsContent>

        <TabsContent value="feedback">
          <AdminFeedbackPanel />
        </TabsContent>

        <TabsContent value="announcement">
          <AdminAnnouncementPanel />
        </TabsContent>

        <TabsContent value="roadmap">
          <AdminRoadmapPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminConsolePage;
