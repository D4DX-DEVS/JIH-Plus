# Mobile UI follow-up — 7 September 2026

This pass extends the recent user-requested presentation changes beyond the annotated Alternative Submission screen. Source searches covered active JSX pages/components across JIH, IHTHISABI and Members; this is not a claim of live testing every role or route.

| Surface family | Changes applied |
| --- | --- |
| IHTHISABI regular reports, both dynamic and legacy branches | Close control aligned inside report header, with reserved space instead of a viewport-floating button; existing unsaved-work confirmation retained. |
| IHTHISABI submission details | Close aligned to its own header with content clearance. |
| Shared report preview | Dynamic viewport limit, internal scrolling, wrapped title, labelled close button, dialog semantics and shared focus/scroll lock. |
| JIH confirmation, rejection, suggestion, notification details/create, error dialogs | Dim backdrops, mobile height constraints and readable title/close positioning where missing. |
| Members shared modal | Dynamic viewport limit, compact aligned header, wrapped footer actions and independent body scrolling; applies to consumers of the shared modal. |
| IHTHISABI member/profile/confirmation popups | Mobile viewport sizing, visible backdrop, wrapped header and close-control consistency. |
| Report section headers | Shared light mobile title treatment, readable wrapping; desktop styles retained. |

Existing shared white canvas, form spacing, compact number controls and mobile navigation remain in place. Full-page workflows are retained as pages; only existing popups receive popup presentation. Routes, API payloads, permissions and submission rules are not intentionally changed.

Validation: production build and PWA generation passed; whitespace checks passed. Source review covers these component families. Earlier live checks covered the Rukn dashboard, profile, quarter selector and Alternative Submission popup at phone width. Other role-specific popup states and physical-device keyboard testing are not individually verified.
