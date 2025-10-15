# Paycile Platform Architecture & Technology Documentation

## Executive Summary

Paycile is a modern, AI-powered SaaS platform for insurance premium payment management and reconciliation. The platform is built using a microservices-oriented architecture with React/TypeScript frontend, Node.js/Express backend, PostgreSQL database, and integrated AI capabilities powered by OpenAI.

## Table of Contents

1. [System Architecture Overview](#system-architecture-overview)
2. [Technology Stack](#technology-stack)
3. [Application Architecture](#application-architecture)
4. [Security Architecture](#security-architecture)
5. [Data Architecture](#data-architecture)
6. [AI/ML Architecture](#ai-ml-architecture)
7. [Infrastructure & Deployment](#infrastructure--deployment)
8. [Module Breakdown](#module-breakdown)
9. [API Architecture](#api-architecture)
10. [Performance & Scalability](#performance--scalability)
11. [Development Workflow](#development-workflow)
12. [Monitoring & Observability](#monitoring--observability)

---

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                           Load Balancer                              │
└─────────────────────┬───────────────────────┬──────────────────────┘
                      │                       │
              ┌───────▼────────┐      ┌──────▼────────┐
              │  React Frontend│      │ Express API    │
              │  (Static Site) │      │ (Web Service)  │
              └───────┬────────┘      └──────┬────────┘
                      │                       │
                      └───────────┬──────────┘
                                  │
                          ┌───────▼────────┐
                          │  PostgreSQL    │
                          │   Database     │
                          └────────────────┘
                                  │
                    ┌─────────────┼─────────────┐
                    │             │             │
            ┌───────▼──────┐ ┌───▼────┐ ┌─────▼─────┐
            │ OpenAI API   │ │ Stripe │ │ Plaid API │
            │ Integration  │ │  API   │ │Integration│
            └──────────────┘ └────────┘ └───────────┘
```

## Technology Stack

### Frontend Technologies
- **Framework**: React 18.2.0
- **Language**: TypeScript 5.3.3
- **Build Tool**: Vite 5.0.8
- **Styling**: Tailwind CSS 3.4.0
- **State Management**: 
  - Zustand 4.4.7 (Global auth state)
  - React Query/TanStack Query 5.17.9 (Server state)
- **Routing**: React Router DOM 6.21.1
- **UI Components**: 
  - Headless UI 1.7.17
  - React Beautiful DnD 13.1.1
  - React Hot Toast 2.4.1
- **Charts**: Chart.js 4.4.1 + React-Chartjs-2 5.2.0
- **HTTP Client**: Axios 1.6.5
- **Date Handling**: date-fns 3.2.0

### Backend Technologies
- **Runtime**: Node.js 18+
- **Framework**: Express.js 4.18.2
- **Language**: TypeScript 5.3.3
- **Database**: PostgreSQL 15+
- **ORM/Query Builder**: node-postgres (pg) 8.11.3
- **Authentication**: 
  - jsonwebtoken 9.0.2
  - bcryptjs 2.4.3
- **Environment**: dotenv 16.3.1
- **Logging**: Winston 3.11.0
- **AI Integration**: OpenAI SDK 4.24.1
- **Utilities**: uuid 9.0.1
- **Development**: 
  - tsx 4.7.0
  - nodemon 3.0.2

### Database
- **Primary**: PostgreSQL 15+
- **Schema Management**: Manual migrations
- **Connection Pooling**: pg built-in pooling

### DevOps & Infrastructure
- **Version Control**: Git/GitHub
- **Deployment Platform**: Render.com
- **Container**: Docker & Docker Compose
- **CI/CD**: GitHub Actions (planned)

## Application Architecture

### Layered Architecture

```
┌─────────────────────────────────────────────────┐
│              Presentation Layer                  │
│         (React Components & Pages)               │
├─────────────────────────────────────────────────┤
│             Application Layer                    │
│    (React Hooks, Services, State Management)    │
├─────────────────────────────────────────────────┤
│                API Layer                         │
│    (Express Routes, Middleware, Controllers)    │
├─────────────────────────────────────────────────┤
│             Business Logic Layer                 │
│        (Services, Validation, Rules)             │
├─────────────────────────────────────────────────┤
│              Data Access Layer                   │
│      (Database Queries, Mock Services)           │
├─────────────────────────────────────────────────┤
│             Infrastructure Layer                 │
│        (Database, External Services)             │
└─────────────────────────────────────────────────┘
```

### Frontend Architecture

```
frontend/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── agent/          # Agent-specific components
│   │   ├── auth/           # Authentication components
│   │   ├── client/         # Client portal components
│   │   ├── common/         # Shared components
│   │   ├── dashboard/      # Dashboard widgets
│   │   ├── payments/       # Payment components
│   │   └── reconciliation/ # Reconciliation UI
│   ├── pages/              # Route-based page components
│   ├── services/           # API clients and services
│   │   ├── api.ts         # Axios instance & interceptors
│   │   └── auth.store.ts  # Global auth state
│   ├── hooks/              # Custom React hooks
│   ├── utils/              # Helper functions
│   └── styles/             # Global styles
```

### Backend Architecture

```
backend/
├── src/
│   ├── config/            # Configuration files
│   │   └── database.ts    # Database connection
│   ├── controllers/       # Request handlers
│   ├── middleware/        # Express middleware
│   │   ├── auth.ts       # JWT verification
│   │   └── error.ts      # Error handling
│   ├── models/           # Data models/types
│   ├── routes/           # API route definitions
│   ├── services/         # Business logic
│   │   ├── mockData.service.ts  # Mock data generation
│   │   └── ai.service.ts        # AI integration
│   └── utils/            # Utility functions
```

## Security Architecture

### Authentication & Authorization

1. **JWT-Based Authentication**
   - Token expiration: 7 days
   - Secure httpOnly cookies (planned)
   - Role-based access control (RBAC)

2. **User Roles & Permissions**
   ```
   Admin
   ├── Full system access
   ├── User management
   └── System configuration
   
   Broker
   ├── View all agents
   ├── Manage agents
   ├── View aggregated data
   └── Configure payment rules
   
   Agent
   ├── View assigned clients
   ├── Manage own policies
   └── View own metrics
   
   Client
   ├── View own policies
   ├── Make payments
   └── View payment history
   ```

3. **Security Measures**
   - Password hashing: bcrypt (10 rounds)
   - Input validation & sanitization
   - SQL injection prevention (parameterized queries)
   - XSS protection (React default escaping)
   - CORS configuration
   - Rate limiting (planned)
   - API key management for external services

4. **Compliance Readiness**
   - SOC2 Type II readiness
   - PCI compliance considerations
   - Encrypted PII at rest and in transit
   - Comprehensive audit logging

### Data Protection

```
┌────────────────────────────────────┐
│         HTTPS/TLS 1.3              │
├────────────────────────────────────┤
│     Application Layer Security      │
│  - JWT tokens                      │
│  - Session management              │
│  - RBAC enforcement                │
├────────────────────────────────────┤
│      Database Security             │
│  - Encrypted connections           │
│  - Role-based DB access           │
│  - Encrypted sensitive fields      │
└────────────────────────────────────┘
```

## Data Architecture

### Database Schema

```sql
-- Core Entities
users (
  id UUID PRIMARY KEY,
  email VARCHAR UNIQUE,
  role ENUM('admin','broker','agent','client'),
  encrypted_password VARCHAR,
  created_at TIMESTAMP
)

policies (
  id UUID PRIMARY KEY,
  policy_number VARCHAR UNIQUE,
  client_id UUID REFERENCES users,
  agent_id UUID REFERENCES users,
  carrier_id UUID REFERENCES carriers,
  premium_amount DECIMAL,
  status VARCHAR,
  waterfall_order JSONB
)

invoices (
  id UUID PRIMARY KEY,
  policy_id UUID REFERENCES policies,
  amount DECIMAL,
  due_date DATE,
  status VARCHAR
)

payments (
  id UUID PRIMARY KEY,
  client_id UUID REFERENCES users,
  amount DECIMAL,
  payment_method VARCHAR,
  status VARCHAR,
  created_at TIMESTAMP
)

reconciliations (
  id UUID PRIMARY KEY,
  payment_id UUID REFERENCES payments,
  invoice_id UUID REFERENCES invoices,
  status VARCHAR,
  ai_confidence DECIMAL,
  matched_amount DECIMAL
)
```

### Data Flow

```
Client Payment → Payment Record → AI Reconciliation → Invoice Matching → Policy Update
                     ↓                    ↓                  ↓
                Notification      Waterfall Rules      Agent Commission
```

## AI/ML Architecture

### AI Integration Points

1. **Payment Reconciliation**
   - Fuzzy matching algorithms
   - NLP for payment memo analysis
   - Confidence scoring
   - Anomaly detection

2. **Insights Generation**
   - Predictive payment behavior
   - Risk assessment
   - Trend analysis
   - Performance recommendations

3. **Chat Assistant**
   - OpenAI GPT-4 Turbo integration
   - Context-aware responses
   - Insurance domain knowledge
   - Data query capabilities

### AI Service Architecture

```
┌─────────────────────┐
│   User Interface    │
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│   AI Service Layer  │
│  - Context Building │
│  - Prompt Engineering│
│  - Response Parsing │
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│   OpenAI API        │
│  - GPT-4 Turbo      │
│  - Embeddings       │
└─────────────────────┘
```

## Infrastructure & Deployment

### Deployment Architecture

```
GitHub Repository
      │
      ├── Push to main
      │
      ▼
Render Blueprint
      │
      ├── Frontend Service (Static)
      │   └── Build & Deploy React App
      │
      ├── Backend Service (Web)
      │   └── Node.js API Server
      │
      └── Database Service
          └── PostgreSQL Instance
```

### Environment Configuration

**Frontend (.env)**
```
VITE_API_URL=https://api.paycile.com
```

**Backend (.env)**
```
DATABASE_URL=postgresql://user:pass@host:5432/paycile
JWT_SECRET=secure-random-string
OPENAI_API_KEY=sk-...
PORT=3001
```

### Docker Configuration

```yaml
version: '3.8'
services:
  frontend:
    build: ./frontend
    ports: ["5173:5173"]
    
  backend:
    build: ./backend
    ports: ["3001:3001"]
    depends_on: [postgres]
    
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: paycile
      POSTGRES_USER: admin
```

## Module Breakdown

### 1. Policy & Billing Engine
- Policy lifecycle management
- Premium calculations
- Billing schedule generation
- Commission tracking

### 2. Payment Management
- Multi-method payment processing
- Payment link generation
- Recurring payment scheduling
- Refund processing
- Integration ready for:
  - Stripe
  - Plaid
  - Dwolla
  - ACH/Wire processing

### 3. AI-Powered Reconciliation
- Automated payment matching
- Fuzzy logic algorithms
- Machine learning models
- Exception handling workflows

### 4. Agent Portal
- Performance dashboards
- Client management
- Commission tracking
- Policy administration

### 5. Client Portal
- Policy viewing
- Payment submission
- Document access
- Payment history

### 6. Notifications System
- Email notifications
- In-app alerts
- SMS capabilities (planned)
- Webhook support

### 7. Reporting & Analytics
- Real-time dashboards
- Custom report builder
- Data export capabilities
- Predictive analytics

### 8. Admin Module
- User management
- System configuration
- Audit log viewing
- Carrier management

## API Architecture

### RESTful API Design

```
Base URL: https://api.paycile.com/api/v1

Authentication:
  POST   /auth/login
  POST   /auth/logout
  GET    /auth/me

Users:
  GET    /users
  POST   /users
  PUT    /users/:id
  DELETE /users/:id

Policies:
  GET    /policies
  POST   /policies
  PUT    /policies/:id
  
Payments:
  GET    /payments
  POST   /payments
  PUT    /payments/:id
  
Reconciliation:
  GET    /reconciliations
  POST   /reconciliations/auto-match
  PUT    /reconciliations/:id
  
AI Services:
  POST   /ai/chat
  POST   /ai/insights
  POST   /ai/reconcile
```

### API Response Format

```json
{
  "success": true,
  "data": {
    // Response payload
  },
  "meta": {
    "page": 1,
    "total": 100,
    "limit": 20
  },
  "error": null
}
```

## Performance & Scalability

### Current Performance Metrics
- API Response Time: < 200ms (average)
- Frontend Load Time: < 2s
- Database Query Time: < 50ms

### Scalability Considerations

1. **Horizontal Scaling**
   - Stateless API design
   - Load balancer ready
   - Database connection pooling

2. **Caching Strategy**
   - React Query caching
   - Database query caching (planned)
   - CDN for static assets

3. **Performance Optimizations**
   - Code splitting
   - Lazy loading
   - Image optimization
   - Memoization

## Development Workflow

### Git Workflow
```
main (production)
  └── develop
       ├── feature/payment-module
       ├── feature/ai-insights
       └── bugfix/reconciliation
```

### Code Quality
- TypeScript strict mode
- ESLint configuration
- Prettier formatting
- Pre-commit hooks (planned)

### Testing Strategy
- Unit tests (Jest - planned)
- Integration tests
- E2E tests (Cypress - planned)
- API testing (Postman/Thunder Client)

## Monitoring & Observability

### Logging
- Winston for structured logging
- Log levels: error, warn, info, debug
- Centralized log aggregation (planned)

### Metrics (Planned)
- Application Performance Monitoring (APM)
- Real User Monitoring (RUM)
- Database performance metrics
- API endpoint monitoring

### Alerting (Planned)
- Error rate thresholds
- Performance degradation
- Security incidents
- System health checks

---

## Future Enhancements

1. **Technical Debt**
   - Implement comprehensive testing
   - Add request validation middleware
   - Implement rate limiting
   - Add API versioning

2. **Feature Roadmap**
   - Mobile applications
   - Advanced ML models
   - Blockchain integration
   - Multi-tenancy support

3. **Infrastructure**
   - Kubernetes deployment
   - Multi-region support
   - Disaster recovery
   - Auto-scaling

## Contact & Support

For technical questions or architecture discussions, please contact the development team.

---

*Last Updated: January 2025*
*Version: 1.0* 