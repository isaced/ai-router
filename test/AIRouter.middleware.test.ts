import { describe, test, expect, beforeEach, afterEach, spyOn } from "bun:test";
import AIRouter from "../src/AIRouter";
import type { AIRouterConfig, ProviderModel } from "../src/types/types";
import type { Middleware } from "../src/types/middleware";
import type { ChatCompletion } from "../src/types/completions";
import type { ChatRequest } from "../src/types/chat";
import * as selectProviderModule from "../src/core/selectProvider";
import * as sendRequestModule from "../src/core/sendRequest";

describe("AIRouter Onion Model Middleware", () => {
  let router: AIRouter;
  let mockConfig: AIRouterConfig;
  let mockSelectProvider: any;
  let mockSendRequest: any;
  let mockResponse: ChatCompletion.ChatCompletion;

  beforeEach(() => {
    mockConfig = {
      providers: [
        {
          name: "TestProvider",
          endpoint: "https://api.openai.com/v1",
          accounts: [
            {
              apiKey: "test-key",
              models: ["gpt-3.5-turbo"],
            },
          ],
        },
      ],
      strategy: "random",
    };
    router = new AIRouter(mockConfig);

    mockResponse = {
      id: "test-id",
      created: Date.now(),
      model: "gpt-3.5-turbo",
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: "Test response",
          },
          finish_reason: "stop",
        },
      ],
      usage: {
        prompt_tokens: 10,
        completion_tokens: 5,
        total_tokens: 15,
      },
    };

    // Mock the functions
    mockSelectProvider = spyOn(
      selectProviderModule,
      "selectProvider"
    ).mockResolvedValue({
      model: "gpt-3.5-turbo",
      endpoint: "https://api.openai.com/v1",
      apiKey: "test-key",
    } as ProviderModel);

    mockSendRequest = spyOn(sendRequestModule, "sendRequest").mockResolvedValue(
      mockResponse
    );

    // Clear mock call history
    mockSelectProvider.mockClear();
    mockSendRequest.mockClear();
  });

  afterEach(() => {
    // Restore all mocks after each test
    mockSelectProvider.mockRestore();
    mockSendRequest.mockRestore();
  });

  test("should work without middleware", async () => {
    const request: ChatRequest = {
      messages: [{ role: "user", content: "Hello" }],
    };

    const response = await router.chat(request);

    expect(response).toEqual(mockResponse);
    expect(mockSendRequest).toHaveBeenCalledTimes(1);
  });

  test("should execute middleware that modifies request", async () => {
    const middleware: Middleware = async (req, next) => {
      const modifiedReq = {
        ...req,
        messages: [
          ...req.messages,
          { role: "system", content: "Added by middleware" },
        ],
      };
      return await next(modifiedReq);
    };

    router.use(middleware);

    const request: ChatRequest = {
      messages: [{ role: "user", content: "Hello" }],
    };

    await router.chat(request);

    expect(mockSendRequest).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        messages: expect.arrayContaining([
          { role: "user", content: "Hello" },
          { role: "system", content: "Added by middleware" },
        ]),
      }),
      expect.any(Object), // config parameter
      expect.any(Object) // rateLimitManager parameter
    );
  });

  test("should execute middleware that modifies response", async () => {
    const middleware: Middleware = async (req, next) => {
      const response = await next(req);
      return {
        ...response,
        choices: response.choices.map(choice => ({
          ...choice,
          message: {
            ...choice.message,
            content: choice.message.content + " (modified by middleware)",
          },
        })),
      };
    };

    router.use(middleware);

    const request: ChatRequest = {
      messages: [{ role: "user", content: "Hello" }],
    };

    const response = await router.chat(request);

    expect(response.choices[0].message.content).toBe(
      "Test response (modified by middleware)"
    );
  });

  test("should execute multiple middleware in onion model order", async () => {
    const executionOrder: string[] = [];

    const middleware1: Middleware = async (req, next) => {
      executionOrder.push("middleware1-before");
      const response = await next(req);
      executionOrder.push("middleware1-after");
      return response;
    };

    const middleware2: Middleware = async (req, next) => {
      executionOrder.push("middleware2-before");
      const response = await next(req);
      executionOrder.push("middleware2-after");
      return response;
    };

    const middleware3: Middleware = async (req, next) => {
      executionOrder.push("middleware3-before");
      const response = await next(req);
      executionOrder.push("middleware3-after");
      return response;
    };

    router.use(middleware1).use(middleware2).use(middleware3);

    const request: ChatRequest = {
      messages: [{ role: "user", content: "Hello" }],
    };

    await router.chat(request);

    // Should follow onion model pattern: 1-before, 2-before, 3-before, 3-after, 2-after, 1-after
    expect(executionOrder).toEqual([
      "middleware1-before",
      "middleware2-before",
      "middleware3-before",
      "middleware3-after",
      "middleware2-after",
      "middleware1-after",
    ]);
  });

  test("should handle middleware that transforms both request and response", async () => {
    const loggingMiddleware: Middleware = async (req, next) => {
      // 修改请求
      const modifiedReq = {
        ...req,
        messages: [
          { role: "system", content: `Request processed at ${new Date().toISOString()}` },
          ...req.messages,
        ],
      };

      // 调用下一个中间件
      const response = await next(modifiedReq);

      // 修改响应
      return {
        ...response,
        choices: response.choices.map(choice => ({
          ...choice,
          message: {
            ...choice.message,
            content: `[${new Date().toISOString()}] ${choice.message.content}`,
          },
        })),
      };
    };

    router.use(loggingMiddleware);

    const request: ChatRequest = {
      messages: [{ role: "user", content: "Hello" }],
    };

    const response = await router.chat(request);

    // 检查请求是否被修改
    expect(mockSendRequest).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: "system",
            content: expect.stringContaining("Request processed at"),
          }),
          { role: "user", content: "Hello" },
        ]),
      }),
      expect.any(Object), // config parameter
      expect.any(Object) // rateLimitManager parameter
    );

    // 检查响应是否被修改
    expect(response.choices[0].message.content).toMatch(
      /^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] Test response$/
    );
  });

  test("should handle middleware errors properly", async () => {
    const errorMiddleware: Middleware = async (req, next) => {
      if (req.messages.some(msg => msg?.content?.includes("error"))) {
        throw new Error("Middleware error");
      }
      return await next(req);
    };

    router.use(errorMiddleware);

    const request: ChatRequest = {
      messages: [{ role: "user", content: "trigger error" }],
    };

    await expect(router.chat(request)).rejects.toThrow("Middleware error");
  });

  test("should support async middleware with delays", async () => {
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    const delayMiddleware: Middleware = async (req, next) => {
      await delay(10); // 模拟异步操作
      const response = await next(req);
      await delay(10); // 模拟异步操作
      return response;
    };

    router.use(delayMiddleware);

    const request: ChatRequest = {
      messages: [{ role: "user", content: "Hello" }],
    };

    const startTime = Date.now();
    const response = await router.chat(request);
    const endTime = Date.now();

    expect(response).toEqual(mockResponse);
    expect(endTime - startTime).toBeGreaterThanOrEqual(20); // 至少20ms延迟
  });
});
