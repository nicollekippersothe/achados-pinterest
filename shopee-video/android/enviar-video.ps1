# Manda um video do seu computador para a galeria do emulador.
# Como rodar:  powershell -ExecutionPolicy Bypass -File .\enviar-video.ps1 -Arquivo "C:\shopee\meu-video.mp4"

param([Parameter(Mandatory = $true)][string]$Arquivo)

$adb = Join-Path $env:LOCALAPPDATA 'Android\Sdk\platform-tools\adb.exe'
if (-not (Test-Path $adb)) { Write-Host 'adb nao encontrado. Rode antes o criar-emulador.ps1.' -ForegroundColor Red; exit 1 }
if (-not (Test-Path $Arquivo)) { Write-Host "Arquivo nao encontrado: $Arquivo" -ForegroundColor Red; exit 1 }

$nome = 'teste_' + (Get-Date -Format 'HHmmss') + '.mp4'
& $adb push $Arquivo "/sdcard/Movies/$nome"
& $adb shell am broadcast -a android.intent.action.MEDIA_SCANNER_SCAN_FILE -d "file:///sdcard/Movies/$nome" | Out-Null
Write-Host "Video enviado como $nome. Abra a galeria do emulador para conferir." -ForegroundColor Green
