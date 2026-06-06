param(
  [string]$Stage = "dev",
  [string]$Region = "us-east-1",
  [string]$CorsOrigin = "http://localhost:5173"
)

npm install
npm run validate
Push-Location infrastructure
try {
  npx serverless deploy --stage $Stage --region $Region --param="corsOrigin=$CorsOrigin"
}
finally {
  Pop-Location
}

$env:STAGE = $Stage
$env:AWS_REGION = $Region
node scripts/deploy-frontend.mjs $Stage $Region
