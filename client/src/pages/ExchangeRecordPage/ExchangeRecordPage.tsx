import React, { useMemo, useState } from "react";
import {
  Send,
  Inbox,
  History,
  Copy,
  Check,
  LogIn,
  ShieldAlert,
  Search,
  CalendarIcon,
  X,
  ChevronDown,
  ChevronUp,
  PackageOpen,
  Download,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import dayjs from "dayjs";
import { NavLink, useNavigate } from "react-router-dom";

import { Card } from "@client/src/components/ui/card";
import { Button } from "@client/src/components/ui/button";
import { Badge } from "@client/src/components/ui/badge";
import { Input } from "@client/src/components/ui/input";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@client/src/components/ui/tabs";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@client/src/components/ui/popover";
import { Calendar } from "@client/src/components/ui/calendar";
import { useExtokenAccount } from "@client/src/hooks/useExtokenAccount";
import { formatBytes } from "@client/src/utils/format";
import { downloadDecryptedPackage } from "./download-package";
import type {
  SentPackageItem,
  ReceivedPackageItem,
} from "@shared/api.interface";

const buildSentCopyText = (pkg: SentPackageItem): string => {
  const lines = [
    `标题：${pkg.title}`,
    `简介：${pkg.description || "（无）"}`,
    `EXtoken取件码：${pkg.code || "仅创建时显示，请从原始分享记录获取"}`,
    `协议版本：v${pkg.schemaVersion}`,
    `交接状态：${pkg.handoffStatus}`,
    `来源 Agent：${pkg.sourceAgent || "未标注"}`,
    `项目：${pkg.workspaceProject || "未标注"}`,
    `发布日期：${dayjs(pkg.createdAt).format("YYYY-MM-DD HH:mm")}`,
    `文件包大小：${pkg.itemCount} 块 · ${formatBytes(pkg.contentSize)}`,
    `有效期：${
      pkg.expiresAt
        ? `至 ${dayjs(pkg.expiresAt).format("YYYY-MM-DD")}`
        : "永久有效"
    }`,
  ];
  return lines.join("\n");
};

const ExchangeRecordPage: React.FC = () => {
  const navigate = useNavigate();
  const { data, loading, error } = useExtokenAccount();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [copiedFull, setCopiedFull] = useState<string | null>(null);
  const [keyword, setKeyword] = useState("");
  const [fromDate, setFromDate] = useState<Date | undefined>(undefined);
  const [toDate, setToDate] = useState<Date | undefined>(undefined);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleDownload = async (packageId: string) => {
    setDownloadingId(packageId);
    try {
      await downloadDecryptedPackage(packageId);
      toast.success("已解密并下载到本地");
    } catch {
      toast.error("下载失败，请稍后重试");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleLogin = () => {
    navigate('/login');
  };

  const copyText = async (
    text: string,
    onOk: () => void,
    okMsg: string,
  ) => {
    try {
      await navigator.clipboard.writeText(text);
      onOk();
      toast.success(okMsg);
    } catch {
      toast.error("复制失败，请手动复制");
    }
  };

  const copyCode = (code: string) => {
    if (!code) {
      toast.error("该包未保存明文取件码，请从创建时返回的信息中获取");
      return;
    }
    copyText(
      code,
      () => {
        setCopiedCode(code);
        setTimeout(() => setCopiedCode(null), 2000);
      },
      "已复制 EXtoken取件码",
    );
  };

  const copyFull = (pkg: SentPackageItem) => {
    copyText(
      buildSentCopyText(pkg),
      () => {
        setCopiedFull(pkg.id);
        setTimeout(() => setCopiedFull(null), 2000);
      },
      "已复制完整信息",
    );
  };

  const matchDate = (iso: string): boolean => {
    const d = dayjs(iso);
    if (fromDate && d.isBefore(dayjs(fromDate).startOf("day"))) return false;
    if (toDate && d.isAfter(dayjs(toDate).endOf("day"))) return false;
    return true;
  };

  const kw = keyword.trim().toLowerCase();

  const filteredSent = useMemo(() => {
    if (!data) return [] as SentPackageItem[];
    return data.sent.filter((p) => {
      if (!matchDate(p.createdAt)) return false;
      if (!kw) return true;
      return (
        p.title.toLowerCase().includes(kw) ||
        (p.description ?? "").toLowerCase().includes(kw)
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, kw, fromDate, toDate]);

  const filteredReceived = useMemo(() => {
    if (!data) return [] as ReceivedPackageItem[];
    return data.received.filter((p) => {
      if (!matchDate(p.redeemedAt)) return false;
      if (!kw) return true;
      return (
        p.packageTitle.toLowerCase().includes(kw) ||
        (p.packageDescription ?? "").toLowerCase().includes(kw)
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, kw, fromDate, toDate]);

  const header = (
    <header className="space-y-2">
      <div className="flex items-center gap-2">
        <History className="size-5 text-primary" />
        <h1 className="text-lg font-semibold">交换记录</h1>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">
        你的 Agent 通过接入指令产生的发包与取包记录，都会汇总在这里。可搜索标题与简介、按日期筛选。
      </p>
    </header>
  );

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-7xl space-y-6">
        {header}
        <Card className="p-6 border border-border rounded-sm bg-card">
          <p className="text-sm text-muted-foreground">加载记录中...</p>
        </Card>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto w-full max-w-7xl space-y-6">
        {header}
        <Card className="p-6 border border-border rounded-sm bg-card flex flex-col items-center gap-4 text-center">
          <ShieldAlert className="size-8 text-primary" />
          <p className="text-sm font-medium">请先登录本站账号查看你的交换记录</p>
          <Button className="gap-1" onClick={handleLogin}>
            <LogIn className="size-4" />
            去登录
          </Button>
        </Card>
      </div>
    );
  }

  const { account } = data;
  const hasFilter = Boolean(kw || fromDate || toDate);

  const clearFilters = () => {
    setKeyword("");
    setFromDate(undefined);
    setToDate(undefined);
  };

  const dateButtonLabel = (d: Date | undefined, placeholder: string) =>
    d ? dayjs(d).format("YYYY-MM-DD") : placeholder;

  const renderEmpty = (
    type: "sent" | "received",
    filtered: boolean,
  ): React.ReactNode => {
    if (filtered) {
      return (
        <p className="text-sm text-muted-foreground py-6 text-center border border-dashed border-border rounded-sm">
          {type === "sent"
            ? "没有符合条件的发包记录"
            : "没有符合条件的取包记录"}
        </p>
      );
    }
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center border border-dashed border-border rounded-sm">
        <PackageOpen className="size-8 text-muted-foreground" />
        <div className="space-y-1">
          <p className="text-sm font-medium">
            {type === "sent" ? "还没有发出过 extoken 包" : "还没有取用过任何 extoken 包"}
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-xs">
            {type === "sent"
              ? "去首页复制接入指令发给你的 Agent，让它打包第一个任务上下文，记录会自动出现在这里。"
              : "拿到别人的 EXtoken 取件码后，让你的 Agent 按接入指令取件，记录会自动出现在这里。"}
          </p>
        </div>
        <NavLink to="/">
          <Button size="sm" className="gap-1">
            <Send className="size-3.5" />
            去首页复制接入指令
          </Button>
        </NavLink>
      </div>
    );
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(360px,0.8fr)] lg:items-end">
        {header}

        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4 border border-border rounded-sm bg-card/85 backdrop-blur-sm">
            <p className="text-xs text-muted-foreground">已发出</p>
            <p className="text-2xl font-mono font-bold text-primary">
              {account.sentCount}
            </p>
          </Card>
          <Card className="p-4 border border-border rounded-sm bg-card/85 backdrop-blur-sm">
            <p className="text-xs text-muted-foreground">已取用</p>
            <p className="text-2xl font-mono font-bold text-[hsl(152_68%_45%)]">
              {account.receivedCount}
            </p>
          </Card>
        </div>
      </div>

      <Card className="p-3 border border-border rounded-sm bg-card/85 backdrop-blur-sm">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索标题或简介"
            className="pl-8"
          />
          </div>
          <div className="flex flex-wrap items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                <CalendarIcon className="size-3.5" />
                {dateButtonLabel(fromDate, "起始日期")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={fromDate}
                onSelect={setFromDate}
              />
            </PopoverContent>
          </Popover>
          <span className="text-xs text-muted-foreground">至</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                <CalendarIcon className="size-3.5" />
                {dateButtonLabel(toDate, "结束日期")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={toDate} onSelect={setToDate} />
            </PopoverContent>
          </Popover>
          {hasFilter && (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-muted-foreground"
              onClick={clearFilters}
            >
              <X className="size-3.5" />
              清除筛选
            </Button>
          )}
          </div>
        </div>
      </Card>

      <Tabs defaultValue="sent">
        <TabsList className="grid grid-cols-2 w-full overflow-hidden">
          <TabsTrigger value="sent" className="gap-1.5">
            <Send className="size-4" />
            已发出的包
            <span className="font-mono text-xs">({filteredSent.length})</span>
          </TabsTrigger>
          <TabsTrigger value="received" className="gap-1.5">
            <Inbox className="size-4" />
            已取用的包
            <span className="font-mono text-xs">
              ({filteredReceived.length})
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sent" className="mt-4">
          {filteredSent.length === 0 ? (
            renderEmpty("sent", hasFilter)
          ) : (
            <div className="grid gap-3 xl:grid-cols-2">
              {filteredSent.map((pkg) => {
                const expanded = expandedId === pkg.id;
                return (
                  <Card
                    key={pkg.id}
                    className="p-3 border border-border rounded-sm bg-card space-y-2"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {pkg.title}
                        </p>
                        {pkg.description && (
                          <p
                            className={`text-xs text-muted-foreground ${
                              expanded ? "whitespace-pre-wrap" : "truncate"
                            }`}
                          >
                            {pkg.description}
                          </p>
                        )}
                      </div>
                      <Badge variant="secondary" className="shrink-0">
                        被取 {pkg.downloadCount} 次
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="outline">v{pkg.schemaVersion}</Badge>
                      <Badge variant="outline">{pkg.handoffStatus}</Badge>
                      {pkg.sourceAgent && (
                        <Badge variant="outline">{pkg.sourceAgent}</Badge>
                      )}
                      {pkg.workspaceProject && (
                        <Badge variant="outline">{pkg.workspaceProject}</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 px-2 py-1 rounded-sm bg-background border border-border font-mono text-xs break-all">
                        {pkg.code || "取件码仅创建时显示"}
                      </code>
                      <Button
                        variant="outline"
                        size="icon"
                        className={`shrink-0 size-7 transition-colors ${
                          copiedCode === pkg.code
                            ? "border-success text-success bg-success/10"
                            : ""
                        }`}
                        onClick={() => copyCode(pkg.code)}
                        disabled={!pkg.code}
                        aria-label="复制 EXtoken取件码"
                      >
                        {copiedCode === pkg.code ? (
                          <Check className="size-3.5" />
                        ) : (
                          <Copy className="size-3.5" />
                        )}
                      </Button>
                    </div>
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <p className="text-xs text-muted-foreground font-mono leading-5">
                        {pkg.itemCount} 块 · {formatBytes(pkg.contentSize)} ·{" "}
                        {dayjs(pkg.createdAt).format("YYYY-MM-DD HH:mm")}
                        {pkg.expiresAt
                          ? ` · 至 ${dayjs(pkg.expiresAt).format("YYYY-MM-DD")}`
                          : " · 永久"}
                      </p>
                      <div className="flex flex-wrap items-center gap-1 sm:shrink-0">
                        {pkg.description && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1 text-muted-foreground h-7 px-2"
                            onClick={() =>
                              setExpandedId(expanded ? null : pkg.id)
                            }
                          >
                            {expanded ? (
                              <ChevronUp className="size-3.5" />
                            ) : (
                              <ChevronDown className="size-3.5" />
                            )}
                            简介
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1 h-7 px-2"
                          disabled={downloadingId === pkg.id}
                          onClick={() => handleDownload(pkg.id)}
                        >
                          {downloadingId === pkg.id ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Download className="size-3.5" />
                          )}
                          下载
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className={`gap-1 h-7 px-2 transition-colors ${
                            copiedFull === pkg.id
                              ? "border-success text-success bg-success/10"
                              : ""
                          }`}
                          onClick={() => copyFull(pkg)}
                        >
                          {copiedFull === pkg.id ? (
                            <Check className="size-3.5" />
                          ) : (
                            <Copy className="size-3.5" />
                          )}
                          复制完整信息
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="received" className="mt-4">
          {filteredReceived.length === 0 ? (
            renderEmpty("received", hasFilter)
          ) : (
            <div className="grid gap-3 xl:grid-cols-2">
              {filteredReceived.map((item) => {
                const expanded = expandedId === item.id;
                return (
                  <Card
                    key={item.id}
                    className="p-3 border border-border rounded-sm bg-card"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {item.packageTitle}
                        </p>
                        {item.packageDescription && (
                          <p
                            className={`text-xs text-muted-foreground ${
                              expanded ? "whitespace-pre-wrap" : "truncate"
                            }`}
                          >
                            {item.packageDescription}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground font-mono mt-1">
                          来自 {item.packagerName} · 取用于{" "}
                          {dayjs(item.redeemedAt).format("YYYY-MM-DD HH:mm")}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-1 sm:shrink-0">
                        {item.packageDescription && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1 text-muted-foreground h-7 px-2"
                            onClick={() =>
                              setExpandedId(expanded ? null : item.id)
                            }
                          >
                            {expanded ? (
                              <ChevronUp className="size-3.5" />
                            ) : (
                              <ChevronDown className="size-3.5" />
                            )}
                            简介
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1 h-7 px-2"
                          disabled={downloadingId === item.packageId}
                          onClick={() => handleDownload(item.packageId)}
                        >
                          {downloadingId === item.packageId ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Download className="size-3.5" />
                          )}
                          下载
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ExchangeRecordPage;
