const knex = require('knex');

function createDb(databaseUrl = process.env.DATABASE_URL) {
  if (!databaseUrl) {
    throw new Error('Missing DATABASE_URL environment variable');
  }

  return knex({
    client: 'pg',
    connection: databaseUrl,
    ssl: {
      rejectUnauthorized: false
    }
  });
}

module.exports = {
  createDb
};
