import type { OpenAPIV3 } from "openapi-types";

const bearerAuth: OpenAPIV3.SecuritySchemeObject = {
  type: "http",
  scheme: "bearer",
  description: "Session token from Better Auth sign-in response",
};

const errorSchema: OpenAPIV3.SchemaObject = {
  type: "object",
  properties: {
    success: { type: "boolean", example: false },
    message: { type: "string" },
  },
};

const successSchema = (dataSchema?: OpenAPIV3.SchemaObject): OpenAPIV3.SchemaObject => ({
  type: "object",
  properties: {
    success: { type: "boolean", example: true },
    message: { type: "string" },
    ...(dataSchema ? { data: dataSchema } : {}),
  },
});

const paginatedSchema = (itemSchema: OpenAPIV3.SchemaObject): OpenAPIV3.SchemaObject => ({
  type: "object",
  properties: {
    success: { type: "boolean", example: true },
    data: {
      type: "object",
      properties: {
        items: { type: "array", items: itemSchema },
        total: { type: "integer" },
        page: { type: "integer" },
        limit: { type: "integer" },
        totalPages: { type: "integer" },
      },
    },
  },
});

const brandEnum: OpenAPIV3.SchemaObject = { type: "string", enum: ["watpak", "dercolbags"] };
const statusEnum: OpenAPIV3.SchemaObject = { type: "string", enum: ["new", "contacted", "converted", "spam"] };
const roleEnum: OpenAPIV3.SchemaObject = { type: "string", enum: ["owner", "admin", "marketing_manager", "sales_support"] };

// ─── Schemas ─────────────────────────────────────────────────────────────────

