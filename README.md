# Forgeflow: Autonomous AI App Builder Workspace

Forgeflow is an AI application builder designed from the ground up to embody a modern, continuous coding workspace. Rather than adopting the dense, card-heavy visual language of traditional software dashboards, the application provides an uncluttered environment inspired by minimalist developer utilities and conversational programming interfaces.

---

## Architectural and Design Philosophy

The core architectural requirement is the elimination of unnecessary containers, bordered cards, colored agent badges, and heavy drop shadows. Hierarchy is established strictly through typography, negative space, subtle division lines, and muted monochrome iconography.

### Visual Palette and Typography Standards

| Token | Value | Functional Role |
| :--- | :--- | :--- |
| **Workspace Background** | `#0c0d0e` | Deep near-black matte surface devoid of gradients |
| **Surface Accent** | `#14151b` / `#1b1c23` | Subtle hover states, active file selections, and composer background |
| **Primary Typography** | `#f4f4f5` | High-contrast white headers and emphasized agent titles |
| **Secondary Typography** | `#d4d4d8` | Natural conversation text and code editor tokens |
| **Metadata & Borders** | `#71717a` / `#1d1e24` | Timestamps, technical traces, and minimal pane dividers |
| **Monochrome Icons** | Lucide React | Uniform white and zinc iconography across all agent roles |

Primary display and reading typography leverages **Plus Jakarta Sans**, while technical artifacts—including line numbers, command line interfaces, file paths, and network telemetry—render using **Geist Mono**.

---

## Workspace Architecture

The system functions as a unified workspace partitioned into purposeful, non-decorative operational zones:

1. **Narrow Navigation Sidebar**: Hosts the project brand, new project triggers, existing repositories, and credential settings. Active project selections receive a discreet surface highlight rather than an elevated card enclosure.
2. **Autonomous Agent Conversation Stream**: Serves as the primary operational surface. Messages stream naturally with progressive typewriter pacing.
3. **Collapsible Technical Disclosures**: Operational specifics—such as files modified, terminal outputs, HTTP requests, and stack traces—are concealed beneath a minimal `Technical details` disclosure link.
4. **Contextual Coding Environment**: Houses a hierarchical file tree, a tabbed code editor with line counts and search utilities, an interactive live preview simulator with integrated browser console and network panels, and an interactive shell terminal.
5. **Fixed User Composer**: Anchored near the workspace base, offering prompt inputs, attachment handlers, agent state indicators, and keyboard submission listeners.

---

## Autonomous Agent Team Workflow

Workflows progress autonomously through peer agent handoffs without requiring the user to manually trigger intermediate pipelines or inspect complex workflow graphs.

```
User Prompt ──> Planner Agent ──> Code Writer Agent ──> Preview Agent ──> Deployment Agent
                     │                    ▲                   │
                     │                    └── Error Handoff ──┘
```

When runtime errors occur during browser compilation or API authentication, the Preview Agent logs the error trace internally, summarizes the finding in natural language, and hands control back to the Code Writer Agent for corrective action. Upon successful validation, the Deployment Agent presents actionable decisions (such as generating `railway.toml` infrastructure configurations) through simple inline buttons.

---

## Responsive Implementation

On desktop and widescreen viewports, the application provides a balanced side-by-side arrangement featuring conversational guidance alongside the active code workspace. On mobile and narrow viewports, the interface automatically collapses the navigation sidebar into an off-canvas drawer and introduces lightweight viewport tabs (`Chat`, `Preview`, `Code`, `Term`), ensuring seamless accessibility regardless of screen size.
