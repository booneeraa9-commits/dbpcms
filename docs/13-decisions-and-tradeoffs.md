# 13 — Decisions & Trade-offs (Where I Push Back)

You asked me to challenge poor decisions and recommend better alternatives
instead of just agreeing. Here is where I did, plus the choices that need **your**
input. Read this one carefully.

## A. Places I adjusted or reinforced your plan (with reasons)

### A1. Node.js **24 LTS**, not 20
Your stack said "Node.js (LTS)". As of 2026, Node 20 is **end-of-life** and Node
**24** is the active LTS with support into 2028. We'll build on 24. (No downside;
just the correct current baseline.)

### A2. Modular **monolith**, not microservices
Your spec implies many future modules, which sometimes tempts teams toward
microservices. For a college of this size on a single Ethio Telecom VPS,
microservices would multiply cost and operational pain for little benefit. A
**clean-layered modular monolith** gives you the modularity you want and can
serve thousands of users on one server. We can extract a module into its own
service *later* if one ever truly needs it. **Recommendation: accept.**

### A3. Check **permissions**, not role names, in code
Your spec lists permissions per role. I'm making the code check *permissions*
(`grade:approve`) rather than role names. This means future org changes are a
database edit, not a code change. **Recommendation: accept (already in design).**

### A4. **Soft delete + audit + version columns** from day one
Not explicitly in your spec, but essential for a government-facing college
(records must be recoverable and every change traceable; concurrent edits must be
safe). Cheap now, very expensive to retrofit. **Recommendation: accept (in design).**

### A5. **Immutable grade snapshots** on publish
Critical academic-integrity point I added: when grades publish, freeze the exact
scale/weights/GPA rule used, so changing a policy next year never rewrites old
transcripts. **Recommendation: accept (in design).**

### A6. **argon2** password hashing over bcrypt
Both are fine; argon2id is the current best-practice default. Minor, but correct.

### A7. Keep `users` separate from `employees`
Explained in the DB doc: not all employees log in, not all logins are employees.
A nullable link keeps both clean. **Recommendation: accept.**

## B. Decisions that need YOUR input (don't block Phase 1)

### B1. GPA scale default — **4.0 or 5.0?**
Your spec supports both, configurable. But we need a **default** to seed. Many
Ethiopian higher-ed institutions use a **4.0** scale; some polytechnics differ.
→ *Tell me your college's default scale and pass mark, or I'll seed 4.0 and you
can change it in the UI.*

### B2. **Ethiopian calendar & Amharic** — how far in V1?
I strongly recommend building the UI **localization-ready** now (cheap) but
shipping **English + Gregorian** in V1, adding Amharic and Ethiopian-calendar
*display* later. Full Ethiopian-calendar logic everywhere is a large effort.
→ *Is English/Gregorian acceptable for V1 with Amharic planned for Phase 10?*

### B3. **Email sending** for password reset & notifications
Password reset needs to send email. Options: (a) use the college's existing email
(SMTP) if available; (b) a transactional email service; (c) V1 = admin resets
passwords manually (no email) and we add email later.
→ *Which do you prefer? If unsure, we start with (c) and design the email seam.*

### B4. **File storage location on the VPS**
You chose local storage for now — good. On the VPS, files must live on a
**backed-up, persistent disk path**, not inside the app folder. We'll set a
configurable storage root. No action needed now; noting it so it's not forgotten.

### B5. **Who is the very first admin?**
The seed creates one System Administrator. → *Give me an email to use (temporary
password will be forced-changed on first login), or I'll use a placeholder you
change later.*

### B6. **Encryption-at-rest for National ID / TIN in V1?**
I've built the seam. Enabling encryption adds a little complexity to search on
those fields. → *Do you need it ON in V1, or is permission-gated + access-logged
sufficient for now with encryption enabled later?* (Recommendation: gated +
logged in V1, encryption in Phase 9 unless you have a compliance mandate.)

## C. My one strong warning
The **grading engine (Phase 6/7)** is where colleges get burned: rounding
disputes, policy changes rewriting history, concurrent edits, retakes. We are
investing extra design there on purpose (snapshots, versioned rules, exhaustive
unit tests, change-request workflow). Please don't let us rush that phase — it's
the part your registrar will trust or curse for years.

---

### None of B1–B6 block us starting Phase 1.
Phase 1 is pure skeleton/tooling. You can answer B1–B6 anytime before the phases
that need them (auth, grading). So we can begin as soon as you approve.
