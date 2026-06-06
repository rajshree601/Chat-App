param(
  [string]$Profile = "default",
  [string]$Region = "us-east-1"
)

$awsDir = Join-Path $HOME ".aws"
$credentialsPath = Join-Path $awsDir "credentials"
$configPath = Join-Path $awsDir "config"

New-Item -ItemType Directory -Force -Path $awsDir | Out-Null

$accessKey = Read-Host "AWS Access Key ID"
$secretKey = Read-Host "AWS Secret Access Key"
$sessionToken = Read-Host "AWS Session Token (leave blank for long-lived access keys)"

$credentialBlock = @"
[$Profile]
aws_access_key_id = $accessKey
aws_secret_access_key = $secretKey
"@

if ($sessionToken.Trim().Length -gt 0) {
  $credentialBlock += "`naws_session_token = $sessionToken"
}

$configBlock = @"
[profile $Profile]
region = $Region
output = json
"@

Set-Content -LiteralPath $credentialsPath -Value $credentialBlock
Set-Content -LiteralPath $configPath -Value $configBlock

Write-Host "AWS profile '$Profile' configured for region '$Region'."
Write-Host "Deploy with: Push-Location infrastructure; npx serverless deploy --stage dev --region $Region --param=`"corsOrigin=http://localhost:5173`"; Pop-Location"

