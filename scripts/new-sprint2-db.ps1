# Run from the repository root. Creates fresh resources; never reuses a volume.
param([ValidateRange(1024, 65535)][int]$DatabasePort = 55439)

$ErrorActionPreference = 'Stop'
if (Test-Path -LiteralPath '.env.sprint2') {
    throw 'Ya existe .env.sprint2. Usa el entorno documentado; no se sobrescribe.'
}
if (Get-NetTCPConnection -State Listen -LocalPort $DatabasePort -ErrorAction SilentlyContinue) {
    throw 'El puerto está ocupado. No se reutiliza una base desconocida.'
}
docker info --format '{{.ServerVersion}}'
if ($LASTEXITCODE -ne 0) { throw 'Inicia Docker Desktop y vuelve a ejecutar.' }
$resourceName = 'ecl-sprint2-' + [Guid]::NewGuid().ToString('N').Substring(0, 12)
$databasePassword = [Guid]::NewGuid().ToString('N')
$demoPassword = [Guid]::NewGuid().ToString('N')
$privateConfig = @"
POSTGRES_DB=ecl_sprint2_dev
POSTGRES_USER=ecl_synthetic
POSTGRES_PASSWORD=$databasePassword
DATABASE_URL=postgresql+psycopg://ecl_synthetic:${databasePassword}@127.0.0.1:${DatabasePort}/ecl_sprint2_dev
TEST_DATABASE_URL=postgresql+psycopg://ecl_synthetic:${databasePassword}@127.0.0.1:${DatabasePort}/ecl_sprint2_test
DEMO_PASSWORD=$demoPassword
SPRINT2_CONTAINER=${resourceName}-db
SPRINT2_VOLUME=${resourceName}-data
"@
[IO.File]::WriteAllText((Join-Path (Get-Location) '.env.sprint2'), $privateConfig)
docker run -d --name "${resourceName}-db" --label ecologistica.scope=sprint2-isolated --env-file .env.sprint2 -p "127.0.0.1:${DatabasePort}:5432" -v "${resourceName}-data:/var/lib/postgresql/data" postgis/postgis:16-3.5@sha256:94146ac37bc61e2322f88016056c5920729cb8c64c8542ed590af8fc2abdac07
if ($LASTEXITCODE -ne 0) { throw 'Falló la creación. Conserva .env.sprint2 para diagnosticar; no reintentes a ciegas.' }
$ready = $false
for ($attempt = 0; $attempt -lt 30; $attempt++) {
    docker exec "${resourceName}-db" pg_isready -U ecl_synthetic -d ecl_sprint2_dev 2>$null
    if ($LASTEXITCODE -eq 0) { $ready = $true; break }
    Start-Sleep -Seconds 1
}
if (-not $ready) { throw 'PostgreSQL aún no responde. Revisa el contenedor creado.' }
docker exec "${resourceName}-db" psql -U ecl_synthetic -d ecl_sprint2_dev -c 'ALTER DATABASE ecl_sprint2_dev SET search_path TO public'
if ($LASTEXITCODE -ne 0) { throw 'No se pudo aislar el esquema público.' }
docker exec "${resourceName}-db" createdb -U ecl_synthetic -T template_postgis ecl_sprint2_test
if ($LASTEXITCODE -ne 0) { throw 'No se pudo crear la base de pruebas.' }
Write-Output 'Bases nuevas listas. Sigue docs/entrega-sprint2/INICIO.md para migrar, cargar la semilla e iniciar.'
