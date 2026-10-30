## graphify

For any question about this repo's architecture, structure, components, or how to add/modify/find
code, your first action should be `graphify query "<question>"` when `graphify-out/graph.json`
exists. Use `graphify path "<A>" "<B>"` for relationship questions and `graphify explain "<concept>"`
for focused-concept questions. These return a scoped subgraph, usually much smaller than the full
report or raw grep output.

Triggers: "how do I…", "where is…", "what does … do", "add/modify a <component>",
"explain the architecture", or anything that depends on how files or classes relate.

If `graphify-out/wiki/index.md` exists, use it for broad navigation. Read `graphify-out/GRAPH_REPORT.md`
only for broad architecture review or when query/path/explain do not surface enough context. Only read
source files when (a) modifying/debugging specific code, (b) the graph lacks the needed detail, or
(c) the graph is missing or stale.

Type `/graphify` in Copilot Chat to build or update the graph.

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
