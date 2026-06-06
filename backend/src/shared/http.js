export function json(statusCode, body, extraHeaders = {}) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": process.env.CORS_ORIGIN || "*",
      "Access-Control-Allow-Headers": "Content-Type,Authorization",
      "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
      ...extraHeaders
    },
    body: JSON.stringify(body)
  };
}

export function ok(body) {
  return json(200, body);
}

export function created(body) {
  return json(201, body);
}

export function noContent() {
  return { statusCode: 204, body: "" };
}

export function errorResponse(error, fallbackStatus = 500) {
  const statusCode = error.statusCode || fallbackStatus;
  console.error(JSON.stringify({ level: "error", message: error.message, stack: error.stack }));
  return json(statusCode, {
    error: statusCode >= 500 ? "Internal server error" : error.message
  });
}

export function withHttp(handler) {
  return async (event, context) => {
    context.callbackWaitsForEmptyEventLoop = false;
    if (event.httpMethod === "OPTIONS") return noContent();
    try {
      return await handler(event, context);
    } catch (error) {
      return errorResponse(error);
    }
  };
}

export function badRequest(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

export function forbidden(message = "Forbidden") {
  const error = new Error(message);
  error.statusCode = 403;
  return error;
}

export function notFound(message = "Not found") {
  const error = new Error(message);
  error.statusCode = 404;
  return error;
}

