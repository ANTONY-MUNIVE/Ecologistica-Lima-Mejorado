[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

function Fail([string] $Message) {
    throw $Message
}

function Test-TcpPort([int] $Port) {
    $connection = Test-NetConnection -ComputerName '127.0.0.1' -Port $Port -WarningAction SilentlyContinue
    return [bool] $connection.TcpTestSucceeded
}

function Invoke-HttpStatus([string] $Uri) {
    try {
        $response = Invoke-WebRequest -Uri $Uri -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
        return [int] $response.StatusCode
    } catch {
        if ($_.Exception.Response) {
            return [int] $_.Exception.Response.StatusCode
        }
        return 0
    }
}

function Start-ServiceTerminal(
    [string] $Title,
    [string] $WorkingDirectory,
    [string] $Command
) {
    $escapedDirectory = $WorkingDirectory.Replace("'", "''")
    $escapedTitle = $Title.Replace("'", "''")
    $terminalCommand = "Set-Location -LiteralPath '$escapedDirectory'; `$Host.UI.RawUI.WindowTitle = '$escapedTitle'; $Command"
    Start-Process -FilePath 'powershell.exe' -ArgumentList @(
        '-NoProfile'
        '-NoExit'
        '-Command'
        $terminalCommand
    ) | Out-Null
}

$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$envFile = Join-Path $root '.env.sprint2'
$backend = Join-Path $root 'backend'
$frontend = Join-Path $root 'frontend'

if (-not (Test-Path -LiteralPath $envFile -PathType Leaf)) {
    Fail "No existe .env.sprint2 en la raíz del repositorio: $root"
}
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Fail 'Docker no está disponible en PATH.'
}

Get-Content -LiteralPath $envFile | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith('#')) {
        return
    }
    $key, $value = $line -split '=', 2
    if ($key -and $key -notmatch '^[\s''"]') {
        [Environment]::SetEnvironmentVariable($key.Trim(), $value, 'Process')
    }
}

foreach ($required in @('SPRINT2_CONTAINER', 'POSTGRES_USER', 'POSTGRES_DB', 'DATABASE_URL')) {
    if ([string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($required, 'Process'))) {
        Fail "Falta la variable requerida $required en .env.sprint2."
    }
}

$env:APP_ENV = 'development'
$env:CORS_ALLOWED_ORIGINS = '["http://127.0.0.1:5173"]'

docker info --format '{{.ServerVersion}}' | Out-Null
if ($LASTEXITCODE -ne 0) {
    Fail 'Docker no responde. Inicia Docker Desktop y vuelve a ejecutar este script.'
}

$container = $env:SPRINT2_CONTAINER
$containerState = docker inspect --format '{{.State.Status}}' $container 2>$null
if ($LASTEXITCODE -ne 0 -or -not $containerState) {
    Fail "No existe el contenedor sintético existente '$container'. No se crea uno nuevo."
}

if ($containerState -ne 'running') {
    Write-Host "Iniciando contenedor existente: $container"
    docker start $container | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Fail "No se pudo iniciar el contenedor existente '$container'."
    }
} else {
    Write-Host "Contenedor existente activo: $container"
}

$postgresPort = 55439
$postgresReady = $false
for ($attempt = 1; $attempt -le 15; $attempt++) {
    docker exec $container pg_isready -U $env:POSTGRES_USER -d $env:POSTGRES_DB 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) {
        $postgresReady = $true
        break
    }
    Start-Sleep -Seconds 1
}
if (-not $postgresReady) {
    Fail 'PostgreSQL no alcanzó estado listo dentro del tiempo esperado.'
}
if (-not (Test-TcpPort $postgresPort)) {
    Fail "PostgreSQL no está disponible en 127.0.0.1:$postgresPort."
}
Write-Host "PostgreSQL listo en 127.0.0.1:$postgresPort; se conservan contenedor y volumen."

$apiPort = 8000
$uiPort = 5173
$apiHealth = Invoke-HttpStatus 'http://127.0.0.1:8000/health'
$apiReady = Invoke-HttpStatus 'http://127.0.0.1:8000/health/ready'
if ($apiHealth -eq 200 -and $apiReady -eq 200) {
    Write-Host "API existente activa y saludable: http://127.0.0.1:$apiPort"
} elseif ($apiHealth -ne 0 -or (Test-TcpPort $apiPort)) {
    Fail "El puerto $apiPort está ocupado, pero la API no está saludable. No se detiene ni duplica el proceso."
} else {
    $env:PYTHONPATH = '.venv/deps;.'
    Start-ServiceTerminal 'EcoLogística Lima - API' $backend `
        ' $env:PYTHONPATH = ''.venv/deps;.''; python -m uvicorn app.main:create_app --factory --host 127.0.0.1 --port 8000'
    Write-Host 'API iniciada en una terminal separada.'
}

$uiStatus = Invoke-HttpStatus 'http://127.0.0.1:5173/'
if ($uiStatus -eq 200) {
    Write-Host "Frontend existente activo: http://127.0.0.1:$uiPort"
} elseif ($uiStatus -ne 0 -or (Test-TcpPort $uiPort)) {
    Fail "El puerto $uiPort está ocupado, pero el frontend no responde correctamente. No se detiene ni duplica el proceso."
} else {
    $env:VITE_API_BASE_URL = 'http://127.0.0.1:8000'
    Start-ServiceTerminal 'EcoLogística Lima - Frontend' $frontend `
        ' $env:VITE_API_BASE_URL = ''http://127.0.0.1:8000''; npm run dev -- --host 127.0.0.1 --port 5173 --strictPort'
    Write-Host 'Frontend iniciado en una terminal separada.'
}

for ($attempt = 1; $attempt -le 20; $attempt++) {
    if ((Invoke-HttpStatus 'http://127.0.0.1:8000/health/ready') -eq 200) {
        Write-Host 'Verificación /health/ready: OK'
        exit 0
    }
    Start-Sleep -Seconds 1
}

Fail 'La API no respondió correctamente en /health/ready. Revisa la terminal de API.'
