param([ValidateRange(1,90)][int]$Days = 14)
$ErrorActionPreference = 'Stop'
# Run interactively on the owner's computer. No plaintext code is printed or written to disk.
$reviewBytes = [byte[]]::new(24)
$reviewRng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
try { $reviewRng.GetBytes($reviewBytes) } finally { $reviewRng.Dispose() }
$reviewCode = [Convert]::ToHexString($reviewBytes).ToLowerInvariant()
$reviewSha = [System.Security.Cryptography.SHA256]::Create()
try { $reviewHash = [Convert]::ToHexString($reviewSha.ComputeHash([Text.Encoding]::UTF8.GetBytes($reviewCode))).ToLowerInvariant() } finally { $reviewSha.Dispose() }
Set-Clipboard -Value $reviewCode
$reviewCode = $null
[Array]::Clear($reviewBytes, 0, $reviewBytes.Length)
Write-Output 'Review code copied to clipboard. Save it in your password manager and private store review fields; then clear the clipboard.'
Write-Output 'Set these four values in Supabase > InOut > Edge Functions > Secrets:'
Write-Output 'REVIEWER_ENABLED=true'
Write-Output "REVIEWER_CODE_SHA256=$reviewHash"
Write-Output "REVIEWER_CODE_EXPIRES_AT=$([DateTime]::UtcNow.AddDays($Days).ToString('o'))"
Write-Output "REVIEWER_GENERATION=$([Guid]::NewGuid().ToString())"
