#Requires -Version 5.1
<#
.SYNOPSIS
  Installe Eclipse Temurin JDK 11 (Adoptium), configure JAVA_HOME / PATH utilisateur
  et pointe Gradle Android (org.gradle.java.home) vers ce JDK.

.NOTES
  - Exécuter de préférence en administrateur (winget / MSI écrivent souvent sous Program Files).
  - Ne cherche pas de dossiers à la main : détection automatique après installation.
  - Usage : powershell -ExecutionPolicy Bypass -File .\scripts\install-java11-for-android.ps1
#>

param(
  [string]$AndroidProjectRoot = ""
)

$ErrorActionPreference = "Stop"

if (-not $AndroidProjectRoot) {
  $AndroidProjectRoot = Join-Path (Split-Path -Parent $PSScriptRoot) "android"
}
$GradleProps = Join-Path $AndroidProjectRoot "gradle.properties"
if (-not (Test-Path $GradleProps)) {
  Write-Error "Fichier introuvable : $GradleProps (passe -AndroidProjectRoot si besoin)."
}

function Get-Temurin11Directories {
  $bases = @(
    "${env:ProgramFiles}\Eclipse Adoptium",
    "${env:ProgramFiles(x86)}\Eclipse Adoptium"
  )
  foreach ($base in $bases) {
    if (-not (Test-Path -LiteralPath $base)) { continue }
    Get-ChildItem -LiteralPath $base -Directory -ErrorAction SilentlyContinue |
      Where-Object { $_.Name -match '^jdk-11\.' } |
      ForEach-Object { $_.FullName }
  }
}

function Resolve-Jdk11Home {
  $found = @(Get-Temurin11Directories | Sort-Object { $_ } -Descending)
  if ($found.Count -ge 1) { return $found[0] }
  return $null
}

function Install-Jdk11Winget {
  Write-Host "`n[1/4] Tentative d'installation via winget (Eclipse Temurin 11)..." -ForegroundColor Cyan
  if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
    Write-Warning "winget introuvable. Passage au téléchargement Adoptium."
    return $false
  }
  winget install -e --id EclipseAdoptium.Temurin.11.JDK `
    --accept-package-agreements --accept-source-agreements --silent
  if ($LASTEXITCODE -ne 0 -and $LASTEXITCODE -ne $null) {
    Write-Warning "winget a retourné le code $LASTEXITCODE. Essai MSI Adoptium ensuite si besoin."
    return $false
  }
  return $true
}

function Install-Jdk11Msi {
  Write-Host "`n[1/4] Téléchargement Eclipse Temurin 11 (API Adoptium)..." -ForegroundColor Cyan
  $uri = "https://api.adoptium.net/v3/binary/latest/11/ga/windows/x64/jdk/hotspot/normal/eclipse?project=jdk"
  $msi = Join-Path $env:TEMP ("temurin-11-x64-" + [guid]::NewGuid().ToString("n").Substring(0, 8) + ".msi")
  Invoke-WebRequest -Uri $uri -OutFile $msi -UseBasicParsing -MaximumRedirection 5
  Write-Host "      MSI : $msi" -ForegroundColor Gray
  Write-Host "`n[2/4] Installation silencieuse (peut demander une élévation UAC)..." -ForegroundColor Cyan
  $args = @(
    "/i", "`"$msi`"",
    "ADDLOCAL=FeatureMain,FeatureJavaHome,FeatureEnvironment",
    "INSTALLLEVEL=3",
    "/quiet",
    "/norestart"
  )
  $p = Start-Process -FilePath "msiexec.exe" -ArgumentList $args -Wait -PassThru
  if ($p.ExitCode -ne 0) {
    Write-Warning "msiexec code $($p.ExitCode). Si échec, relance le script en administrateur."
  }
  Remove-Item -LiteralPath $msi -Force -ErrorAction SilentlyContinue
}

function Set-UserJavaEnvironment {
  param([string]$JdkHome)
  Write-Host "`n[3/4] JAVA_HOME + PATH (profil utilisateur)..." -ForegroundColor Cyan
  $bin = Join-Path $JdkHome "bin"
  [Environment]::SetEnvironmentVariable("JAVA_HOME", $JdkHome, "User")
  $userPath = [Environment]::GetEnvironmentVariable("Path", "User")
  if (-not $userPath) { $userPath = "" }
  $parts = $userPath -split ";" | Where-Object { $_ -and ($_ -notmatch "Eclipse Adoptium\\jdk-11") }
  $newPath = ($bin + ";" + ($parts -join ";")).TrimEnd(";")
  [Environment]::SetEnvironmentVariable("Path", $newPath, "User")
  $env:JAVA_HOME = $JdkHome
  $env:Path = $bin + ";" + $env:Path
}

function Update-GradleJavaHome {
  param(
    [string]$PropsPath,
    [string]$JdkHome
  )
  Write-Host "`n[4/4] Mise à jour de gradle.properties (org.gradle.java.home)..." -ForegroundColor Cyan
  $gradlePath = ($JdkHome -replace "\\", "/")
  $lines = Get-Content -LiteralPath $PropsPath
  $filtered = foreach ($line in $lines) {
    if ($line -match '^\s*org\.gradle\.java\.home\s*=') { continue }
    $line
  }
  $block = @"

# JDK 11+ requis par Android Gradle Plugin (Capacitor). Configuré par scripts/install-java11-for-android.ps1
org.gradle.java.home=$gradlePath
"@
  ($filtered -join "`n").TrimEnd() + $block | Set-Content -LiteralPath $PropsPath -Encoding UTF8
  Write-Host "      $PropsPath" -ForegroundColor Gray
}

# --- main ---
Write-Host "=== Takap Soccer : JDK 11 pour builds Android ===" -ForegroundColor Green
Write-Host "Android project : $AndroidProjectRoot"

$jdk = Resolve-Jdk11Home
if (-not $jdk) {
  [void](Install-Jdk11Winget)
  Start-Sleep -Seconds 2
  $jdk = Resolve-Jdk11Home
}
if (-not $jdk) {
  Install-Jdk11Msi
  Start-Sleep -Seconds 2
  $jdk = Resolve-Jdk11Home
}

if (-not $jdk) {
  Write-Error "JDK 11 Temurin introuvable après installation. Relance en administrateur ou installe manuellement depuis https://adoptium.net/"
}

Write-Host "`nJDK détecté : $jdk" -ForegroundColor Green
& (Join-Path $jdk "bin\java.exe") -version

Set-UserJavaEnvironment -JdkHome $jdk
Update-GradleJavaHome -PropsPath $GradleProps -JdkHome $jdk

Write-Host "`nTerminé. Ferme et rouvre Android Studio / le terminal, puis dans android\ : .\gradlew.bat assembleDebug" -ForegroundColor Green
