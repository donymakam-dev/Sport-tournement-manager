@echo off
chcp 65001 >nul
title Saint Jerome - Gestionnaire de Tournois Sportifs
cls
echo ======================================================================
echo    INSTITUT UNIVERSITAIRE SAINT JEROME DE DOUALA
echo    Gestionnaire de Tournois Sportifs (Foot, Basket, Hand, Volley)
echo ======================================================================
echo.
cd /d "%~dp0"

echo [1/2] Lancement de l'interface dans votre navigateur...
start "" http://127.0.0.1:8080
echo.
echo [2/2] Demarrage du serveur local sur le port 8080...
echo Application active sur : http://127.0.0.1:8080
echo Pour arreter l'application, fermez simplement cette fenetre.
echo.

py -3 src\app.py 8080
if %errorlevel% neq 0 (
    py src\app.py 8080
)
if %errorlevel% neq 0 (
    echo.
    echo ======================================================================
    echo [ERREUR] Impossible de demarrer l'application avec le lanceur 'py'.
    echo Assurez-vous que Python 3 est installe sur votre ordinateur.
    echo ======================================================================
    echo.
    pause
)
