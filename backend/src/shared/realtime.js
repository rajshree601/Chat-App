import { ApiGatewayManagementApiClient, DeleteConnectionCommand, PostToConnectionCommand } from "@aws-sdk/client-apigatewaymanagementapi";
import { BatchWriteCommand, DeleteCommand, PutCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { db, env, now, ttlFromNow } from "./aws.js";

function wsClient() {
  return new ApiGatewayManagementApiClient({ endpoint: env.websocketEndpoint });
}

export async function saveConnection({ connectionId, userId, username }) {
  await db.send(new PutCommand({
    TableName: env.connectionsTable,
    Item: {
      connectionId,
      userId,
      username,
      status: "online",
      connectedAt: now(),
      ttl: ttlFromNow(60 * 60 * 24)
    }
  }));
}

export async function removeConnection(connectionId) {
  await db.send(new DeleteCommand({
    TableName: env.connectionsTable,
    Key: { connectionId }
  }));
}

export async function listConnectionsForRoom(roomId) {
  const result = await db.send(new QueryCommand({
    TableName: env.connectionsTable,
    IndexName: "roomId-index",
    KeyConditionExpression: "roomId = :roomId",
    ExpressionAttributeValues: { ":roomId": roomId }
  }));
  return result.Items || [];
}

export async function attachRoomToConnection(connectionId, roomId) {
  await db.send(new UpdateCommand({
    TableName: env.connectionsTable,
    Key: { connectionId },
    UpdateExpression: "SET roomId = :roomId, lastSeenAt = :now",
    ExpressionAttributeValues: { ":roomId": roomId, ":now": now() }
  }));
}

export async function broadcast(roomId, payload, excludeConnectionId) {
  const connections = await listConnectionsForRoom(roomId);
  const client = wsClient();
  const data = Buffer.from(JSON.stringify(payload));
  await Promise.all(connections
    .filter((item) => item.connectionId !== excludeConnectionId)
    .map(async (item) => {
      try {
        await client.send(new PostToConnectionCommand({ ConnectionId: item.connectionId, Data: data }));
      } catch (error) {
        if (error?.$metadata?.httpStatusCode === 410) {
          await removeConnection(item.connectionId);
        } else {
          console.error(JSON.stringify({ level: "warn", message: "WebSocket send failed", connectionId: item.connectionId, error: error.message }));
        }
      }
    }));
}

export async function disconnectAll(connectionIds) {
  if (!connectionIds.length) return;
  await db.send(new BatchWriteCommand({
    RequestItems: {
      [env.connectionsTable]: connectionIds.map((connectionId) => ({
        DeleteRequest: { Key: { connectionId } }
      }))
    }
  }));
}

