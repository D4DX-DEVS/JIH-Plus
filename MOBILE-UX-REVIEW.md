# JIH Plus: mobile application design review

Review date: 7 September 2026. Implementation completed and production build verified on 7 September 2026.

## Implementation status

The recommended mobile-first direction is now implemented across the three portal shells and their active page families without changing API contracts, route permissions, report calculations or submission payloads. The production build and generated PWA service worker complete successfully.

| Requirement | Status | Implemented outcome |
|---|---|---|
| F01 / R01 | Complete | Shared dynamic-viewport shell, safe-area-aware headers/navigation and one marked content scroller replace fixed `h-screen` page shells. |
| F02 / R02 | Complete | Paginated forms scroll the owning content region and move focus to the new section start. |
| F03 / R03 | Complete | Shared Malayalam typography keeps primary labels at readable sizes; 12px remains limited to secondary metadata/navigation. |
| F04 / R04 | Complete | Short number fields use compact label-left/value-right rows; long controls remain full width and mobile tables use wrapped records. |
| F05 / R05 | Complete | IHTHISABI dashboard uses one current-report state and places the full schedule behind a labelled disclosure. |
| F06 / R06 | Complete | PWA update notice sits above bottom navigation, supports “Later”, and checks unsaved-work guards before reload. |
| F07 / R07 | Complete | Shared shell tokens, brand treatment, navigation, modal focus behaviour, metrics and responsive records are used across portal families while portal accents remain distinct. |
| F08 | Complete | Generated controls have stable labels, required/error relationships and grouped-choice semantics. |
| F09 | Complete | Rejection dialog traps/restores focus, supports Escape, locks background scrolling and announces validation errors. |
| F10 | Complete | Active mobile data tables use wrapped record cards; comparative tables retain explicit contained scrolling. |
| F11 | Complete | Denied routes provide deterministic permitted-dashboard and all-portals recovery links. |
| F12 | Complete | All login screens identify portal audience, credential type and recovery route consistently. |

Automated verification covers compilation, PWA generation and focused static checks. Physical iOS/Android keyboard, installed-mode and assistive-technology checks remain release-device QA items, not blockers falsely marked as tested here.

## Recommendation

Adopt one shared mobile application layout and component vocabulary across JIH Portal, IHTHISABI and Members. Keep each portal's role-specific destinations, permissions, form rules and data operations. Reuse the existing logo, Lucide icons, Malayalam font and compact metric components. Use portal colour as a restrained accent, while keeping navigation, spacing, field behaviour and status meanings consistent.

The current product has useful mobile improvements, but three independently styled layouts still behave differently. More global CSS overrides alone will not establish consistency. Consolidate deliberately, then migrate page families and validate each role.

## Evidence and limits

- EV-U01: User's annotated 378×748 screenshots: clipped names, nested padding, large report cards and unclear clickable menu rows. Historical screenshots are not proof of the latest state.
- EV-U02: Explicit requirement: readable Malayalam, maximum useful screen area, less scrolling, consistent app feel, unchanged functionality.
- EV-S01: Live 378×748 IHTHISABI user dashboard inspected during this review. Four compact metrics, current-quarter action, a second empty-submission explanation and a full quarter schedule are visible.
- EV-C01: `src/components/members/Layout.jsx:173–210`, `src/pages/DistrictDashboardPage.jsx:1187–1213`, `src/components/ihthisabi/Layout.jsx:483` — different page/scroll structures.
- EV-C02: `src/index.css:90–160,419–475`, `src/components/dashboard/DashboardMetricGrid.jsx:29` — shared fonts/tokens coexist with different label sizes and component sizing.
- EV-C03: `src/components/reportRenderer/DynamicFormRenderer.jsx:147–152,235–290`, `FieldRenderer.jsx:6–13`, `RowColumnField.jsx:44–55` — pagination scroll target and field width/layout rules.
- EV-C04: `src/components/PWAUpdatePrompt.jsx:27–39`, `vite.config.js:45–74` — reload action, fixed bottom overlay, network-only API and standalone manifest.
- EV-C05: `src/pages/ihthisabi/UserDashboard.jsx:500–529` — empty-state illustration, repeated guidance and expanded schedule.

Source paths are relative to `frontend/`. Code observations are source-verified; runtime consequences are inferred unless explicitly marked observed. Live browser opened IHTHISABI despite the supplied ambient district URL, so this review does not claim a fresh district interaction test. All-role login, installed-device keyboard behaviour, offline recovery and assistive-technology tests remain partial or not observed. No real submissions, deletions or permission changes were performed.

