# Grava as telas do emulador enquanto voce faz o caminho de postar um video a mao.
# A cada etapa guarda um print, a estrutura da tela (XML) e o nome da tela atual.
# Como rodar:  powershell -ExecutionPolicy Bypass -File .\gravar-telas.ps1

$ErrorActionPreference = 'Continue'

$adb = Join-Path $env:LOCALAPPDATA 'Android\Sdk\platform-tools\adb.exe'
if (-not (Test-Path $adb)) { Write-Host 'adb nao encontrado. Rode antes o criar-emulador.ps1.' -ForegroundColor Red; exit 1 }

& $adb start-server | Out-Null
$aparelhos = (& $adb devices) | Select-String 'device$'
if (-not $aparelhos) {
    Write-Host 'Nenhum aparelho ligado. Abra o emulador com ligar-emulador.ps1 e tente de novo.' -ForegroundColor Red
    exit 1
}

$pasta = Join-Path $PSScriptRoot ('gravacao-' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
New-Item -ItemType Directory -Force $pasta | Out-Null
$passos = Join-Path $pasta 'passos.txt'

Write-Host ''
Write-Host "Pacotes da Shopee instalados:" -ForegroundColor Cyan
& $adb shell pm list packages shopee
Add-Content -Path $passos -Value ((& $adb shell pm list packages shopee) -join ' ') -Encoding UTF8

function Guardar-Xml($destino) {
    for ($t = 1; $t -le 4; $t++) {
        $saida = (& $adb shell uiautomator dump /sdcard/gravar_ui.xml 2>&1) | Out-String
        if ($saida -match 'dumped') {
            & $adb pull /sdcard/gravar_ui.xml $destino | Out-Null
            return $true
        }
        Start-Sleep -Seconds 1
    }
    return $false
}

Write-Host ''
Write-Host 'COMO USAR:' -ForegroundColor Yellow
Write-Host ' 1. Deixe o emulador numa tela. 2. Aqui, escreva o que VAI tocar nela e aperte Enter.'
Write-Host ' 3. Faca o toque no emulador e espere a proxima tela carregar. 4. Repita.'
Write-Host ' Para terminar, digite FIM.'
Write-Host ''

$n = 0
while ($true) {
    $n++
    $id = '{0:D2}' -f $n
    $acao = Read-Host "Tela $id - o que voce vai fazer nela? (ou FIM)"
    if ($acao.Trim().ToUpper() -eq 'FIM') { break }

    $okXml = Guardar-Xml (Join-Path $pasta "$id-tela.xml")
    & $adb shell screencap -p /sdcard/gravar_tela.png
    & $adb pull /sdcard/gravar_tela.png (Join-Path $pasta "$id-tela.png") | Out-Null
    $foco = ((& $adb shell dumpsys window windows) | Select-String 'mCurrentFocus' | Select-Object -First 1)
    $focoTxt = if ($foco) { $foco.ToString().Trim() } else { '(sem foco)' }

    Add-Content -Path $passos -Value ("{0} | acao: {1} | xml: {2} | {3}" -f $id, $acao, $okXml, $focoTxt) -Encoding UTF8
    if ($okXml) { Write-Host "  tela $id guardada." -ForegroundColor Green }
    else { Write-Host "  tela $id: print guardado, mas a estrutura (XML) falhou. Se for tela com video rodando, pause e tente de novo." -ForegroundColor Yellow }
}

$zip = "$pasta.zip"
Compress-Archive -Path (Join-Path $pasta '*') -DestinationPath $zip -Force
Write-Host ''
Write-Host "PRONTO. Arquivo para me enviar: $zip" -ForegroundColor Green
Write-Host 'Antes de enviar, abra os prints e confira se nao aparece nada pessoal (nome, telefone, e-mail).'
