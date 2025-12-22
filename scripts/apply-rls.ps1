# PowerShell script to apply RLS migration
# This script helps apply the RLS migration to your Supabase database

param(
    [string]$ProjectRef,
    [string]$Password,
    [string]$MigrationFile = "src/db/migrations/004_enable_rls_policies.sql"
)

Write-Host "🔒 RLS Migration Application Script" -ForegroundColor Cyan
Write-Host ""

# Check if psql is available
$psqlPath = Get-Command psql -ErrorAction SilentlyContinue

if (-not $psqlPath) {
    Write-Host "❌ psql not found. Please install PostgreSQL client tools." -ForegroundColor Red
    Write-Host ""
    Write-Host "Alternative: Apply migration via Supabase Dashboard:" -ForegroundColor Yellow
    Write-Host "  1. Go to Supabase Dashboard → SQL Editor"
    Write-Host "  2. Copy contents of: $MigrationFile"
    Write-Host "  3. Paste and run"
    exit 1
}

# Check if migration file exists
if (-not (Test-Path $MigrationFile)) {
    Write-Host "❌ Migration file not found: $MigrationFile" -ForegroundColor Red
    exit 1
}

# Get connection details
if (-not $ProjectRef) {
    $ProjectRef = Read-Host "Enter your Supabase Project Reference ID"
}

if (-not $Password) {
    $SecurePassword = Read-Host "Enter your database password" -AsSecureString
    $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecurePassword)
    $Password = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
}

$ConnectionString = "postgresql://postgres:$Password@db.$ProjectRef.supabase.co:5432/postgres"

Write-Host "📋 Applying RLS migration..." -ForegroundColor Yellow
Write-Host ""

# Apply migration
try {
    & psql $ConnectionString -f $MigrationFile
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ RLS migration applied successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Cyan
        Write-Host "  1. Verify RLS is enabled in Supabase Dashboard"
        Write-Host "  2. Test your application with the new security policies"
        Write-Host "  3. Update your code to use apiClient for write operations"
    } else {
        Write-Host ""
        Write-Host "❌ Migration failed. Check the error messages above." -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host ""
    Write-Host "❌ Error applying migration: $_" -ForegroundColor Red
    exit 1
}

