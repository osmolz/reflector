const fs = require('fs');
const path = require('path');

// Read environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY not found in .env');
  process.exit(1);
}

// Read migration SQL
const migrationPath = path.join(__dirname, '../supabase/migrations/20260328_000000_create_tables.sql');
const sqlContent = fs.readFileSync(migrationPath, 'utf-8');

// Split SQL by statements (simple split by semicolon - real-world would need better parsing)
const statements = sqlContent
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--'));

console.log(`Found ${statements.length} SQL statements to execute`);

// Execute migrations
async function applyMigration() {
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i] + ';';
    console.log(`\nExecuting statement ${i + 1}/${statements.length}...`);
    console.log(`SQL: ${statement.substring(0, 100)}...`);

    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'apikey': SERVICE_ROLE_KEY,
        },
        body: JSON.stringify({ sql: statement }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error(`Error executing statement ${i + 1}: ${error}`);
      } else {
        console.log(`✓ Statement ${i + 1} executed successfully`);
      }
    } catch (err) {
      console.error(`Error: ${err.message}`);
    }
  }
}

applyMigration().catch(console.error);
