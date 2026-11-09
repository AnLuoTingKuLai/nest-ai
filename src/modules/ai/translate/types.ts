/**
 * 翻译链相关类型。
 */
import type { StreamCallConfig } from '../types.js';

/** 翻译链入参 */
export interface TranslateInput {
  /** 目标语言 */
  language: string;
  /** 原文 */
  text: string;
}

/** 翻译链出参：初译与润色分字段返回，供双栏展示 */
export interface TranslateResult {
  /** 初译译文 */
  translation: string;
  /** 润色译文；未走润色时为空串 */
  polished: string;
}

/** 流式翻译可选配置 */
export type TranslateStreamConfig = StreamCallConfig;
