import { CognitoJwtVerifier } from "aws-jwt-verify";
import { env } from "./aws.js";
import { forbidden } from "./http.js";

let verifier;

function getVerifier() {
  if (!verifier) {
    verifier = CognitoJwtVerifier.create({
      userPoolId: env.userPoolId,
      tokenUse: "access",
      clientId: env.userPoolClientId
    });
  }
  return verifier;
}

export async function requireUser(event) {
  const header = event.headers?.Authorization || event.headers?.authorization;
  const token = header?.replace(/^Bearer\s+/i, "");
  if (!token) throw forbidden("Missing bearer token");
  const payload = await getVerifier().verify(token);
  return {
    userId: payload.sub,
    username: payload.username || payload["cognito:username"] || payload.email || payload.sub,
    email: payload.email,
    claims: payload
  };
}

export function userFromWebsocket(event) {
  const authorizer = event.requestContext?.authorizer;
  return {
    userId: authorizer?.principalId || authorizer?.sub || event.queryStringParameters?.userId,
    username: authorizer?.username || event.queryStringParameters?.username || "Member"
  };
}

