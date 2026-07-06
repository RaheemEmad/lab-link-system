# LabLink - Dental Lab Management & Marketplace

![LabLink](https://img.shields.io/badge/Version-1.1.0-blue.svg)
![React](https://img.shields.io/badge/React-18.3.1-61dafb.svg)
![Vite](https://img.shields.io/badge/Vite-5.4.19-646cff.svg)
![Supabase](https://img.shields.io/badge/Supabase-2.81.1-3ecf8e.svg)
![License](https://img.shields.io/badge/License-MIT-green.svg)

A comprehensive web application built to streamline dental lab workflows, connecting dentists (doctors) with laboratories and lab staff. Supports direct lab assignment and marketplace-style auto-assignment with real-time collaboration features.

## 🚀 Why LabLink Matters

- **Reduces administrative overhead** for dentists and labs
- **Accelerates order turnaround** via marketplace and auto-assignment
- **Centralizes communication, files, and invoices**
- **Enforces security and compliance** via database-level RLS & file validation
- **Real-time collaboration** with chat, notifications, and live updates
- **Optimized for performance** with PWA support and offline capabilities

## 👥 Who This README Is For

| Role | Focus Areas |
|------|-------------|
| **Non-technical stakeholders** | Product overview, user flows, quick usage steps |
| **Developers** | Codebase layout, local setup, architecture, API & DB schema |
| **DevOps / SRE** | Deployment, environment variables, monitoring, migrations |
| **QA Engineers** | Test users, E2E test instructions and troubleshooting |

## 🛠 Quickstart - Developer (Local)

### Prerequisites

- Node.js v18+ (recommended via nvm)
- npm/yarn/pnpm/bun package manager
- Supabase project (for Postgres, Auth, Storage, Edge Functions)
- Optional: Playwright for E2E tests

### Clone & Install

```bash
git clone https://github.com/RaheemEmad/lab-link-system.git
cd lab-link-system
npm ci
```

### Local Environment Setup

1. Copy `.env.example` to `.env.local`
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
| **Frontend** | Vite/React 18.3.1 | Vercel, Netlify, Cloudflare Pages |
| **Backend** | Supabase | Supabase Cloud |
| **Edge Functions** | Supabase Edge Functions | Supabase Dashboard |
| **Database** | PostgreSQL | Supabase Managed |
| **PWA** | Vite PWA Plugin | CDN + Service Worker |

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
| `npm run dev` | Start Vite dev server with SEO verification |
| `npm run build` | Create production build with optimizations |
| `npm run build:dev` | Create development build |
| `npm run preview` | Serve build locally |
| `npm run lint` | ESLint linting |
| `npm run format` | Prettier formatting |
| `npm run test` | Unit tests |
| `npm run create-test-users` | Automated test user creation |
| `npm run verify-test-data` | Validate test fixtures |
| `npm run verify:seo` | Verify SEO files and metadata |
| `npm run generate:sitemap` | Generate sitemap.xml |
| `npx playwright test` | Run E2E tests |

## 🏗 Architecture & Data Flow

```
[Browser / Mobile UI]
        ⇅
[Frontend (Vite/React 18)]
        ⇅
[Supabase Client SDK]
        ⇅
[Supabase Edge Functions]
        ⇅
[Postgres (RLS + WAL)]
        ⇅
[Storage: file uploads]
        ⇅
[Service Worker (PWA)]
```

### Key Systems

- **Roles**: `doctor`, `lab_staff`, `admin` (RLS policies enforce per-row access)
- **Marketplace**: `auto_assign_pending` orders, eligible labs apply
- **Notifications**: Real-time via Postgres changes → client subscription channels
- **Files**: Storage with server-side validation (file type, size, content-type checks)
- **Chat**: Real-time messaging with file sharing and typing indicators
- **PWA**: Offline support, installable app, background sync

## 🗄 Database & Migrations

**40+ migrations** documented in `supabase/migrations/`

### Key Tables

- `users`, `user_roles`, `labs`, `orders`, `order_items`
- `applications`, `invoices`, `files`, `notifications`
- `audit_logs`, `badges`, `challenges`, `migrations_meta`, `settings`
- `chat_messages`, `chat_participants`, `message_reactions`

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
- Multi-factor authentication support

### Row Level Security (RLS)

- **Doctors**: CRUD their own orders, view own chat/files
- **Lab Staff**: Access orders assigned to their lab or applied marketplace orders
- **Admins**: Elevated privileges via service role
- **Chat Access**: Only participants can view/edit messages

### Edge Functions

| Function | Purpose |
|----------|---------|
| `secure-login` | Server-side login flows with privileged keys |
| `file-validation` | Validate uploaded files (MIME types, magic bytes, size) |
| `invoice-generator` | Create invoice PDFs |
| `webhook-handler` | Process external webhooks |
| `chat-notifications` | Send real-time chat notifications |

**Deploy with:** `supabase functions deploy`

### Realtime Subscriptions

```javascript
// Order updates
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

// Chat messages
const chatSubscription = supabase
  .channel(`chat-${conversationId}`)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'chat_messages',
    filter: `conversation_id=eq.${conversationId}`
  }, payload => {
    // Handle new message
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
| `/edge/chat-notifications` | POST | Chat real-time notifications |

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

**Send Chat Message:**
```javascript
await supabase
  .from('chat_messages')
  .insert({
    conversation_id: conversationId,
    sender_id: userId,
    content: messageText,
    attachment_ids: attachmentIds
  });
```

## 💻 Frontend Architecture

### Tech Stack

- **React 18.3.1** + TypeScript
- **Vite 5.4.19** build tool with SWC
- **shadcn-ui** component library
- **Tailwind CSS 3.4** styling
- **React Query 5.83** for data fetching
- **Framer Motion 12.23** for animations
- **React Router 6.30** for routing
- **Zod 3.25** for schema validation
- **PWA Plugin 0.21** for offline support

### Project Structure

```
src/
├── components/          # Reusable UI components
├── pages/              # Page-level components/routes
├── lib/                # API/supabase helpers, types, utilities
├── hooks/              # Custom React hooks
└── utils/              # Utility functions

supabase/
├── migrations/         # Database migrations
├── functions/          # Edge functions
└── policies/           # RLS policies

public/
├── manifest.json       # PWA manifest
└── service-worker.js   # Service worker for offline

scripts/
├── generate-sitemap.ts # SEO sitemap generation
└── verify-seo-files.ts # SEO verification
```

### File Uploads

1. Upload to Supabase Storage
2. Validate via edge function before persisting
3. Store metadata in `files` table referencing storage paths
4. Support for multiple file formats (DCM, STL, OBJ, images)

### PWA Features

- Offline support with service worker
- Installable app (add to home screen)
- Push notifications
- Background sync for pending orders
- Optimized asset caching

## 🧪 Testing

### E2E Testing with Playwright

```bash
# Run all tests
npx playwright test

# UI mode (recommended for debugging)
npx playwright test --ui

# Headed mode (see browser)
npx playwright test --headed

# Run specific test file
npx playwright test e2e/auto-assign-workflow.spec.ts
```

**Test Files:**
- `order-creation.spec.ts` - Order form and creation flow
- `order-workflow.spec.ts` - Complete order lifecycle
- `chat-functionality.spec.ts` - Real-time messaging
- `auto-assign-workflow.spec.ts` - Marketplace auto-assignment
- `error-cases.spec.ts` - Error handling and edge cases
- `invoicing.spec.ts` - Invoice generation
- `load-testing.spec.ts` - Performance and stress testing

### Test Accounts

| Role | Email | Password | Lab ID |
|------|-------|----------|--------|
| Doctor | `doctor.test@lablink.test` | `TestDoctor123!` | N/A |
| Lab Staff | `lab.staff@lablink.test` | `TestLabStaff123!` | `00000000-0000-0000-0000-000000000001` |

### Load Testing

```bash
# Run load tests (staging environment only)
npx playwright test e2e/load-testing.spec.ts --workers=10
```

For detailed load testing guide, see `e2e/load-testing-README.md`

## 🔒 Security Model

### Authentication & Authorization

- **Row-Level Security (RLS)** in Postgres
- **Supabase Auth** for sessions and JWTs
- **Edge Functions** for sensitive server-side operations
- **Multi-factor authentication** support
- **Secure password hashing** with bcrypt

### File Validation

```javascript
// Server-side checks
const allowedTypes = ['dcm', 'stl', 'obj', 'jpg', 'png', 'pdf'];
const maxSize = 50 * 1024 * 1024; // 50MB
const mimeTypes = ['image/jpeg', 'image/png', 'application/pdf'];
```

### Rate Limiting

- Implement at edge function or CDN level
- Protect resource-intensive endpoints
- Prevent chat message spam
- Throttle file uploads

### Audit Logging

All privileged actions write to `audit_logs` including:
- `user_id`, `action`, `resource_id`
- `timestamp`, `ip_address`, `changes`

### Content Security

- DOMPurify for HTML sanitization
- XSS protection via Content Security Policy
- CSRF tokens for state-changing operations

## 📊 Observability & Logging

| Component | Monitoring Tool |
|-----------|----------------|
| Frontend Errors | Sentry (VITE_SENTRY_DSN) |
| Server Errors | Sentry (Server DSN) |
| Database Performance | Supabase Analytics |
| Application Logs | Console + Structured Logging |
| PWA Analytics | Web Vitals, offline usage |

## 🔄 CI/CD

### GitHub Actions Workflow

Automated testing and deployment pipelines configured in `.github/workflows/`

**Key Stages:**
1. Lint & Format Check
2. Type Checking
3. Unit Tests
4. E2E Tests (Playwright)
5. Build Optimization
6. Deployment to Staging/Production

### Deployment Pipeline

1. **Build**: `npm run build` (optimized production bundle)
2. **Deploy Static Assets**: Vercel/Netlify/Cloudflare Pages
3. **Database Migrations**: Supabase CLI (auto on deployment)
4. **Edge Functions**: `supabase functions deploy`
5. **Service Worker**: Auto-updated via PWA plugin

## 🐛 Troubleshooting

### Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| "User not found" in tests | Run `npm run create-test-users` |
| "No available orders" in marketplace | Create order with `auto_assign_pending = true` |
| Authentication fails locally | Check Supabase environment variables in `.env.local` |
| Edge function permission errors | Verify `SUPABASE_SERVICE_ROLE_KEY` is set |
| Playwright test failures | Use `data-testid` attributes for stable selectors |
| File upload rejected | Check file validation edge function logs |
| PWA not installing | Ensure HTTPS in production, check manifest.json |
| Chat messages not syncing | Verify Realtime enabled in Supabase dashboard |
| SEO verification fails | Run `npm run verify:seo` to check metadata |

### Debug Mode

Enable debug logging:
```javascript
// In development
const supabase = createClient(url, key, {
  auth: {
    debug: true
  }
});
```

## 🤝 Contributing

### Branch Naming

- `feature/` - New features
- `fix/` - Bug fixes
- `chore/` - Maintenance tasks
- `docs/` - Documentation updates
- `perf/` - Performance improvements

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

# Check SEO compliance
npm run verify:seo
```

### Commit Standards

- Use conventional commits: `feat:`, `fix:`, `docs:`, `style:`, `refactor:`, `perf:`, `test:`
- Reference issues: `fixes #123`
- Keep commits atomic and focused

## 🗺 Roadmap

### Short-term (1-3 months)
- [x] Auto-assign marketplace functionality
- [x] Real-time chat and notifications
- [x] PWA offline support
- [ ] Mobile app optimization
- [ ] Advanced analytics dashboard
- [ ] SLA management features

### Mid-term (3-9 months)
- [ ] Advanced analytics & performance dashboards
- [ ] Automated SLA reminders
- [ ] SLA-based routing in auto-assign
- [ ] Multi-tenant separation for labs
- [ ] Integration APIs for third-party systems
- [ ] Bulk order import/export

### Long-term (9-18 months)
- [ ] Mobile app (React Native)
- [ ] Enhanced push notifications
- [ ] ML-based lab recommendations
- [ ] ETA prediction algorithms
- [ ] Marketplace monetization flows
- [ ] Video consultation support
- [ ] AR/3D preview capabilities

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
├── README.md                      # This file
├── .env.example                   # Environment template
├── e2e/                          # Playwright tests and test data
├── src/                          # Frontend application code
├── supabase/                     # Database migrations, RLS policies, functions
├── public/                       # Static assets & PWA manifest
├── scripts/                      # Build and utility scripts
├── .github/workflows/            # CI/CD pipelines
├── playwright.config.ts          # Playwright configuration
├── vite.config.ts               # Vite configuration
├── tailwind.config.ts           # Tailwind CSS configuration
├── tsconfig.json                # TypeScript configuration
├── package.json                 # Dependencies and scripts
└── LICENSE                      # MIT License
```

### Performance Tips

- Use React Query for server state management
- Leverage code splitting with React Router lazy loading
- Optimize images with modern formats (WebP)
- Enable compression in production
- Monitor Core Web Vitals with Sentry
- Use service worker for intelligent caching

### Debugging Tools

- React DevTools browser extension
- Redux DevTools for state inspection
- Supabase Studio for database inspection
- Playwright Inspector for E2E debugging
- Network tab in Chrome DevTools

### Security Checklist

- [ ] All environment variables properly set
- [ ] Service role keys never exposed
- [ ] RLS policies enabled on all tables
- [ ] File uploads validated server-side
- [ ] HTTPS enabled in production
- [ ] CSP headers configured
- [ ] Rate limiting enabled
- [ ] Audit logging configured

### Resources & Documentation

- [Supabase Documentation](https://supabase.io/docs)
- [React Documentation](https://react.dev)
- [Vite Guide](https://vitejs.dev)
- [Playwright Testing](https://playwright.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [shadcn/ui Components](https://ui.shadcn.com)

### License & Credits

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

Built with ❤️ using modern web technologies and best practices.

### Contact & Support

| Role | Contact |
|------|---------|
| **Product/Feature Inquiries** | Product Owner |
| **Infrastructure & Deployment** | DevOps Team |
| **Code & Pull Requests** | Create PR against main branch |
| **Bug Reports** | Create issue with reproduction steps |

---

**LabLink** - Streamlining dental lab workflows through innovative technology solutions.

*Last updated: July 2026 | Created with Vite + React + Supabase*
