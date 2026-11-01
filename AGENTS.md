# Project Instructions

## Project

Describe the project here.

## Execution Boundary

The project owner performs all installs, environment setups, and test runs personally.
Agents do not run them; they explain how, in detail.

1. Do not run installers, package managers, dependency installs, setup or bootstrap
   scripts, or test suites.
2. Do not change machine-level configuration: PATH, global tool or agent config, or
   anything outside this repository.
3. Instead, give complete step-by-step instructions: the working directory, the exact
   command, what success looks like, and what to do when a step fails.
4. Stop and wait for the owner to run the steps and report the output before continuing.
5. Reading, searching, and editing project files is still expected. When validation is
   needed, supply the commands for the owner to run; that is how rule 9 of the workflow
   below is satisfied.

This applies to every environment and every tool in this repository, including
graphify, ICM, Obsidian, and spec-kit.

## AI Agent Workflow

Any AI coding agent working on this project must:

1. Read this file before making changes.
2. Read relevant specifications before implementation.
3. Inspect the existing project before changing files.
4. Keep changes simple and focused.
5. Avoid unnecessary dependencies.
6. Avoid unrelated modifications.
7. Ask for approval before major architectural changes.
8. Never modify specifications without user approval.
9. Validate changes after implementation.
10. Report what changed and whether validation passed.

## Code Comments and Documentation

Write for the next reader: a teammate, or you in three months. English, matching the
existing project documentation.

**Comments**

1. Explain **why**, not **what**. If a comment is needed to say what the code does,
   rename or restructure the code first.
2. Give every exported function, type, hook, and API route a TSDoc/JSDoc block: purpose,
   parameters, return value, thrown errors, and side effects.
3. Comment non-obvious decisions and constraints: business rules (slot capacity,
   guardian consent for minors, payment states), date and timezone handling,
   third-party quirks, and workarounds.
4. Cite the source of a workaround — issue link, ADR, or exact error — instead of
   paraphrasing it.
5. Use `TODO(name): reason` for deferred work. A bare `TODO` is not acceptable.
6. No commented-out code and no stale comments. Delete dead code; git keeps the history.
   Update or remove a comment in the same change that invalidates it.
7. Never put secrets, credentials, or real participant or parent data in a comment.

**Documentation**

1. Long-form documentation lives in `docs/` (the Obsidian vault): decisions in
   `docs/decisions/ADR-0001-*.md`, architecture in `docs/architecture/`, milestone
   material in `docs/milestone-1/`.
2. Start every new note with frontmatter — `status`, `owner`, `milestone` — and link it
   from `docs/index.md` so Dataview queries keep working.
3. Keep one source of truth: requirements in `specifications.md` and the spec-kit
   artifacts, setup instructions in `README.md`, design rationale in the vault. Link
   between them instead of duplicating.
4. Update affected documentation in the same change as the code. A change that
   invalidates a document is incomplete until that document is fixed.
5. When adding a public API or module, document its purpose and usage in
   `docs/architecture/` and keep `README.md` accurate.
6. Do not commit generated or private material to the vault: `docs/graph/` and
   `docs/.obsidian/` are ignored, and meeting transcripts or client data do not belong
   in the repository.

## Specifications

Specifications are optional.

If the project contains specifications:

1. Read the relevant specification before implementation.
2. Treat the specification as the intended behavior.
3. Identify requirements relevant to the requested change.
4. Explain conflicts between the requested change and the specification.
5. Propose specification changes when necessary.
6. Do not modify specifications without explicit user approval.
7. Do not silently work around specification conflicts.
8. After approval, update the specification before or alongside implementation.

For small projects that do not require formal specifications, do not create a specification system unnecessarily.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

Rules:
- When graphify-out/graph.json exists, run `graphify query "<question>"` before your first grep, search or source-file read for a codebase question, and put this rule in every subagent prompt that explores code. Read raw files only for lines the graph or an earlier read already located. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
- A committed graphify-out/graph.json is rewritten whole on every build, so a large diff to it in a pull request is expected. Do not flag it as churn or suggest skipping the graph rebuild or its hooks.

<!-- icm:start -->
## Persistent memory (ICM) — MANDATORY

This project uses [ICM](https://github.com/rtk-ai/icm) for persistent memory across sessions.
You MUST use it actively. Not optional.

### Recall (before starting work)
```bash
icm.exe recall "query"                        # search memories
icm.exe recall "query" -t "topic-name"        # filter by topic
icm.exe recall-context "query" --limit 5      # formatted for prompt injection
```

### Store — MANDATORY triggers
You MUST call `icm.exe store` when ANY of the following happens:
1. **Error resolved** → `icm.exe store -t errors-resolved -c "description" -i high -k "keyword1,keyword2"`
2. **Architecture/design decision** → `icm.exe store -t decisions-{project} -c "description" -i high`
3. **User preference discovered** → `icm.exe store -t preferences -c "description" -i critical`
4. **Significant task completed** → `icm.exe store -t context-{project} -c "summary of work done" -i high`
5. **Conversation exceeds ~20 tool calls without a store** → store a progress summary

Do this BEFORE responding to the user. Not after. Not later. Immediately.

Do NOT store: trivial details, info already in this file, ephemeral state (build logs, git status).

### Memoirs (permanent knowledge graphs)
Use memoirs for durable, structured knowledge that outlasts individual memories.
```bash
icm.exe memoir create -n "my-memoir" -d "Description"   # create knowledge container
icm.exe memoir add-concept -m "my-memoir" -n "concept" \
-d "Dense definition" -l "type:decision,domain:arch" # add concept with labels
icm.exe memoir link -m "my-memoir" --from "a" --to "b" \
-r depends-on                                        # link concepts (relations:
# part-of, depends-on, related-to,
# contradicts, refines,
# alternative-to, caused-by,
# instance-of, superseded-by)
icm.exe memoir export -m "my-memoir" -f ai                # dump as LLM-ready markdown
icm.exe memoir search -m "my-memoir" "query"              # full-text search concepts
icm.exe memoir list                                        # list all memoirs
icm.exe memoir show "my-memoir"                            # stats + concept list
icm.exe memoir inspect --memoir "my-memoir" "concept"      # full definition + graph
icm.exe memoir refine --memoir "my-memoir" --name "concept" \
--definition "new text"                              # update concept (bumps revision)
```

### Other commands
```bash
icm.exe forget <id>                          # remove a memory by ID
icm.exe list --all                           # list all memories
icm.exe list --topic <name>                  # list memories in a topic
icm.exe update <id> -c "updated content"     # edit memory in-place
icm.exe health                                # topic hygiene audit
icm.exe topics                                # list all topics
```
<!-- icm:end -->
