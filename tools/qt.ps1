param(
    [ValidateSet('setup', 'run', 'test')][string]$Action = 'run',
    [ValidateSet('chipchip', 'chipdraw', 'pinview')][string]$App = 'chipchip'
)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$qtPython = Join-Path $projectRoot '.venv-qt\Scripts\python.exe'
if ($Action -eq 'setup') {
    if (!(Test-Path -LiteralPath $qtPython)) {
        & py -3 -m venv (Join-Path $projectRoot '.venv-qt')
        if ($LASTEXITCODE -ne 0) { throw 'Python 3.10+ is required.' }
    }
    & $qtPython -m pip install -r (Join-Path $projectRoot 'desktop\qt\requirements.txt')
    exit $LASTEXITCODE
}
if (!(Test-Path -LiteralPath $qtPython)) { throw 'Run ./tools/qt.ps1 setup first.' }
$entry = Join-Path $projectRoot 'desktop\qt\main.py'
if ($Action -eq 'test') {
    foreach ($target in @('chipchip', 'pinview')) {
        & $qtPython $entry --app $target --smoke-test
        if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    }
} else {
    & $qtPython $entry --app $App
    exit $LASTEXITCODE
}
