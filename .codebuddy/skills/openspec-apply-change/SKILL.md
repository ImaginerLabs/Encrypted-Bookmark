---
name: openspec-apply-change
description: Implement tasks from an OpenSpec change. Use when the user wants to start implementing, continue implementation, or work through tasks.
license: MIT
compatibility: Requires openspec CLI.
metadata:
  author: openspec
  version: "1.0"
  generatedBy: "1.2.0"
---

Implement tasks from an OpenSpec change with a structured development → E2E test → validation loop.

**Input**: Optionally specify a change name. If omitted, check if it can be inferred from conversation context. If vague or ambiguous you MUST prompt for available changes.

---

## Project Context

This workflow is designed for the Encrypted Bookmark Chrome extension project:

| Category           | Technology                                             |
| ------------------ | ------------------------------------------------------ |
| Frontend Framework | React 18 + TypeScript                                  |
| Build Tool         | Vite + @crxjs/vite-plugin                              |
| Encryption         | Web Crypto API (AES-256-GCM + PBKDF2, 100k iterations) |
| Browser Spec       | Manifest V3                                            |
| E2E Testing        | Playwright (Chrome Extension persistent context)       |

### Key Directory Structure

```
src/
├── background/          # Service Worker (messaging, lifecycle)
├── popup/               # Popup window (main UI, bookmark management)
├── options/             # Settings page (password, storage, import/export)
├── services/            # Core services (EncryptionService, PasswordService, BookmarkService, ImportExportService)
├── storage/             # Storage layer abstraction
└── types/               # TypeScript type definitions

e2e/
├── fixtures/extension.ts      # Extension loading fixture
├── helpers/
│   ├── chrome-storage.ts      # Chrome Storage helpers
│   └── selectors.ts           # Page selector constants
├── tests/
│   ├── popup/                 # Popup page tests
│   ├── options/               # Options page tests
│   └── integration/           # Integration tests
└── playwright.config.ts
```

### E2E Test Constraints

- Must run `npm run build` first to generate `dist/`
- Extension requires `chromium.launchPersistentContext` (headless not supported)
- Clear `chrome.storage.local` before each test for isolation
- Use `workers: 1` to avoid parallel conflicts

### Common Commands

```bash
npm run dev           # Development mode (hot reload)
npm run build         # Production build
npm run type-check    # Type checking
npm run lint          # ESLint check
npm run test:e2e      # Build + run E2E tests
npm run test:e2e:ui   # Build + Playwright UI mode
```

---

## Implementation Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    IMPLEMENTATION FLOW                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                  ┌───────────────────────┐
                  │   Phase 1: Develop    │
                  │   (Frontend Agent)    │
                  └───────────┬───────────┘
                              │
                              ▼
                  ┌───────────────────────┐
                  │   Phase 2: E2E Test   │
                  │   (Tester Agent)      │
                  └───────────┬───────────┘
                              │
                    ┌─────────┴─────────┐
                    │                   │
               PASS │                   │ FAIL
                    ▼                   ▼
            ┌───────────────┐   ┌───────────────┐
            │   Complete    │   │  Back to      │
            │               │   │  Phase 1      │
            └───────────────┘   │  (max 3x)     │
                                └───────────────┘
