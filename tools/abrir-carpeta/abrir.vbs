' Lanzador sin ventana para el enlace mous-abrir://. Solo deja pasar caracteres seguros y delega en abrir.ps1.
Option Explicit
Dim sh, re, u, dir
If WScript.Arguments.Count < 1 Then WScript.Quit 1
u = WScript.Arguments(0)
Set re = New RegExp
re.Pattern = "^mous-abrir:[A-Za-z0-9%._~:/?=&+\-]*$"
If Not re.Test(u) Then WScript.Quit 2
Set sh = CreateObject("WScript.Shell")
dir = Left(WScript.ScriptFullName, InStrRev(WScript.ScriptFullName, "\"))
sh.Run "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File """ & dir & "abrir.ps1"" -Url """ & u & """", 0, False
