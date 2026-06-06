import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { z } from "zod";
import { nanoid } from "nanoid";
import { env, parseJson, s3 } from "../shared/aws.js";
import { created, withHttp } from "../shared/http.js";
import { requireUser } from "../shared/auth.js";

export const uploadMedia = withHttp(async (event) => {
  const body = z.object({
    fileName: z.string().min(1).max(200),
    contentType: z.string().min(1).max(100),
    mediaType: z.enum(["image", "file", "voice"])
  }).parse(parseJson(event.body));
  const user = await requireUser(event);
  const key = `${user.userId}/${body.mediaType}/${nanoid()}-${body.fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const command = new PutObjectCommand({
    Bucket: env.mediaBucket,
    Key: key,
    ContentType: body.contentType,
    ServerSideEncryption: "AES256",
    Metadata: { userId: user.userId, mediaType: body.mediaType }
  });
  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 900 });
  return created({
    uploadUrl,
    key,
    publicUrl: `https://${process.env.MEDIA_CLOUDFRONT_DOMAIN}/${key}`
  });
});

