@echo off
REM SEIT Granite Code 8B — Ollama (Windows dev machine)
REM Ollama auto-quantizes for RTX 3080
echo.
echo   SEIT SOVEREIGN STACK -- GRANITE CODE ENGINE
echo.
echo   Pulling granite-code via Ollama...
ollama pull granite-code
echo.
echo   Starting Ollama server...
ollama serve