const schemas: Record<string, OpenAPIV3.SchemaObject> = {
  Subscriber: {
    type: "object",
    properties: {
      id: { type: "string", format: "uuid" },
      brand: brandEnum,
      name: { type: "string" },
      email: { type: "string", format: "email" },
      phone: { type: "string" },
      location: { type: "string" },
      source: { type: "string" },
      status: statusEnum,
      isSubscribed: { type: "boolean" },
      createdAt: { type: "string", format: "date-time" },
    },
  },

  CreateSubscriber: {
    type: "object",
    required: ["brand", "email"],
    properties: {
      brand: brandEnum,
      name: { type: "string" },
      email: { type: "string", format: "email" },
      phone: { type: "string" },
      location: { type: "string" },
      source: { type: "string" },
    },
  },

  User: {
    type: "object",
    properties: {
      id: { type: "string", format: "uuid" },
      name: { type: "string" },
      email: { type: "string", format: "email" },
      role: roleEnum,
      brandAccess: { type: "array", items: brandEnum },
      createdAt: { type: "string", format: "date-time" },
    },
  },

  CreateUser: {
    type: "object",
    required: ["name", "email", "password", "role", "brandAccess"],
    properties: {
      name: { type: "string", minLength: 2 },
      email: { type: "string", format: "email" },
      password: { type: "string", minLength: 8 },
      role: roleEnum,
      brandAccess: { type: "array", items: brandEnum, minItems: 1 },
    },
  },

  UpdateUser: {
    type: "object",
    properties: {
      name: { type: "string", minLength: 2 },
      role: roleEnum,
      brandAccess: { type: "array", items: brandEnum, minItems: 1 },
    },
  },

  MailingList: {
    type: "object",
    properties: {
      id: { type: "string", format: "uuid" },
      name: { type: "string" },
      brand: brandEnum,
      description: { type: "string" },
      isDynamic: { type: "boolean" },
      subscriberCount: { type: "integer" },
      createdAt: { type: "string", format: "date-time" },
    },
  },

  CreateMailingList: {
    type: "object",
    required: ["name", "brand"],
    properties: {
      name: { type: "string", maxLength: 100 },
      brand: brandEnum,
      description: { type: "string", maxLength: 500 },
      isDynamic: { type: "boolean", default: false },
      filterConfig: {
        type: "object",
        nullable: true,
        properties: {
          brand: brandEnum,
          status: { type: "array", items: statusEnum },
          isSubscribed: { type: "boolean" },
          location: { type: "string" },
          createdAtFrom: { type: "string", format: "date-time" },
          createdAtTo: { type: "string", format: "date-time" },
        },
      },
    },
  },

  Campaign: {
    type: "object",
    properties: {
      id: { type: "string", format: "uuid" },
      name: { type: "string" },
      brand: brandEnum,
      subject: { type: "string" },
      content: { type: "string" },
      preheader: { type: "string" },
      targetType: { type: "string", enum: ["all", "list", "segment"] },
      targetId: { type: "string", format: "uuid" },
      status: { type: "string", enum: ["draft", "scheduled", "sending", "sent", "cancelled"] },
      scheduledAt: { type: "string", format: "date-time" },
      sentAt: { type: "string", format: "date-time" },
      createdAt: { type: "string", format: "date-time" },
    },
  },

  CreateCampaign: {
    type: "object",
    required: ["name", "brand", "subject", "content", "targetType"],
    properties: {
      name: { type: "string", maxLength: 100 },
      brand: brandEnum,
      subject: { type: "string", maxLength: 200 },
      content: { type: "string" },
      preheader: { type: "string", maxLength: 200 },
      targetType: { type: "string", enum: ["all", "list", "segment"] },
      targetId: { type: "string", format: "uuid" },
    },
  },

  ScheduleCampaign: {
    type: "object",
    required: ["scheduledAt"],
    properties: {
      scheduledAt: { type: "string", format: "date-time" },
    },
  },

  EmailTemplate: {
    type: "object",
    properties: {
      id: { type: "string", format: "uuid" },
      brand: brandEnum,
      templateKey: {
        type: "string",
        enum: [
          "subscriber_confirmation", "unsubscribe_confirmation", "user_invite",
          "password_reset", "campaign_default", "campaign_test",
          "admin_new_subscriber_notification",
        ],
      },
      name: { type: "string" },
      subject: { type: "string" },
      htmlContent: { type: "string" },
      plainTextContent: { type: "string" },
      category: { type: "string", enum: ["system", "auth", "campaign", "notification"] },
      status: { type: "string", enum: ["draft", "active", "archived"] },
      createdAt: { type: "string", format: "date-time" },
    },
  },

  CreateEmailTemplate: {
    type: "object",
    required: ["brand", "templateKey", "name", "subject", "htmlContent", "category"],
    properties: {
      brand: brandEnum,
      templateKey: {
        type: "string",
        enum: [
          "subscriber_confirmation", "unsubscribe_confirmation", "user_invite",
          "password_reset", "campaign_default", "campaign_test",
          "admin_new_subscriber_notification",
        ],
      },
      name: { type: "string", maxLength: 100 },
      subject: { type: "string", maxLength: 200 },
      htmlContent: { type: "string" },
      plainTextContent: { type: "string" },
      designJson: { type: "object" },
      category: { type: "string", enum: ["system", "auth", "campaign", "notification"] },
    },
  },

  ImportRow: {
    type: "object",
    required: ["email"],
    properties: {
      email: { type: "string", format: "email" },
      name: { type: "string" },
      phone: { type: "string" },
      location: { type: "string" },
      source: { type: "string" },
    },
  },
};

// ─── Paths ────────────────────────────────────────────────────────────────────

const securedOp = (
  summary: string,
  tags: string[],
  extra: Partial<OpenAPIV3.OperationObject> = {}
): OpenAPIV3.OperationObject => ({
  summary,
  tags,
  security: [{ bearerAuth: [] }],
  responses: {
    401: { description: "Unauthorized", content: { "application/json": { schema: errorSchema } } },
    403: { description: "Forbidden", content: { "application/json": { schema: errorSchema } } },
    ...extra.responses,
  },
  ...extra,
});

const ok = (schema: OpenAPIV3.SchemaObject): OpenAPIV3.ResponseObject => ({
  description: "Success",
  content: { "application/json": { schema } },
});

const idParam: OpenAPIV3.ParameterObject = {
  name: "id",
  in: "path",
  required: true,
  schema: { type: "string", format: "uuid" },
};

