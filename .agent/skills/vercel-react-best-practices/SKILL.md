---
name: vercel-react-best-practices
description: React and Next.js performance optimization guidelines from Vercel Engineering. Use when writing, reviewing, or refactoring React/Next.js code to ensure optimal performance.
---

# Vercel React Best Practices

This skill provides Vercel's official React and Next.js performance optimization guidelines.

## When to use this skill
- Writing new React components or Next.js pages
- Implementing data fetching (client or server-side)
- Reviewing code for performance issues
- Optimizing bundle size or load times
- Refactoring existing React/Next.js code

## Instructions

The full set of best practices and rules is contained in the `resources/AGENTS.md` file. 

1.  **Read the guidelines**: When you need to apply best practices, first read the detailed rules in `resources/AGENTS.md`.
    - You do not need to read the entire file every time if you are looking for specific topics (e.g., "waterfalls" or "client-side fetching" or "use server"). Use `grep` or `read_file` with line ranges if efficient.
    - However, for a general review, reading the file provides the full context.

2.  **Apply the rules**: The rules are prioritized by impact:
    - **CRITICAL**: Eliminating Waterfalls, Bundle Size Optimization.
    - **HIGH**: Server-Side Performance.
    - **MEDIUM**: Client-Side Data Fetching, Re-render Optimization, Rendering Performance.
    - **LOW**: JavaScript Performance, Advanced Patterns.

3.  **Refactoring**: When refactoring, identify violations of these rules and apply the "Correct" patterns documented in `resources/AGENTS.md`.

## Resources
- [Full Guidelines (AGENTS.md)](resources/AGENTS.md)
