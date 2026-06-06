import { withHttp } from "../shared/http.js";
import { saveConnection } from "../shared/realtime.js";
import { userFromWebsocket } from "../shared/auth.js";

export const handler = withHttp(async (event) => {
  const connectionId = event.requestContext.connectionId;
  const user = userFromWebsocket(event);
  await saveConnection({ connectionId, userId: user.userId || connectionId, username: user.username });
  return { statusCode: 200, body: "connected" };
});

