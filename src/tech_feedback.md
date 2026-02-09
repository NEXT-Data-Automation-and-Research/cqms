Total Issues: 49 security findings
Critical Issues: 11 (require immediate attention)
Critical Issues (Immediate Attention Required)
1. Exposed Credentials in Repository
Issue:
API keys and secrets are committed to git repository in files cqms.env and env-config.js.
Current Impact:
Anyone with repository access can view database credentials
Supabase anon key is visible
Intercom access token is exposed
All API tokens are publicly accessible in git history
If Not Fixed:
Complete database breach possible
Unauthorized access to all customer data
Attackers can read, modify, or delete any data in Supabase
Intercom data and conversations can be accessed
Historical git commits remain compromised even if files are deleted
Credentials must be rotated (changed) to secure the system
2. AI Data Logging
Issue:
Full conversation data (up to 5,000 characters) is logged to Supabase logs when sending data to AI services.
Location: supabase/functions/ai-audit-batch/index.ts (lines 29-35)
Current Impact:
Customer conversations visible in logs
Personal information (names, emails, phone numbers) exposed
Business intelligence and quality scores leaked
Anyone with Supabase log access can read this data
If Not Fixed:
Data breach through log access
GDPR compliance violation (potential €20M fine or 4% of revenue)
Customer trust destroyed if discovered
Legal liability for exposing customer PII
Logs retained indefinitely, creating long-term exposure
Cannot delete data even if requested by customers
3. Unauthenticated External Webhook
Issue:
The n8n webhook endpoint has no authentication or API key protection.
Location: supabase/functions/ai-audit-batch/index.ts (lines 38-45)
Current Impact:
Webhook URL is the only security measure
Anyone with the URL can send data to n8n
No way to verify legitimate requests
If Not Fixed:
Malicious actors can inject fake audit data
Data tampering possible
Denial of service by flooding webhook
Cannot track unauthorized access
Business logic can be manipulated
Audit integrity compromised
4. Weak Password Hashing (SHA-256)
Issue:
Passwords are hashed using SHA-256 instead of proper password hashing algorithms (bcrypt/Argon2).
Location: login.html, user-management.html
Current Impact:
SHA-256 is fast (designed for data integrity, not passwords)
No salt used (identical passwords create identical hashes)
Vulnerable to rainbow table attacks
Can be brute-forced with modern GPUs
If Not Fixed:
Database compromise = all passwords cracked within hours/days
User accounts across all systems at risk (if password reuse)
Mass account takeover possible
Cannot detect breach until damage is done
Legal liability for inadequate security measures
Regulatory fines for failing to protect user credentials
5. SQL Injection via Table Names
Issue:
User-controlled table names are used directly in database queries without validation or sanitization.
Location: scorecards.html, auditor-dashboard.html, multiple files
Current Impact:
Table names come from user input or database records
No whitelist or validation applied
Direct use in Supabase queries
If Not Fixed:
Attackers can access any table in database
Read sensitive data from users table (emails, roles, passwords)
Modify or delete audit records
Access admin-only tables
Export entire database contents
Cannot trace unauthorized data access
Complete database compromise possible
6. No Rate Limiting on Login
Issue:
Login endpoint allows unlimited authentication attempts with no delays or account lockouts.
Location: login.html
Current Impact:
Unlimited login attempts possible
No delay between attempts
No account lockout after failures
No IP-based restrictions
If Not Fixed:
Automated brute force attacks succeed
Password guessing tools can try millions of combinations
Weak passwords compromised within minutes
Account takeover at scale
Service degradation from attack traffic
Cannot detect or stop attacks in progress
Combined with weak hashing, complete authentication bypass
7. Client-Side Authorization Only
Issue:
All access control checks happen in browser JavaScript. No server-side enforcement via Row Level Security (RLS) policies.
Location: access-control.js, access-control.html
Current Impact:
User roles stored in localStorage
Access checks run in browser
No database-level permission enforcement
If Not Fixed:
Any user can modify localStorage to become "Super Admin"
Browser console access = instant admin rights
Direct database API calls bypass all checks
Users can read data they shouldn't access
Users can modify/delete records without authorization
Audit trail shows legitimate user performed unauthorized actions
Cannot prove unauthorized access occurred
Complete privilege escalation in seconds
8. No Row Level Security (RLS) Enabled in Supabase
Issue:
Supabase database has no Row Level Security (RLS) policies enabled on any tables. This is Supabase's primary security mechanism for protecting data.
Current Impact:
All tables are accessible to anyone with the anon key
No database-level access control enforcement
Client-side JavaScript can directly query any table
Any user can read, modify, or delete any data
Supabase anon key (exposed in client code) grants full database access
If Not Fixed:
Complete database compromise through exposed anon key
Any user can access all customer data, audit records, and user accounts
Attackers can export entire database contents
Data modification and deletion possible by anyone
Cannot prevent unauthorized access even if application code is secure
Supabase's security model is completely bypassed
GDPR violations due to unauthorized data access
Legal liability for failing to implement basic database security
Cannot achieve any security compliance (SOC 2, ISO 27001, HIPAA)
Application is fundamentally insecure regardless of other fixes
Database Security Issues (Supabase-Specific)
Supabase Security Model Misconfiguration
Issue:
The application uses Supabase (PostgreSQL-based database) but does not implement the security features that make Supabase safe for client-side access.
How Supabase Security Works:
Supabase allows direct database access from client-side JavaScript
Security relies on Row Level Security (RLS) policies at the database level
Anon key is designed to be public (exposed in client code)
RLS policies filter data per user automatically
Without RLS, anon key grants full database access
Current Implementation:
No RLS policies enabled on any tables
Anon key exposed in env-config.js (this is OK if RLS is enabled)
Client-side code directly queries database without server-side validation
Access control only in browser JavaScript (can be bypassed)
Impact:
Supabase's security model is completely ineffective
Application is as insecure as giving everyone the database password
All data is accessible to anyone who views the page source
No protection against unauthorized access
Cannot leverage Supabase's built-in security features
If Not Fixed:
Complete data breach inevitable
Cannot use Supabase safely in production
Must either implement RLS or migrate to traditional server-side database access
All other security fixes are ineffective without database-level protection
Application architecture is fundamentally flawed
Direct Client-Side Database Access Without Protection
Issue:
Application code directly queries Supabase database from browser JavaScript using the anon key, with no server-side API layer or RLS protection.
Location: supabase-config.js, all HTML files using window.SupabaseDB
Current Impact:
Database queries executed from browser
No server-side validation or filtering
User can modify JavaScript to change queries
Browser DevTools can inspect all database operations
Network traffic shows all database queries and responses
If Not Fixed:
Users can modify queries in browser console
Direct database manipulation possible
Cannot hide database schema or table structure
All data transfer visible in network tab
No way to prevent unauthorized queries
Attackers can learn database structure and craft targeted attacks
Supabase Anon Key Exposure (Informational)
Issue:
Supabase anon key is visible in client-side code (env-config.js) and can be viewed in browser DevTools.
Reality:
This is expected behavior in Supabase
Anon key is designed to be public
Security comes from RLS policies, not hiding the key
Without RLS, anon key is dangerous
With RLS, anon key is safe
Current Problem:
Anon key is exposed (this is OK)
But RLS is not enabled (this makes it dangerous)
Without RLS, exposed anon key = full database access
If Not Fixed:
Misunderstanding leads to false sense of security
May think hiding anon key solves the problem (it doesn't)
Must enable RLS regardless of anon key exposure
Cannot secure application by hiding the key
Missing Supabase Edge Function Security
Issue:
Supabase Edge Functions (serverless functions) do not properly verify user authentication or enforce authorization.
Location: supabase/functions/ai-audit-batch/index.ts, supabase/functions/intercom-proxy/index.ts
Current Impact:
Edge Functions accept requests without authentication verification
No user role checking before processing requests
Functions can be called by anyone with the URL
No rate limiting on function calls
If Not Fixed:
Unauthorized users can trigger expensive operations
Data processing functions can be abused
Cost escalation from API abuse
Cannot track who performed actions
Functions bypass all application-level security
High Priority Issues
9. AI Data Privacy & Compliance
Issue:
Conversation data sent to n8n.cloud → unknown LLM provider without PII redaction or data processing agreements.
Current Impact:
Full conversation transcripts sent externally
Customer personal information not redacted
Agent names and employee data included
Unknown LLM provider (OpenAI, Anthropic, or other)
No data processing agreements in place
No user consent for AI processing
If Not Fixed:
GDPR Article 28 violation (no DPA with processors) - potential €20M fine
Customer data used to train AI models without permission
International data transfer without safeguards
Cannot fulfill data deletion requests (GDPR Right to Erasure)
Privacy policy does not disclose AI processing (deceptive practice)
Class action lawsuits from affected customers
Regulatory investigation and enforcement actions
Business partnerships terminated due to compliance failures
Cannot bid on enterprise contracts requiring data protection
10. CORS Misconfiguration
Issue:
Edge Functions use wildcard CORS (Access-Control-Allow-Origin: *) allowing any website to call APIs.
Location: supabase/functions/intercom-proxy/index.ts, supabase/functions/clickup-proxy/index.ts
Current Impact:
Any website can make requests to your APIs
No origin validation
Credentials can be sent cross-origin
If Not Fixed:
Malicious websites can call your APIs from victim browsers
Steal user data through victim sessions
Perform actions as authenticated users
Cross-Site Request Forgery (CSRF) attacks
Data exfiltration through third-party sites
API abuse from any domain
Cannot block malicious origins
User browsers used as attack proxies
Medium Priority Issues
11. Cross-Site Scripting (XSS) via innerHTML
Issue:
User input inserted into HTML using innerHTML without sanitization in 29 files across the application.
Current Impact:
User-provided content rendered as HTML
No input sanitization or output encoding
Affects profile names, audit comments, feedback, etc.
If Not Fixed:
Attackers inject malicious JavaScript
Steal session tokens and credentials
Perform actions as victim user
Redirect to phishing sites
Keylogging to capture passwords
Persistent XSS (stored in database) affects all users who view it
Worm-like propagation through audit comments
Complete account takeover
Reputation damage when users are compromised
12. No CSRF Protection
Issue:
State-changing operations (create, update, delete) do not verify request origin or include CSRF tokens.
Current Impact:
Forms submit without CSRF tokens
No validation of request origin
Cookie-based sessions vulnerable
If Not Fixed:
Attackers craft malicious websites that perform actions
Victim visits attacker site while logged into your app
Malicious site submits forms as victim user
Create/modify/delete audits without user knowledge
Change user settings or passwords
Cannot distinguish legitimate from forged requests
Users blamed for unauthorized actions
Evidence of "insider threat" when it's CSRF attack
13. No Session Expiration
Issue:
User sessions stored in localStorage never expire. Sessions remain valid indefinitely.
Location: auth-check.js
Current Impact:
Sessions valid forever until manual logout
No automatic timeout
Stale sessions remain active
If Not Fixed:
Shared/public computers retain access indefinitely
Stolen session tokens never expire
Cannot force re-authentication
Account takeover persists even after password change
Users forget to logout = permanent access
Compliance issues with session timeout requirements
Cannot revoke access remotely
Lost/stolen devices = permanent security breach
14. Weak File Upload Validation
Issue:
File uploads validated only by MIME type which can be spoofed. No content verification.
Location: profile.html
Current Impact:
Only checks file.type from browser
No verification of actual file content
No file signature checking
If Not Fixed:
Malicious files uploaded disguised as images
Executable files uploaded to server
XSS payloads embedded in SVG "images"
Server-side code execution if files processed
Storage consumed by large fake files
Malware distribution through your platform
Phishing assets hosted on your domain
Legal liability for hosting malicious content
15. Missing Security Headers
Issue:
HTTP responses lack security headers (CSP, HSTS, X-Frame-Options, X-Content-Type-Options).
Current Impact:
No Content Security Policy
No HTTPS enforcement
No clickjacking protection
No MIME-type sniffing prevention
If Not Fixed:
Clickjacking attacks embed your app in malicious iframe
Users tricked into performing actions unknowingly
Man-in-the-middle attacks downgrade to HTTP
Mixed content vulnerabilities
XSS attacks easier to execute
Browser security features disabled
Failed security audits for enterprise customers
Cannot achieve SOC 2 or ISO 27001 compliance
Additional Security Issues
Lower Priority (Address Systematically)
16. No Input Length Limits
Issue: Form inputs accept unlimited length data
If Not Fixed: Denial of service through large payloads, database bloat, application crashes
17. Weak Password Policy
Issue: No password complexity requirements enforced
If Not Fixed: Users choose weak passwords ("password123"), easier brute force attacks, account compromises
18. No Security Event Logging
Issue: Login attempts, permission changes, data access not logged
If Not Fixed: Cannot detect breaches, no audit trail, cannot investigate incidents, compliance failures
19. Information Disclosure in Errors
Issue: Detailed error messages expose database structure, table names, column names
If Not Fixed: Attackers learn system internals, easier to craft attacks, data schema exposed
20. No HTTPS Enforcement
Issue: Application does not force HTTPS connections
If Not Fixed: Man-in-the-middle attacks, credentials sent in clear text, session hijacking
21. Outdated Dependencies
Issue: npm packages not regularly updated, known vulnerabilities present
If Not Fixed: Exploitation of known CVEs, automated attacks succeed, supply chain compromises
22. No API Rate Limiting
Issue: API endpoints have no request limits
If Not Fixed: API abuse, data scraping, denial of service, excessive costs
23. Session Fixation Vulnerability
Issue: Session IDs not regenerated after login
If Not Fixed: Attackers can force known session ID, session hijacking, authentication bypass
24. Insecure Direct Object References
Issue: Predictable IDs used for resources (audit IDs, user IDs)
If Not Fixed: Enumeration attacks, unauthorized data access, privacy breaches
25. No Subresource Integrity
Issue: Third-party scripts loaded without integrity checks
If Not Fixed: CDN compromise affects your app, malicious code injection, supply chain attack
26. Client-Side Business Logic
Issue: Pricing, calculations, validations done in browser
If Not Fixed: Price manipulation, business rule bypass, revenue loss