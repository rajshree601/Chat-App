import { PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { z } from "zod";
import { db, env, now, parseJson } from "../shared/aws.js";
import { ok, withHttp } from "../shared/http.js";
import { requireUser } from "../shared/auth.js";

export const postConfirmation = async (event) => {
  const attributes = event.request.userAttributes;
  await db.send(new PutCommand({
    TableName: env.usersTable,
    Item: {
      userId: attributes.sub,
      email: attributes.email,
      username: attributes.name || attributes.email,
      avatarUrl: null,
      status: "offline",
      createdAt: now(),
      updatedAt: now()
    }
  }));
  return event;
};

export const updateMe = withHttp(async (event) => {
  const user = await requireUser(event);
  const body = z.object({
    username: z.string().min(1).max(80).optional(),
    avatarUrl: z.string().url().optional(),
    status: z.enum(["online", "offline", "away", "busy"]).optional()
  }).parse(parseJson(event.body));
  const names = { "#status": "status" };
  const values = { ":now": now() };
  const updates = ["updatedAt = :now"];
  if (body.username) {
    values[":username"] = body.username;
    updates.push("username = :username");
  }
  if (body.avatarUrl) {
    values[":avatarUrl"] = body.avatarUrl;
    updates.push("avatarUrl = :avatarUrl");
  }
  if (body.status) {
    values[":status"] = body.status;
    updates.push("#status = :status");
  }
  await db.send(new UpdateCommand({
    TableName: env.usersTable,
    Key: { userId: user.userId },
    UpdateExpression: `SET ${updates.join(", ")}`,
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: values
  }));
  return ok({ updated: true });
});
