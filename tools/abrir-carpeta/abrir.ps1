# Abre en el Explorador la carpeta (o muestra el archivo) de un proyecto. Lo invoca el Mous Hub desde el navegador.
# Entrada: mous-abrir://abrir?r=<ruta relativa al Escritorio, codificada>
# Seguridad: solo abre rutas que existan DENTRO del Escritorio; cualquier otra cosa se descarta sin hacer nada.
param([string]$Url, [switch]$Probar)

$base = [IO.Path]::GetFullPath((Join-Path $env:USERPROFILE 'Desktop'))
if ($Url -notmatch '^mous-abrir:[^?]*\?(?:[^#]*&)?r=([^&#]+)') { exit 1 }
$rel = [Uri]::UnescapeDataString($Matches[1]) -replace '/', '\'
if ($rel -match '[<>"|?*]' -or $rel -match '^[A-Za-z]:' -or $rel.StartsWith('\')) { exit 2 }
$full = [IO.Path]::GetFullPath((Join-Path $base $rel))
if (-not ($full.Equals($base, [StringComparison]::OrdinalIgnoreCase) -or $full.StartsWith($base + '\', [StringComparison]::OrdinalIgnoreCase))) { exit 2 }
if (-not (Test-Path -LiteralPath $full)) { exit 3 }
if ($Probar) { Write-Output $full; exit 0 }

if (Test-Path -LiteralPath $full -PathType Container) {
    Start-Process -FilePath 'explorer.exe' -ArgumentList ('"{0}"' -f $full)
} else {
    Start-Process -FilePath 'explorer.exe' -ArgumentList ('/select,"{0}"' -f $full)
}
