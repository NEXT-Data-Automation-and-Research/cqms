/**
 * Export Database to Local Files
 * Exports schema and data from QMS database
 * Renames 'users' table to 'people'
 */

import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import postgres from 'postgres';

const PROJECT_REF = 'xijmkmvsumeoqarpmpvi';
const OUTPUT_DIR = 'db-migration-data';

// You'll need to provide the database password
const DB_PASSWORD = process.env.SOURCE_DB_PASSWORD || '';

if (!DB_PASSWORD) {
  console.error('❌ Please set SOURCE_DB_PASSWORD environment variable');
  console.log('Example: $env:SOURCE_DB_PASSWORD="your-password"; node export-database-local.js');
  process.exit(1);
}

const DB_URL = `postgresql://postgres:${encodeURIComponent(DB_PASSWORD)}@db.${PROJECT_REF}.supabase.co:5432/postgres`;

async function ensureDirectory() {
  try {
    await mkdir(OUTPUT_DIR, { recursive: true });
    console.log(`✓ Directory ${OUTPUT_DIR} ready`);
  } catch (error) {
    // Directory already exists
  }
}

async function exportSchema(sql) {
  console.log('\n📋 Exporting schema...');
  
  const schemaQueries = [
    // Get all table creation statements
    `SELECT 
      'CREATE TABLE IF NOT EXISTS ' || quote_ident(table_name) || ' (' || 
      string_agg(
        quote_ident(column_name) || ' ' || 
        CASE 
          WHEN data_type = 'USER-DEFINED' THEN udt_name
          WHEN data_type = 'ARRAY' THEN udt_name || '[]'
          ELSE data_type
        END ||
        CASE WHEN character_maximum_length IS NOT NULL 
          THEN '(' || character_maximum_length || ')'
          ELSE ''
        END ||
        CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
        CASE WHEN column_default IS NOT NULL 
          THEN ' DEFAULT ' || column_default
          ELSE ''
        END,
        ', '
        ORDER BY ordinal_position
      ) || ');' as create_statement
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name NOT LIKE 'pg_%'
    GROUP BY table_name
    ORDER BY table_name;`
  ];

  let allSchema = [];
  
  // Get table structures
  const tables = await sql`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      AND table_name NOT LIKE 'pg_%'
    ORDER BY table_name
  `;

  for (const table of tables) {
    const tableName = table.table_name;
    const newTableName = tableName === 'users' ? 'people' : tableName;
    
    // Get column definitions
    const columns = await sql`
      SELECT 
        column_name,
        data_type,
        udt_name,
        character_maximum_length,
        is_nullable,
        column_default,
        ordinal_position
      FROM information_schema.columns
      WHERE table_schema = 'public' 
        AND table_name = ${tableName}
      ORDER BY ordinal_position
    `;

    // Build CREATE TABLE statement
    let createTable = `CREATE TABLE IF NOT EXISTS ${newTableName} (\n`;
    const colDefs = columns.map(col => {
      let def = `  ${col.column_name} `;
      
      // Handle data types
      if (col.data_type === 'USER-DEFINED') {
        def += col.udt_name;
      } else if (col.data_type === 'ARRAY') {
        def += col.udt_name + '[]';
      } else {
        def += col.data_type;
        if (col.character_maximum_length) {
          def += `(${col.character_maximum_length})`;
        }
      }
      
      if (col.is_nullable === 'NO') {
        def += ' NOT NULL';
      }
      
      if (col.column_default) {
        def += ` DEFAULT ${col.column_default}`;
      }
      
      return def;
    });
    
    createTable += colDefs.join(',\n');
    createTable += '\n);\n';
    
    allSchema.push(createTable);
    
    // Get constraints (primary keys, foreign keys, etc.)
    const constraints = await sql`
      SELECT 
        conname as constraint_name,
        contype as constraint_type,
        pg_get_constraintdef(oid) as constraint_def
      FROM pg_constraint
      WHERE conrelid = ${tableName}::regclass
    `;
    
    if (constraints.length > 0) {
      allSchema.push(`\n-- Constraints for ${newTableName}\n`);
      constraints.forEach(con => {
        let constraintSQL = con.constraint_def;
        // Replace table name in constraint
        constraintSQL = constraintSQL.replace(new RegExp(`\\b${tableName}\\b`, 'g'), newTableName);
        allSchema.push(`ALTER TABLE ${newTableName} ADD CONSTRAINT ${con.constraint_name} ${constraintSQL};\n`);
      });
    }
  }

  const schemaSQL = allSchema.join('\n');
  
  // Replace all references to 'users' table with 'people'
  const finalSchema = schemaSQL.replace(/\busers\b/g, 'people');
  
  await writeFile(join(OUTPUT_DIR, 'schema.sql'), finalSchema, 'utf8');
  console.log(`✓ Schema exported to ${OUTPUT_DIR}/schema.sql`);
}

