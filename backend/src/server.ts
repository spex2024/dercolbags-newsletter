import app from "./app";
import { env } from "./config/env";

const port = parseInt(env.PORT, 10);

console.log(`Server running on port ${port} [${env.NODE_ENV}]`);

export default {
  port,
  fetch: app.fetch,
};
