---
title: Algorithms and Information Assurance Security Specifications
status: active
owner: team
milestone: 1
---

# Algorithms & Information Assurance Security Specifications

This architecture document details the algorithmic foundations and security standards required for the Oak Sports Academy System, aligned with academic requirements for **Algorithms & Complexity** and **Information Assurance & Security**.

---

## 1. Information Assurance & Security (CIA Triad)

### 1.1 Confidentiality (Data Privacy & Access Control)
- **Data Privacy Act of 2012 (RA 10173) for Minors**:
  - Oak Sports Academy manages youth athletes. Minor accounts require verified parental/legal guardian consent before storing PII or medical waivers.
  - Multi-tenant data isolation: athletes see only their own data; parents see only linked children; staff see only athletes assigned to their rosters.
  - Storage buckets in Supabase are strictly private. File access is mediated exclusively via short-lived signed URLs (TTL $\le 15$ minutes) issued after server-side authorization checks.
- **RBAC Bitmasking & PostgreSQL Row-Level Security (RLS)**:
  - Backend gate middleware enforces bitmask permissions in $O(1)$ time.
  - PostgreSQL Row-Level Security (RLS) is enabled in Supabase for table-level defense-in-depth.

### 1.2 Integrity (Data Accuracy & Tamper Resistance)
- **Input Validation & Injection Defense**:
  - Strict Zod validation on every API route payload, query parameter, and route parameter.
  - Prisma ORM parameterized queries prevent SQL injection.
  - Security headers via Helmet (strict Content Security Policy).
- **Cryptographic Append-Only Event Logging (SHA-256 Hash Chain)**:
  - Every administrative action (account creation, file upload, status mutation, fee/rate adjustment, role grant) produces an immutable record linked by a cryptographic hash chain:
    $$\text{currentHash} = \text{SHA-256}(\text{previousHash} \parallel \text{timestamp} \parallel \text{userId} \parallel \text{action} \parallel \text{targetEntity} \parallel \text{targetId} \parallel \text{payloadHash})$$
  - Genesis record uses a 64-character zero hash.
  - Database table permissions: `INSERT` and `SELECT` only; `UPDATE` and `DELETE` revoked.
  - Any historical tampering breaks the hash chain verification sequentially.

### 1.3 Availability (Operational Resilience & Reliability)
- **Denial-of-Service (DoS) Mitigation**:
  - Multi-tiered rate limiting with `express-rate-limit`:
    - Global API tier: 100 requests / 15 min per IP.
    - Sensitive endpoints (login, OTP): 10 req / 15 min per IP, 5 req / 15 min per email, returning `Retry-After`.
  - Body parser payload limits: 10 kB for JSON, 5 MB for multipart document uploads.
  - Mobile retry resilience with exponential backoff to handle free-tier API spin-up cold starts.

### 1.4 Security Reference Standards
- **Cloudflare Security-Audit Guidelines**: Edge protection, TLS configuration, and strict boundary validation.
- **OWASP Agentic Skills Top 10**: Securing AI agent development boundaries and execution environments.

---

## 2. Core Algorithm Specifications

### 2.1 Algorithm 1: Cardinality-Constrained Weighted Interval Scheduling (CC-WIS)
- **Feature**: Training Schedule Recommendation
- **Paradigm**: Dynamic Programming with Binary Search
- **Complexity**: Time $O(n \log n)$, Space $O(n)$ where cardinality $q \in \{2, 3\}$.
- **Purpose**: Select the optimal combination of $q$ non-overlapping weekly sessions maximizing the participant's cumulative preference score ($w_i \in [1, 3]$).
- **Recurrence**:
  $$DP[i][k] = \max\Big(DP[i-1][k], \; DP[p(i)][k-1] + w_i\Big)$$
  where $p(i)$ is the latest compatible preceding interval found via binary search ($O(\log n)$).

### 2.2 Algorithm 2: Trial Conversion & Student Churn Tracking (FSM)
- **Feature**: Participant Lifecycle Monitoring and Conversion Analytics
- **Paradigm**: Finite State Machine (FSM)
- **Complexity**: Time $O(1)$ per transition, Space $O(1)$ state lookup.
- **States**: `REGISTERED` $\rightarrow$ `TRIAL_SCHEDULED` $\rightarrow$ `TRIAL_ACTIVE` $\rightarrow$ `TRIAL_COMPLETED` $\rightarrow$ `ENROLLED` $\rightarrow$ `INACTIVE` $\rightarrow$ `WITHDRAWN`.
- **Telemetry**: Measures trial-to-regular conversion rate and triggers rule-based churn risk flags (e.g. idle post-trial $\ge 7$ days, renewal lapse $\le 7$ days).

### 2.3 Algorithm 3: Digital Document Collection & Automated Image Quality Screening
- **Feature**: Digital Document Collection & Upload Verification
- **Paradigm**: Stream-based Header Inspection & Structural Binary Validation
- **Complexity**: Time $O(k)$ ($k \le 32$ bytes, $O(1)$), Space $O(1)$ memory buffer.
- **Purpose**: Inspects magic numbers (`FF D8 FF` for JPEG, `89 50 4E 47` for PNG) to prevent script injection/polyglot files, enforces resolution boundaries ($\ge 400 \times 400$ px), sanitizes filenames to UUIDs, and securely stores files in private Supabase buckets.
