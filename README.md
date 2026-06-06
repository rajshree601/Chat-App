# AWS Serverless Realtime Chat Platform

A production-oriented Slack, Discord, and WhatsApp Web style chat platform built with React, Vite, TailwindCSS, Framer Motion, AWS Lambda, API Gateway REST/WebSocket APIs, DynamoDB, Cognito, S3, CloudFront, CloudWatch, EventBridge, and Amazon Bedrock.

## Features

- Cognito signup, login, logout, email verification, forgot password, and protected routes
- Room chats, group rooms, private-room ready data model, message persistence, reactions, read receipts, typing indicators, presence, and notifications foundation
- Image, file, and voice uploads through S3 presigned URLs
- Modern dark responsive UI with animated chat layout, avatars, badges, room switching, and loading states
- Bedrock smart replies and conversation summaries
- Serverless Framework infrastructure with least-privilege function IAM
- GitHub Actions validation and production deployment workflow

## Quick Start

```powershell
npm install
Copy-Item .env.example .env
Copy-Item frontend/.env.example frontend/.env
npm run validate
cd infrastructure
npx serverless deploy --stage dev --param="corsOrigin=http://localhost:5173"
cd ..
```

After deployment, copy the Serverless outputs into `frontend/.env`:

```env
VITE_API_URL=https://<http-api-id>.execute-api.<region>.amazonaws.com
VITE_WEBSOCKET_URL=wss://<websocket-api-id>.execute-api.<region>.amazonaws.com/dev
VITE_AWS_REGION=<region>
VITE_COGNITO_USER_POOL_ID=<user-pool-id>
VITE_COGNITO_CLIENT_ID=<client-id>
```

Run the frontend:

```powershell
npm run dev --workspace frontend
```

## Deployment

If Serverless reports `The security token included in the request is invalid`, refresh the local AWS profile first:

```powershell
.\scripts\configure-aws-profile.ps1 -Profile default -Region us-east-1
```

Use an access key from the AWS account you want to deploy into. Leave the session token blank for a normal long-lived access key.

Use the helper script:

```powershell
.\scripts\deploy.ps1 -Stage dev -Region us-east-1 -CorsOrigin http://localhost:5173
```

Production deploy:

```powershell
cd infrastructure
npx serverless deploy --stage prod --region us-east-1 --param="corsOrigin=https://yourdomain.com"
cd ..
```

## API

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/rooms` | List rooms |
| POST | `/rooms` | Create a room |
| POST | `/rooms/join` | Join room and broadcast presence |
| POST | `/rooms/leave` | Leave room and broadcast presence |
| GET | `/rooms/{roomId}/messages` | Fetch latest room messages |
| POST | `/messages` | Send message with optional media |
| POST | `/typing` | Broadcast typing indicator |
| POST | `/reactions` | Add message reaction |
| POST | `/read-receipts` | Mark message as read |
| GET | `/users` | List users by presence status |
| PUT | `/users/me` | Update profile and presence |
| POST | `/media/upload` | Create S3 presigned upload URL |
| POST | `/ai/replies` | Generate smart replies |
| POST | `/ai/summarize` | Summarize recent messages |

WebSocket route `joinRoom` attaches a connection to a room. Server broadcasts `message.created`, `typing`, `reaction.added`, `message.read`, and presence events.

## Project Structure

```text
frontend/        React, Vite, TailwindCSS, Framer Motion client
backend/         Node.js 20 Lambda handlers and shared AWS utilities
infrastructure/  Serverless Framework CloudFormation configuration
docs/            Architecture and operational notes
scripts/         Deployment helper scripts
```

See [docs/architecture.md](docs/architecture.md) for the architecture diagram, data model, scaling notes, and security model.

## Screenshots

Place production screenshots in `docs/screenshots/` after first deployment.
