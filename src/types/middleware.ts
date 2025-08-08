import type { ChatCompletion } from "./completions";
import { ChatRequest } from "./types";

/**
 * Middleware function type for processing requests
 */
export type Middleware = (
  req: ChatRequest,
  next: (req: ChatRequest) => Promise<ChatRequest>
) => Promise<ChatRequest>;

/**
 * Advanced middleware function type that can process both requests and responses
 */
export type AdvancedMiddleware = (
  req: ChatRequest,
  next: (req: ChatRequest) => Promise<ChatCompletion.ChatCompletion>
) => Promise<ChatCompletion.ChatCompletion>;
