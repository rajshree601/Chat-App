import { nanoid } from "nanoid";
import { PutCommand, QueryCommand, ScanCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { z } from "zod";
import { db, env, now, parseJson } from "../shared/aws.js";
import { created, ok, withHttp } from "../shared/http.js";
import { requireUser } from "../shared/auth.js";
import { attachRoomToConnection, broadcast } from "../shared/realtime.js";

export const createRoom = withHttp(async (event) => {
  const body = z.object({
    name: z.string().min(1).max(80),
    type: z.enum(["group", "private", "room"]).default("room"),
    memberIds: z.array(z.string()).optional().default([])
  }).parse(parseJson(event.body));
  const user = await requireUser(event);
  const room = {
    roomId: nanoid(),
    name: body.name,
    type: body.type,
    ownerId: user.userId,
    members: Array.from(new Set([user.userId, ...body.memberIds])),
    createdAt: now(),
    updatedAt: now()
  };
  await db.send(new PutCommand({ TableName: env.roomsTable, Item: room }));
  return created({ room });
});

export const listRooms = withHttp(async (event) => {
  await requireUser(event);
  const result = await db.send(new ScanCommand({ TableName: env.roomsTable, Limit: 100 }));
  return ok({ rooms: result.Items || [] });
});

export const joinRoom = withHttp(async (event) => {
  const body = z.object({ roomId: z.string(), connectionId: z.string().optional() }).parse(parseJson(event.body));
  const user = await requireUser(event);
  await db.send(new UpdateCommand({
    TableName: env.roomsTable,
    Key: { roomId: body.roomId },
    UpdateExpression: "ADD membersSet :member SET updatedAt = :now",
    ExpressionAttributeValues: { ":member": new Set([user.userId]), ":now": now() }
  }));
  if (body.connectionId) await attachRoomToConnection(body.connectionId, body.roomId);
  await broadcast(body.roomId, { type: "presence.joined", roomId: body.roomId, userId: user.userId, username: user.username });
  return ok({ joined: true });
});

export const leaveRoom = withHttp(async (event) => {
  const body = z.object({ roomId: z.string() }).parse(parseJson(event.body));
  const user = await requireUser(event);
  await broadcast(body.roomId, { type: "presence.left", roomId: body.roomId, userId: user.userId });
  return ok({ left: true });
});

export const getUsers = withHttp(async (event) => {
  await requireUser(event);
  const result = await db.send(new QueryCommand({
    TableName: env.usersTable,
    IndexName: "status-updatedAt-index",
    KeyConditionExpression: "#status = :status",
    ExpressionAttributeNames: { "#status": "status" },
    ExpressionAttributeValues: { ":status": event.queryStringParameters?.status || "online" },
    Limit: 100
  }));
  return ok({ users: result.Items || [] });
});

