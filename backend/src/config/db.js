const knex = require('knex');

const db = knex({
  client: 'pg',
  connection: {
    host:     process.env.DB_HOST     || 'localhost',
    port:     parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME     || 'pranitra',
    user:     process.env.DB_USER     || 'pranitra',
    password: process.env.DB_PASSWORD || 'changeme',
  },
  pool: { min: 2, max: 10 },
  acquireConnectionTimeout: 10000,
});

module.exports = db;
