# Liga o aparelho virtual "shopee" com janela (para voce instalar a Shopee e entrar na conta).
# Como rodar:  powershell -ExecutionPolicy Bypass -File .\ligar-emulador.ps1
$sdk = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
& (Join-Path $sdk 'emulator\emulator.exe') -avd shopee
