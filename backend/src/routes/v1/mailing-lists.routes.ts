import { Hono } from "hono";
import * as controller from "../../controllers/v1/mailing-list.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { createMailingListSchema, updateMailingListSchema, addSubscribersToListSchema, listMailingListsQuerySchema } from "../../validators/mailing-list.schema";

const mailingLists = new Hono();

mailingLists.use("*", authMiddleware);

mailingLists.post("/preview-filter", controller.previewDynamicFilter);
mailingLists.post("/", validate(createMailingListSchema), controller.createMailingList);
mailingLists.get("/", validate(listMailingListsQuerySchema, "query"), controller.listMailingLists);
mailingLists.get("/:id", controller.getMailingList);
mailingLists.patch("/:id", validate(updateMailingListSchema), controller.updateMailingList);
mailingLists.delete("/:id", controller.deleteMailingList);

mailingLists.get("/:id/subscribers", controller.getListSubscribers);
mailingLists.post("/:id/subscribers", validate(addSubscribersToListSchema), controller.addSubscribers);
mailingLists.delete("/:id/subscribers/:subscriberId", controller.removeSubscriber);

export { mailingLists };