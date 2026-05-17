param(
  [switch]$Restore,
  [switch]$UseBridge,
  [string]$ApiKey = $env:AURAAI_API_KEY
)

$ErrorActionPreference = 'Stop'
$Origin = '__ORIGIN__'
$CodexApi = "$Origin/backend-api/codex"
$RemoteBase = "$Origin/v1"
$BridgePort = 4111
$BridgeBase = "http://127.0.0.1:$BridgePort/v1"

function Write-Info([string]$Message) {
  Write-Host "[AuraAI] $Message" -ForegroundColor Cyan
}

function Write-WarnAura([string]$Message) {
  Write-Host "[AuraAI] $Message" -ForegroundColor Yellow
}

function Get-CodexHome {
  if ($env:CODEX_HOME -and $env:CODEX_HOME.Trim().Length -gt 0) {
    return $env:CODEX_HOME
  }

  return (Join-Path $HOME '.codex')
}

function Backup-Config([string]$ConfigPath) {
  if (Test-Path -LiteralPath $ConfigPath) {
    $timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
    $backupPath = "$ConfigPath.auraai.$timestamp.bak"
    Copy-Item -LiteralPath $ConfigPath -Destination $backupPath -Force
    Write-Info "Создан backup: $backupPath"
  }
}

function Restore-Config([string]$ConfigPath) {
  $folder = Split-Path -Parent $ConfigPath
  $name = Split-Path -Leaf $ConfigPath
  $backup = Get-ChildItem -Path $folder -Filter "$name.auraai.*.bak" -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1

  if (-not $backup) {
    throw "Backup не найден. Ожидался файл вида $name.auraai.*.bak"
  }

  Copy-Item -LiteralPath $backup.FullName -Destination $ConfigPath -Force
  Write-Info "Восстановлен конфиг из backup: $($backup.FullName)"
}

function Remove-ProviderBlock([string]$ConfigContent) {
  $pattern = '(?ms)^\[model_providers\.auraai\]\r?\n(?:^(?!\[).*(?:\r?\n)?)*'
  return [regex]::Replace($ConfigContent, $pattern, '')
}

function Upsert-TopLevelKey([string]$ConfigContent, [string]$Key, [string]$Value) {
  $pattern = "(?m)^$Key\s*=\s*.*$"
  $line = "$Key = $Value"

  if ([regex]::IsMatch($ConfigContent, $pattern)) {
    return [regex]::Replace($ConfigContent, $pattern, $line, 1)
  }

  if ([string]::IsNullOrWhiteSpace($ConfigContent)) {
    return $line + [Environment]::NewLine
  }

  return $ConfigContent + [Environment]::NewLine + $line + [Environment]::NewLine
}

function Ensure-ProviderConfig([string]$ConfigPath, [string]$ProviderBase, [bool]$SupportsWebSockets) {
  if (Test-Path -LiteralPath $ConfigPath) {
    $content = Get-Content -LiteralPath $ConfigPath -Raw
  } else {
    $content = ''
  }

  $content = Remove-ProviderBlock -ConfigContent $content
  $content = Upsert-TopLevelKey -ConfigContent $content -Key 'model_provider' -Value '"auraai"'
  $content = Upsert-TopLevelKey -ConfigContent $content -Key 'model' -Value '"gpt-5.4"'

  $providerBlock = @"
[model_providers.auraai]
name = "AuraAI / OpenAI-compatible"
base_url = "$ProviderBase"
env_key = "AURAAI_API_KEY"
env_key_instructions = "Set your AuraAI API key (aura_live_...)"
wire_api = "responses"
requires_openai_auth = false
supports_websockets = $($SupportsWebSockets.ToString().ToLower())
request_max_retries = 4
stream_max_retries = 5
stream_idle_timeout_ms = 300000
"@

  $normalized = $content.TrimEnd()
  if ($normalized.Length -gt 0) {
    $normalized = $normalized + [Environment]::NewLine + [Environment]::NewLine + $providerBlock
  } else {
    $normalized = $providerBlock
  }

  Set-Content -LiteralPath $ConfigPath -Value $normalized -Encoding UTF8
}