export const openAPISpec: OpenAPIV3.Document = {
  openapi: "3.0.3",
  info: {
    title: "DercolBags Newsletter API",
    version: "1.0.0",
    description:
      "Backend API for the DercolBags / WatPak newsletter management system. " +
      "Most endpoints require a session token obtained from `POST /api/auth/sign-in/email`.",
  },
  servers: [
    { url: "https://newsletter.dercolbags.com", description: "Production" },
    { url: "https://backend.dercolbags.com", description: "Local (tunnel)" },
  ],
  components: {
    securitySchemes: { bearerAuth },
    schemas,
  },
  paths: {
    // ── Health ──────────────────────────────────────────────────────────────
    "/api/v1/health": {
      get: {
        summary: "Health check",
        tags: ["Health"],
        responses: {
          200: ok(successSchema({
            type: "object",
            properties: {
              status: { type: "string", example: "healthy" },
              timestamp: { type: "string", format: "date-time" },
              uptime: { type: "number" },
            },
          })),
        },
      },
    },

    // ── Auth (Better Auth) ───────────────────────────────────────────────────
    "/api/auth/sign-in/email": {
      post: {
        summary: "Sign in with email & password",
        tags: ["Auth"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", format: "email" },
                  password: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          200: ok({
            type: "object",
            properties: {
              token: { type: "string" },
              user: { $ref: "#/components/schemas/User" },
            },
          }),
          401: { description: "Invalid credentials" },
        },
      },
    },

    "/api/auth/sign-out": {
      post: {
        summary: "Sign out",
        tags: ["Auth"],
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Signed out" } },
      },
    },

    // ── Subscribers ──────────────────────────────────────────────────────────
    "/api/v1/subscribers": {
      post: {
        summary: "Subscribe (public)",
        tags: ["Subscribers"],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/CreateSubscriber" } } },
        },
        responses: {
          201: ok(successSchema({ $ref: "#/components/schemas/Subscriber" })),
          429: { description: "Rate limit exceeded" },
        },
      },
      get: securedOp("List subscribers", ["Subscribers"], {
        parameters: [
          { name: "brand", in: "query", schema: brandEnum },
          { name: "search", in: "query", schema: { type: "string" } },
          { name: "status", in: "query", schema: statusEnum },
          { name: "isSubscribed", in: "query", schema: { type: "boolean" } },
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20, maximum: 100 } },
          { name: "sortBy", in: "query", schema: { type: "string", enum: ["createdAt", "email", "name", "status", "brand"] } },
          { name: "sortOrder", in: "query", schema: { type: "string", enum: ["asc", "desc"] } },
        ],
        responses: {
          200: ok(paginatedSchema({ $ref: "#/components/schemas/Subscriber" })),
        },
      }),
    },

    "/api/v1/subscribers/unsubscribe": {
      get: {
        summary: "Unsubscribe via token link (public)",
        tags: ["Subscribers"],
        parameters: [{ name: "token", in: "query", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Unsubscribed" } },
      },
    },

    "/api/v1/subscribers/{id}": {
      get: securedOp("Get subscriber by ID", ["Subscribers"], {
        parameters: [idParam],
        responses: { 200: ok(successSchema({ $ref: "#/components/schemas/Subscriber" })) },
      }),
      delete: securedOp("Delete subscriber", ["Subscribers"], {
        parameters: [idParam],
        responses: { 200: ok(successSchema()) },
      }),
    },

    "/api/v1/subscribers/{id}/status": {
      patch: securedOp("Update subscriber status", ["Subscribers"], {
        parameters: [idParam],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["status"],
                properties: { status: statusEnum },
              },
            },
          },
        },
        responses: { 200: ok(successSchema({ $ref: "#/components/schemas/Subscriber" })) },
      }),
    },

    // ── Users ────────────────────────────────────────────────────────────────
    "/api/v1/users": {
      get: securedOp("List users (owner/admin)", ["Users"], {
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20, maximum: 100 } },
          { name: "role", in: "query", schema: { type: "string", enum: ["owner", "admin", "marketing_manager", "sales_support"] } },
          { name: "search", in: "query", schema: { type: "string" } },
        ],
        responses: { 200: ok(paginatedSchema({ $ref: "#/components/schemas/User" })) },
      }),
      post: securedOp("Create user (owner/admin)", ["Users"], {
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/CreateUser" } } },
        },
        responses: { 201: ok(successSchema({ $ref: "#/components/schemas/User" })) },
      }),
    },

    "/api/v1/users/{id}": {
      get: securedOp("Get user by ID (owner/admin)", ["Users"], {
        parameters: [idParam],
        responses: { 200: ok(successSchema({ $ref: "#/components/schemas/User" })) },
      }),
      patch: securedOp("Update user (owner/admin)", ["Users"], {
        parameters: [idParam],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/UpdateUser" } } },
        },
        responses: { 200: ok(successSchema({ $ref: "#/components/schemas/User" })) },
      }),
      delete: securedOp("Delete user (owner only)", ["Users"], {
        parameters: [idParam],
        responses: { 200: ok(successSchema()) },
      }),
    },

    // ── Dashboard ────────────────────────────────────────────────────────────
    "/api/v1/dashboard/overview": {
      get: securedOp("Dashboard overview stats", ["Dashboard"], {
        responses: { 200: ok(successSchema()) },
      }),
    },

    "/api/v1/dashboard/recent-subscribers": {
      get: securedOp("Recent subscribers", ["Dashboard"], {
        responses: {
          200: ok(successSchema({ type: "array", items: { $ref: "#/components/schemas/Subscriber" } })),
        },
      }),
    },

    // ── Mailing Lists ────────────────────────────────────────────────────────
    "/api/v1/mailing-lists": {
      post: securedOp("Create mailing list", ["Mailing Lists"], {
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/CreateMailingList" } } },
        },
        responses: { 201: ok(successSchema({ $ref: "#/components/schemas/MailingList" })) },
      }),
      get: securedOp("List mailing lists", ["Mailing Lists"], {
        parameters: [
          { name: "brand", in: "query", schema: brandEnum },
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20, maximum: 100 } },
        ],
        responses: { 200: ok(paginatedSchema({ $ref: "#/components/schemas/MailingList" })) },
      }),
    },

    "/api/v1/mailing-lists/{id}": {
      get: securedOp("Get mailing list", ["Mailing Lists"], {
        parameters: [idParam],
        responses: { 200: ok(successSchema({ $ref: "#/components/schemas/MailingList" })) },
      }),
      patch: securedOp("Update mailing list", ["Mailing Lists"], {
        parameters: [idParam],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string", maxLength: 100 },
                  description: { type: "string", maxLength: 500 },
                  isDynamic: { type: "boolean" },
                },
              },
            },
          },
        },
        responses: { 200: ok(successSchema({ $ref: "#/components/schemas/MailingList" })) },
      }),
      delete: securedOp("Delete mailing list", ["Mailing Lists"], {
        parameters: [idParam],
        responses: { 200: ok(successSchema()) },
      }),
    },

    "/api/v1/mailing-lists/{id}/subscribers": {
      post: securedOp("Add subscribers to list", ["Mailing Lists"], {
        parameters: [idParam],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["subscriberIds"],
                properties: {
                  subscriberIds: { type: "array", items: { type: "string", format: "uuid" }, minItems: 1, maxItems: 100 },
                },
              },
            },
          },
        },
        responses: { 200: ok(successSchema()) },
      }),
    },

    "/api/v1/mailing-lists/{id}/subscribers/{subscriberId}": {
      delete: securedOp("Remove subscriber from list", ["Mailing Lists"], {
        parameters: [
          idParam,
          { name: "subscriberId", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        ],
        responses: { 200: ok(successSchema()) },
      }),
    },

    // ── Campaigns ────────────────────────────────────────────────────────────
    "/api/v1/campaigns": {
      post: securedOp("Create campaign", ["Campaigns"], {
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/CreateCampaign" } } },
        },
        responses: { 201: ok(successSchema({ $ref: "#/components/schemas/Campaign" })) },
      }),
      get: securedOp("List campaigns", ["Campaigns"], {
        parameters: [
          { name: "brand", in: "query", schema: brandEnum },
          { name: "status", in: "query", schema: { type: "string", enum: ["draft", "scheduled", "sending", "sent", "cancelled"] } },
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20, maximum: 100 } },
        ],
        responses: { 200: ok(paginatedSchema({ $ref: "#/components/schemas/Campaign" })) },
      }),
    },

    "/api/v1/campaigns/{id}": {
      get: securedOp("Get campaign", ["Campaigns"], {
        parameters: [idParam],
        responses: { 200: ok(successSchema({ $ref: "#/components/schemas/Campaign" })) },
      }),
      patch: securedOp("Update campaign (draft only)", ["Campaigns"], {
        parameters: [idParam],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string", maxLength: 100 },
                  subject: { type: "string", maxLength: 200 },
                  content: { type: "string" },
                  preheader: { type: "string", maxLength: 200 },
                },
              },
            },
          },
        },
        responses: { 200: ok(successSchema({ $ref: "#/components/schemas/Campaign" })) },
      }),
      delete: securedOp("Delete campaign", ["Campaigns"], {
        parameters: [idParam],
        responses: { 200: ok(successSchema()) },
      }),
    },

    "/api/v1/campaigns/{id}/send": {
      post: securedOp("Send campaign immediately", ["Campaigns"], {
        parameters: [idParam],
        responses: { 200: ok(successSchema()) },
      }),
    },

    "/api/v1/campaigns/{id}/schedule": {
      post: securedOp("Schedule campaign", ["Campaigns"], {
        parameters: [idParam],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/ScheduleCampaign" } } },
        },
        responses: { 200: ok(successSchema({ $ref: "#/components/schemas/Campaign" })) },
      }),
    },

    "/api/v1/campaigns/{id}/cancel": {
      post: securedOp("Cancel scheduled campaign", ["Campaigns"], {
        parameters: [idParam],
        responses: { 200: ok(successSchema()) },
      }),
    },

    "/api/v1/campaigns/{id}/stats": {
      get: securedOp("Get campaign stats", ["Campaigns"], {
        parameters: [idParam],
        responses: {
          200: ok(successSchema({
            type: "object",
            properties: {
              sent: { type: "integer" },
              delivered: { type: "integer" },
              opened: { type: "integer" },
              clicked: { type: "integer" },
              bounced: { type: "integer" },
              unsubscribed: { type: "integer" },
            },
          })),
        },
      }),
    },

    // ── Email Templates ───────────────────────────────────────────────────────
    "/api/v1/email-templates": {
      post: securedOp("Create email template", ["Email Templates"], {
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/CreateEmailTemplate" } } },
        },
        responses: { 201: ok(successSchema({ $ref: "#/components/schemas/EmailTemplate" })) },
      }),
      get: securedOp("List email templates", ["Email Templates"], {
        parameters: [
          { name: "brand", in: "query", schema: brandEnum },
          { name: "status", in: "query", schema: { type: "string", enum: ["draft", "active", "archived"] } },
          { name: "category", in: "query", schema: { type: "string", enum: ["system", "auth", "campaign", "notification"] } },
          { name: "templateKey", in: "query", schema: { type: "string" } },
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20, maximum: 100 } },
        ],
        responses: { 200: ok(paginatedSchema({ $ref: "#/components/schemas/EmailTemplate" })) },
      }),
    },

    "/api/v1/email-templates/{id}": {
      get: securedOp("Get email template", ["Email Templates"], {
        parameters: [idParam],
        responses: { 200: ok(successSchema({ $ref: "#/components/schemas/EmailTemplate" })) },
      }),
      patch: securedOp("Update email template", ["Email Templates"], {
        parameters: [idParam],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  subject: { type: "string" },
                  htmlContent: { type: "string" },
                  plainTextContent: { type: "string" },
                  designJson: { type: "object" },
                },
              },
            },
          },
        },
        responses: { 200: ok(successSchema({ $ref: "#/components/schemas/EmailTemplate" })) },
      }),
      delete: securedOp("Delete email template", ["Email Templates"], {
        parameters: [idParam],
        responses: { 200: ok(successSchema()) },
      }),
    },

    "/api/v1/email-templates/{id}/status": {
      patch: securedOp("Update template status", ["Email Templates"], {
        parameters: [idParam],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["status"],
                properties: { status: { type: "string", enum: ["draft", "active", "archived"] } },
              },
            },
          },
        },
        responses: { 200: ok(successSchema({ $ref: "#/components/schemas/EmailTemplate" })) },
      }),
    },

    "/api/v1/email-templates/{id}/preview": {
      post: securedOp("Preview template with variables", ["Email Templates"], {
        parameters: [idParam],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["variables"],
                properties: {
                  variables: {
                    type: "object",
                    properties: {
                      brandName: { type: "string" },
                      firstName: { type: "string" },
                      name: { type: "string" },
                      email: { type: "string", format: "email" },
                      unsubscribeUrl: { type: "string", format: "uri" },
                      inviteUrl: { type: "string", format: "uri" },
                      resetPasswordUrl: { type: "string", format: "uri" },
                      dashboardUrl: { type: "string", format: "uri" },
                      campaignTitle: { type: "string" },
                      campaignContent: { type: "string" },
                      ctaText: { type: "string" },
                      ctaUrl: { type: "string", format: "uri" },
                    },
                  },
                },
              },
            },
          },
        },
        responses: { 200: ok(successSchema({ type: "object", properties: { html: { type: "string" } } })) },
      }),
    },

    "/api/v1/email-templates/{id}/send-test": {
      post: securedOp("Send test email", ["Email Templates"], {
        parameters: [idParam],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "variables"],
                properties: {
                  email: { type: "string", format: "email" },
                  variables: { type: "object" },
                },
              },
            },
          },
        },
        responses: { 200: ok(successSchema()) },
      }),
    },

    "/api/v1/email-templates/{id}/duplicate": {
      post: securedOp("Duplicate template", ["Email Templates"], {
        parameters: [idParam],
        responses: { 201: ok(successSchema({ $ref: "#/components/schemas/EmailTemplate" })) },
      }),
    },

    // ── Import / Export ───────────────────────────────────────────────────────
    "/api/v1/import-export/import": {
      post: securedOp("Import subscribers (CSV rows)", ["Import / Export"], {
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["brand", "rows"],
                properties: {
                  brand: brandEnum,
                  rows: { type: "array", items: { $ref: "#/components/schemas/ImportRow" }, minItems: 1, maxItems: 1000 },
                },
              },
            },
          },
        },
        responses: { 202: ok(successSchema()) },
      }),
    },

    "/api/v1/import-export/export": {
      post: securedOp("Request subscriber export", ["Import / Export"], {
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["brand"],
                properties: {
                  brand: brandEnum,
                  status: statusEnum,
                  isSubscribed: { type: "boolean" },
                  location: { type: "string" },
                },
              },
            },
          },
        },
        responses: { 202: ok(successSchema()) },
      }),
    },

    "/api/v1/import-export/jobs": {
      get: securedOp("List import/export jobs", ["Import / Export"], {
        parameters: [
          { name: "brand", in: "query", schema: brandEnum },
          { name: "type", in: "query", schema: { type: "string", enum: ["import", "export"] } },
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20, maximum: 100 } },
        ],
        responses: { 200: ok(paginatedSchema({ type: "object" })) },
      }),
    },

    "/api/v1/import-export/jobs/{id}": {
      get: securedOp("Get job status", ["Import / Export"], {
        parameters: [idParam],
        responses: { 200: ok(successSchema({ type: "object" })) },
      }),
    },

    "/api/v1/import-export/jobs/{id}/process": {
      post: securedOp("Process a pending job", ["Import / Export"], {
        parameters: [idParam],
        responses: { 200: ok(successSchema()) },
      }),
    },

    // ── Webhooks (public) ────────────────────────────────────────────────────
    "/api/webhooks/resend": {
      post: {
        summary: "Resend webhook receiver",
        tags: ["Webhooks"],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object" } } } },
        responses: { 200: ok(successSchema()) },
      },
    },

    "/api/webhooks/mailgun": {
      post: {
        summary: "Mailgun webhook receiver",
        tags: ["Webhooks"],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object" } } } },
        responses: { 200: ok(successSchema()) },
      },
    },
  },
};
