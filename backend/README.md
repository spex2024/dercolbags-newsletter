# Newsletter Backend

A production-grade email newsletter management system built with Bun, Hono, Drizzle ORM, and Neon PostgreSQL.

## Features

- **Multi-brand Support**: WatPak and DercolBags with separate email providers
- **Subscriber Management**: CRUD operations, import/export, segmentation
- **Campaign Management**: Create, schedule, send email campaigns
- **Email Templates**: Customizable templates with preview and test send
- **Mailing Lists**: Static and dynamic subscriber lists
- **User Management**: Role-based access control (Owner, Admin, Marketing, Sales)
- **Webhook Integration**: Resend and Mailgun webhooks
- **Tracking**: Open and click tracking pixels

## Tech Stack

| Component | Technology |
|-----------|------------|
| Runtime | Bun |
| Framework | Hono |
| Database | Neon PostgreSQL |
| ORM | Drizzle ORM |
| Auth | Better Auth |
| Email | Resend (WatPak), Mailgun (DercolBags) |

## Prerequisites

- Bun 1.3+
- Neon PostgreSQL database
- Resend API key (WatPak)
- Mailgun API key + domain (DercolBags)

## Quick Start

```bash
# Install dependencies
bun install

# Set up environment variables
cp .env.example .env
# Edit .env with your database URL and API keys

# Push database schema
bun run db:push

# Seed initial data (creates admin user)
bun run db:seed

# Start development server
bun run dev
```

## Environment Variables

```env
# Database
DATABASE_URL=postgres://user:pass@host.neon.tech/neondb

# Server
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Auth (generate with: openssl rand -hex 32)
AUTH_SECRET=your-secret-key

# Email Providers
RESEND_API_KEY=re_123456789
MAILGUN_API_KEY=your-mailgun-key
MAILGUN_DOMAIN=your-domain.com
MAILGUN_URL=https://api.mailgun.net
```

## API Endpoints

### Authentication
- `POST /api/auth/sign-in/email` - Sign in
- `POST /api/auth/sign-out` - Sign out
- `POST /api/auth/forgot-password` - Password reset

### Subscribers
- `POST /api/v1/subscribers` - Create subscriber
- `GET /api/v1/subscribers` - List subscribers
- `GET /api/v1/subscribers/:id` - Get subscriber
- `PATCH /api/v1/subscribers/:id/status` - Update status
- `DELETE /api/v1/subscribers/:id` - Delete subscriber

### Campaigns
- `POST /api/v1/campaigns` - Create campaign
- `GET /api/v1/campaigns` - List campaigns
- `GET /api/v1/campaigns/:id` - Get campaign
- `PATCH /api/v1/campaigns/:id` - Update campaign
- `POST /api/v1/campaigns/:id/send` - Send campaign
- `POST /api/v1/campaigns/:id/schedule` - Schedule campaign

### Email Templates
- `POST /api/v1/email-templates` - Create template
- `GET /api/v1/email-templates` - List templates
- `GET /api/v1/email-templates/:id` - Get template
- `PATCH /api/v1/email-templates/:id` - Update template
- `POST /api/v1/email-templates/:id/preview` - Preview template
- `POST /api/v1/email-templates/:id/send-test` - Send test

### Mailing Lists
- `POST /api/v1/mailing-lists` - Create list
- `GET /api/v1/mailing-lists` - List lists
- `GET /api/v1/mailing-lists/:id` - Get list with subscribers
- `POST /api/v1/mailing-lists/:id/subscribers` - Add subscribers
- `DELETE /api/v1/mailing-lists/:id/subscribers/:subscriberId` - Remove subscriber

### Users (Admin only)
- `GET /api/v1/users` - List users
- `POST /api/v1/users` - Create user
- `PATCH /api/v1/users/:id` - Update user
- `DELETE /api/v1/users/:id` - Delete user

### Import/Export
- `POST /api/v1/import-export/import` - Import subscribers
- `POST /api/v1/import-export/export` - Export subscribers

## Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Start development server |
| `bun run start` | Start production server |
| `bun run build` | Build for production |
| `bun run db:push` | Push schema to database |
| `bun run db:seed` | Seed initial data |
| `bun run db:studio` | Open Drizzle Studio |

## Deployment

Deploy to your VPS with Dokploy:

1. Build command: `bun run build`
2. Start command: `bun run start`
3. Port: `3000`

Or deploy to Vercel with `@hono/vercel` adapter.

## License

MIT