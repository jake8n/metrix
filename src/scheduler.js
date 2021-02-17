const fastify = require("fastify");
const Bull = require("bull");
const { request } = require("undici");

const { QUEUE_NAME, MANAGER_URL } = process.env;
const queue = new Bull(QUEUE_NAME);

const routes = [
  {
    method: "GET",
    url: "/",
    handler: () => queue.getRepeatableJobs(),
  },
  {
    method: "GET",
    url: "/:name",
    handler: async ({ params }) => {
      const { name: compareName } = params;
      const repeatableJobs = await queue.getRepeatableJobs();
      return repeatableJobs.filter(({ name }) => name === compareName);
    },
  },
  {
    method: "DELETE",
    url: "/:name",
    handler: async ({ params }, reply) => {
      const { name } = params;
      const repeatableJobs = await queue.getRepeatableJobs();
      const repeatableJobsFiltered = repeatableJobs.filter(
        (job) => job.name === name
      );
      await Promise.all(
        repeatableJobsFiltered.map((job) =>
          queue.removeRepeatableByKey(job.key)
        )
      );
      reply.code(204);
    },
  },
  {
    method: "POST",
    url: "/",
    schema: {
      body: {
        required: ["id", "every"],
        properties: {
          id: { type: "string" },
          every: {
            type: "integer",
            minimum: 50,
            maximum: 1000 * 60 * 60 * 24, // 1 day
          },
        },
      },
    },
    handler: async ({ body }, reply) => {
      const { id, every } = body;
      const { statusCode } = await request(MANAGER_URL + id);
      if (statusCode !== 200) return reply.code(statusCode).send();
      await queue.add(id, {}, { repeat: { every } });
      reply.code(204);
    },
  },
];

const Scheduler = async () => {
  const server = fastify({ logger: true });
  routes.forEach((route) => server.route(route));
  await server.listen(process.env.PORT, "0.0.0.0");
};

module.exports = {
  Scheduler,
};
