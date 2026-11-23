param(
    [ValidateSet('setup','run','test')][string]$Action='run',
    [ValidateSet('chipchip','chipdraw')][string]$App='chipchip'
)
$ErrorActionPreference='Stop'
$projectRoot=Split-Path $PSScriptRoot -Parent
$build=Join-Path $projectRoot '.qt-build/windows'
# Packaged MinGW Qt installs keep the matching compiler and Ninja under Tools.
$qtRoot=if ($env:QTDIR) { $env:QTDIR } else {
    Get-ChildItem C:/Qt -Directory -ErrorAction SilentlyContinue |
        Where-Object { Test-Path (Join-Path $_.FullName 'mingw_64/bin/qmake.exe') } |
        Sort-Object { [version]$_.Name } -Descending | Select-Object -First 1 |
        ForEach-Object { Join-Path $_.FullName 'mingw_64' }
}
if ($qtRoot) {
    $env:CMAKE_PREFIX_PATH="$qtRoot;$env:CMAKE_PREFIX_PATH"
    $env:PATH="$(Join-Path $qtRoot 'bin');$env:PATH"
}
if ($qtRoot -and (Split-Path $qtRoot -Leaf) -eq 'mingw_64') {
    $qtTools=Join-Path (Split-Path (Split-Path $qtRoot -Parent) -Parent) 'Tools'
    $compiler=Get-ChildItem $qtTools -Directory -Filter 'mingw*_64' | Sort-Object Name -Descending | Select-Object -First 1
    if ($compiler) { $env:PATH="$(Join-Path $compiler.FullName 'bin');$(Join-Path $qtTools 'Ninja');$env:PATH" }
    $generator=@('-G','Ninja','-DCMAKE_CXX_COMPILER=g++.exe')
} else { $generator=@() }
& cmake -S (Join-Path $projectRoot 'desktop/qt') -B $build @generator
if ($LASTEXITCODE) { exit $LASTEXITCODE }
& cmake --build $build --config Release --parallel 2
if ($LASTEXITCODE -or $Action -eq 'setup') { exit $LASTEXITCODE }
if ($Action -eq 'test') {
    & ctest --test-dir $build -C Release --output-on-failure
} else {
    $exe=Join-Path $build 'chipchip.exe'
    if (!(Test-Path -LiteralPath $exe)) { $exe=Join-Path $build 'Release/chipchip.exe' }
    & $exe --app $App
}
exit $LASTEXITCODE
