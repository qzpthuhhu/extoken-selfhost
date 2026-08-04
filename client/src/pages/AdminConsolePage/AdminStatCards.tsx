import React from "react";
import { Users, Package, Download, Activity } from "lucide-react";

import { Card } from "@client/src/components/ui/card";
import type { AdminOverviewStats } from "@shared/api.interface";

interface AdminStatCardsProps {
  stats: AdminOverviewStats;
}

const AdminStatCards: React.FC<AdminStatCardsProps> = ({ stats }) => {
  const cards = [
    {
      label: "账号总数",
      value: stats.totalAccounts,
      icon: Users,
      hint: `${stats.activeAccounts7d} 个近 7 天活跃`,
    },
    {
      label: "累计打包",
      value: stats.totalPackages,
      icon: Package,
      hint: "全平台交换包",
    },
    {
      label: "累计取件",
      value: stats.totalRedemptions,
      icon: Download,
      hint: "全平台取件次数",
    },
    {
      label: "7 天活跃账号",
      value: stats.activeAccounts7d,
      icon: Activity,
      hint: "近 7 天有活动",
    },
  ];

  return (
    <div
      className="grid grid-cols-2 md:grid-cols-4 gap-3"
      data-ai-section-type="card-stat"
    >
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <Card
            key={c.label}
            className="p-4 border border-border rounded-sm bg-card flex flex-col gap-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{c.label}</span>
              <Icon className="size-4 text-primary" />
            </div>
            <span className="text-2xl font-bold font-mono tabular-nums">
              {c.value}
            </span>
            <span className="text-xs text-muted-foreground truncate">
              {c.hint}
            </span>
          </Card>
        );
      })}
    </div>
  );
};

export default AdminStatCards;
