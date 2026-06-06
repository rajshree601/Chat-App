export const config = {
  apiUrl: import.meta.env.VITE_API_URL || "",
  websocketUrl: import.meta.env.VITE_WEBSOCKET_URL || "",
  region: import.meta.env.VITE_AWS_REGION || "us-east-1",
  userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID || "",
  userPoolClientId: import.meta.env.VITE_COGNITO_CLIENT_ID || ""
};

