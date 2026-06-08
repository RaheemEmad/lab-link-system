# LabLink - Dental Lab Management & Marketplace

![LabLink](https://img.shields.io/badge/Version-1.0.0-blue.svg)
![React](https://img.shields.io/badge/React-18.2.0-61dafb.svg)
![Supabase](https://img.shields.io/badge/Supabase-Backend-3ecf8e.svg)
![License](https://img.shields.io/badge/License-MIT-green.svg)

A comprehensive web application built to streamline dental lab workflows, connecting dentists (doctors) with laboratories and lab staff. Supports direct lab assignment and marketplace-style auto-assign flow, secure file uploads, real-time order/notification updates, invoices, and role-based access controls.

## 🚀 Why LabLink Matters

- **Reduces administrative overhead** for dentists and labs
- **Accelerates order turnaround** via marketplace and auto-assignment
- **Centralizes communication, files, and invoices**
- **Enforces security and compliance** via database-level RLS & file validation

## 👥 Who This README Is For

| Role | Focus Areas |
|------|-------------|
| **Non-technical stakeholders** | Product overview, user flows, quick usage steps |
| **Developers** | Codebase layout, local setup, architecture, API & DB schema |
| **DevOps / SRE** | Deployment, environment variables, monitoring, migrations |
| **QA Engineers** | Test users, E2E test instructions and troubleshooting |

## 🛠 Quickstart - Developer (Local)

### Prerequisites

- Node.js (recommended via nvm)
- npm (or bun/pnpm if configured)
- Supabase project (for Postgres, Auth, Storage, Edge Functions)
- Optional: Playwright for E2E tests

### Clone & Install

```bash
git clone https://github.com/RaheemEmad/lab-link-system.git
cd lab-link-system
npm ci
```

### Local Environment Setup

1. Copy `.env.example` to `.env`
2. Supply credentials for Supabase, Sentry, and other integrations:

```env
# Frontend Environment Variables
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_APP_TITLE=LabLink
VITE_SENTRY_DSN=your_sentry_dsn_optional
VITE_API_BASE_URL=your_api_base_url
```

### Start Development Server

```bash
npm run dev
```

The app runs on **port 5173** (Vite default) - navigate to `http://localhost:5173`

### Create Test Users

```bash
npm run create-test-users
```

## ☁️ Replit / Quick Cloud Setup

The project includes Replit-ready configuration. Ensure environment variables are present in workspace settings.

## 🚀 Production Deployment Summary

| Component | Technology | Deployment Target |
|-----------|------------|-------------------|
| **Frontend** | Vite/React | Vercel, Netlify, Cloudflare Pages |
| **Backend** | Supabase | Supabase Cloud |
| **Edge Functions** | Supabase Edge Functions | Supabase Dashboard |
| **Database** | PostgreSQL | Supabase Managed |

## ⚙️ Environment Variables

### Frontend (VITE_*)

| Variable | Purpose | Required |
|----------|---------|----------|
| `VITE_SUPABASE_URL` | Supabase project URL | ✅ |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key | ✅ |
| `VITE_APP_TITLE` | Application title | ✅ |
| `VITE_SENTRY_DSN` | Error tracking | ❌ |
| `VITE_API_BASE_URL` | Custom API proxy | ❌ |

### Server / CI / Edge Functions (Secret)

| Variable | Purpose | Required |
|----------|---------|----------|
| `SUPABASE_SERVICE_ROLE_KEY` | Privileged operations | ✅ |
| `SUPABASE_URL` | Supabase project URL | ✅ |
| `DATABASE_URL` | Database connection | ❌ |
| `SENTRY_DSN` | Error tracking | ❌ |
| `NODE_ENV` | Environment | ✅ |
| `PORT` | Server port | ❌ |

**⚠️ Important:** Never store service role keys in frontend environment files.

## 📜 Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Create production build |
| `npm run preview` | Serve build locally |
| `npm run lint` | ESLint linting |
| `npm run format` | Prettier formatting |
| `npm run test` | Unit tests |
| `npm run create-test-users` | Automated test user creation |
| `npm run verify-test-data` | Validate test fixtures |
| `npx playwright test` | Run E2E tests |

## 🏗 Architecture & Data Flow

```
[Browser / Mobile UI]
        ⇅
[Frontend (Vite/React)]
        ⇅
[Supabase Client SDK]
        ⇅
[Supabase Edge Functions]
        ⇅
[Postgres (RLS + WAL)]
        ⇅
[Storage: file uploads]
```

### Key Systems

- **Roles**: `doctor`, `lab_staff`, `admin` (RLS policies enforce per-row access)
- **Marketplace**: `auto_assign_pending` orders, eligible labs apply
- **Notifications**: Real-time via Postgres changes → client subscription channels
- **Files**: Storage with server-side validation (file type, size, content-type checks)

## 🗄 Database & Migrations

**40+ migrations** documented in `supabase/migrations/`

### Key Tables

- `users`, `user_roles`, `labs`, `orders`, `order_items`
- `applications`, `invoices`, `files`, `notifications`
- `audit_logs`, `badges`, `challenges`, `migrations_meta`, `settings`

### Example RLS Policy

```sql
CREATE POLICY "Doctors can view own orders" 
ON orders FOR SELECT 
USING (auth.uid() = doctor_id);
```

Migrations are applied using Supabase CLI or psql.

## 🔐 Supabase Integration

### Authentication

- Supabase Auth handles signup/signin
- Social providers configurable via Supabase dashboard
- Onboarding requires `onboarding_completed = true` for marketplace access

### Row Level Security (RLS)

- **Doctors**: CRUD their own orders
- **Lab Staff**: Access orders assigned to their lab or applied marketplace orders
- **Admins**: Elevated privileges via service role

### Edge Functions

| Function | Purpose |
|----------|---------|
| `secure-login` | Server-side login flows with privileged keys |
| `file-validation` | Validate uploaded files (MIME types, magic bytes, size) |
| `invoice-generator` | Create invoice PDFs |
| `webhook-handler` | Process external webhooks |

**Deploy with:** `supabase functions deploy`

### Realtime Subscriptions

```javascript
const subscription = supabase
  .channel('order-updates')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'orders',
    filter: `doctor_id=eq.${doctorId}`
  }, payload => {
    // Handle update
  })
  .subscribe();
```

## 🌐 API Surface

### Edge Function Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/edge/secure-login` | POST | Server-side login |
| `/edge/validate-file` | POST | File validation before upload |
| `/edge/generate-invoice` | POST | Invoice PDF generation |
| `/edge/webhook` | POST | External notifications |

### Frontend Examples

**Fetch Orders:**
```javascript
const { data, error } = await supabase
  .from('orders')
  .select('*')
  .eq('doctor_id', supabase.auth.getUser().id);
```

**Apply to Marketplace Order:**
```javascript
// Insert into applications table
await supabase
  .from('applications')
  .insert({
    lab_id: labId,
    order_id: orderId,
    staff_id: userId
  });
```

## 💻 Frontend Architecture

### Tech Stack

- **React 18** + TypeScript
- **Vite** build tool
- **shadcn-ui** component library
- **Tailwind CSS** styling

### Project Structure

```
src/
├── components/          # Reusable UI components
├── pages/              # Page-level components/routes
├── lib/                # API/supabase helpers, types
├── hooks/              # Custom React hooks
└── utils/              # Utility functions

supabase/
├── migrations/         # Database migrations
├── functions/          # Edge functions
└── policies/           # RLS policies
```

### File Uploads

1. Upload to Supabase Storage
2. Validate via edge function before persisting
3. Store metadata in `files` table referencing storage paths

## 🧪 Testing

### E2E Testing with Playwright

```bash
# Run all tests
npx playwright test

# UI mode
npx playwright test --ui

# Headed mode
npx playwright test --headed
```

**Example Test:** `e2e/auto-assign-workflow.spec.ts`

### Test Accounts

| Role | Email | Password | Lab ID |
|------|-------|----------|--------|
| Doctor | `doctor.test@lablink.test` | `TestDoctor123!` | N/A |
| Lab Staff | `lab.staff@lablink.test` | `TestLabStaff123!` | `00000000-0000-0000-0000-000000000001` |

### Load Testing

```bash
# Run load tests (staging environment only)
npx playwright test e2e/load-testing.spec.ts
```

## 🔒 Security Model

### Authentication & Authorization

- **Row-Level Security (RLS)** in Postgres
- **Supabase Auth** for sessions and JWTs
- **Edge Functions** for sensitive server-side operations

### File Validation

```javascript
// Server-side checks
const allowedTypes = ['dcm', 'stl', 'obj', 'jpg', 'png'];
const maxSize = 50 * 1024 * 1024; // 50MB
```

### Rate Limiting

- Implement at edge function or CDN level
- Protect resource-intensive endpoints

### Audit Logging

All privileged actions write to `audit_logs` including:
- `user_id`, `action`, `resource_id`
- `timestamp`, `ip_address`

## 📊 Observability & Logging

| Component | Monitoring Tool |
|-----------|----------------|
| Frontend Errors | Sentry (VITE_SENTRY_DSN) |
| Server Errors | Sentry (Server DSN) |
| Database Performance | Supabase Analytics |
| Application Logs | Console + Structured Logging |

## 🔄 CI/CD

### GitHub Actions Workflow (`.github/workflows/e2e.yml`)

```yaml
name: E2E Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npx playwright test
```

### Deployment Pipeline

1. **Build**: `npm run build`
2. **Deploy Static Assets**: Vercel/Netlify/Cloudflare Pages
3. **Database Migrations**: Supabase CLI
4. **Edge Functions**: `supabase functions deploy`

## 🐛 Troubleshooting

### Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| "User not found" in tests | Run `npm run create-test-users` |
| "No available orders" in marketplace | Create order with `auto_assign_pending = true` |
| Authentication fails locally | Check Supabase environment variables |
| Edge function permission errors | Verify `SUPABASE_SERVICE_ROLE_KEY` |
| Playwright test failures | Use `data-testid` attributes for stable selectors |
| File upload rejected | Check file validation edge function |

## 🤝 Contributing

### Branch Naming

- `feature/` - New features
- `fix/` - Bug fixes
- `chore/` - Maintenance tasks

### Development Process

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'feat: Add amazing feature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Code Quality

```bash
# Lint code
npm run lint

# Format code
npm run format

# Run tests
npm run test
```

## 🗺 Roadmap

### Short-term (1-3 months)
- [ ] Harden marketplace eligibility checks
- [ ] Add auto-assign scoring algorithms
- [ ] Expand load-testing scenarios
- [ ] Polish onboarding UX

### Mid-term (3-9 months)
- [ ] Advanced analytics & performance dashboards
- [ ] Automated SLA reminders
- [ ] SLA-based routing in auto-assign
- [ ] Multi-tenant separation for labs

### Long-term (9-18 months)
- [ ] Mobile app (React Native)
- [ ] Push notifications
- [ ] ML-based lab recommendations
- [ ] ETA prediction algorithms
- [ ] Marketplace monetization flows

## 📋 Appendix

### Example Subscription

```javascript
const subscription = supabase
  .channel('order-updates')
  .on('postgres_changes', {
    schema: 'public',
    table: 'orders',
    event: '*'
  }, payload => {
    console.log('Order changed:', payload);
  })
  .subscribe();
```

### File Structure

```
.
├── README.md                 # This file
├── e2e/                     # Playwright tests and test data
├── src/                     # Frontend application code
├── supabase/               # Database migrations, RLS policies, functions
├── public/                 # Static assets
├── playwright.config.ts    # Playwright configuration
├── package.json           # Dependencies and scripts
└── tailwind.config.ts     # Tailwind CSS configuration
```

### License & Credits

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

### Contact & Support

| Role | Contact |
|------|---------|
| **Product/Feature Inquiries** | Product Owner |
| **Infrastructure & Deployment** | DevOps Team |
| **Code & Pull Requests** | Create PR against main branch |

---

**LabLink** - Streamlining dental lab workflows through innovative technology solutions.
