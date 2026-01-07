# CQMS - Communication Quality Management System

A production-ready, AI-powered quality management platform for QC-led communication audits. Built with Clean Architecture principles, featuring seamless Intercom integration, intelligent automation, and comprehensive security measures.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Supabase account and project
- Intercom account (for conversation integration)

### Installation

```bash
# Install dependencies
npm install

# Setup environment variables
npm run setup

# Build the project
npm run build

# Start development server
npm run dev

# Start production server
npm start
```

### Environment Setup

Copy `env.template` to `.env` and configure:

```env
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
DATABASE_URL=your_database_connection_string
INTERCOM_ACCESS_TOKEN=your_intercom_token
```

See [Setup Guide](docs/guides/SETUP_COMPLETE.md) for detailed instructions.

## 📁 Project Structure

```
express-cqms/
├── src/                    # TypeScript source code
│   ├── api/               # Server-side API routes
│   ├── core/              # Core abstractions (reusable)
│   ├── features/          # Feature modules (Clean Architecture)
│   ├── infrastructure/   # External adapters
│   └── utils/             # Shared utilities
├── public/                # Static assets and compiled output
├── docs/                  # Documentation
│   ├── guides/           # Setup and architecture guides
│   ├── migration/        # Database migration guides
│   ├── security/         # Security documentation
│   ├── assessments/      # Testing and assessment docs
│   └── sql/              # SQL scripts
├── supabase/             # Supabase functions
└── scripts/              # Utility scripts
```

## 🏗️ Architecture

This application uses a **hybrid architecture**:

- **Client-side reads** with Row Level Security (RLS) for performance
- **Server-side writes** via API for security and validation
- **Supabase** as the database with proper security policies
- **Clean Architecture** with modular, scalable design

### Key Principles

- **Database Portability**: Switch databases via configuration
- **Layer Separation**: Strict Clean Architecture layers
- **Dependency Injection**: Testable, maintainable code
- **Security First**: Comprehensive security measures (9.3/10 rating)
- **Modularity**: 250-line file limit enforces modularity

See [Architecture Documentation](docs/guides/ARCHITECTURE.md) for details.

## 🔒 Security

CQMS implements comprehensive security measures:

- **Row Level Security (RLS)**: Database-level data protection
- **Authentication**: JWT-based authentication with Supabase
- **XSS Prevention**: HTML sanitization and safe content handling
- **CSRF Protection**: Token-based request validation
- **Input Validation**: Comprehensive input sanitization
- **Audit Logging**: Complete audit trail for all operations

**Security Rating: 9.3/10**

See [Security Rules](docs/security/SECURITY_RULES.md) for development guidelines.

## 📚 Documentation

### Getting Started
- [Setup Guide](docs/guides/SETUP_COMPLETE.md) - Complete setup instructions
- [Architecture](docs/guides/ARCHITECTURE.md) - System architecture overview
- [TypeScript Only Policy](docs/guides/TYPESCRIPT_ONLY.md) - TypeScript development guidelines

### Migration & Database
- [Migration Guide](docs/migration/MIGRATION_GUIDE.md) - Database migration instructions
- [RLS Quick Start](docs/migration/QUICK_START_RLS.md) - Row Level Security setup
- [Migration API Guide](docs/migration/MIGRATION_GUIDE_API.md) - API migration details

### Security
- [Security Rules](docs/security/SECURITY_RULES.md) - Security best practices
- [Security Architecture](docs/security/SECURITY_ARCHITECTURE_EXPLAINED.md) - Security design
- [Authenticated Supabase Guide](docs/guides/AUTHENTICATED_SUPABASE_GUIDE.md) - Supabase auth patterns

### Development
- [Project Description](docs/CQMS_PROJECT_DESCRIPTION.md) - Project overview and goals
- [SQL Scripts](docs/sql/) - Database utility scripts
- [Assessments](docs/assessments/) - Testing and assessment documentation

## 🛠️ Development

### Build Commands

```bash
# Build everything (TypeScript + CSS + Server)
npm run build

# Build TypeScript only
npm run build:ts

# Build CSS only
npm run build:css

# Build server only
npm run build:server

# Watch mode (development)
npm run dev
```

### Code Style

- **TypeScript Only**: All source code must be TypeScript (`.ts` files)
- **File Size Limit**: Maximum 250 lines per file
- **Clean Architecture**: Follow layer separation principles
- **Security First**: Follow security rules in `docs/security/SECURITY_RULES.md`

### Database Migrations

```bash
# Apply RLS migration
npm run apply-rls

# Or use migration scripts
node src/scripts/apply-rls-migration.ts
```

## 🎯 Features

### Core Modules

- **Home Dashboard** - Overview of audits, statistics, and updates
- **Audit Distribution** - Assign and manage audit assignments
- **Performance Tracking** - Track auditor and agent performance
- **Coaching & Remediation** - Provide feedback and coaching
- **Reversal Management** - Handle audit reversals
- **Settings Management** - Configure system settings
- **Intercom Integration** - Direct conversation access and filtering
- **AI-Powered Audits** - Intelligent audit assistance
- **Notifications** - Web push and in-app notifications

### Key Capabilities

- ✅ Seamless Intercom integration
- ✅ AI-assisted audit workflows
- ✅ Real-time notifications
- ✅ Comprehensive analytics
- ✅ Flexible scorecard configuration
- ✅ Complete data ownership
- ✅ Row Level Security (RLS)
- ✅ Audit logging

## 🔧 Configuration

### Database Configuration

Set `DATABASE_TYPE` environment variable:
- `supabase` (default)
- `postgresql`
- `mysql`

See [Database Configuration](docs/guides/ARCHITECTURE.md#database-configuration) for details.

### Supabase Setup

1. Create a Supabase project
2. Run database migrations
3. Configure RLS policies
4. Set up environment variables

See [Setup Guide](docs/guides/SETUP_COMPLETE.md) for step-by-step instructions.

## 📊 Project Status

- ✅ **Production Ready**: Fully functional and deployed
- ✅ **Security**: 9.3/10 security rating
- ✅ **Architecture**: Clean Architecture with modular design
- ✅ **Documentation**: Comprehensive guides and references
- ✅ **Testing**: Assessment and testing documentation available

## 🤝 Contributing

When contributing to this project:

1. Follow the [Architecture Guidelines](docs/guides/ARCHITECTURE.md)
2. Adhere to [Security Rules](docs/security/SECURITY_RULES.md)
3. Maintain [TypeScript Only Policy](docs/guides/TYPESCRIPT_ONLY.md)
4. Keep files under 250 lines
5. Write comprehensive tests

## 📝 License

ISC

## 👥 Authors

- **Aminul Islam** - Design & Development
- **Saif Alam** - Design & Development

## 🙏 Acknowledgments

Built as a replacement for Scorebuddy, providing complete data ownership and cost savings while delivering superior functionality tailored to internal quality management needs.

---

For detailed documentation, see the [docs](docs/) directory.
