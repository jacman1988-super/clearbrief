# ClearBrief

A calm brief-review workspace for freelancers and small studios, built for the **Best Apps and Agents** track of the Nebius x NVIDIA Global AI Hackathon. New work started October 13, 2026.

A brief can ask for online purchases while excluding payments, or promise a delivery date before photos arrive. ClearBrief turns a selected brief into a review draft with source quotations. The person using it decides what to clarify or accept.

## What works

- English and Polish interfaces and fictional example briefs.
- A real server-side call to `nvidia/Nemotron-3_5-Lightning` through Nebius Token Factory.
- Requirement notes, question topics and possible conflicts, each with exact source quotations and line numbers.
- Local quote validation; a conflict must cite at least two different source lines. Invalid or incomplete output is rejected without an automatic retry.
- Individual review checkboxes and a JSON download containing the brief, notes, provenance and review selections.
- Editing or changing language clears old results and resets permission to send the text.
- An optional local notes mode that keeps source lines verbatim. This mode is explicitly **not AI**.

No messages are sent to clients, calendars changed, or commitments accepted.

## Run the test build

Requirements: **Node.js 22.19+**, a desktop browser, and a writable extracted folder. There are no npm dependencies, no Docker requirement and no model weights to download.

```sh
node build.mjs
node server.mjs
```

Open **http://127.0.0.1:8820/** manually in your browser. On Windows, double-click `Uruchom-ClearBrief.cmd` in File Explorer. Keep the console open. Use the literal loopback address; another hostname is rejected. If an automated browser navigation is rejected by the origin check, open the address manually. Do not disable the origin guard.

This default mode makes **no cloud requests**. Click **English**, then **Organize locally** to inspect the local notes and export workflow. The generated sibling `ClearBrief-demo.html` is a standalone local preview, with its cloud button disabled.

## Test real NVIDIA analysis

Live analysis requires the reviewer's **own working Nebius Token Factory account, active credits and API key**. The build does not contain a shared key or provide hosted inference. Nebius onboarding currently requires a bank card and its API is metered. A promotional balance does not itself establish a hard account spending cap. Do not create paid resources or top up a card to run the local notes mode.

1. Stop any ClearBrief server already using port 8820.
2. On Windows, double-click `Podlacz-Nebius.cmd`; otherwise run `node nebius-local.mjs` in an interactive terminal.
3. Confirm available free credits, then paste your API key into the hidden local prompt. The key stays in process memory and is never sent to the browser or saved in the repository.
4. Open the app manually, choose English or Polish, inspect the fictional brief and check permission to send that selected text to Nebius.
5. Click **Analyze with NVIDIA**. Inspect the source quotations and interpretation, then optionally mark reviewed items and download the JSON.

The selected text is sent to `https://api.tokenfactory.nebius.com/v1/chat/completions`. The rest of the app runs locally. No Nebius AI Cloud GPU, dedicated endpoint, fine-tuning job or other paid compute is provisioned.

### Request allowance and costs

A fresh installation allows **four total provider attempts**, including failures. Atomic local slots in ignored `private-attempt-budget/` are reserved before sending and survive server restarts. Concurrent local processes share those slots. Storage failure stops inference. Do not remove the slots or start another copy to bypass the allowance. The developer installation has already consumed all four attempts and will not make another model call.

Each attempt uses a fixed model, at most 10,000 input characters and 2,400 generated tokens, a 60-second timeout, one in-flight request, and **no automatic retries**. Explicit `chat_template_kwargs.enable_thinking=false` leaves the generation allowance for the visible draft. Cancellation after transmission can still consume tokens.

This is an **application attempt limit**, not a provider-enforced dollar cap. It does not control other apps, playground use, pricing changes or account billing. The app cannot inspect your balance or stop provider billing. Check your own account and current model prices before enabling it. No optional paid service is required by this source build.

## Actual validation on October 30, 2026

Four real provider attempts were made using fictional development examples:

| Attempt | Outcome | Observed result |
| --- | --- | --- |
| 1, English API | Rejected incomplete response | No automatic retry; actual token usage was not retained. |
| 2, English API | Complete validated response | 4 requirements, 1 question-category item, 1 conflict; 336 input + 328 output = 664 tokens. |
| 3, Polish browser | Complete validated response | 3 requirements, 4 question topics, 1 conflict; UI reported 866 total tokens. |
| 4, English browser | Complete validated response | 5 requirements, 2 question topics, 2 conflicts; UI reported 823 total tokens. |

The final English browser run found both the photo/deadline and purchase/payment conflicts. Earlier runs did not explicitly flag the timing conflict; some question-category titles are topics rather than complete questions. Exact quotations passing validation **do not establish semantic correctness, completeness or general accuracy**. These are small AI-assisted development examples, not an independent held-out benchmark or real customer evidence.

Sanitized evidence is in `evidence/`. Browser evidence is clearly identified as observed DOM, not a raw provider response. Download completion was confirmed by the participant; the automation could not independently read the downloaded file. Review-checkbox operation was demonstrated through browser automation, not independently evaluated human annotation.

## Verification

```sh
node --test core.test.mjs nebius.test.mjs attempt-budget.test.mjs server.test.mjs ui.test.mjs
```

**23 local checks passed** on October 30. They cover input bounds, invented citations, distinct conflict lines, export provenance, persistent allowance exhaustion, failure accounting, storage failure, fixed endpoint/model, thinking control, cancellation, sanitized failures, HTTP boundaries, stale results and consent reset. Injected transports and simulated DOM checks are separate from the actual provider/browser evidence above. Tests do not call Nebius.

## Architecture and privacy

`core.mjs` validates source quotations and creates local notes/exports. `nebius.mjs` constructs the bounded NVIDIA request and rejects invalid results. `attempt-budget.mjs` reserves persistent local attempts. `server.mjs` serves the bundled UI only on loopback and enforces Host, Origin, content type and request-size boundaries. `ui.mjs` implements bilingual review, consent, cancellation and invalidation.

Untrusted brief text is data, not tool instructions. The model has no browser, execution, messaging or account-management tools. This reduces the action surface; it does not prove resistance to every prompt-injection or interpretation failure. The selected brief still leaves the device when cloud analysis is explicitly requested. Use fictional or non-sensitive material for a demo. Downloaded JSON deliberately includes the selected source text.

The status endpoint reports configuration and remaining attempts; dated validation evidence records actual provider requests separately. No model credentials, billing details, private codes or account identifiers are included.

## License and assistance

MIT for this application's original code. NVIDIA models and Nebius services have their own terms; no weights are redistributed. Built solo with AI coding assistance and the participant's preference for calm, useful interfaces. The demo video is an explicitly labeled edit of authentic application captures with synthetic local English narration, not a continuous recording.

## Official references

- https://nebiusglobalaihackathon.devpost.com/rules
- https://nebiusglobalaihackathon.devpost.com/details/faqs
- https://docs.tokenfactory.nebius.com/quickstart
- https://docs.tokenfactory.nebius.com/other-capabilities/billing-new
- https://tokenfactory.nebius.com/api/public/models_info
- https://nebius.com/services/token-factory/models/nvidia-nemotron-models-inference
- https://docs.nvidia.com/nim/large-language-models/2.0.10/get-started/advanced/get-started-nemotron-3.5-lightning.html

