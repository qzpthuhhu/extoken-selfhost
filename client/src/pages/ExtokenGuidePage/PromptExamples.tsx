import React, { useState } from "react";
import { Copy, Check, MessageSquareCode } from "lucide-react";
import { toast } from "sonner";

import { Card } from "@client/src/components/ui/card";
import { Button } from "@client/src/components/ui/button";

interface PromptExample {
  scene: string;
  desc: string;
  prompt: string;
}

const EXAMPLES: PromptExample[] = [
  {
    scene: "打包交接给另一个 Agent",
    desc: "在一个 Agent 里干到一半，想换个 Agent 接着干",
    prompt:
      "我要把当前任务交接给另一个 Agent。请用 extoken 把我们这段对话、改动过的文件清单和还没做完的待办打包成一个交换包，生成EXtoken取件码发给我。",
  },
  {
    scene: "凭EXtoken取件码接续上下文",
    desc: "拿到别人给的EXtoken取件码，让新 Agent 秒懂前因后果",
    prompt:
      "这是上一个 Agent 给我的 extoken EXtoken取件码：<在这里粘贴EXtoken取件码>。请用 extoken 取回里面的上下文，理解之前的进度和待办后，继续把剩下的工作做完。",
  },
  {
    scene: "分享项目配置 / 文档",
    desc: "把一份配置或规范打包，团队里的 Agent 都能取用",
    prompt:
      "把这份项目配置和相关规范文档用 extoken 打包好，生成EXtoken取件码，我要分享给团队其他同学的 Agent 使用。",
  },
];

const PromptExamples: React.FC = () => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      toast.success("已复制提示词");
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch {
      toast.error("复制失败，请手动复制");
    }
  };

  return (
    <section className="space-y-3">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <MessageSquareCode className="size-4 text-primary" />
          案例提示词 · 拿来即用
        </h2>
        <p className="text-xs text-muted-foreground leading-relaxed">
          接入完成后，直接把下面这类话发给你的 Agent 即可，无需记接口和参数。
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {EXAMPLES.map((item, index) => (
          <Card
            key={item.scene}
            className="glass-panel p-4 rounded-sm flex flex-col gap-3"
          >
            <div className="space-y-1">
              <div className="text-sm font-medium">{item.scene}</div>
              <div className="text-xs text-muted-foreground leading-relaxed">
                {item.desc}
              </div>
            </div>
            <div className="flex-1 px-3 py-2 rounded-sm bg-background/50 border border-primary/15 text-xs leading-relaxed text-foreground/90">
              {item.prompt}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-1 w-full cyber-magnetic"
              onClick={() => handleCopy(item.prompt, index)}
            >
              {copiedIndex === index ? (
                <>
                  <Check className="size-4 text-success" />
                  已复制
                </>
              ) : (
                <>
                  <Copy className="size-4" />
                  复制提示词
                </>
              )}
            </Button>
          </Card>
        ))}
      </div>
    </section>
  );
};

export default PromptExamples;
