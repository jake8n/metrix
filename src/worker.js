const { createPool, sql } = require("slonik");
const Bull = require("bull");
const si = require("systeminformation");

const { DB_USER, DB_SECRET, DB_HOST, DB_NAME, QUEUE_NAME } = process.env;
const uri = `postgres://${DB_USER}:${DB_SECRET}@${DB_HOST}/${DB_NAME}`;
const pool = createPool(uri);

const queue = new Bull(QUEUE_NAME);

const collect = async ({ name: id }) => {
  const nullIfUndefined = (value) => (value === undefined ? null : value);
  const [a, b] = id.split(".");
  const value = (await si[a]())[b];
  await pool.query(
    sql`INSERT INTO metric_values(time, id, value) VALUES (NOW(), ${id}, ${nullIfUndefined(
      value
    )})`
  );
};

const Worker = async () => {
  await pool.query(
    sql`CREATE TABLE IF NOT EXISTS metric_values(time TIMESTAMPTZ NOT NULL, id TEXT NOT NULL, value DOUBLE PRECISION NULL)`
  );
  await queue.process("*", collect);
};

module.exports = {
  Worker,
};
