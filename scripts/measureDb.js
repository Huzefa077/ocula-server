const { createDb } = require('../db');

async function measure(label, action) {
  const startedAt = performance.now();
  const result = await action();
  const durationMs = Math.round(performance.now() - startedAt);

  console.log(`${label}=${durationMs}ms`);
  return result;
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL || '';
  const db = createDb(databaseUrl);

  try {
    console.log(`pooledConnection=${databaseUrl.includes('-pooler.')}`);

    await measure('select1', () => db.raw('select 1'));
    await measure('countProfiles', () => db('user_profiles').count('* as count'));

    const indexes = await measure('indexLookup', () => db.raw(`
      select tablename, indexname
      from pg_indexes
      where schemaname = 'public'
      and tablename in ('user_profiles', 'user_auth')
      order by tablename, indexname
    `));

    console.log('indexes=' + indexes.rows
      .map((index) => `${index.tablename}.${index.indexname}`)
      .join(','));
  } finally {
    await db.destroy();
  }
}

main().catch((error) => {
  console.error(`measureDbErrorName=${error.name || 'UnknownError'}`);
  console.error(`measureDbErrorCode=${error.code || 'none'}`);
  console.error(`measureDbErrorMessage=${error.message || 'No message from database driver'}`);
  process.exit(1);
});
