param(
    [string]$PythonExecutable = "python",
    [string]$ModelPath = "",
    [switch]$SkipBuild
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$projectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$ferRoot = Join-Path $projectRoot "services\fer"
$venvRoot = Join-Path $ferRoot ".venv"
$pythonPath = Join-Path $venvRoot "Scripts\python.exe"
$assetRoot = Join-Path $ferRoot "models"
$modelName = "enet_b0_8_best_vgaf.onnx"
$assetModel = Join-Path $assetRoot $modelName
$userProfilePath = [Environment]::GetFolderPath("UserProfile")
$cacheRoot = Join-Path $userProfilePath ".emotiefflib"
$cachedModel = Join-Path $cacheRoot $modelName

function Invoke-Checked {
    param([string]$Program, [string[]]$Arguments)
    & $Program @Arguments
    if ($LASTEXITCODE -ne 0) { throw "Perintah gagal: $Program" }
}

Push-Location $projectRoot
try {
    if (-not (Get-Command $PythonExecutable -ErrorAction SilentlyContinue)) { throw "Python tidak ditemukan. Pasang Python 3.11 atau berikan -PythonExecutable dengan path python.exe." }
    if (-not (Get-Command "pnpm.cmd" -ErrorAction SilentlyContinue)) { throw "pnpm.cmd tidak ditemukan. Siapkan Node.js dan pnpm sesuai packageManager proyek terlebih dahulu." }
    Invoke-Checked -Program $PythonExecutable -Arguments @("-c", "import sys; raise SystemExit(0 if sys.version_info[:2] == (3, 11) else 'Gunakan Python 3.11 untuk environment lab ini.')")
    if (-not (Test-Path -LiteralPath $pythonPath)) { Invoke-Checked -Program $PythonExecutable -Arguments @("-m", "venv", $venvRoot) }
    Invoke-Checked -Program $pythonPath -Arguments @("-c", "import sys; raise SystemExit(0 if sys.version_info[:2] == (3, 11) else 'Environment tidak sesuai. Siapkan ulang .venv lokal dengan Python 3.11.')")
    Invoke-Checked -Program $pythonPath -Arguments @("-m", "pip", "install", "-r", (Join-Path $ferRoot "requirements.txt"))

    New-Item -ItemType Directory -Path $assetRoot -Force | Out-Null
    $sourceModel = $assetModel
    if ($ModelPath) { $sourceModel = (Resolve-Path -LiteralPath $ModelPath).Path }
    elseif (-not (Test-Path -LiteralPath $assetModel)) { $sourceModel = $cachedModel }
    if (-not (Test-Path -LiteralPath $sourceModel)) { throw "Model lokal belum tersedia. Sertakan $modelName di services\fer\models atau berikan -ModelPath. Model tidak diunduh otomatis." }
    if ([System.IO.Path]::GetFileName($sourceModel) -ne $modelName) { throw "Gunakan file model $modelName yang sama dengan penelitian." }
    $sourceHash = (Get-FileHash -LiteralPath $sourceModel -Algorithm SHA256).Hash
    if (Test-Path -LiteralPath $assetModel) {
        if ((Get-FileHash -LiteralPath $assetModel -Algorithm SHA256).Hash -ne $sourceHash) { throw "Model sumber berbeda dari model di paket. Tidak ada model yang ditimpa." }
    } else { Copy-Item -LiteralPath $sourceModel -Destination $assetModel }

    New-Item -ItemType Directory -Path $cacheRoot -Force | Out-Null
    if (Test-Path -LiteralPath $cachedModel) {
        if ((Get-FileHash -LiteralPath $cachedModel -Algorithm SHA256).Hash -ne $sourceHash) { throw "Cache EmotiEffLib berisi model berbeda. Periksa manual sebelum melanjutkan; cache tidak ditimpa." }
    } else { Copy-Item -LiteralPath $assetModel -Destination $cachedModel }
    Set-Content -LiteralPath (Join-Path $assetRoot ($modelName + ".sha256")) -Value ($sourceHash + "  " + $modelName) -Encoding ascii

    if (-not (Test-Path -LiteralPath (Join-Path $projectRoot "config\research-allocation.json"))) { throw "Konfigurasi alokasi belum ada. Sertakan config\research-allocation.json dari paket peneliti." }
    if (-not (Test-Path -LiteralPath (Join-Path $projectRoot ".env.local"))) { Copy-Item -LiteralPath (Join-Path $projectRoot ".env.example") -Destination (Join-Path $projectRoot ".env.local") }
    Invoke-Checked -Program "pnpm.cmd" -Arguments @("install", "--frozen-lockfile")
    if (-not $SkipBuild) { Invoke-Checked -Program "pnpm.cmd" -Arguments @("build") }
    Write-Host "Setup selesai. Pastikan RESEARCHER_KEY di .env.local sudah diisi. Jalankan pnpm.cmd lab (atau pnpm.cmd lab:dev untuk development)."
    Write-Host "Model SHA-256: $sourceHash"
} finally { Pop-Location }
