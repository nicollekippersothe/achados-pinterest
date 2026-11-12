# Cria o aparelho virtual "shopee" (Pixel 6, Android 14 com Google Play) no Windows.
# Pré-requisito: Android Studio instalado e aberto pelo menos uma vez (assistente inicial concluído).
# Como rodar (PowerShell):  powershell -ExecutionPolicy Bypass -File .\criar-emulador.ps1

$ErrorActionPreference = 'Stop'

$sdk     = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
$nome    = 'shopee'
$imagem  = 'system-images;android-34;google_apis_playstore;x86_64'
$ramMB   = 3072
$nucleos = 4

function Passo($t) { Write-Host "`n==> $t" -ForegroundColor Cyan }

if (-not (Test-Path $sdk)) {
    throw "SDK do Android não encontrado em $sdk. Abra o Android Studio e conclua o assistente de instalação (Standard)."
}

# Java: o Android Studio traz um embutido (JBR). O sdkmanager precisa dele.
if (-not $env:JAVA_HOME) {
    foreach ($c in @("$env:ProgramFiles\Android\Android Studio\jbr", "$env:LOCALAPPDATA\Programs\Android Studio\jbr")) {
        if (Test-Path $c) { $env:JAVA_HOME = $c; break }
    }
}
if (-not $env:JAVA_HOME) { throw 'Java não encontrado. Reinstale o Android Studio ou defina a variável JAVA_HOME.' }

# 1) Ferramentas de linha de comando (sdkmanager e avdmanager)
Passo 'Verificando ferramentas de linha de comando'
$sdkmanager = Join-Path $sdk 'cmdline-tools\latest\bin\sdkmanager.bat'
$avdmanager = Join-Path $sdk 'cmdline-tools\latest\bin\avdmanager.bat'
if (-not (Test-Path $sdkmanager)) {
    Write-Host 'Baixando as ferramentas do Google...'
    $zip = Join-Path $env:TEMP 'cmdline-tools.zip'
    $tmp = Join-Path $env:TEMP 'cmdline-tools-extract'
    try {
        Invoke-WebRequest 'https://dl.google.com/android/repository/commandlinetools-win-11076708_latest.zip' -OutFile $zip
    } catch {
        throw 'Falhou o download. Alternativa: no Android Studio vá em Settings > Languages & Frameworks > Android SDK > SDK Tools, marque "Android SDK Command-line Tools (latest)" e clique em Apply. Depois rode este script de novo.'
    }
    if (Test-Path $tmp) { Remove-Item $tmp -Recurse -Force }
    Expand-Archive $zip -DestinationPath $tmp
    New-Item -ItemType Directory -Force (Join-Path $sdk 'cmdline-tools') | Out-Null
    Move-Item (Join-Path $tmp 'cmdline-tools') (Join-Path $sdk 'cmdline-tools\latest')
}

# 2) Licenças e componentes
Passo 'Aceitando licenças'
(1..30 | ForEach-Object { 'y' }) | & $sdkmanager --licenses | Out-Null

Passo 'Instalando emulador, ferramentas e imagem do Android 14 (download grande, pode demorar)'
& $sdkmanager --install 'platform-tools' 'emulator' $imagem
if ($LASTEXITCODE -ne 0) { throw 'Falha ao instalar os componentes.' }

# 3) Criar o aparelho virtual
Passo "Criando o aparelho virtual '$nome'"
'no' | & $avdmanager create avd -n $nome -k $imagem -d pixel_6 --force
if ($LASTEXITCODE -ne 0) { throw 'Falha ao criar o aparelho virtual.' }

# 4) Ajustes de memória e CPU
Passo 'Ajustando memória e CPU'
$ini = Join-Path $env:USERPROFILE ".android\avd\$nome.avd\config.ini"
if (-not (Test-Path $ini)) { throw "Não achei $ini" }
$ajustes = [ordered]@{
    'hw.ramSize'                = "$ramMB"
    'hw.cpu.ncore'              = "$nucleos"
    'disk.dataPartition.size'   = '8G'
    'hw.keyboard'               = 'yes'
    'hw.gpu.mode'               = 'auto'
}
$linhas = [System.Collections.Generic.List[string]](Get-Content $ini)
foreach ($k in $ajustes.Keys) {
    $i = -1
    for ($n = 0; $n -lt $linhas.Count; $n++) { if ($linhas[$n] -match "^\s*$([regex]::Escape($k))\s*=") { $i = $n; break } }
    if ($i -ge 0) { $linhas[$i] = "$k=$($ajustes[$k])" } else { $linhas.Add("$k=$($ajustes[$k])") }
}
Set-Content -Path $ini -Value $linhas -Encoding ASCII

# 5) ADB no PATH do usuário
Passo 'Colocando o adb no PATH'
$pt = Join-Path $sdk 'platform-tools'
$pathUsuario = [Environment]::GetEnvironmentVariable('Path', 'User')
if ($pathUsuario -notlike "*$pt*") {
    [Environment]::SetEnvironmentVariable('Path', "$pathUsuario;$pt", 'User')
    Write-Host 'adb adicionado. Feche e abra o PowerShell para valer.'
}

# 6) Verificar aceleração (virtualização)
Passo 'Verificando a virtualização'
& (Join-Path $sdk 'emulator\emulator.exe') -accel-check

Write-Host "`nPRONTO. Aparelho '$nome' criado." -ForegroundColor Green
Write-Host 'Para ligar (com janela, para instalar a Shopee):'
Write-Host "  & `"$sdk\emulator\emulator.exe`" -avd $nome" -ForegroundColor Yellow
