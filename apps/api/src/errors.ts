import type { FastifyInstance, FastifyReply } from "fastify";

export class AppError extends Error {
  public constructor(
    public readonly code: string,
    public readonly statusCode: number,
    public readonly details?: unknown,
  ) {
    super(code);
  }
}

export function sendError(reply: FastifyReply, error: AppError): FastifyReply {
  return reply.status(error.statusCode).send({
    error: { code: error.code, ...(error.details === undefined ? {} : { details: error.details }) },
  });
}

export function installErrorHandler(
  app: FastifyInstance,
): void {
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError) return sendError(reply, error);
    if (isZodError(error)) {
      return reply.status(400).send({
        error: { code: "VALIDATION_ERROR", details: error.flatten() },
      });
    }
    const unhandledError = error instanceof Error ? error : new Error("Non-error thrown");
    const statusCode = getStatusCode(unhandledError);
    const code = statusCode === 413 ? "REQUEST_TOO_LARGE" : "INTERNAL_ERROR";
    if (statusCode >= 500) request.log.error({ errorName: unhandledError.name, requestId: request.id }, "Unhandled request error");
    return reply.status(statusCode).send({ error: { code } });
  });
}

function isZodError(error: unknown): error is Error & { flatten: () => unknown } {
  return error instanceof Error && error.name === "ZodError" && "flatten" in error && typeof error.flatten === "function";
}

function getStatusCode(error: Error & { statusCode?: unknown }): number {
  return typeof error.statusCode === "number" && error.statusCode >= 400 && error.statusCode < 600
    ? error.statusCode
    : 500;
}
