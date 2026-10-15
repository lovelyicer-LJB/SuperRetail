# ============================================================================
#  superretail-launcher.ps1
#  SuperRetail launcher - invoked by the superretail:// protocol handler
#  (can also be run manually).
#
#  Behavior when you click the superretail://start bookmark:
#    1) If 127.0.0.1:7100 is already up, just open the page in Chrome.
#    2) Otherwise run  npm run dev -- --port 7100 --strictPort  in a cmd
#       window, wait for the port, then open http://localhost:7100/atlas
#       in Chrome.
#
#  Every run is appended to superretail-launcher.log next to this script.
# ============================================================================

[CmdletBinding()]
param(
    # The protocol handler passes something like superretail://start/ ; unused here.
    [string]$Url = 'superretail://start'
)

$ErrorActionPreference = 'Continue'

$Port    = 7100
$WebUrl  = 'http://localhost:7100/atlas'
# Working directory for the npm command (the Vite app).
$WorkDir = 'D:\LJB_Plan\GitHub_ProjectManager\SuperRetail\apps\web'
$LogFile = Join-Path $PSScriptRoot 'superretail-launcher.log'

function Write-Log([string]$Msg) {
    try {
        $line = '{0:yyyy-MM-dd HH:mm:ss}  {1}' -f (Get-Date), $Msg
        Add-Content -Path $LogFile -Value $line -Encoding ASCII
    } catch { }
}

function Test-SuperRetailPort {
    # Vite binds IPv6 ::1 only (localhost resolves to ::1 first), so probe
    # both loopback families. NOTE: the TcpClient must be constructed with
    # the matching AddressFamily - the default ctor is IPv4-only.
    $probes = @(
        @{ Addr = '::1';       Family = [System.Net.Sockets.AddressFamily]::InterNetworkV6 },
        @{ Addr = '127.0.0.1'; Family = [System.Net.Sockets.AddressFamily]::InterNetwork }
    )
    foreach ($probe in $probes) {
        $client = New-Object System.Net.Sockets.TcpClient($probe.Family)
        try {
            $ar = $client.BeginConnect($probe.Addr, $Port, $null, $null)
            if ($ar.AsyncWaitHandle.WaitOne(600)) {
                $client.EndConnect($ar)
                return $true
            }
        }
        catch { }
        finally {
            $client.Close()
        }
    }
    return $false
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
if (Test-SuperRetailPort) {
    Write-Log "port $Port already up -> opening page only"
    $chrome = Find-Chrome
    if ($chrome) { Start-Process -FilePath $chrome -ArgumentList $WebUrl }
    else { Start-Process $WebUrl }
    Write-Log 'done'
    exit 0
}

# Start the dev server in a minimized cmd window so the output stays visible.
# --strictPort keeps Vite on 7100 instead of silently hopping to another port.
Write-Log "port $Port down -> starting vite dev server"
try {
    $devProc = Start-Process -FilePath 'cmd.exe' `
        -ArgumentList '/k', 'npm run dev -- --port 7100 --strictPort' `
        -WorkingDirectory $WorkDir `
        -WindowStyle Minimized `
        -PassThru -ErrorAction Stop
    Write-Log "spawned cmd pid=$($devProc.Id)"
}
catch {
    Write-Log "SPAWN FAILED: $($_.Exception.Message)"
}

# Wait for the port (up to ~240 s), then open the browser.
# Note: on this machine npm/node are routed through the Kimi desktop
# process-runner, which makes vite's cold start take 2+ minutes.
$portUp = $false
for ($i = 0; $i -lt 150; $i++) {
    Start-Sleep -Seconds 1
    if (Test-SuperRetailPort) { $portUp = $true; break }
    if (($i % 15) -eq 14) { Write-Log "still waiting... ($($i + 1)s)" }
}

Write-Log "after wait, port up = $portUp"
$chrome = Find-Chrome
if ($chrome) { Start-Process -FilePath $chrome -ArgumentList $WebUrl }
else { Start-Process $WebUrl }
Write-Log 'done'
exit 0
