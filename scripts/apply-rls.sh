#!/bin/bash
# Bash script to apply RLS migration
# This script helps apply the RLS migration to your Supabase database

MIGRATION_FILE="src/db/migrations/004_enable_rls_policies.sql"

echo "🔒 RLS Migration Application Script"
echo ""

# Check if psql is available
if ! command -v psql &> /dev/null; then
    echo "❌ psql not found. Please install PostgreSQL client tools."
    echo ""
    echo "Alternative: Apply migration via Supabase Dashboard:"
    echo "  1. Go to Supabase Dashboard → SQL Editor"
    echo "  2. Copy contents of: $MIGRATION_FILE"
    echo "  3. Paste and run"
    exit 1
fi

# Check if migration file exists
if [ ! -f "$MIGRATION_FILE" ]; then
    echo "❌ Migration file not found: $MIGRATION_FILE"
    exit 1
fi

# Get connection details
if [ -z "$PROJECT_REF" ]; then
    read -p "Enter your Supabase Project Reference ID: " PROJECT_REF
fi

if [ -z "$DB_PASSWORD" ]; then
    read -sp "Enter your database password: " DB_PASSWORD
    echo ""
fi

CONNECTION_STRING="postgresql://postgres:${DB_PASSWORD}@db.${PROJECT_REF}.supabase.co:5432/postgres"

echo "📋 Applying RLS migration..."
echo ""

# Apply migration
if psql "$CONNECTION_STRING" -f "$MIGRATION_FILE"; then
    echo ""
    echo "✅ RLS migration applied successfully!"
    echo ""
    echo "Next steps:"
    echo "  1. Verify RLS is enabled in Supabase Dashboard"
    echo "  2. Test your application with the new security policies"
    echo "  3. Update your code to use apiClient for write operations"
else
    echo ""
    echo "❌ Migration failed. Check the error messages above."
    exit 1
fi

