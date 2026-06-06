import { InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { z } from "zod";
import { bedrock, env, parseJson } from "../shared/aws.js";
import { ok, withHttp } from "../shared/http.js";
import { requireUser } from "../shared/auth.js";

async function askBedrock(prompt) {
  const body = JSON.stringify({
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: 500,
    temperature: 0.4,
    messages: [{ role: "user", content: prompt }]
  });
  const result = await bedrock.send(new InvokeModelCommand({
    modelId: env.bedrockModelId,
    contentType: "application/json",
    accept: "application/json",
    body
  }));
  const parsed = JSON.parse(Buffer.from(result.body).toString("utf8"));
  return parsed.content?.map((part) => part.text).join("\n").trim() || "";
}

export const smartReplies = withHttp(async (event) => {
  await requireUser(event);
  const body = z.object({ messages: z.array(z.string()).min(1).max(20) }).parse(parseJson(event.body));
  const text = await askBedrock(`Suggest five concise, friendly chat replies for this conversation:\n${body.messages.join("\n")}`);
  return ok({ suggestions: text.split("\n").map((line) => line.replace(/^[-\d. ]+/, "").trim()).filter(Boolean).slice(0, 5) });
});

export const summarize = withHttp(async (event) => {
  await requireUser(event);
  const body = z.object({ messages: z.array(z.string()).min(1).max(100) }).parse(parseJson(event.body));
  const summary = await askBedrock(`Summarize this chat thread with action items and decisions:\n${body.messages.join("\n")}`);
  return ok({ summary });
});

