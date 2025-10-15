#!/usr/bin/env node

/**
 * Database Migration Runner
 * Run: node run-migration.js
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Read DATABASE_URL from environment
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ DATABASE_URL not found in environment');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function runMigration() {
  console.log('🚀 Starting AI Roadmap database migration...\n');
  
  const migrationFile = path.join(__dirname, 'migrations', 'create_ai_roadmap_tables.sql');
  
  if (!fs.existsSync(migrationFile)) {
    console.error('❌ Migration file not found:', migrationFile);
    process.exit(1);
  }
  
  const sql = fs.readFileSync(migrationFile, 'utf8');
  
  try {
    // Execute the migration
    await pool.query(sql);
    console.log('✅ Successfully created AI Roadmap tables:');
    console.log('   - ai_roadmap_configs');
    console.log('   - roadmap_departments');
    console.log('   - roadmap_nodes');
    console.log('   - roadmap_edges');
    console.log('   - roadmap_snapshots');
    console.log('   - All indexes created\n');
    
    // Verify tables were created
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND (table_name LIKE 'roadmap%' OR table_name LIKE 'ai_roadmap%')
      ORDER BY table_name
    `);
    
    console.log('📊 Verified tables in database:');
    result.rows.forEach(row => {
      console.log(`   ✓ ${row.table_name}`);
    });
    
    console.log('\n🎉 Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();

