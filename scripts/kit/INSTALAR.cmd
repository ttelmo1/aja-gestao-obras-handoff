@echo off
rem Kit de instalacao do Sistema de Gestao de Obras - AJA.
rem
rem Duplo clique. O Windows pede permissao de administrador e a instalacao
rem abre numa janela nova. Extraia o kit inteiro antes: nao rode de dentro do .zip.
rem
rem Sem acentos de proposito: o cmd do Windows mostra acento quebrado.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0instalar-kit.ps1"
