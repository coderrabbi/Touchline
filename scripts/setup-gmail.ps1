param([switch]$CheckConnection)
$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
$taskEnvPath = Join-Path $taskRoot 'apps/api/.env'
$taskCaPath = (Join-Path -Path $taskRoot -ChildPath '.local/smtp-trusted-ca.pem') -replace '\\','/'
if ($CheckConnection) {
  $taskOldCa = $env:EMAIL_CA_FILE
  try {
    $env:EMAIL_CA_FILE = $taskCaPath
    & node (Join-Path -Path $PSScriptRoot -ChildPath 'export-smtp-ca.mjs')
    if ($LASTEXITCODE -ne 0) { throw 'Certificate export failed. Use Node 24 or newer.' }
    Push-Location (Join-Path -Path $taskRoot -ChildPath 'apps/api')
    try {
      & node check-email.mjs --connection-only
      if ($LASTEXITCODE -ne 0) { throw 'Connection check failed.' }
    } finally { Pop-Location }
  } finally { $env:EMAIL_CA_FILE = $taskOldCa }
  return
}
$taskSecure = Read-Host 'Paste the Google App Password for golamrabbi.eh@gmail.com (hidden)' -AsSecureString
$taskPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($taskSecure)
try {
  $taskPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($taskPointer) -replace '\s',''
} finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($taskPointer) }
if ($taskPassword -notmatch '^[a-zA-Z]{16}$') { throw 'Expected a 16-letter Google App Password. Configuration was not changed.' }
$taskSettings = @{ EMAIL_MODE='smtp'; EMAIL_USE_SYSTEM_CA='true'; EMAIL_CA_FILE=$taskCaPath; EMAIL_HOST='smtp.gmail.com'; EMAIL_PORT='587'; EMAIL_USER='golamrabbi.eh@gmail.com'; EMAIL_PASSWORD=$taskPassword; EMAIL_FROM='Touchline <golamrabbi.eh@gmail.com>' }
$taskPrevious = @{}
try {
  foreach ($taskKey in $taskSettings.Keys) {
    $taskPrevious[$taskKey] = [Environment]::GetEnvironmentVariable($taskKey,'Process')
    [Environment]::SetEnvironmentVariable($taskKey,$taskSettings[$taskKey],'Process')
  }
  # Export only public trusted certificates so the API can use the same trust store on older Node runtimes.
  & node (Join-Path $PSScriptRoot 'export-smtp-ca.mjs')
  if ($LASTEXITCODE -ne 0) { throw 'Use Node 24 or newer to prepare the trusted Windows certificate file.' }
  Push-Location (Join-Path $taskRoot 'apps/api')
  try { & node check-email.mjs; $taskVerified = $LASTEXITCODE -eq 0 } finally { Pop-Location }
  if (-not $taskVerified) { throw 'Gmail setup failed. See the diagnostic above. Existing email delivery mode was preserved.' }
  $taskText = [IO.File]::ReadAllText($taskEnvPath)
  foreach ($taskKey in $taskSettings.Keys) {
    $taskValue = $taskSettings[$taskKey]
    if ($taskKey -eq 'EMAIL_FROM') { $taskValue = '"' + $taskValue + '"' }
    $taskLine = $taskKey + '=' + $taskValue
    if ($taskText -match ('(?m)^' + $taskKey + '=')) {
      $taskText = [regex]::Replace($taskText, '(?m)^' + $taskKey + '=[^\r\n]*', [System.Text.RegularExpressions.MatchEvaluator]{param($m) $taskLine})
    } else { $taskText += "`n" + $taskLine + "`n" }
  }
  [IO.File]::WriteAllText($taskEnvPath,$taskText)
  Write-Host 'Gmail verified and enabled. Restart the API to load the new settings. No email was sent by this check.'
} finally {
  foreach ($taskKey in $taskPrevious.Keys) { [Environment]::SetEnvironmentVariable($taskKey,$taskPrevious[$taskKey],'Process') }
  $taskPassword=$null; $taskText=$null; $taskSettings=$null; $taskSecure.Dispose()
}




