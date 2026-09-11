@echo off
rem Atualiza o Sistema de Gestao de Obras.
rem
rem Antes: copie o .zip e o .sha256 da versao nova para a pasta "pacotes",
rem ao lado deste arquivo. Depois, duplo clique aqui.
rem
rem Sem acentos de proposito: o cmd do Windows mostra acento quebrado.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0current\scripts\atualizar.ps1" -Raiz "%~dp0."
