import React from "react";
import dayjs from "dayjs";

import { Card } from "@client/src/components/ui/card";
import { UserDisplay } from "@client/src/components/business-ui/user-display";
import type { AdminAccountRow } from "@shared/api.interface";

interface AdminAccountTableProps {
  accounts: AdminAccountRow[];
}

const formatTime = (iso: string | null): string =>
  iso ? dayjs(iso).format("YYYY-MM-DD HH:mm") : "—";

const AdminAccountTable: React.FC<AdminAccountTableProps> = ({ accounts }) => {
  if (accounts.length === 0) {
    return (
      <Card className="p-8 border border-border rounded-sm bg-card text-center">
        <p className="text-sm text-muted-foreground">暂无账号使用记录</p>
      </Card>
    );
  }

  return (
    <Card className="border border-border rounded-sm bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <h2 className="text-sm font-medium">
          使用者明细
          <span className="ml-2 text-xs text-muted-foreground font-mono">
            {accounts.length}
          </span>
        </h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-muted-foreground border-b border-border">
              <th className="text-left font-normal px-4 py-2">使用者</th>
              <th className="text-left font-normal px-4 py-2">账号名称</th>
              <th className="text-left font-normal px-4 py-2">Key 前缀</th>
              <th className="text-right font-normal px-4 py-2">打包</th>
              <th className="text-right font-normal px-4 py-2">取件</th>
              <th className="text-left font-normal px-4 py-2">最近活跃</th>
              <th className="text-left font-normal px-4 py-2">注册时间</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((a) => {
              return (
                <tr
                  key={a.id}
                  className="border-b border-border/60 last:border-0 hover:bg-accent/40 transition-colors"
                >
                  <td className="px-4 py-2.5">
                    {a.creatorUserId ? (
                      <UserDisplay value={[a.creatorUserId]} size="small" />
                    ) : (
                      <span className="text-muted-foreground">
                        {a.creatorName || "—"}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">{a.name}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
                    {a.apiKeyPrefix}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono tabular-nums">
                    {a.sentCount}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono tabular-nums">
                    {a.receivedCount}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground font-mono">
                    {formatTime(a.lastActiveAt)}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground font-mono">
                    {formatTime(a.createdAt)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

export default AdminAccountTable;
