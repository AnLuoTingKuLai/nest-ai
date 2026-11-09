/**
 * 订单查询链相关类型。
 */
import { z } from 'zod';

import { QUERY_ORDER_REPLY_SCHEMA } from './schema.js';

/** 订单查询入参：用户原问题（含订单号时可直接查） */
export interface QueryOrderInput {
  /** 用户问题，例如「查一下订单 ORD-123 的物流」 */
  content: string;
}

/** 订单查询结构化回复 */
export type QueryOrderReply = z.infer<typeof QUERY_ORDER_REPLY_SCHEMA>;
