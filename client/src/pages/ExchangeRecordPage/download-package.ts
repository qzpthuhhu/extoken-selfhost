import { downloadPackage } from "@client/src/api";
import type {
  ExtokenContinuationContext,
  ExtokenIntegrityProof,
  ExtokenItem,
  ExtokenItemType,
  ExtokenWorkspaceIdentity,
} from "@shared/api.interface";
import dayjs from "dayjs";

const TYPE_LABEL: Record<ExtokenItemType, string> = {
  chat: "对话上下文",
  doc: "文档",
  config: "配置",
  file_diff: "文件改动",
  decision: "决策记录",
  todo: "待办事项",
  tool_result: "工具结果",
  env_note: "环境说明",
  error: "错误记录",
  token_usage: "Token 用量",
  permission: "权限记录",
};

const sanitizeFileName = (name: string): string => {
  const cleaned = name.replace(/[\\/:*?"<>|]/g, "_").trim();
  return cleaned.slice(0, 80) || "extoken-package";
};

const buildMarkdown = (
  title: string,
  description: string,
  createdAt: string,
  schemaVersion: number,
  continuation: ExtokenContinuationContext,
  workspace: ExtokenWorkspaceIdentity,
  integrity: ExtokenIntegrityProof,
  items: ExtokenItem[],
): string => {
  const lines: string[] = [
    `# ${title}`,
    "",
    description ? description : "（无简介）",
    "",
    `> 协议版本：v${schemaVersion} · 发布时间：${dayjs(createdAt).format("YYYY-MM-DD HH:mm")} · 共 ${items.length} 个内容块`,
    "",
    "## 接续状态",
    "",
    `- 来源 Agent：${continuation.sourceAgent || "未标注"}`,
    `- 来源会话：${continuation.sourceSessionId || "未标注"}`,
    `- 来源运行：${continuation.sourceRunId || "未标注"}`,
    `- 来源轮次：${continuation.sourceTurnId || "未标注"}`,
    `- 交接状态：${continuation.handoffStatus || "ready"}`,
    `- 阻塞状态：${continuation.blockingState || "无"}`,
    "",
    "## 下一步",
    "",
    ...(continuation.nextActions && continuation.nextActions.length > 0
      ? continuation.nextActions.map((item) => `- ${item}`)
      : ["- 待补充"]),
    "",
    "## 工作区身份",
    "",
    `- 项目：${workspace.projectName || "未标注"}`,
    `- 根目录 Hash：${workspace.rootHash || "未标注"}`,
    `- Git Remote：${workspace.gitRemote || "未标注"}`,
    `- Git Branch：${workspace.gitBranch || "未标注"}`,
    `- Git Commit：${workspace.gitCommit || "未标注"}`,
    `- Dirty Files Hash：${workspace.dirtyFilesHash || "未标注"}`,
    "",
    "## 完整性证明",
    "",
    `- Payload SHA256：${integrity.payloadSha256 || "未提供"}`,
    `- Files Hash：${integrity.filesHash || "未提供"}`,
    `- Command Hash：${integrity.commandHash || "未提供"}`,
    `- Task State Hash：${integrity.taskStateHash || "未提供"}`,
    "",
    "## 内容块",
    "",
  ];
  items.forEach((item, index) => {
    lines.push(
      `## ${index + 1}. ${item.title || "（无标题）"} · ${TYPE_LABEL[item.type] ?? item.type}`,
    );
    lines.push("");
    lines.push(item.content ?? "");
    if (item.metadata && Object.keys(item.metadata).length > 0) {
      lines.push("");
      lines.push("```json");
      lines.push(JSON.stringify(item.metadata, null, 2));
      lines.push("```");
    }
    lines.push("");
  });
  if (integrity.toolOperations && integrity.toolOperations.length > 0) {
    lines.push("## 工具调用边界");
    lines.push("");
    integrity.toolOperations.forEach((op, index) => {
      lines.push(
        `${index + 1}. ${op.toolName} · ${op.recoveryMode || "outcome_unknown"} · ${op.canonicalArgsHash || "no-hash"}`,
      );
      if (op.summary) lines.push(`   ${op.summary}`);
    });
    lines.push("");
  }
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
    data.schemaVersion,
    data.continuation,
    data.workspace,
    data.integrity,
    data.items,
  );
  triggerDownload(`${sanitizeFileName(data.title)}.md`, markdown);
};
