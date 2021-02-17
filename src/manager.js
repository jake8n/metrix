const { createPool, sql } = require("slonik");
const fastify = require("fastify");
const { request } = require("undici");

const { DB_USER, DB_SECRET, DB_HOST, DB_NAME, SCHEDULER_URL } = process.env;
const uri = `postgres://${DB_USER}:${DB_SECRET}@${DB_HOST}/${DB_NAME}`;
const pool = createPool(uri);

const routes = [
  {
    method: "GET",
    url: "/",
    handler: async () => {
      const { rows } = await pool.query(sql`SELECT * FROM metric_metas`);
      return rows;
    },
  },
  {
    method: "GET",
    url: "/:id",
    handler: async ({ params }, reply) => {
      const { id } = params;
      const { rows } = await pool.query(
        sql`SELECT * FROM metric_metas WHERE id=${id}`
      );
      if (rows.length) {
        return rows[0];
      } else {
        return reply.code(404).send();
      }
    },
  },
  {
    method: "DELETE",
    url: "/:id",
    handler: async ({ params }, reply) => {
      const { id } = params;
      await Promise.all([
        pool.query(sql`DELETE FROM metric_metas WHERE id=${id}`),
        pool.query(sql`DELETE FROM metric_values WHERE id=${id}`),
        request(SCHEDULER_URL + id, { method: "DELETE" }),
      ]);
      reply.code(204);
    },
  },
  {
    method: "POST",
    url: "/",
    schema: {
      body: {
        required: ["id", "description"],
        properties: {
          id: { type: "string" },
          description: { type: "string" },
        },
      },
    },
    handler: async ({ body }, reply) => {
      const { id, description } = body;
      await pool.query(
        sql`INSERT INTO metric_metas (id, description) VALUES (${id}, ${description})`
      );
      reply.code(204);
    },
  },
];

const Manager = async () => {
  await pool.query(
    sql`CREATE TABLE IF NOT EXISTS metric_metas(id TEXT NOT NULL UNIQUE, description TEXT NOT NULL)`
  );
  const server = fastify({ logger: true });
  routes.forEach((route) => server.route(route));
  await server.listen(process.env.PORT, "0.0.0.0");
};

module.exports = {
  Manager,
};
