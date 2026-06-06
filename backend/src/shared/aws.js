import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { S3Client } from "@aws-sdk/client-s3";
import { BedrockRuntimeClient } from "@aws-sdk/client-bedrock-runtime";

export const env = {
  region: process.env.AWS_REGION || "us-east-1",
  usersTable: process.env.USERS_TABLE,
  connectionsTable: process.env.CONNECTIONS_TABLE,
  roomsTable: process.env.ROOMS_TABLE,
  messagesTable: process.env.MESSAGES_TABLE,
  reactionsTable: process.env.REACTIONS_TABLE,
  notificationsTable: process.env.NOTIFICATIONS_TABLE,
  mediaBucket: process.env.MEDIA_BUCKET,
  websocketEndpoint: process.env.WEBSOCKET_ENDPOINT,
  userPoolId: process.env.USER_POOL_ID,
  userPoolClientId: process.env.USER_POOL_CLIENT_ID,
  bedrockModelId: process.env.BEDROCK_MODEL_ID || "anthropic.claude-3-haiku-20240307-v1:0"
};

const ddbClient = new DynamoDBClient({ region: env.region });
export const db = DynamoDBDocumentClient.from(ddbClient, {
  marshallOptions: { removeUndefinedValues: true }
});

export const s3 = new S3Client({ region: env.region });
export const bedrock = new BedrockRuntimeClient({ region: env.region });

export const now = () => new Date().toISOString();

export function parseJson(body) {
  if (!body) return {};
  try {
    return JSON.parse(body);
  } catch {
    throw new Error("Invalid JSON body");
  }
}

export function ttlFromNow(seconds) {
  return Math.floor(Date.now() / 1000) + seconds;
}