async function exportData(sql) {
  console.log('\n📊 Exporting data...');
  
  const tables = await sql`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      AND table_name NOT LIKE 'pg_%'
    ORDER BY table_name
  `;

  let allData = [];
  let totalRows = 0;

  for (const table of tables) {
    const tableName = table.table_name;
    const newTableName = tableName === 'users' ? 'people' : tableName;
    
    console.log(`  Exporting ${tableName}${tableName === 'users' ? ' → people' : ''}...`);
    
    // Get row count
    const countResult = await sql`SELECT COUNT(*) as count FROM ${sql(tableName)}`;
    const rowCount = Number(countResult[0]?.count || 0);
    
    if (rowCount === 0) {
      console.log(`    ⏭ Skipping ${tableName} (empty)`);
      continue;
    }
    
    // Get all data
    const data = await sql`SELECT * FROM ${sql(tableName)}`;
    
    // Generate INSERT statements
    if (data.length > 0) {
      const columns = Object.keys(data[0]);
      allData.push(`\n-- Data for ${newTableName} (${rowCount} rows)\n`);
      
      // Insert in batches for better performance
      const batchSize = 100;
      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);
        const values = batch.map(row => {
          const vals = columns.map(col => {
            const val = row[col];
            if (val === null) return 'NULL';
            if (typeof val === 'string') {
              return `'${val.replace(/'/g, "''")}'`;
            }
            if (typeof val === 'object') {
              return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
            }
            return val;
          });
          return `(${vals.join(', ')})`;
        });
        
        allData.push(`INSERT INTO ${newTableName} (${columns.join(', ')}) VALUES\n${values.join(',\n')};\n`);
      }
      
      totalRows += rowCount;
      console.log(`    ✓ Exported ${rowCount} rows`);
    }
  }

  const dataSQL = allData.join('\n');
  await writeFile(join(OUTPUT_DIR, 'data.sql'), dataSQL, 'utf8');
  console.log(`✓ Data exported to ${OUTPUT_DIR}/data.sql (${totalRows} total rows)`);
}

async function main() {
  console.log('🚀 Starting database export...');
  console.log(`Project: QMS - Quality Management System (${PROJECT_REF})`);
  console.log(`Output: ${OUTPUT_DIR}/`);
  console.log(`Table rename: users → people\n`);

  await ensureDirectory();

  const sql = postgres(DB_URL, {
    max: 1,
    idle_timeout: 20,
  });

  try {
    await exportSchema(sql);
    await exportData(sql);
    
    console.log('\n✅ Export completed successfully!');
    console.log(`\nFiles created:`);
    console.log(`  - ${OUTPUT_DIR}/schema.sql`);
    console.log(`  - ${OUTPUT_DIR}/data.sql`);
    console.log(`\nNote: The 'users' table has been renamed to 'people' in both files.`);
    
  } catch (error) {
    console.error('\n❌ Export failed:', error.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();




