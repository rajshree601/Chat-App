import { nanoid } from "nanoid";
import { DeleteCommand, GetCommand, PutCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { z } from "zod";
import { db, env, now, parseJson } from "../shared/aws.js";
import { badRequest, ok, created, withHttp } from "../shared/http.js";
import { requireUser } from "../shared/auth.js";
import { attachRoomToConnection, broadcast } from "../shared/realtime.js";

const messageSchema = z.object({
  roomId: z.string().min(1),
  content: z.string().max(4000).optional().default(""),
  media: z.array(z.object({
    url: z.string().url(),
    type: z.enum(["image", "file", "voice"]),
    name: z.string().optional()
  })).optional().default([])
});

export const sendMessage = withHttp(async (event) => {
  const body = messageSchema.parse(parseJson(event.body));
  const user = await requireUser(event);
  if (!body.content && body.media.length === 0) throw badRequest("Message must include content or media");
  const message = {
    messageId: nanoid(),
    roomId: body.roomId,
    userId: user.userId,
    username: user.username,
    content: body.content,
    media: body.media,
    createdAt: now(),
    editedAt: null,
    readBy: [user.userId]
  };
  await db.send(new PutCommand({ TableName: env.messagesTable, Item: message }));
  await broadcast(body.roomId, { type: "message.created", message });
  return created({ message });
});

export const getMessages = withHttp(async (event) => {
  await requireUser(event);
  const roomId = event.pathParameters?.roomId || event.queryStringParameters?.roomId;
  if (!roomId) throw badRequest("roomId is required");
  const result = await db.send(new QueryCommand({
    TableName: env.messagesTable,
    IndexName: "roomId-createdAt-index",
    KeyConditionExpression: "roomId = :roomId",
    ExpressionAttributeValues: { ":roomId": roomId },
    ScanIndexForward: false,
    Limit: Number(event.queryStringParameters?.limit || 50)
  }));
  return ok({ messages: (result.Items || []).reverse() });
});

export const typingIndicator = withHttp(async (event) => {
  const body = z.object({ roomId: z.string(), isTyping: z.boolean() }).parse(parseJson(event.body));
  const user = await requireUser(event);
  await broadcast(body.roomId, { type: "typing", roomId: body.roomId, userId: user.userId, username: user.username, isTyping: body.isTyping });
  return ok({ sent: true });
});

export const addReaction = withHttp(async (event) => {
  const body = z.object({ messageId: z.string(), roomId: z.string(), emoji: z.string().min(1).max(16) }).parse(parseJson(event.body));
  const user = await requireUser(event);
  const reaction = { reactionId: `${body.messageId}#${user.userId}#${body.emoji}`, ...body, userId: user.userId, createdAt: now() };
  await db.send(new PutCommand({ TableName: env.reactionsTable, Item: reaction }));
  await broadcast(body.roomId, { type: "reaction.added", reaction });
  return created({ reaction });
});

export const readReceipt = withHttp(async (event) => {
  const body = z.object({ messageId: z.string(), roomId: z.string() }).parse(parseJson(event.body));
  const user = await requireUser(event);
  await db.send(new UpdateCommand({
    TableName: env.messagesTable,
    Key: { messageId: body.messageId },
    UpdateExpression: "ADD readBySet :user SET lastReadAt = :now",
    ExpressionAttributeValues: { ":user": new Set([user.userId]), ":now": now() }
  }));
  await broadcast(body.roomId, { type: "message.read", messageId: body.messageId, userId: user.userId });
  return ok({ read: true });
});

export const websocketMessage = withHttp(async (event) => {
  const body = parseJson(event.body);
  if (body.action === "joinRoom") {
    await attachRoomToConnection(event.requestContext.connectionId, body.roomId);
    await broadcast(body.roomId, { type: "presence.joined", roomId: body.roomId }, event.requestContext.connectionId);
    return { statusCode: 200, body: "joined" };
  }
  return { statusCode: 400, body: "Unknown websocket action" };
});

