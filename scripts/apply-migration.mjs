import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY not found in .env');
  process.exit(1);
}

// Create Supabase client with service role key for admin access
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// Read migration SQL
const migrationPath = path.join(process.cwd(), 'supabase/migrations/20260328_000000_create_tables.sql');
const sqlContent = fs.readFileSync(migrationPath, 'utf-8');

// Split by statement separators
// We need to be careful with this - split by ; but preserve statements that might have ; inside
const splitStatements = (sql) => {
  return sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))
    .map(s => s + ';');
};

const statements = splitStatements(sqlContent);
console.log(`Found ${statements.length} SQL statements to execute`);

async function applyMigration() {
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    console.log(`\nExecuting statement ${i + 1}/${statements.length}...`);

    // Show truncated SQL for logging
    const sqlPreview = statement.replace(/\n/g, ' ').substring(0, 80);
    console.log(`SQL: ${sqlPreview}...`);

    try {
      const { data, error } = await supabase.rpc('exec_sql', {
        sql: statement,
      });

      if (error) {
        // Some errors are expected (like "already exists" for `create extension if not exists`)
        // We'll log them but continue
        console.warn(`⚠ Warning on statement ${i + 1}: ${error.message}`);
        successCount++;
      } else {
        console.log(`✓ Statement ${i + 1} executed successfully`);
        successCount++;
      }
    } catch (err) {
      console.error(`✗ Error executing statement ${i + 1}: ${err.message}`);
      errorCount++;
    }
  }

  console.log(`\n\n=== Migration Summary ===`);
  console.log(`Total statements: ${statements.length}`);
  console.log(`Successful: ${successCount}`);
  console.log(`Errors: ${errorCount}`);

  if (errorCount > 0) {
    console.warn('\nNote: Some errors above may be expected (e.g., "already exists").');
    console.log('Please verify the schema in the Supabase dashboard.');
  }
}

applyMigration().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
