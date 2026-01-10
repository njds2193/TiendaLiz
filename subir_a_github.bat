@echo off
echo --- Configuracion de GitHub para CloudStore PWA ---
echo.

:: Verificar si git esta instalado
where git >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Git no esta instalado o no se encuentra en el PATH.
    echo Por favor instala Git desde https://git-scm.com/downloads y vuelve a intentar.
    pause
    exit /b
)

echo 1. Inicializando repositorio...
git init
git branch -M main

echo.
echo 2. Agregando archivos...
git add .

echo.
echo 3. Creando primer commit...
git commit -m "Initial commit - CloudStore PWA"

echo.
echo ---------------------------------------------------
echo Ve a https://github.com/new y crea un nuevo repositorio.
echo Copia la URL que termina en .git (ej: https://github.com/usuario/repo.git)
echo ---------------------------------------------------
echo.
set /p REMOTE_URL="Pega la URL del repositorio aqui: "

echo.
echo 4. Vinculando repositorio remoto...
git remote add origin %REMOTE_URL%

echo.
echo 5. Subiendo archivos...
git push -u origin main

echo.
echo [EXITO] Proyecto subido correctamente!
pause
