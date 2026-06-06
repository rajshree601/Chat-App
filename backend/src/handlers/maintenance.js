import { ScanCommand } from "@aws-sdk/lib-dynamodb";
import { db, env } from "../shared/aws.js";
import { disconnectAll } from "../shared/realtime.js";

export const cleanupConnections = async () => {
  const cutoff = Math.floor(Date.now() / 1000);
  const result = await db.send(new ScanCommand({
    TableName: env.connectionsTable,
    ProjectionExpression: "connectionId, ttl",
    FilterExpression: "ttl < :cutoff",
    ExpressionAttributeValues: { ":cutoff": cutoff },
    Limit: 100
  }));
  await disconnectAll((result.Items || []).map((item) => item.connectionId));
  return { cleaned: result.Items?.length || 0 };
};

