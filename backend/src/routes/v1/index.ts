import { Hono } from "hono";
import { analytics } from "./analytics.routes";
import { campaigns } from "./campaigns.routes";
import { csrfProtection } from "../../middlewares/csrf.middleware";
import { dashboard } from "./dashboard.routes";
import { emailTemplates } from "./email-templates.routes";
import { health } from "./health.routes";
import { importExport } from "./import-export.routes";
import { mailingLists } from "./mailing-lists.routes";
import { permissions } from "./permissions.routes";
import { subscribers } from "./subscribers.routes";
import { tracking, webhooks } from "./webhooks.routes";
import { users } from "./users.routes";

const v1 = new Hono();

v1.use("*", csrfProtection());

v1.route("/analytics", analytics);
v1.route("/health", health);
v1.route("/subscribers", subscribers);
v1.route("/dashboard", dashboard);
v1.route("/users", users);
v1.route("/mailing-lists", mailingLists);
v1.route("/campaigns", campaigns);
v1.route("/email-templates", emailTemplates);
v1.route("/import-export", importExport);
v1.route("/permissions", permissions);

export { v1 as apiV1Router, webhooks, tracking };
