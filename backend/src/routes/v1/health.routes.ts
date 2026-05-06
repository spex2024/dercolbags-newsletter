import { Hono } from "hono";

const health = new Hono();

health.get("/", (c) => {
  return c.json({
    success: true,
    message: "OK",
    data: {
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    },
  });
});

export { health };
