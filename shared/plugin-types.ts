// ---- plugin:generate_handover_document_1 ----
// ============================================================
// 插件 generate_handover_document_1 (任务交接文档生成) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface GenerateHandoverDocumentOneInput {
  /** 拼接好的交接单信息，包含任务标题、任务背景、源/目标Agent、Git分支、已改动文件、遗留问题、下一步计划等内容 */
  handover_info: string;
}

/**
 * capabilityClient.load('generate_handover_document_1').call<GenerateHandoverDocumentOneOutput>('textGenerate', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { response, content } = result;
 */
export interface GenerateHandoverDocumentOneOutput {
  /** [object Object] */
  response?: string;
  /** [object Object] */
  content: string;
}
// ---- end:generate_handover_document_1 ----