function Start-LocalBridge([string]$ApiKey) {
  $nodeCmd = Get-Command node -ErrorAction SilentlyContinue
  if (-not $nodeCmd) {
    throw 'Node.js не найден. Установите Node.js или запустите скрипт без -UseBridge.'
  }

  $bridgeRoot = Join-Path $env:LOCALAPPDATA 'AuraAI'
  New-Item -ItemType Directory -Path $bridgeRoot -Force | Out-Null
  $bridgeScript = Join-Path $bridgeRoot 'aura-codex-bridge.js'

  $bridgeSource = @"
const http = require('http');
const https = require('https');
const { URL } = require('url');

const PORT = 4111;
const REMOTE = '__ORIGIN__';
const API_KEY = process.env.AURAAI_API_KEY;

if (!API_KEY) {
  console.error('[AuraAI bridge] Missing AURAAI_API_KEY');
  process.exit(1);
}

const server = http.createServer((req, res) => {
  const target = new URL(req.url, REMOTE);
  const options = {
    method: req.method,
    headers: {
      ...req.headers,
      host: target.host,
      authorization: `Bearer ${API_KEY}`
    }
  };

  const transport = target.protocol === 'http:' ? http : https;
  const upstream = transport.request(target, options, (upRes) => {
    res.writeHead(upRes.statusCode || 500, upRes.headers);
    upRes.pipe(res);
  });

  upstream.on('error', (err) => {
    res.writeHead(502, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: { message: err.message } }));
  });

  req.pipe(upstream);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[AuraAI bridge] running on http://127.0.0.1:${PORT}`);
});
"@

  Set-Content -LiteralPath $bridgeScript -Value $bridgeSource -Encoding UTF8

  $alreadyRunning = Get-NetTCPConnection -LocalAddress 127.0.0.1 -LocalPort $BridgePort -ErrorAction SilentlyContinue
  if (-not $alreadyRunning) {
    Start-Process -FilePath $nodeCmd.Source -ArgumentList "`"$bridgeScript`"" -WindowStyle Hidden | Out-Null
    Start-Sleep -Milliseconds 700
    Write-Info "Локальный bridge запущен на http://127.0.0.1:$BridgePort"
  } else {
    Write-Info "Локальный bridge уже запущен на порту $BridgePort"
  }
}

if (-not $ApiKey -or $ApiKey.Trim().Length -eq 0) {
  throw 'AURAAI_API_KEY не задан. Пример: $env:AURAAI_API_KEY="aura_live_xxx"'
}

$headers = @{ Authorization = "Bearer $ApiKey" }
try {
  Invoke-RestMethod -Method GET -Uri $CodexApi -Headers $headers -TimeoutSec 30 | Out-Null
  Write-Info 'API key успешно проверен через backend.'
} catch {
  throw "Проверка ключа не прошла: $($_.Exception.Message)"
}

$codexHome = Get-CodexHome
New-Item -ItemType Directory -Path $codexHome -Force | Out-Null
$configPath = Join-Path $codexHome 'config.toml'

if ($Restore) {
  Restore-Config -ConfigPath $configPath
  Write-Info 'Восстановление завершено. Можно запускать Codex.'
  exit 0
}

Backup-Config -ConfigPath $configPath

$providerBase = $RemoteBase
$supportsWs = $true

if ($UseBridge) {
  Start-LocalBridge -ApiKey $ApiKey
  $providerBase = $BridgeBase
  $supportsWs = $false
}

Ensure-ProviderConfig -ConfigPath $configPath -ProviderBase $providerBase -SupportsWebSockets $supportsWs

[Environment]::SetEnvironmentVariable('AURAAI_API_KEY', $ApiKey, 'User')
[Environment]::SetEnvironmentVariable('OPENAI_API_KEY', $ApiKey, 'User')
[Environment]::SetEnvironmentVariable('OPENAI_BASE_URL', $providerBase, 'User')
[Environment]::SetEnvironmentVariable('AURAAI_BASE_URL', $providerBase, 'User')

Write-Info "Настройки применены в $configPath"
Write-Info "Provider: AuraAI / OpenAI-compatible"
Write-Info "Base endpoint: $providerBase"

$codexCmd = Get-Command codex -ErrorAction SilentlyContinue
if ($codexCmd) {
  Write-Info 'Запускаю Codex...'
  & $codexCmd.Source
  exit $LASTEXITCODE
}

Write-WarnAura 'Команда codex не найдена в PATH. Установите Codex CLI или откройте Codex Desktop вручную.'
Write-Info 'После установки запустите новую консоль и выполните: codex'
