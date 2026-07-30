param(
  [string]$OutputName = "ELMS-Launcher.exe"
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Root = Resolve-Path (Join-Path $ScriptDir "..\..")
$DistDir = Join-Path $Root "dist"
$GeneratedDir = Join-Path $ScriptDir "generated"
$WrapperPath = Join-Path $GeneratedDir "launch-from-repo.cmd"
$SedPath = Join-Path $GeneratedDir "elms-launcher.sed"
$TargetPath = Join-Path $DistDir $OutputName
$LauncherPath = Join-Path $Root "ELMS-Launcher.cmd"
$IExpressPath = Join-Path $env:WINDIR "System32\iexpress.exe"

if (-not (Test-Path $LauncherPath)) {
  throw "ELMS-Launcher.cmd was not found at $LauncherPath"
}

if (-not (Test-Path $IExpressPath)) {
  throw "iexpress.exe was not found. This builder requires Windows IExpress."
}

New-Item -ItemType Directory -Force -Path $DistDir | Out-Null
New-Item -ItemType Directory -Force -Path $GeneratedDir | Out-Null

$RootEscaped = $Root.Path
@"
@echo off
set "ELMS_ROOT=$RootEscaped"
call "%ELMS_ROOT%\ELMS-Launcher.cmd" /all
"@ | Set-Content -Path $WrapperPath -Encoding ASCII

$TargetEscaped = $TargetPath
$GeneratedEscaped = $GeneratedDir
@"
[Version]
Class=IEXPRESS
SEDVersion=3
[Options]
PackagePurpose=InstallApp
ShowInstallProgramWindow=1
HideExtractAnimation=1
UseLongFileName=1
InsideCompressed=0
CAB_FixedSize=0
CAB_ResvCodeSigning=0
RebootMode=N
InstallPrompt=%InstallPrompt%
DisplayLicense=%DisplayLicense%
FinishMessage=%FinishMessage%
TargetName=%TargetName%
FriendlyName=%FriendlyName%
AppLaunched=%AppLaunched%
PostInstallCmd=<None>
AdminQuietInstCmd=
UserQuietInstCmd=
SourceFiles=SourceFiles
[Strings]
InstallPrompt=
DisplayLicense=
FinishMessage=
TargetName=$TargetEscaped
FriendlyName=ELMS Launcher
AppLaunched=launch-from-repo.cmd
FILE0=launch-from-repo.cmd
[SourceFiles]
SourceFiles0=$GeneratedEscaped
[SourceFiles0]
%FILE0%=
"@ | Set-Content -Path $SedPath -Encoding ASCII

& $IExpressPath /N $SedPath

for ($attempt = 0; $attempt -lt 20 -and -not (Test-Path $TargetPath); $attempt++) {
  Start-Sleep -Milliseconds 250
}

if (-not (Test-Path $TargetPath)) {
  throw "Failed to build $TargetPath"
}

Write-Host "Built $TargetPath"
