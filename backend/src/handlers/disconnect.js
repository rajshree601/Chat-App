import { withHttp } from "../shared/http.js";
import { removeConnection } from "../shared/realtime.js";

export const handler = withHttp(async (event) => {
  await removeConnection(event.requestContext.connectionId);
  return { statusCode: 200, body: "disconnected" };
});

