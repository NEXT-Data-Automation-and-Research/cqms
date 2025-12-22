#!/usr/bin/env python3
"""
Supabase Migration CLI Tool
Migrates tables from one Supabase database to another using PostgreSQL connection strings.
"""

import psycopg2
import sys
import json
from typing import Dict, List, Optional, Tuple
from datetime import datetime
import argparse

class SupabaseMigrator:
    def __init__(self, source_conn_string: str, dest_conn_string: str):
        self.source_conn_string = source_conn_string
        self.dest_conn_string = dest_conn_string
        self.source_conn = None
        self.dest_conn = None
        
    def connect(self):
        """Connect to both source and destination databases"""
        print("🔌 Connecting to source database...")
        try:
            self.source_conn = psycopg2.connect(self.source_conn_string)
            print("✅ Connected to source database")
        except Exception as e:
            print(f"❌ Failed to connect to source: {e}")
            sys.exit(1)
            
        print("🔌 Connecting to destination database...")
        try:
            self.dest_conn = psycopg2.connect(self.dest_conn_string)
            print("✅ Connected to destination database")
        except Exception as e:
            print(f"❌ Failed to connect to destination: {e}")
            sys.exit(1)
    
    def close(self):
        """Close database connections"""
        if self.source_conn:
            self.source_conn.close()
        if self.dest_conn:
            self.dest_conn.close()
    
    def get_tables(self) -> List[str]:
        """Get list of all tables from source database"""
        cursor = self.source_conn.cursor()
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
            AND table_name NOT LIKE 'pg_%'
            AND table_name NOT LIKE '_prisma%'
            ORDER BY table_name
        """)
        tables = [row[0] for row in cursor.fetchall()]
        cursor.close()
        return tables
    
    def get_table_info(self, table_name: str) -> Dict:
        """Get information about a table (row count, columns)"""
        cursor = self.source_conn.cursor()
        
        # Get row count
        cursor.execute(f'SELECT COUNT(*) FROM "{table_name}"')
        row_count = cursor.fetchone()[0]
        
        # Get columns
        cursor.execute("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = %s
            ORDER BY ordinal_position
        """, (table_name,))
        columns = [{'name': row[0], 'type': row[1]} for row in cursor.fetchall()]
        
        cursor.close()
        return {
            'name': table_name,
            'row_count': row_count,
            'columns': columns
        }
    
    def table_exists(self, table_name: str) -> bool:
        """Check if table exists in destination"""
        cursor = self.dest_conn.cursor()
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = %s
            )
        """, (table_name,))
        exists = cursor.fetchone()[0]
        cursor.close()
        return exists
    
    def migrate_table(self, source_table: str, dest_table: str, batch_size: int = 1000) -> int:
        """Migrate a single table from source to destination"""
        print(f"📦 Migrating {source_table} → {dest_table}...")
        
        source_cursor = self.source_conn.cursor()
        dest_cursor = self.dest_conn.cursor()
        
        # Get all data from source table
        source_cursor.execute(f'SELECT * FROM "{source_table}"')
        
        # Get column names
        columns = [desc[0] for desc in source_cursor.description]
        escaped_columns = [f'"{col}"' for col in columns]
        
        # Migrate data in batches
        rows_migrated = 0
        while True:
            rows = source_cursor.fetchmany(batch_size)
            if not rows:
                break
            
            # Build INSERT statement
            placeholders = ', '.join(['%s'] * len(columns))
            insert_query = f'''
                INSERT INTO "{dest_table}" ({', '.join(escaped_columns)}) 
                VALUES ({placeholders})
                ON CONFLICT DO NOTHING
            '''
            
            try:
                dest_cursor.executemany(insert_query, rows)
                self.dest_conn.commit()
                rows_migrated += len(rows)
                print(f"  ✓ Migrated {rows_migrated} rows...", end='\r')
            except Exception as e:
                self.dest_conn.rollback()
                print(f"\n  ❌ Error inserting rows: {e}")
                raise
        
        source_cursor.close()
        dest_cursor.close()
        print(f"\n  ✅ Completed: {rows_migrated} rows migrated")
        return rows_migrated
    
    def migrate(self, 
                selected_tables: Optional[List[str]] = None,
                table_mappings: Optional[Dict[str, str]] = None,
                skip_existing: bool = False,
                batch_size: int = 1000):
        """Main migration function"""
        start_time = datetime.now()
        
        # Get all tables if not specified
        if selected_tables is None:
            all_tables = self.get_tables()
            print(f"\n📊 Found {len(all_tables)} tables in source database")
            print("Tables:", ', '.join(all_tables))
            
            # Ask user which tables to migrate
            print("\nEnter table names to migrate (comma-separated, or 'all' for all tables):")
            user_input = input("> ").strip()
            
            if user_input.lower() == 'all':
                selected_tables = all_tables
            else:
                selected_tables = [t.strip() for t in user_input.split(',') if t.strip()]
        else:
            all_tables = self.get_tables()
            # Validate selected tables exist
            invalid_tables = [t for t in selected_tables if t not in all_tables]
            if invalid_tables:
                print(f"❌ Tables not found: {', '.join(invalid_tables)}")
                sys.exit(1)
        
        if not selected_tables:
            print("❌ No tables selected for migration")
            sys.exit(1)
        
        # Show table info
        print("\n📋 Table Information:")
        print("-" * 80)
        table_info_list = []
        for table in selected_tables:
            info = self.get_table_info(table)
            table_info_list.append(info)
            print(f"{info['name']}: {info['row_count']:,} rows, {len(info['columns'])} columns")
        print("-" * 80)
        
        # Confirm migration
        print(f"\n⚠️  Ready to migrate {len(selected_tables)} table(s)")
        confirm = input("Continue? (yes/no): ").strip().lower()
        if confirm not in ['yes', 'y']:
            print("Migration cancelled")
            return
        
        # Start migration
        print("\n🚀 Starting migration...\n")
        total_rows = 0
        
        for source_table in selected_tables:
            # Get destination table name
            dest_table = table_mappings.get(source_table, source_table) if table_mappings else source_table
            
            # Check if table exists
            if skip_existing and self.table_exists(dest_table):
                print(f"⏭️  Skipping {source_table} (already exists in destination)")
                continue
            
            try:
                rows = self.migrate_table(source_table, dest_table, batch_size)
                total_rows += rows
            except Exception as e:
                print(f"❌ Failed to migrate {source_table}: {e}")
                continue
        
        end_time = datetime.now()
        duration = (end_time - start_time).total_seconds()
        
        print("\n" + "=" * 80)
        print(f"✅ Migration completed!")
        print(f"   Tables: {len(selected_tables)}")
        print(f"   Rows: {total_rows:,}")
        print(f"   Duration: {duration:.2f} seconds")
        print("=" * 80)


def get_connection_string_interactive():
    """Get connection string from user interactively"""
    print("\n" + "=" * 80)
    print("Supabase Connection String Setup")
    print("=" * 80)
    print("\nEnter your PostgreSQL connection string.")
    print("Format: postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres")
    print("\nOr enter components separately:")
    
    choice = input("\nEnter connection string directly? (yes/no): ").strip().lower()
    
    if choice in ['yes', 'y']:
        conn_string = input("Connection string: ").strip()
        if not conn_string:
            print("❌ Connection string cannot be empty")
            sys.exit(1)
        return conn_string
    else:
        # Get components separately
        project_ref = input("Project Reference ID: ").strip()
        password = input("Database Password: ").strip()
        
        if not project_ref or not password:
            print("❌ Project ref and password are required")
            sys.exit(1)
        
        conn_string = f"postgresql://postgres:{password}@db.{project_ref}.supabase.co:5432/postgres"
        return conn_string


def main():
    parser = argparse.ArgumentParser(
        description='Migrate tables between Supabase databases',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Interactive mode (will prompt for connection strings)
  python supabase-migration-cli.py

  # With connection strings as arguments
  python supabase-migration-cli.py --source "postgresql://..." --dest "postgresql://..."

  # Migrate specific tables
  python supabase-migration-cli.py --tables users,posts,comments

  # With table renaming (JSON file)
  python supabase-migration-cli.py --mappings mappings.json
        """
    )
    
    parser.add_argument('--source', help='Source database connection string')
    parser.add_argument('--dest', help='Destination database connection string')
    parser.add_argument('--tables', help='Comma-separated list of tables to migrate')
    parser.add_argument('--mappings', help='JSON file with table name mappings (e.g., {"old_name": "new_name"})')
    parser.add_argument('--skip-existing', action='store_true', help='Skip tables that already exist in destination')
    parser.add_argument('--batch-size', type=int, default=1000, help='Batch size for data migration (default: 1000)')
    
    args = parser.parse_args()
    
    # Get connection strings
    if args.source and args.dest:
        source_conn = args.source
        dest_conn = args.dest
    else:
        print("Source Database:")
        source_conn = get_connection_string_interactive()
        print("\nDestination Database:")
        dest_conn = get_connection_string_interactive()
    
    # Parse table mappings if provided
    table_mappings = {}
    if args.mappings:
        try:
            with open(args.mappings, 'r') as f:
                table_mappings = json.load(f)
        except Exception as e:
            print(f"❌ Error reading mappings file: {e}")
            sys.exit(1)
    
    # Parse selected tables
    selected_tables = None
    if args.tables:
        selected_tables = [t.strip() for t in args.tables.split(',')]
    
    # Create migrator and run migration
    migrator = SupabaseMigrator(source_conn, dest_conn)
    
    try:
        migrator.connect()
        migrator.migrate(
            selected_tables=selected_tables,
            table_mappings=table_mappings,
            skip_existing=args.skip_existing,
            batch_size=args.batch_size
        )
    except KeyboardInterrupt:
        print("\n\n⚠️  Migration interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        sys.exit(1)
    finally:
        migrator.close()


if __name__ == '__main__':
    main()




