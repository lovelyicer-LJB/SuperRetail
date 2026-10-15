# ============================================================================
#  dsh-launcher.ps1
#  DeepSeek Harness launcher - invoked by the dsh:// protocol handler
#  (can also be run manually).
#
#  Behavior when you click the dsh://start bookmark:
#    1) If 127.0.0.1:3080 is already up, just open the page in Chrome.
#    2) Otherwise run  npx @deepseek-ai/dsh web  in a cmd window,
#       wait for the port, then open http://127.0.0.1:3080 in Chrome.
#
#  Every run is appended to dsh-launcher.log next to this script.
# ============================================================================

[CmdletBinding()]
param(
    # The protocol handler passes something like dsh://start/ ; unused here.
    [string]$Url = 'dsh://start'
)

$ErrorActionPreference = 'Continue'

$Port    = 3080
$WebUrl  = 'http://127.0.0.1:3080'
# Working directory for the npx command.
$WorkDir = 'D:\LJB_Plan\GitHub_ProjectManager\General'
$LogFile = Join-Path $PSScriptRoot 'dsh-launcher.log'

function Write-Log([string]$Msg) {
    try {
        $line = '{0:yyyy-MM-dd HH:mm:ss}  {1}' -f (Get-Date), $Msg
        Add-Content -Path $LogFile -Value $line -Encoding ASCII
    } catch { }
}

function Test-DshPort {
    $client = New-Object System.Net.Sockets.TcpClient
    try {
        $ar = $client.BeginConnect('127.0.0.1', $Port, $null, $null)
        if ($ar.AsyncWaitHandle.WaitOne(600)) {
            $client.EndConnect($ar)
            return $true
        }
        return $false
    }
    catch {
        return $false
    }
    finally {
        $client.Close()
    }
}

function Find-Chrome {
    $candidates = @(
        "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe",
        "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
        "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe"
    )
    foreach ($c in $candidates) {
        if (Test-Path -LiteralPath $c) { return $c }
    }
    return $null
}

Write-Log "started (url=$Url)"

# Already running: open the page, do not start a second instance.
if (Test-DshPort) {
    Write-Log 'port 3080 already up -> opening page only'
    $chrome = Find-Chrome
    if ($chrome) { Start-Process -FilePath $chrome -ArgumentList $WebUrl }
    else { Start-Process $WebUrl }
    Write-Log 'done'
    exit 0
}

# Start the server in a minimized cmd window so the command stays visible.
Write-Log 'port 3080 down -> starting npx server'
Start-Process -FilePath 'cmd.exe' `
    -ArgumentList '/k', 'npx @deepseek-ai/dsh web --no-open' `
    -WorkingDirectory $WorkDir `
    -WindowStyle Minimized

# Wait for the port (up to ~90 s), then open the browser.
for ($i = 0; $i -lt 90; $i++) {
    Start-Sleep -Seconds 1
    if (Test-DshPort) { break }
}

Write-Log "after wait, port up = $(Test-DshPort)"
$chrome = Find-Chrome
if ($chrome) { Start-Process -FilePath $chrome -ArgumentList $WebUrl }
else { Start-Process $WebUrl }
Write-Log 'done'
exit 0
