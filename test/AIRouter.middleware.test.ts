import { describe, test, expect, beforeEach, mock, spyOn } from "bun:test";
import AIRouter from "../src/AIRouter";
import type { AIRouterConfig, ChatRequest } from "../src/types/types";
import type { Middleware } from "../src/types/middleware";
import * as selectProviderModule from "../src/core/selectProvider";
import * as sendRequestModule from "../src/core/sendRequest";

describe("AIRouter Middleware", () => {
  let router: AIRouter;
  let mockConfig: AIRouterConfig;
  let mockSelectProvider: any;
  let mockSendRequest: any;

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

    // Mock the functions
    mockSelectProvider = spyOn(
      selectProviderModule,
      "selectProvider"
    ).mockReturnValue({
      model: "gpt-3.5-turbo",
      endpoint: "https://api.openai.com/v1",
      apiKey: "test-key",
    });

    mockSendRequest = spyOn(sendRequestModule, "sendRequest").mockResolvedValue(
      {
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
      }
    );

    // Clear mock call history
    mockSelectProvider.mockClear();
    mockSendRequest.mockClear();
  });

  test("should work without middleware", async () => {
    const request: ChatRequest = {
      messages: [{ role: "user", content: "Hello" }],
    };

    const response = await router.chat(request);

    expect(response).toBeDefined();
    expect(mockSendRequest).toHaveBeenCalledTimes(1);
    expect(mockSendRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gpt-3.5-turbo",
        endpoint: "https://api.openai.com/v1",
        apiKey: "test-key",
      }),
      request
    );
  });

  test("should add single middleware using use() method", () => {
    const middleware: Middleware = async (req, next) => next(req);

    const result = router.use(middleware);

    // Should return router instance for chaining
    expect(result).toBe(router);
    expect((router as any).config.middleware).toHaveLength(1);
    expect((router as any).config.middleware[0]).toBe(middleware);
  });

  test("should add multiple middleware using use() method", () => {
    const middleware1: Middleware = async (req, next) => next(req);
    const middleware2: Middleware = async (req, next) => next(req);

    router.use(middleware1).use(middleware2);

    expect((router as any).config.middleware).toHaveLength(2);
    expect((router as any).config.middleware[0]).toBe(middleware1);
    expect((router as any).config.middleware[1]).toBe(middleware2);
  });

  test("should execute single middleware that modifies request", async () => {
    const middleware: Middleware = async (req, next) => {
      const modifiedReq = {
        ...req,
        messages: [
          ...req.messages,
          { role: "system", content: "Modified by middleware" },
        ],
      };
      return next(modifiedReq);
    };

    router.use(middleware);

    const request: ChatRequest = {
      messages: [{ role: "user", content: "Hello" }],
    };

    await router.chat(request);

    // Check that sendRequest was called with modified request
    expect(mockSendRequest).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        messages: expect.arrayContaining([
          { role: "user", content: "Hello" },
          { role: "system", content: "Modified by middleware" },
        ]),
      })
    );
  });

  test("should execute multiple middleware in order", async () => {
    const executionOrder: string[] = [];

    const middleware1: Middleware = async (req, next) => {
      executionOrder.push("middleware1-start");
      const modifiedReq = {
        ...req,
        messages: [
          ...req.messages,
          { role: "system", content: "From middleware1" },
        ],
      };
      const result = await next(modifiedReq);
      executionOrder.push("middleware1-end");
      return result;
    };

    const middleware2: Middleware = async (req, next) => {
      executionOrder.push("middleware2-start");
      const modifiedReq = {
        ...req,
        messages: [
          ...req.messages,
          { role: "system", content: "From middleware2" },
        ],
      };
      const result = await next(modifiedReq);
      executionOrder.push("middleware2-end");
      return result;
    };

    router.use(middleware1).use(middleware2);

    const request: ChatRequest = {
      messages: [{ role: "user", content: "Hello" }],
    };

    await router.chat(request);

    // Check execution order
    expect(executionOrder).toEqual([
      "middleware1-start",
      "middleware2-start",
      "middleware2-end",
      "middleware1-end",
    ]);

    // Check that sendRequest was called with request modified by both middleware
    expect(mockSendRequest).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        messages: expect.arrayContaining([
          { role: "user", content: "Hello" },
          { role: "system", content: "From middleware1" },
          { role: "system", content: "From middleware2" },
        ]),
      })
    );
  });

  test("should handle middleware that adds model to request", async () => {
    const middleware: Middleware = async (req, next) => {
      const modifiedReq = {
        ...req,
        model: "gpt-4",
      };
      return next(modifiedReq);
    };

    router.use(middleware);

    const request: ChatRequest = {
      messages: [{ role: "user", content: "Hello" }],
    };

    await router.chat(request);

    expect(mockSendRequest).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        model: "gpt-4",
        messages: [{ role: "user", content: "Hello" }],
      })
    );
  });

  test("should handle middleware that adds custom properties", async () => {
    const middleware: Middleware = async (req, next) => {
      const modifiedReq = {
        ...req,
        temperature: 0.7,
        max_tokens: 100,
      };
      return next(modifiedReq);
    };

    router.use(middleware);

    const request: ChatRequest = {
      messages: [{ role: "user", content: "Hello" }],
    };

    await router.chat(request);

    expect(mockSendRequest).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        temperature: 0.7,
        max_tokens: 100,
        messages: [{ role: "user", content: "Hello" }],
      })
    );
  });

  test("should handle middleware that logs requests", async () => {
    const logs: any[] = [];

    const loggingMiddleware: Middleware = async (req, next) => {
      logs.push({ type: "request", data: { ...req } });
      const processedReq = await next(req);
      logs.push({ type: "processed_request", data: { ...processedReq } });
      return processedReq;
    };

    router.use(loggingMiddleware);

    const request: ChatRequest = {
      messages: [{ role: "user", content: "Hello" }],
    };

    const response = await router.chat(request);

    expect(logs).toHaveLength(2);
    expect(logs[0]).toEqual({
      type: "request",
      data: request,
    });
    expect(logs[1].type).toBe("processed_request");
    expect(logs[1].data).toHaveProperty("messages");
    expect(response).toHaveProperty("id");
    expect(response).toHaveProperty("choices");
  });

  test("should handle middleware that validates requests", async () => {
    const validationMiddleware: Middleware = async (req, next) => {
      if (!req.messages || req.messages.length === 0) {
        throw new Error("Messages are required");
      }
      if (
        req.messages.some((msg) => !msg.content || msg.content.trim() === "")
      ) {
        throw new Error("Message content cannot be empty");
      }
      return next(req);
    };

    router.use(validationMiddleware);

    // Test valid request
    const validRequest: ChatRequest = {
      messages: [{ role: "user", content: "Hello" }],
    };

    await expect(router.chat(validRequest)).resolves.toBeDefined();

    // Test invalid request - empty messages
    const invalidRequest1: ChatRequest = {
      messages: [],
    };

    await expect(router.chat(invalidRequest1)).rejects.toThrow(
      "Messages are required"
    );

    // Test invalid request - empty content
    const invalidRequest2: ChatRequest = {
      messages: [{ role: "user", content: "" }],
    };

    await expect(router.chat(invalidRequest2)).rejects.toThrow(
      "Message content cannot be empty"
    );
  });

  test("should handle middleware that modifies request for response processing", async () => {
    const responseProcessingMiddleware: Middleware = async (req, next) => {
      // Add metadata to request that can be used for response processing
      const modifiedReq = {
        ...req,
        metadata: {
          processedAt: new Date().toISOString(),
          middleware: "response-processing",
        },
      };
      return next(modifiedReq);
    };

    router.use(responseProcessingMiddleware);

    const request: ChatRequest = {
      messages: [{ role: "user", content: "Hello" }],
    };

    await router.chat(request);

    // Verify that sendRequest was called with metadata
    expect(mockSendRequest).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        metadata: expect.objectContaining({
          processedAt: expect.any(String),
          middleware: "response-processing",
        }),
        messages: [{ role: "user", content: "Hello" }],
      })
    );
  });

  test("should propagate errors from middleware", async () => {
    const errorMiddleware: Middleware = async (req, next) => {
      throw new Error("Middleware error");
    };

    router.use(errorMiddleware);

    const request: ChatRequest = {
      messages: [{ role: "user", content: "Hello" }],
    };

    await expect(router.chat(request)).rejects.toThrow("Middleware error");
  });

  test("should handle async middleware properly", async () => {
    const asyncMiddleware: Middleware = async (req, next) => {
      // Simulate async operation
      await new Promise((resolve) => setTimeout(resolve, 10));

      const modifiedReq = {
        ...req,
        processedAsync: true,
      };

      return next(modifiedReq);
    };

    router.use(asyncMiddleware);

    const request: ChatRequest = {
      messages: [{ role: "user", content: "Hello" }],
    };

    await router.chat(request);

    expect(mockSendRequest).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        processedAsync: true,
        messages: [{ role: "user", content: "Hello" }],
      })
    );
  });

  test("should handle middleware with complex request transformation", async () => {
    const complexMiddleware: Middleware = async (req, next) => {
      // Add system message if not present
      const hasSystemMessage = req.messages.some(
        (msg) => msg.role === "system"
      );
      let messages = req.messages;

      if (!hasSystemMessage) {
        messages = [
          { role: "system", content: "You are a helpful assistant." },
          ...messages,
        ];
      }

      // Limit message content length
      messages = messages.map((msg) => ({
        ...msg,
        content:
          msg.content.length > 100
            ? msg.content.substring(0, 100) + "..."
            : msg.content,
      }));

      const modifiedReq = {
        ...req,
        messages,
        temperature: req.temperature || 0.7,
        max_tokens: req.max_tokens || 150,
      };

      return next(modifiedReq);
    };

    router.use(complexMiddleware);

    const request: ChatRequest = {
      messages: [
        {
          role: "user",
          content:
            "This is a very long message that exceeds the 100 character limit and should be truncated by the middleware function to test the complex transformation logic",
        },
      ],
    };

    await router.chat(request);

    // Check the call was made (simplified assertion)
    expect(mockSendRequest).toHaveBeenCalledTimes(1);

    // Get the actual call arguments
    const callArgs = mockSendRequest.mock.calls[0];
    const actualRequest = callArgs[1];

    // Verify the transformations
    expect(actualRequest.messages).toHaveLength(2);
    expect(actualRequest.messages[0]).toEqual({
      role: "system",
      content: "You are a helpful assistant.",
    });
    expect(actualRequest.messages[1].content).toBe(
      "This is a very long message that exceeds the 100 character limit and should be truncated by the midd..."
    );
    expect(actualRequest.temperature).toBe(0.7);
    expect(actualRequest.max_tokens).toBe(150);
  });
});
