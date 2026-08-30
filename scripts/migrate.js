const fs = require('fs/promises');
const path = require('path');
const { createDb } = require('../db');

async function main() {
  const db = createDb();
  const migrationsDir = path.join(__dirname, '..', 'migrations');
  const migrationFiles = (await fs.readdir(migrationsDir))
    .filter((file) => file.endsWith('.sql'))
    .sort();

  try {
    for (const file of migrationFiles) {
      const sql = await fs.readFile(path.join(migrationsDir, file), 'utf8');
      console.log(`Running migration: ${file}`);
      await db.raw(sql);
    }

    console.log('Database migrations completed.');
  } finally {
    await db.destroy();
  }
}

main().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
