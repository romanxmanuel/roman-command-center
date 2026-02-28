# Roman Command Center – High Performance AI Operating Rules

This project exists to:
1. Increase Roman's employability in SQL / backend / data roles.
2. Reinforce workflow fundamentals (Git, Node, REST, SQLite).
3. Avoid over-engineering and unnecessary abstraction.
4. Produce clean, resume-ready architecture.

Claude must prioritize clarity, simplicity, and maintainability over cleverness.

---

## 1. Core Stack Constraints (Non-Negotiable)

**Backend:**
- Node.js (LTS)
- Express
- SQLite (file-based only)
- No ORM — use raw SQL queries for learning clarity

**Frontend:**
- Vanilla HTML
- Vanilla CSS
- Vanilla JS
- Chart.js for visualizations

**Do NOT introduce:**
- React
- TypeScript
- Prisma
- Docker
- Authentication systems
- Cloud services
- Microservices
- Build tools unless absolutely necessary

This is a fundamentals-first project.

---

## 2. Architectural Principles

- RESTful API structure
- Separate route files by feature
- Separate database logic into its own module
- No global mutable state
- Use async/await consistently
- Explicit error handling (try/catch)
- Clear logging with timestamps
- Environment variables for configuration

**Folder structure must be clean and readable:**

```
project-root/
  server.js
  package.json
  CLAUDE.md
  /routes
  /db
  /public
  /utils
```

No deep nesting. No unnecessary abstraction layers.

---

## 3. Database Philosophy

SQLite is used to reinforce SQL competence.

**Requirements:**
- Raw SQL queries only
- Parameterized queries (prevent injection)
- Clear schema definitions
- Foreign keys where appropriate
- Avoid premature optimization

Roman must be able to read, understand, and modify every query.
Do not obscure SQL behind magic libraries.

---

## 4. UI Philosophy (Tron but Professional)

**Theme:**
- Dark background (`#0b0f1a`)
- Neon cyan + magenta accents
- Subtle grid animation
- Glassmorphism panels
- Clean, readable typography

**Design priorities:**
- Readability over flash
- No heavy animation libraries
- No unnecessary UI frameworks
- Responsive for laptop first

UI must feel: focused, intentional, controlled, minimalist. Not flashy chaos.

---

## 5. Code Quality Standards

Every file must:
- Be under 300 lines if possible
- Have a clear comment at the top explaining its purpose
- Avoid deeply nested logic
- Avoid callback hell
- Use consistent naming conventions

**Naming:**
- `camelCase` for JS variables and functions
- `snake_case` for DB fields
- Clear, descriptive variable names

No vague variable names like `data`, `temp`, `x`, or `stuff`.

---

## 6. Anti-Overengineering Guardrails

Claude must actively prevent:
- Adding new frameworks unnecessarily
- Refactoring for abstraction without clear benefit
- Creating generic utility layers too early
- Premature optimization
- Complex design patterns

If tempted to introduce complexity, Claude must explain WHY before doing so.

**Simplicity > cleverness.**

---

## 7. Employability Optimization Rules

Every major feature should demonstrate:
- CRUD operations
- SQL joins or grouping where possible
- Input validation
- API design
- Structured error handling

This project must function as a portfolio piece.

**README must include:**
- Architecture explanation
- API documentation
- Database schema explanation
- Screenshots
- Future improvements section

---

## 8. Learning Mode Requirement

When implementing new architectural decisions, Claude must briefly explain:
- Why this approach was chosen
- What alternative approaches exist
- What trade-offs were considered

Keep explanations concise. Roman learns through implementation, not lectures.

---

## 9. Debugging Protocol

When errors occur:
1. Identify exact file + line.
2. Explain root cause.
3. Apply smallest possible fix.
4. Re-run and confirm resolution.

No guessing. No broad rewrites.

---

## 10. Identity Alignment

This system reinforces:
- Discipline
- Structured thinking
- SQL mastery
- Execution over analysis
- Practical competence

Claude must avoid philosophical tangents, over-optimization, and academic digressions.

**The mission is employability and real capability.**

---

## 11. Scope Control

This is an MVP system.

Future upgrades may include:
- Authentication
- Cloud deployment
- PostgreSQL migration

But **NOT in Phase 1.**

Keep it lean. Ship. Iterate.

---

*END OF OPERATING RULES.*
