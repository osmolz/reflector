#!/usr/bin/env python3

import psycopg2
import sys
import os

# Supabase connection details
DB_HOST = "db.jjwmtqkjpbaviwdvyuuq.supabase.co"
DB_PORT = 5432
DB_NAME = "postgres"
DB_USER = "postgres"
DB_PASSWORD = "Victorgyokeres14!"

# Read migration SQL
migration_file = "supabase/migrations/20260328_000000_create_tables.sql"

try:
    with open(migration_file, 'r') as f:
        sql_content = f.read()
except FileNotFoundError:
    print(f"Error: Migration file '{migration_file}' not found")
    sys.exit(1)

print("Connecting to Supabase database...")
print(f"Host: {DB_HOST}")
print(f"Database: {DB_NAME}\n")

try:
    # Connect to the database
    conn = psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        database=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD,
        sslmode='require'
    )

    print("✓ Connected successfully\n")

    # Create a cursor to execute SQL
    cursor = conn.cursor()

    # Execute the entire SQL file
    print("Executing migration SQL...")
    cursor.execute(sql_content)
    conn.commit()

    print("✓ Migration executed successfully!\n")

    # Verify tables were created
    cursor.execute("""
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public'
        ORDER BY table_name;
    """)

    tables = cursor.fetchall()
    print("Created tables:")
    for table in tables:
        print(f"  - {table[0]}")

    cursor.close()
    conn.close()

except psycopg2.Error as e:
    print(f"✗ Database error: {e}")
    sys.exit(1)
except Exception as e:
    print(f"✗ Error: {e}")
    sys.exit(1)

print("\n✓ Schema migration complete!")