## Core journeys

| Portal | Main journey | Preserve | Improve presentation |
|---|---|---|---|
| JIH | Login → district/area/unit overview → reporting period → form → draft/submission | Existing scope, report rules, totals, permissions | Scope visible in header; concise period/status; full names; focused form |
| IHTHISABI | Login → role dashboard → quarter → report → status/history | Quarter availability, review stages, role switching | One next action; consistent tabs and status; optional schedule disclosure |
| Members | Staff/applicant entry → assigned application → details → review/status | Private applicant link, field requirements, review permissions | Clear entry choice; compact detail groups; consistent validation and save feedback |

## Strengths to preserve

Shared branding, bundled Noto Sans Malayalam, Lucide icons, visible labels, mobile metric grids, large input controls, fixed mobile navigation, wrapped names, draft support where already present, error focus in shared forms, and explicit PWA update prompting. These are a good base; rebuilding the product or changing business workflows is unnecessary.

## Prioritized findings and requirements

| ID / priority | Evidence and finding | User consequence | Recommended requirement / acceptance |
|---|---|---|---|
| F01 / P1 | EV-C01: independently implemented viewport and scrolling structures. Medium severity, high source confidence. | Inconsistent scroll/back behaviour and possible keyboard obstruction. | R01: one shared viewport contract using dynamic viewport height, a single primary content scroller and measured safe-area offsets. Verify focused last field and final action with keyboard open. |
| F02 / P1 | EV-C03: form pagination scrolls `window`, while several pages scroll an inner element. Medium severity, high source confidence; runtime effect inferred. | Next section can open away from its heading. | R02: focus the new section heading and scroll the actual content region; preserve values and validation. Test page 2 after scrolling page 1 to its end. |
| F03 / P1 | EV-C02: primary metadata still uses 11–12px variants alongside 14px labels. Medium severity, high source confidence. | Malayalam reading comfort varies by portal. | R03: semantic typography tokens; 14px primary labels, 16px entry text, 18–20px page title, 12px only secondary navigation/meta. Test long Malayalam and 200% text enlargement. |
| F04 / P2 | EV-C03: fixed input widths and two-column rules lack a shared density policy. Medium severity, high source confidence. | A dense form can become narrow instead of efficient. | R04: pair short related numeric fields only; long questions/addresses/uploads span full width. All controls max-width 100%; collapse pairs at narrow/zoomed widths. No change to form schema/order/calculations. |
| F05 / P2 | EV-S01 + EV-C05: repeated empty-submission messaging and expanded schedule. Medium severity, high confidence, observed. | Useful next step competes with redundant information and additional scroll. | R05: one compact empty state; schedule available through labelled disclosure; retain all dates and availability rules. Primary action visible in first phone viewport. |
| F06 / P1 | EV-C04: update prompt is fixed at bottom 16px and reloads on selection. Medium severity, high source confidence; dirty-form outcome untested. | Navigation may be covered; unsaved work needs explicit protection. | R06: put notice above navigation/safe area, allow later dismissal, and respect existing unsaved-work guards before reload. Test with edited forms without submitting data. |
| F07 / P2 | EV-U01 + EV-C02: local spacing/colour/active-state rules remain across portal layouts. Medium severity, medium confidence. | Users must relearn visual cues when changing portal. | R07: common AppHeader, BottomNav, BottomSheet, ActionRow, StatusBadge, MetricGrid and FieldGroup with portal accent parameter. Existing destinations remain unchanged. |

No P0 finding is established by this evidence. This is not a security, accessibility compliance or authentication certification.

### Independent review synthesis

Three lower-cost GPT-5.6 Luna reviewers inspected task flow/IA, accessibility/content, and visual/frontend consistency independently. The lead checked the important findings against source and inspected the live IHT dashboard. Reviewers did not run live-device tests or edit production. Their statements about lacking their own subagents describe their local sessions; this review did have three independent reviewers.