```

---

## Steps

1. **Select the change**

   If a name is provided, use it. Otherwise:
   - Infer from conversation context if the user mentioned a change
   - Auto-select if only one active change exists
   - If ambiguous, run `openspec list --json` to get available changes and use the **AskUserQuestion tool** to let the user select

   Always announce: "Using change: <name>" and how to override (e.g., `/opsx:apply <other>`).

2. **Check status to understand the schema**

   ```bash
   openspec status --change "<name>" --json
   ```

   Parse the JSON to understand:
   - `schemaName`: The workflow being used (e.g., "spec-driven")
   - Which artifact contains the tasks (typically "tasks" for spec-driven, check status for others)

3. **Get apply instructions**

   ```bash
   openspec instructions apply --change "<name>" --json
   ```

   This returns:
   - Context file paths (varies by schema - could be proposal/specs/design/tasks or spec/tests/implementation/docs)
   - Progress (total, complete, remaining)
   - Task list with status
   - Dynamic instruction based on current state

   **Handle states:**
   - If `state: "blocked"` (missing artifacts): show message, suggest using openspec-continue-change
   - If `state: "all_done"`: congratulate, suggest archive
   - Otherwise: proceed to implementation

4. **Read context files**

   Read the files listed in `contextFiles` from the apply instructions output.
   The files depend on the schema being used:
   - **spec-driven**: proposal, specs, design, tasks
   - Other schemas: follow the contextFiles from CLI output

5. **Show current progress**

   Display:
   - Schema being used
   - Progress: "N/M tasks complete"
   - Remaining tasks overview
   - Dynamic instruction from CLI

6. **Phase 1: Implement tasks (Development)**

   Use **Task tool** with `subagent_name: "通用资深前端研发"` for development work.

   **For each pending task:**
   - Show which task is being worked on
   - Make the code changes required
   - Follow project code style and directory structure
   - TypeScript first with complete type definitions
   - Components follow React single responsibility principle
   - Use Web Crypto API for encryption-related logic
   - Keep changes minimal and focused
   - Mark task complete in the tasks file: `- [ ]` → `- [x]`
   - Continue to next task

   **E2E Test Requirements:**
   - Read existing test cases in `e2e/` directory for reference
   - Add/modify test files in `e2e/tests/` corresponding directory
   - Use selector constants from `e2e/helpers/selectors.ts`
   - Use storage helpers from `e2e/helpers/chrome-storage.ts`
   - Use extension fixture from `e2e/fixtures/extension.ts`

   **Ensure:**
   - `npm run build` succeeds before proceeding to testing

   **Pause if:**
   - Task is unclear → ask for clarification
   - Implementation reveals a design issue → suggest updating artifacts
   - Error or blocker encountered → report and wait for guidance
   - User interrupts

7. **Phase 2: E2E Test Validation**

   After all tasks are implemented, use **Task tool** with `subagent_name: "通用资深测试"` for validation.

   **Test Agent Prompt Template:**

   ```
   You are the test lead for the Encrypted Bookmark project. Validate the implementation quality.

   ## Test Tasks
   1. Read the proposal: `openspec/changes/<name>/proposal.md`
   2. Read E2E test plan: `e2e/README.md`
   3. Check new/modified E2E test files, evaluate coverage
   4. Build and run E2E tests: `npm run test:e2e`
   5. Analyze results:
      - If all pass → output test report, ready for archive
      - If failures → record failure details and reproduction steps, return to Phase 1

   ## Output Requirements
   - Test coverage evaluation
   - Test execution results (pass/fail/skip)
   - Root cause analysis and fix suggestions for failures
   ```

   **Handle Test Results:**
   - **All tests pass** → Proceed to step 8 (completion)
   - **Tests fail** → Return to Phase 1 with failure details (loop counter +1)

   **Retry Loop:**
   - Maximum 3 iterations of Phase 1 → Phase 2 loop
   - After 3 failed attempts, pause and report to user

8. **On completion or pause, show status**

   Display:
   - Tasks completed this session
   - Overall progress: "N/M tasks complete"
   - Test results: "X/Y tests passed"
   - If all done: suggest archive
   - If paused: explain why and wait for guidance

---

## Output During Implementation

```
## Implementing: <change-name> (schema: <schema-name>)

### Phase 1: Development
Working on task 3/7: <task description>
[...implementation happening...]
✓ Task complete

Working on task 4/7: <task description>
[...implementation happening...]
✓ Task complete

### Phase 2: E2E Test Validation
Running E2E tests...
✓ All tests passed (12/12)

All tasks complete! Ready to archive.
```

**Output On Test Failure (Retry Loop)**

```
## Test Validation Failed - Returning to Development

**Change:** <change-name>
**Attempt:** 2/3

### Failed Tests
- `e2e/tests/popup/bookmark.test.ts:45` - "should decrypt bookmark correctly"
  Error: Expected "decrypted" but got "null"
- `e2e/tests/options/import.test.ts:78` - "should import HTML bookmarks"
  Error: Timeout waiting for selector "#import-success"

### Root Cause Analysis
1. Decryption service not handling empty password case
2. Import flow missing async await for file processing

### Returning to Phase 1 for fixes...
```

**Output On Completion**

```
## Implementation Complete

**Change:** <change-name>
**Schema:** <schema-name>
**Progress:** 7/7 tasks complete ✓
**Tests:** 12/12 passed ✓

### Completed This Session
- [x] Task 1
- [x] Task 2
...

All tasks complete! All tests passed! Ready to archive this change.
```

**Output On Pause (Issue Encountered)**

```
## Implementation Paused

**Change:** <change-name>
**Schema:** <schema-name>
**Progress:** 4/7 tasks complete

### Issue Encountered
<description of the issue>

**Options:**
1. <option 1>
2. <option 2>
3. Other approach

What would you like to do?
```

---

## Guardrails

- Keep going through tasks until done or blocked
- Always read context files before starting (from the apply instructions output)
- If task is ambiguous, pause and ask before implementing
- If implementation reveals issues, pause and suggest artifact updates
- Keep code changes minimal and scoped to each task
- Update task checkbox immediately after completing each task
- Pause on errors, blockers, or unclear requirements - don't guess
- Use contextFiles from CLI output, don't assume specific file names
- **Run E2E tests after implementation** - never skip validation
- **Maximum 3 retry loops** for test failures before reporting to user
- **Security-related logic must be rigorous** (encryption, password, session management)

---

## Fluid Workflow Integration

This skill supports the "actions on a change" model:

- **Can be invoked anytime**: Before all artifacts are done (if tasks exist), after partial implementation, interleaved with other actions
- **Allows artifact updates**: If implementation reveals design issues, suggest updating artifacts - not phase-locked, work fluidly
- **Integrated testing**: E2E validation is built into the workflow, not a separate step

---

## Agent Role Mapping

| Phase                | Agent              | Responsibility                              |
| -------------------- | ------------------ | ------------------------------------------- |
| Phase 1: Development | `通用资深前端研发` | Implement features + E2E tests per proposal |
| Phase 2: Validation  | `通用资深测试`     | Run E2E tests, verify quality               |
