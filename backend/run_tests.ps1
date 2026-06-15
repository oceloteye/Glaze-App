Set-Location "c:\Users\ocelo\Glaze App\backend"
$result = & ".\mvnw.cmd" test "--no-transfer-progress" 2>&1
Write-Host ("Exit: " + $LASTEXITCODE)
$result | Select-Object -Last 60
