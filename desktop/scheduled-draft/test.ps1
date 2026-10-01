$ErrorActionPreference = 'Stop'
# PowerShell's managed C# compiler runs actual source with WinRT test doubles.
# No SDK restore, registry write, app registration, notification or network call.
Add-Type -Path @(
    (Join-Path $PSScriptRoot 'SchedulePlan.cs'),
    (Join-Path $PSScriptRoot 'WindowsScheduler.cs'),
    (Join-Path $PSScriptRoot 'Test-Stubs.cs')
)
[Oharu.ScheduledDraft.DraftTests]::Run()
$config = Get-Content (Join-Path $PSScriptRoot 'config.example.json') -Raw | ConvertFrom-Json
if ($config.enabled -or $config.identityVerified -or $config.activationVerified -or $config.userOptIn) { throw 'Draft unexpectedly enabled' }
[xml](Get-Content (Join-Path $PSScriptRoot 'activation.fragment.xml.template') -Raw) | Out-Null
Write-Output 'PASS disabled configuration and XML template parsing'
