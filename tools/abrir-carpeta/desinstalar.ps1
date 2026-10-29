# Quita el enlace mous-abrir:// de Windows.
Remove-Item -Path 'HKCU:\Software\Classes\mous-abrir' -Recurse -Force -ErrorAction SilentlyContinue
Write-Output 'Desinstalado.'
