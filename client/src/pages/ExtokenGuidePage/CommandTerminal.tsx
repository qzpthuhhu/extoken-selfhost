import React from "react";

interface CommandTerminalProps {
  openApiBase: string;
  gatewayKey: string;
  extokenKey: string;
}

/**
 * 接入指令终端展示：模拟终端窗口，对 URL / Header / Key 做语法高亮。
 * 采用固定文案模板 + 分词着色，非用户输入渲染，无 XSS 风险。
 */
const CommandTerminal: React.FC<CommandTerminalProps> = ({
  openApiBase,
  gatewayKey,
  extokenKey,
}) => {
  return (
    <div className="term-block overflow-hidden">
      {/* 终端标题栏 */}
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-primary/15">
        <span className="size-2.5 rounded-full bg-[hsl(0_72%_58%)]" />
        <span className="size-2.5 rounded-full bg-[hsl(32_95%_58%)]" />
        <span className="size-2.5 rounded-full bg-[hsl(152_70%_48%)]" />
        <span className="ml-2 text-[11px] font-mono term-tok-dim">
          extoken — access instruction
        </span>
      </div>
      <div className="p-3.5 font-mono text-xs leading-relaxed break-all space-y-1.5">
        <p>
          <span className="term-tok-dim">$ </span>
          <span className="term-tok-dim">
            接入 extoken 开放网关，请求端点：
          </span>
        </p>
        <p>
          <span className="term-tok-dim"># endpoint </span>
          <span className="term-tok-url">{openApiBase}</span>
        </p>
        <p>
          <span className="term-tok-header">Authorization</span>
          <span className="term-tok-dim">: Bearer </span>
          <span className="term-tok-key">{gatewayKey}</span>
        </p>
        <p>
          <span className="term-tok-header">x-extoken-key</span>
          <span className="term-tok-dim">: </span>
          <span className="term-tok-key">{extokenKey}</span>
        </p>
        <p className="pt-1 text-[11px] term-tok-dim">
          # 先 GET {"{endpoint}"}/skill 获取技能说明并安装为常驻 skill，
          再按说明打包 / 取件
        </p>
      </div>
    </div>
  );
};

export default CommandTerminal;
