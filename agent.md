# Pantex – Aggies Invent: Codex Project Context

## Project Overview

This repository is for the Pantex challenge at Texas A&M's Aggies Invent hackathon.

Our assigned need statement is:

**Automated Document Review**

The project is intended to help Pantex / DOE personnel review documents when an upstream DOE requirement, order, standard, or other governing document changes.

The core problem is not simply summarizing documents. The system should help determine how a change in a higher-level document may affect lower-level Pantex documents and help a human reviewer determine what needs to be updated.

This is a hackathon prototype. Optimize for a convincing, functional demonstration rather than production-scale infrastructure.

---

## Core Problem

Pantex operates under many DOE requirements and controlled documents.

When an upstream requirement changes, personnel may need to manually:

1. Determine what changed.
2. Find Pantex documents potentially affected by the change.
3. Locate the relevant sections within those documents.
4. Determine why those sections may be affected.
5. Recommend what should be reviewed or changed.
6. Preserve human oversight before any document modification is accepted.

The project should make this workflow substantially faster and easier.

---

## Product Goal

Build an AI-assisted document-change review system.

A user should ideally be able to provide an old and new version of a governing document, or otherwise provide document changes.

The system should then help:

- identify meaningful changes between versions;
- understand the meaning of those changes;
- identify potentially affected downstream documents;
- identify specific relevant sections or passages;
- explain why each section may be impacted;
- propose or assist with recommended changes;
- show evidence/sources supporting the recommendation;
- allow a human reviewer to inspect the results.

Do NOT treat AI output as automatically authoritative. The interface should support human review and accountability.

---

## Current Repository

This repository already contains an existing UI prototype created by another team member.

Before making substantial changes:

1. Inspect the existing repository.
2. Understand the current architecture and components.
3. Preserve useful existing work.
4. Prefer extending/refactoring the existing implementation over unnecessarily rebuilding it.
5. Explain major architectural changes before implementing them when working in Planning mode.

The project currently uses **Next.js**.

Local development:

    npm install
    cp .env.example .env.local
    npm run dev

Local application:

    http://localhost:3000

The existing README states that:

- `/api/analyze` performs AI analysis during local development.
- The current implementation uses Anthropic Haiku for analysis.
- `ANTHROPIC_API_KEY` is expected in `.env.local`.
- The existing GitHub Pages deployment is a static export.
- GitHub Pages therefore cannot run the live `/api/analyze` server-side functionality.
- The static deployment currently demonstrates the UI without live LLM analysis.

Do not expose API keys or commit secrets.

---

## Current UI Direction

The existing application is a document-review interface.

Existing concepts visible in the prototype include areas such as:

- Review Document
- Changes
- Sources
- document content
- identified/recommended changes
- source/evidence information

Preserve the strong parts of the existing design unless there is a clear reason to change them.

The application should feel like a professional internal engineering / DOE review tool rather than a generic AI chatbot.

---

## Important Product Principles

### 1. Human-in-the-loop

AI should assist the reviewer, not silently make authoritative document changes.

Clearly distinguish:

- source text;
- detected changes;
- AI analysis;
- recommendations;
- final human decisions.

### 2. Traceability

Recommendations should be traceable to evidence whenever possible.

A reviewer should be able to understand:

- what changed;
- where it changed;
- what downstream content may be affected;
- why the system believes it is affected;
- what source supports that conclusion.

### 3. Minimize hallucination

Do not fabricate requirements, document sections, citations, page numbers, or relationships between documents.

If information is unavailable, represent that uncertainty.

### 4. Useful over flashy

This is a hackathon project.

Prioritize a complete and demonstrable workflow over unnecessary infrastructure or visual effects.

The demo should make the value proposition obvious within a few minutes.

### 5. Preserve existing functionality

Do not delete or rewrite functioning components merely because another implementation is cleaner.

Understand why something exists before replacing it.

---

## Development / Git Workflow

Multiple team members may work on this repository.

The user working with Codex is developing on their own Git branch rather than directly modifying `main`.

Do not:

- force-push;
- rewrite Git history;
- delete teammates' work;
- merge into `main` without being asked;
- commit secrets;
- make destructive Git operations without explicit approval.

Before large changes, inspect the current branch and repository state.

Keep changes logically grouped so they can be reviewed and merged through a pull request.

---

## How Codex Should Work With This User

The user is a first-year engineering / prospective computer science student and is relatively new to collaborative software development, Git, Next.js, and AI application development.

They have programming experience, including CS50, but should not be assumed to know the internals of the existing web stack.

When proposing or implementing something:

- explain important architectural decisions in understandable terms;
- identify which files will be changed;
- explain unfamiliar technologies when relevant;
- avoid unnecessary complexity;
- prefer straightforward implementations suitable for a hackathon;
- warn before destructive actions;
- do not assume the user understands a command simply because it is common in professional development.

The goal is both to build the project and allow the user to understand what is being built.

---

## Planning Mode Behavior

When the user asks for planning rather than implementation:

1. Inspect the relevant existing code first.
2. Explain what already exists.
3. Identify what can be reused.
4. Propose the smallest reasonable set of changes.
5. Identify files/components likely to change.
6. Identify important risks or dependencies.
7. Do not modify files until implementation is requested.

Do not propose rebuilding the entire application unless the existing architecture genuinely prevents the requested feature.

---

## Implementation Behavior

When asked to implement a feature:

1. Inspect relevant existing files.
2. Check how the feature fits the current architecture.
3. Make focused changes.
4. Avoid unrelated refactors.
5. Preserve existing behavior unless the requested feature requires changing it.
6. Run appropriate checks/tests when possible.
7. Report what changed and any remaining limitations.

If a requested feature is ambiguous, prefer examining the existing implementation and project context before inventing behavior.

---

## Hackathon Priorities

When choosing between implementation options, generally prioritize:

1. A working end-to-end document review demonstration.
2. Accurate and understandable change detection.
3. Evidence/traceability.
4. Clear visualization of affected document sections.
5. Useful AI-assisted recommendations.
6. Human review/approval workflow.
7. Reliability during the live demo.
8. Visual polish.
9. Production-scale infrastructure.

The prototype does not need to solve every possible Pantex document-management problem.

It should demonstrate a credible workflow showing how AI could materially reduce the effort required to review downstream impacts of document changes.

---

## Before Starting a New Task

Always begin by asking:

**How does this feature improve the document-change review workflow?**

Then inspect the existing implementation before deciding how to build it.