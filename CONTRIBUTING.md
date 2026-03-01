# Contributing to PODS — Predictive Order & Demand Solutions

Thank you for your interest in contributing to PODS! This document outlines the process for contributing to the project and helps ensure a smooth collaboration experience.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Branching Strategy](#branching-strategy)
- [Making Changes](#making-changes)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Reporting Bugs](#reporting-bugs)
- [Requesting Features](#requesting-features)

---

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment. Be kind, constructive, and professional in all interactions.

---

## Getting Started

1. **Fork** the repository on GitHub
2. **Clone** your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/podspro.git
   cd podspro
   ```
3. **Add the upstream remote** so you can keep your fork in sync:
   ```bash
   git remote add upstream https://github.com/fulkruhm/podspro.git
   ```

---

## Development Setup

**Prerequisites:** Node.js 20+, npm

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create your `.env.local` file:
   ```bash
   echo "GEMINI_API_KEY=your_api_key_here" > .env.local
   ```
   Get a free API key from [aistudio.google.com/apikey](https://aistudio.google.com/apikey)

3. Start the development server:
   ```bash
   npm run dev
   ```
   The app runs at [http://localhost:3000](http://localhost:3000)

4. Optionally run with Docker:
   ```bash
   export $(cat .env.local | xargs) && docker compose up --build
   ```
   The app runs at [http://localhost:8080](http://localhost:8080)

---

## Branching Strategy

We use the following branch naming conventions:

| Branch | Purpose |
|--------|---------|
| `main` | Production-ready code only |
| `feature/your-feature-name` | New features |
| `fix/your-bug-description` | Bug fixes |
| `chore/your-task` | Maintenance, dependency updates |
| `docs/your-doc-change` | Documentation only |

Always branch off from `main`:
```bash
git checkout main
git pull upstream main
git checkout -b feature/your-feature-name
```

---

## Making Changes

- Keep changes focused — one feature or fix per pull request
- Write clean, readable TypeScript — avoid `any` types where possible
- If adding a new component, place it in the `components/` directory
- If adding a new service, place it in the `services/` directory
- Test your changes locally before submitting
- Make sure `npm run build` completes without errors before opening a PR

---

## Commit Guidelines

We follow the [Conventional Commits](https://www.conventionalcommits.org/) standard:

```
type(scope): short description

Optional longer description here.
```

**Types:**

| Type | When to use |
|------|-------------|
| `feat` | A new feature |
| `fix` | A bug fix |
| `docs` | Documentation changes |
| `style` | Formatting, no logic change |
| `refactor` | Code restructure, no feature/fix |
| `chore` | Build process, dependencies |
| `test` | Adding or updating tests |

**Examples:**
```bash
git commit -m "feat(assistant): add conversation history persistence"
git commit -m "fix(inventory): correct stock level calculation for store users"
git commit -m "docs: update README with Docker Compose instructions"
git commit -m "chore: update Gemini model to gemini-3.1-pro-preview"
```

---

## Pull Request Process

1. **Sync your fork** with upstream before opening a PR:
   ```bash
   git pull upstream main
   ```

2. **Push your branch** to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```

3. **Open a Pull Request** on GitHub against the `main` branch

4. **Fill out the PR template** with:
   - What changes you made and why
   - Screenshots if UI was changed
   - Any breaking changes

5. **Wait for review** — address any feedback promptly

6. Once approved, your PR will be merged into `main`

---

## Coding Standards

**TypeScript**
- Use proper types — avoid `any`
- Define shared types in `types.ts`
- Use interfaces for object shapes

**React**
- Use functional components with hooks
- Keep components focused and single-purpose
- Use Tailwind CSS for styling — no inline styles

**AI / Gemini**
- All Gemini API calls go through `services/geminiService.ts`
- Handle errors gracefully — never let an API failure crash the UI
- Use the model string `gemini-3.1-pro-preview` unless updating intentionally

**File naming**
- Components: `PascalCase.tsx` (e.g. `InventoryView.tsx`)
- Services: `camelCase.ts` (e.g. `geminiService.ts`)
- Types: defined in `types.ts`

---

## Reporting Bugs

Open a [GitHub Issue](https://github.com/fulkruhm/podspro/issues) and include:

- A clear title and description
- Steps to reproduce the bug
- Expected vs actual behavior
- Browser and OS version
- Screenshots or console errors if applicable

---

## Requesting Features

Open a [GitHub Issue](https://github.com/fulkruhm/podspro/issues) with the label `enhancement` and include:

- A clear description of the feature
- Why it would be useful to the project
- Any mockups or examples if applicable

---

## Questions?

If you're unsure about anything, open an issue and ask — we're happy to help!
