# Registra el enlace mous-abrir:// para tu usuario de Windows (sin permisos de administrador).
# Para quitarlo: powershell -File desinstalar.ps1
$vbs = Join-Path $PSScriptRoot 'abrir.vbs'
$k = 'HKCU:\Software\Classes\mous-abrir'
New-Item -Path $k -Force | Out-Null
Set-ItemProperty -Path $k -Name '(default)' -Value 'URL:Mous Hub - abrir carpeta'
New-ItemProperty -Path $k -Name 'URL Protocol' -Value '' -Force | Out-Null
New-Item -Path "$k\shell\open\command" -Force | Out-Null
Set-ItemProperty -Path "$k\shell\open\command" -Name '(default)' -Value ('wscript.exe "{0}" "%1"' -f $vbs)
Write-Output "Instalado: mous-abrir:// -> $vbs"
