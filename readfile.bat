@echo off &setlocal enabledelayedexpansion 
for /F "delims=" %%a in (urls.txt) do ( 
    set /A count+=1 
    set "array[!count!]=%%a" 
) 
for /L %%i in (1,1,%count%) do phantomjs 1.js !array[%%i]! %%i.png