| ID / priority | Verified source evidence | Consequence and recommendation | Acceptance |
|---|---|---|---|
| F08 / P1 | `pages/ihthisabi/DynamicFormsUser.jsx:158`, `SubmissionForm.jsx:1219`: generated input questions appear as headings without associated input IDs/labels. High severity; high source confidence. | Screen-reader question context is missing. Extend the existing accessible-field pattern to these separate renderers. | Every generated control announces its question, requirement and error; entered values/payloads remain identical. |
| F09 / P1 | `components/modals/RejectionModal.jsx:35–75`: separate overlay lacks dialog semantics and reason/error association. High severity; high source confidence. | Rejection interaction is less accessible than existing shared modals. Migrate presentation to shared dialog while preserving required reason and callback. | Focus enters/stays/returns; reason error is announced; cancel and confirm retain current effects. |
| F10 / P1 | `index.css:883–890`: compact mobile table cells force nowrap/ellipsis. Medium severity; high source confidence. | Full text is not consistently available. Use wrapped record lists on mobile; comparative matrices may scroll explicitly with a visible cue. | Full location/name/status readable at 378px, no silent ellipsis; table relationships preserved. |
| F11 / P2 | `components/ihthisabi/ProtectedRoute.jsx:24–42`: denied page offers only history back. Medium severity; high source confidence. | Direct deep links have weak recovery. Offer a valid permitted dashboard destination while retaining the same guard. | Direct denied URL recovers without prior browser history; permission remains denied. |
| F12 / P2 | `pages/ExpansionPortalLoginPage.jsx:139`, `pages/ihthisabi/LoginPage.jsx:276`, `pages/members/LoginPage.jsx:73`: different login audiences/credential types. Medium severity; comprehension impact inferred. | Standardize the shell and explain audience/credential type, retaining separate authentication flows and private applicant access. | A user can identify portal, credential and return route before entering data. |

Reconciled findings: legacy 9/10/11px utility classes are already normalized to 12px by CSS, so they are not proof of actual 9px text. A three-metric layout with one full-width third card still has two rows; changing that alone does not demonstrate scroll reduction. Single-column charts are not equivalent to small metric cards and should not be forced into two columns. Native centred confirmations can remain appropriate; unify semantics and spacing rather than forcing every popup into a sheet. The fuzzy location-matching finding is a separate functional/data-context investigation; changing confirmation requirements would exceed this presentation-only brief. No change to that logic is proposed here.

## Proposed design standard

These values are design proposals, not measured usability outcomes.

| Element | Phone standard | Tablet / desktop adaptation |
|---|---|---|
| Page gutter | 12px; 8px for dense report content | 20–24px; constrained reading width |
| Spacing | 4 / 8 / 12 / 16 / 24px scale | Same scale; more room around sections |
| Typography | Noto Sans Malayalam at native size; 14–16px content; line-height 1.5–1.6 for Malayalam | Same readable base; headings can grow |
| Icons | Lucide, 20px actions, 22–24px navigation; consistent stroke | Same vocabulary |
| Touch actions | At least 44×44px; visible label for unfamiliar icons | Keep targets for touch tablets |
| Cards | 12–16px radius; one subtle border or shadow; 12px inner padding | 16px inner padding |
| Header | Compact title + scope + necessary action; safe-area-aware | Sidebar plus same scope/title vocabulary |
| Bottom navigation | 4–5 stable destinations; same active treatment; short labels | Sidebar replaces it at agreed breakpoint |
| Bottom sheet | 24px top corners; handle; title; close; separated action rows | Centred dialog where appropriate |
| Forms | One section surface; paired short values, full-width long fields; inline errors | More columns only where content allows |
| Scroll | One primary scroll area; no decorative minimum-height spacers | Nested scroll only for justified tables/panels |
| Motion | Short opacity/position transitions; reduced-motion support | No motion required to understand state |

Do not reduce font size merely to meet a scroll target. Do not use arbitrary truncation or hide necessary report details. A two-column layout is a tool, not a rule for every field.

## Annotated wireframe specification

Direction A: evolve the existing product. This specification is a review artifact, not a rendered or user-tested mockup.

### Dashboard, 378px width

```text
┌──────────────────────────────────┐
│ Logo  District dashboard  Account│  A1: persistent page + role/scope
│       ALAPPUZHA                  │
├──────────────────────────────────┤
│ [6 Areas →]     [53 Units →]     │  A2: 2×2 compact metrics
│ [1 Active →]    [1 Submitted →]  │
│                                  │
│ Current report                   │  A3: one primary task surface
│ Full period title wraps          │
│ Quarterly       Submitted        │
│ [Existing report action       →] │
│                                  │
│ Detailed statistics           ›  │  A4: secondary detail disclosure
├──────────────────────────────────┤
│ Home   Areas   Reports Alerts More│ A5: stable bottom navigation
└──────────────────────────────────┘
```

