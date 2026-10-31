# Agent Smith — starting point

## Owner's direction

Connect a repository or application, inventory the actual API providers, endpoints, packages and versions it relies on, link them to usage evidence, and keep a history of relevant changes. When an endpoint changes, a deprecation approaches, an outage occurs, or a security advisory or dependency change appears, determine whether this application is affected. Then either hand the investigation to the team's existing engineering agent or prepare and verify a repair end to end.

The ambition is an application that stays up to date automatically. That is a product direction, not a claim that every change can be safely repaired or deployed without a person.

This is a one-off hackathon on October 31, 2026, with a 4 PM Pacific (PDT; 23:00 UTC) submission deadline. Three people are working together: Ahmed, Haroon, and a third participant. CTO will be brought in by the owner. Names here do not assign work or grant permissions.

## Proposed architecture, not settled implementation

```text
Repository / manifests / call sites
                 |
                 v
       Inventory + usage evidence
                 ^
                 |                     provider docs / changelogs
                 |                     API schemas / status / advisories
                 |                                |
                 +---- applicability analysis <---+
                                  |
                     durable investigation case
                  evidence / progress / dedup / policy
                                  |
                  +---------------+----------------+
                  |                                |
       notify existing engineer          isolated repair + tests
                  |                                |
                  +----------- evidence + diff ----+
                                  |
                      approval / release policy
                                  |
                      approved delivery + verify
```

An outage may need an alert, waiting, or an already-approved fallback—not a code patch. A new endpoint may be optional. An advisory needs affected-version and usage evidence. A passing test does not prove production recovery.

### Tools we are considering

These are tentative roles, not verified adoption or a requirement to use every sponsor:

- **Terse:** a durable actor per investigation, retaining status, evidence references, attempts, deduplication and approval state.
- **Mastra:** investigation and repair agents/workflows.
- **Agent Relay:** structured agent handoffs; separate from this repository's human-readable coordination. Transport does not decide permission or release policy.
- **Freestyle:** an isolated computer/environment for reproducing and testing repairs. Isolation, network access and secret access still need an explicit design.
- **Supabase:** optional dashboard/authentication/queryable history. Avoid two competing authoritative copies of workflow state.

## Recommended first demo — proposal for team review

Use one language, one integration and one deliberately breaking change. A mock API changes `{stock: 7}` to `{available_quantity: 7}`. Find the affected adapter, demonstrate the original test failing, patch it, then rerun the same test and regression checks. Show the evidence, diff and approval gate rather than claiming a production auto-deploy.

Optional stretch: ignore an unrelated change correctly; deduplicate repeated events into one case; resume a case after restarting its actor. The recommendation is not a committed scope or an assignment.

## Decisions still needed

- Confirm product name and the shortest honest demo promise.
- Choose language, repo layout, integration and test command after inspecting actual code.
- Decide what inventory evidence distinguishes installed, used, planned and removed dependencies.
- Choose one source of truth for case state and the minimum agent handoff schema.
- Define autonomy: alert only, generate patch, open PR, or approved release. No automatic production authority is implied.
- Decide sandbox/network/secret boundaries and what the demo simulates.
- Agree the test contract: fixed expected application behavior, deterministic supplier fixtures, the identical before/after command, regression coverage and saved evidence. Do not weaken the assertion just to obtain a passing result.
- Let participants claim implementation ownership and agree who reviews repairs and accepts the demo.
- Confirm each participating agent's repository access and unique identity before it publishes changes.

Record accepted decisions in task files with the deciding person, date and rationale. Do not turn these questions into assumed answers.
