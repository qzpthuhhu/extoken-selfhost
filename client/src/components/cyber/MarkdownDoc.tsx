import React, { useMemo } from "react";
import { Link2 } from "lucide-react";

import { Streamdown } from "@client/src/components/ui/streamdown";
import { UniversalLink } from '@lark-apaas/client-toolkit/components/UniversalLink';

interface MarkdownDocProps {
  content: string;
  /** 是否在右侧展示悬浮目录（长文档场景），默认 false */
  showToc?: boolean;
  className?: string;
}

interface TocItem {
  level: number;
  text: string;
  slug: string;
}

const slugify = (text: string): string =>
  text
    .toLowerCase()
    .trim()
    .replace(/[`*_~]/g, "")
    .replace(/[^\w\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "");

const WARNING_HINTS = ["警告", "注意", "危险", "danger", "warning", "⚠️", "❗"];

/** 从 React children 递归提取纯文本，用于生成 slug / 判断 callout 类型 */
const extractText = (node: React.ReactNode): string => {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (React.isValidElement(node)) {
    return extractText((node.props as { children?: React.ReactNode }).children);
  }
  return "";
};

/** 解析原始 markdown 的 ATX 标题，构建目录（跳过代码块内的 # 行） */
const parseHeadings = (markdown: string): TocItem[] => {
  const lines = markdown.split("\n");
  const items: TocItem[] = [];
  let inFence = false;
  for (const line of lines) {
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const match = /^(#{1,3})\s+(.*)$/.exec(line);
    if (match) {
      const level = match[1].length;
      const text = match[2].replace(/[#\s]+$/, "").trim();
      if (text) items.push({ level, text, slug: slugify(text) });
    }
  }
  return items;
};

const MarkdownDoc: React.FC<MarkdownDocProps> = ({
  content,
  showToc = false,
  className,
}) => {
  const headings = useMemo(
    () => (showToc ? parseHeadings(content) : []),
    [content, showToc],
  );

  const components = useMemo(
    () => ({
      blockquote: ({ children }: { children?: React.ReactNode }) => {
        const text = extractText(children);
        const isWarning = WARNING_HINTS.some((h) =>
          text.toLowerCase().includes(h.toLowerCase()),
        );
        return (
          <blockquote
            data-streamdown="blockquote"
            data-callout={isWarning ? "warning" : "tip"}
          >
            {children}
          </blockquote>
        );
      },
      h1: ({ children }: { children?: React.ReactNode }) =>
        renderHeading(1, children),
      h2: ({ children }: { children?: React.ReactNode }) =>
        renderHeading(2, children),
      h3: ({ children }: { children?: React.ReactNode }) =>
        renderHeading(3, children),
    }),
    [],
  );

  return (
    <div className={`flex gap-8 ${className ?? ""}`}>
      <div className="min-w-0 flex-1">
        <Streamdown className="cyber-prose" components={components}>
          {content}
        </Streamdown>
      </div>
      {showToc && headings.length > 2 && (
        <nav className="cyber-toc hidden lg:block" aria-label="目录">
          <div className="cyber-toc-title">目录</div>
          {headings.map((h, i) => (
            <UniversalLink
              key={`${h.slug}-${i}`}
              to={`#${h.slug}`}
              data-level={h.level}
              onClick={(e) => handleTocClick(e, h.slug)}
            >
              {h.text}
            </UniversalLink>
          ))}
        </nav>
      )}
    </div>
  );
};

const renderHeading = (level: 1 | 2 | 3, children: React.ReactNode) => {
  const slug = slugify(extractText(children));
  const Tag = `h${level}` as "h1" | "h2" | "h3";
  return (
    <Tag id={slug} className="cyber-heading" data-streamdown={`heading-${level}`}>
      <UniversalLink
        to={`#${slug}`}
        className="heading-anchor"
        aria-label="锚点链接"
        onClick={(e) => handleTocClick(e, slug)}
      >
        <Link2 className="inline size-4" />
      </UniversalLink>
      {children}
    </Tag>
  );
};

const handleTocClick = (
  e: React.MouseEvent<HTMLAnchorElement>,
  slug: string,
) => {
  const el = document.getElementById(slug);
  if (el) {
    e.preventDefault();
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    el.scrollIntoView({
      behavior: reduced ? "auto" : "smooth",
      block: "start",
    });
  }
};

export default MarkdownDoc;
