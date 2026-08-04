import { downloadPackage } from "@client/src/api";
import type { ExtokenItem, ExtokenItemType } from "@shared/api.interface";
import dayjs from "dayjs";

const TYPE_LABEL: Record<ExtokenItemType, string> = {
  chat: "对话上下文",
  doc: "文档",
  config: "配置",
};

const sanitizeFileName = (name: string): string => {
  const cleaned = name.replace(/[\\/:*?"<>|]/g, "_").trim();
  return cleaned.slice(0, 80) || "extoken-package";
};

const buildMarkdown = (
  title: string,
  description: string,
  createdAt: string,
  items: ExtokenItem[],
): string => {
  const lines: string[] = [
    `# ${title}`,
    "",
    description ? description : "（无简介）",
    "",
    `> 发布时间：${dayjs(createdAt).format("YYYY-MM-DD HH:mm")} · 共 ${items.length} 个内容块`,
    "",
  ];
  items.forEach((item, index) => {
    lines.push(
      `## ${index + 1}. ${item.title || "（无标题）"} · ${TYPE_LABEL[item.type] ?? item.type}`,
    );
    lines.push("");
    lines.push(item.content ?? "");
    lines.push("");
  });
  return lines.join("\n");
};

const triggerDownload = (fileName: string, content: string): void => {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
};

export const downloadDecryptedPackage = async (
  packageId: string,
): Promise<void> => {
  const data = await downloadPackage(packageId);
  const markdown = buildMarkdown(
    data.title,
    data.description,
    data.createdAt,
    data.items,
  );
  triggerDownload(`${sanitizeFileName(data.title)}.md`, markdown);
};
