import { CloudFormationClient, DescribeStacksCommand } from "@aws-sdk/client-cloudformation";
import { CloudFrontClient, CreateInvalidationCommand } from "@aws-sdk/client-cloudfront";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const stage = process.env.STAGE || process.argv[2] || "dev";
const region = process.env.AWS_REGION || process.argv[3] || "us-east-1";
const stackName = `aws-serverless-realtime-chat-platform-${stage}`;

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8"
};

function outputMap(stack) {
  return Object.fromEntries((stack.Outputs || []).map((item) => [item.OutputKey, item.OutputValue]));
}

function listFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? listFiles(path) : [path];
  });
}

const cloudformation = new CloudFormationClient({ region });
const { Stacks } = await cloudformation.send(new DescribeStacksCommand({ StackName: stackName }));
const outputs = outputMap(Stacks?.[0] || {});

const envFile = [
  `VITE_API_URL=${outputs.HttpApiUrl}`,
  `VITE_WEBSOCKET_URL=${outputs.WebSocketUrl}`,
  `VITE_AWS_REGION=${region}`,
  `VITE_COGNITO_USER_POOL_ID=${outputs.UserPoolId}`,
  `VITE_COGNITO_CLIENT_ID=${outputs.UserPoolClientId}`,
  ""
].join("\n");

writeFileSync(join(root, "frontend", ".env.production"), envFile);
execFileSync(process.platform === "win32" ? "npm.cmd" : "npm", ["run", "build", "--workspace", "frontend"], {
  cwd: root,
  stdio: "inherit"
});

const bucket = outputs.FrontendBucketName;
const distributionId = outputs.FrontendDistributionId;
if (!bucket) throw new Error("FrontendBucketName output was not found. Deploy the Serverless stack first.");

const s3 = new S3Client({ region });
const distDir = join(root, "frontend", "dist");
for (const file of listFiles(distDir)) {
  const key = relative(distDir, file).replace(/\\/g, "/");
  await s3.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: readFileSync(file),
    ContentType: contentTypes[extname(file).toLowerCase()] || "application/octet-stream",
    CacheControl: key.includes("/assets/") ? "public,max-age=31536000,immutable" : "no-cache"
  }));
  console.log(`uploaded s3://${bucket}/${key}`);
}

if (distributionId) {
  const cloudfront = new CloudFrontClient({ region });
  await cloudfront.send(new CreateInvalidationCommand({
    DistributionId: distributionId,
    InvalidationBatch: {
      CallerReference: `${Date.now()}`,
      Paths: { Quantity: 1, Items: ["/*"] }
    }
  }));
}

console.log(`Frontend URL: ${outputs.FrontendUrl}`);