A1 → F01/F07/R01/R07. Show the existing role and scope without another large banner. A2 → EV-U02/F03: readable labels and numbers; only actionable metrics show an arrow. A3 → F05: retain actual report status and existing action semantics; never label submitted work as new submission. A4 → F05: preserve access to details while limiting initial scroll. A5 → F07: identical navigation treatment across portals with role-specific destinations.

### Report section, 378px width

```text
│ Back   Report / period           │
│ Section title — 2 of 5           │  B1: orientation and section focus
│ Full Malayalam question         │
│ Organisation                    │
│ Attendance      Leave           │  B2: short numeric pair
│ [       3 ]     [       3 ]      │
│ Absent                          │
│ [       3 ]                     │
│ Total                         9 │
│ Long question / explanation     │  B3: full width, natural wrapping
│ [                             ] │
│ [Previous] [Save draft] [Next]   │  B4: existing actions, reflow safely
```

B1 → F02; B2/B3 → F04; B4 → F01/F06. On 320px or enlarged text, pairs stack if they cannot retain readable labels and usable controls. Do not add duplicate fixed form actions over bottom navigation. Keep errors adjacent to fields and move focus to the first invalid field.

## States and functional preservation

Keep API endpoints, payloads, role guards, login credentials/session handling, report availability, validations, calculations, file uploads and submission transitions unchanged. Record baseline journeys before component migration. Reuse existing callbacks rather than changing their logic.

Loading must keep a stable layout; empty states show one relevant next step; errors retain entered values and show retry; disabled actions state the reason; success reflects confirmed server state. Permission-restricted actions retain existing restrictions. Deletion keeps existing confirmation. Offline API behaviour remains network-only: do not imply offline submission or add sensitive-data caching as a visual improvement. Test update/reload with unsaved edits. Keyboard focus must remain inside an open modal and return to its trigger when closed.

## Coverage scorecard

Scores are provisional source/design assessments, not measured user satisfaction.

| Dimension | Score / 5 | Confidence | Coverage |
|---|---|---|---|
| Visual consistency | 3 | Medium | Partial: shared CSS and three layout implementations |
| Mobile space efficiency | 3 | Medium | Partial: screenshots, live IHT dashboard, shared forms |
| Malayalam content legibility | 3 | Medium | Partial: source typography; no device reading study |
| Task clarity | 3 | Medium | Partial: primary flows/source; one live dashboard |
| Keyboard and accessibility | — | — | Not comprehensively tested |
| Offline/update reliability | — | Medium source evidence | Partial: config/prompt only |
| Functional equivalence | — | — | Not tested in this read-only review |

## Implementation roadmap and acceptance gate

1. Agree the shared design direction and baseline representative pages: portal selection/login, dashboard, list/detail, report form, sheet/dialog. Capture current behaviour and data operations.
2. Build shared layout, type/spacing tokens, navigation, sheet and status components. Migrate one representative page per portal before broader adoption.
3. Migrate remaining page families by role. Audit remaining hard-coded sizes, nested surfaces, duplicated titles and competing scroll areas. Preserve existing route maps and callbacks.
4. Validate each exposed role: JIH admin/district/area/unit; IHTHISABI admin and all roles configured in the app; Members staff/reviewer/applicant flows. An inaccessible account is marked untested, never passed.
5. Check 320, 378, 430, 768 and 1280px; portrait/landscape; 200% text; long Malayalam; five-digit counts; software keyboard; bottom safe area; keyboard focus; Android/iOS installed mode. Record screenshots and outcomes for every page family.

Success gates: no clipped essential labels, no page-level horizontal scroll, no action covered by navigation/keyboard, visible focus, no changed network payloads or status transitions, unchanged draft values after navigation, and one clear next action. Measure scroll distance and completion time before/after on the same fixture; target lower scrolling only where text and task success remain intact. Actual speed/scroll gains remain unmeasured.

Accessibility queue: full keyboard/dialog audit, chart text equivalents, contrast and enlarged-text tests. Privacy queue: preserve existing applicant-link/role restrictions; inspect any caching or update changes separately. User research queue: validate Malayalam vocabulary, preferred navigation labels and two-column field comprehension with representative users. No health/clinical workflow identified in scope.
