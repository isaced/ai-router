import { describe, test, expect, beforeEach, spyOn } from "bun:test";
import AIRouter from "../src/AIRouter";
import type {
  AIRouterConfig,
  ChatRequest,
  Middleware,
} from "../src/types/types";
import * as selectProviderModule from "../src/core/selectProvider";
import * as sendRequestModule from "../src/core/sendRequest";

describe("AIRouter Middleware Edge Cases", () => {
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

    mockSelectProvider.mockClear();
    mockSendRequest.mockClear();
  });

  test("should handle middleware that throws synchronous errors", async () => {
    const errorMiddleware: Middleware = (req, next) => {
      throw new Error("Synchronous middleware error");
    };

    router.use(errorMiddleware);

    const request: ChatRequest = {
      messages: [{ role: "user", content: "Hello" }],
    };

    await expect(router.chat(request)).rejects.toThrow(
      "Synchronous middleware error"
    );
  });

  test("should handle middleware that throws asynchronous errors", async () => {
    const asyncErrorMiddleware: Middleware = async (req, next) => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      throw new Error("Asynchronous middleware error");
    };

    router.use(asyncErrorMiddleware);

    const request: ChatRequest = {
      messages: [{ role: "user", content: "Hello" }],
    };

    await expect(router.chat(request)).rejects.toThrow(
      "Asynchronous middleware error"
    );
  });

  test("should handle middleware that never calls next", async () => {
    const hangingMiddleware: Middleware = async (req, next) => {
      // This middleware never calls next, effectively stopping the chain
      return req; // Return the request directly instead of calling next
    };

    router.use(hangingMiddleware);

    const request: ChatRequest = {
      messages: [{ role: "user", content: "Hello" }],
    };

    await router.chat(request);

    // Should still work because the middleware returns the request
    expect(mockSendRequest).toHaveBeenCalledTimes(1);
  });

  test("should handle middleware that calls next multiple times", async () => {
    let nextCallCount = 0;

    const multipleNextMiddleware: Middleware = async (req, next) => {
      const result1 = await next(req);
      nextCallCount++;

      // Try to call next again (this shouldn't happen in practice but let's test it)
      try {
        const result2 = await next(req);
        nextCallCount++;
        return result2;
      } catch (error) {
        return result1;
      }
    };

    router.use(multipleNextMiddleware);

    const request: ChatRequest = {
      messages: [{ role: "user", content: "Hello" }],
    };

    await router.chat(request);

    expect(nextCallCount).toBeGreaterThanOrEqual(1);
  });

  test("should handle empty middleware array", async () => {
    // Explicitly set empty middleware array
    (router as any).config.middleware = [];

    const request: ChatRequest = {
      messages: [{ role: "user", content: "Hello" }],
    };

    const response = await router.chat(request);

    expect(response).toBeDefined();
    expect(mockSendRequest).toHaveBeenCalledWith(expect.any(Object), request);
  });

  test("should handle middleware with null/undefined return", async () => {
    const invalidMiddleware: Middleware = async (req, next) => {
      await next(req);
      // Return null (this might cause issues downstream)
      return null as any;
    };

    router.use(invalidMiddleware);

    const request: ChatRequest = {
      messages: [{ role: "user", content: "Hello" }],
    };

    // This might not throw an error but could cause issues
    const response = await router.chat(request);

    // The response should still be valid because sendRequest was mocked
    expect(response).toBeDefined();
    expect(mockSendRequest).toHaveBeenCalledWith(
      expect.any(Object),
      null // The middleware returned null, so that's what gets passed
    );
  });

  test("should preserve request object identity through middleware chain", async () => {
    const requestIdentities: ChatRequest[] = [];

    const middleware1: Middleware = async (req, next) => {
      requestIdentities.push(req);
      return next(req);
    };

    const middleware2: Middleware = async (req, next) => {
      requestIdentities.push(req);
      return next(req);
    };

    router.use(middleware1).use(middleware2);

    const request: ChatRequest = {
      messages: [{ role: "user", content: "Hello" }],
    };

    await router.chat(request);

    // Both middleware should see the same request object
    expect(requestIdentities).toHaveLength(2);
    expect(requestIdentities[0]).toBe(request);
    expect(requestIdentities[1]).toBe(request);
  });

  test("should handle deeply nested middleware chain", async () => {
    const executionOrder: number[] = [];

    // Add 10 middleware functions
    for (let i = 0; i < 10; i++) {
      const middleware: Middleware = async (req, next) => {
        executionOrder.push(i);
        const result = await next(req);
        executionOrder.push(i + 100); // Use +100 to mark the "end" of middleware
        return result;
      };
      router.use(middleware);
    }

    const request: ChatRequest = {
      messages: [{ role: "user", content: "Hello" }],
    };

    await router.chat(request);

    // Should execute in order: 0,1,2...9,109,108...101,100
    expect(executionOrder.slice(0, 10)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(executionOrder.slice(10)).toEqual([
      109, 108, 107, 106, 105, 104, 103, 102, 101, 100,
    ]);
  });

  test("should handle middleware that modifies message array references", async () => {
    const middleware: Middleware = async (req, next) => {
      // Create a completely new messages array
      const newReq = {
        ...req,
        messages: [
          ...req.messages,
          { role: "system", content: "Added by middleware" },
        ],
      };
      return next(newReq);
    };

    router.use(middleware);

    const originalRequest: ChatRequest = {
      messages: [{ role: "user", content: "Hello" }],
    };

    await router.chat(originalRequest);

    // Original request should not be modified
    expect(originalRequest.messages).toHaveLength(1);
    expect(originalRequest.messages[0]).toEqual({
      role: "user",
      content: "Hello",
    });

    // But the processed request should have the additional message
    expect(mockSendRequest).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        messages: [
          { role: "user", content: "Hello" },
          { role: "system", content: "Added by middleware" },
        ],
      })
    );
  });
});
