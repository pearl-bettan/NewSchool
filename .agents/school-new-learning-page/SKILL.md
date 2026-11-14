---
name: school-new-learning-page
description: Build the complete code (HTML, CSS, JS, Bootstrap RTL) of the responsive Hebrew instructional web page "מתכננים למידה לבוחן" for the client New School (Programming 3 midterm, stage 1, group 1). Use this skill whenever the user asks to create, extend, fix, refactor or review any file of this learning unit - the page, the 3-day study plan, the accordion explanations, the summary quiz and its feedback, the CSS, the JS modules, CREDITS.md or the accessibility notes - even if they only say "build the site", "add a section", "fix the quiz" or "make it responsive". The interactive activities are built as standalone iframe documents so they can be uploaded to an LMS. Also use it when preparing the code to be SCORM-ready in a later stage.
---

# New School - "מתכננים למידה לבוחן" - build skill

Follow this skill literally when generating or editing code for the project. When a rule here conflicts with a general habit, the rule here wins. When something is not specified, choose the simplest option that still satisfies the course requirements, and state the assumption in one line.

## 1. Project facts (do not change)

- Authoritative product sources: the group 1 client brief and the general stage 1 assignment requirements. The files in `disingFiles/` are teacher examples and explanations, not this product specification; do not import their graduation-project content, multi-page wireframe or visual identity into this unit.
- Client: New School (vocational school). Contact: Itai Rosen. Course: Programming 3, midterm stage 1.
- Audience: students preparing for a test who struggle to organize their own learning. They need simple examples and a clear working method.
- Topic: "מתכננים למידה לבוחן" (planning study for a test).
- Content must cover exactly three ideas: (1) a clear goal for a study session, (2) splitting study material into small tasks, (3) adding review and practice in the days before the test.
- Fixed illustrative case: a student with **3 days** to prepare for a test on **3 topics**.
- Required interactive component: a ready-made 3-day example plan, where the student opens short explanations of the choices (why the material was split this way, why review and practice were placed where they were).
- Optional (only if explicitly requested): a weekly planner with fixed blocks. Never build it by default.
- Summary form: checks whether the student identifies a clear learning goal and chooses useful preparation actions. Short feedback that explains the answer and points to improvement.
- Target duration: about 10 minutes. Keep text short; no section longer than ~80 Hebrew words.

## 2. Stack and hard rules

- HTML5, one external CSS file, vanilla JS (ES modules), **Bootstrap 5.3.3 RTL**.
- **Activities are iframes (hard requirement).** Both interactive activities (the 3-day plan and the summary quiz) are separate standalone HTML documents in `activities/`, embedded in `index.html` with `<iframe>`, so each one can also be uploaded to the LMS on its own. See section 6A.
- **Bootstrap is stored locally** in `assets/vendor/` (`bootstrap.rtl.min.css`, `bootstrap.bundle.min.js`), not loaded from a CDN, because LMS environments often block external hosts and a package must work offline. Mention the version and license in `CREDITS.md`. Same for the font: ship Heebo as local `.woff2` in `assets/vendor/` with `@font-face` (`font-display: swap`), keeping the system fallback stack.
- Hebrew, RTL: every page (including each activity file) starts with `<html lang="he" dir="rtl">`. Use `bootstrap.rtl.min.css`, never the LTR build.
- Fonts: Heebo, fallback stack `system-ui, "Segoe UI", Arial, sans-serif`.
- No other libraries without asking the user. No jQuery, no icon fonts. Icons are inline SVG with `aria-hidden="true"` or emoji paired with visible text.
- No inline `style`, no inline `onclick`. Use `addEventListener` and `data-*` attributes.
- Code comments in **English only**. Visible UI text in Hebrew.
- Names are meaningful English: `study-plan`, `quiz-feedback`, `renderQuestion`, `calculateScore`.
- No duplicated CSS rules or JS logic. If two things look alike, create one class or one function and reuse it.
- Never use `var`. Use `const` / `let`. Small single-purpose functions.
- Do not use localStorage. Keep state in memory (it is a 10-minute unit).
- Do not write the QA / decision tables or the AI-usage documentation text. The students write these in their own words. Only create the empty template files if asked.

## 3. File structure (create exactly this)

```
/
├── index.html                 (main page: content + iframes that embed the activities)
├── activities/
│   ├── study-plan.html        (standalone activity 1: 3-day plan, embedded as iframe)
│   └── quiz.html              (standalone activity 2: summary form, embedded as iframe)
├── css/
│   └── styles.css             (shared by the main page AND both activities)
├── js/
│   ├── main.js                (main page only: progress bar, iframe auto-resize, message listener)
│   ├── activity-bridge.js     (shared: sends height/score messages to the parent page)
│   ├── study-plan.js          (3-day plan rendering + explanations)
│   ├── quiz-data.js           (questions as data only)
│   ├── quiz.js                (render, validate, score, feedback)
│   └── utils.js               (tiny shared helpers, only if really reused)
├── assets/
│   ├── images/                (logo.svg, hero illustration)
│   ├── media/                 (optional video + .vtt captions)
│   └── vendor/                (local copy of Bootstrap RTL css + js bundle, see section 2)
├── CREDITS.md
└── README.md                  (how to run, structure, assumptions, how to zip for the LMS)
```

Load scripts at the end of `<body>` with `<script type="module" src="...">`. Bootstrap JS bundle loaded before it. Inside `activities/*.html` all paths are relative to that file (`../css/styles.css`, `../js/quiz.js`, `../assets/vendor/...`). Never use absolute paths (`/css/...`) because the LMS serves the package from an unknown folder.

If the user wants more pages, copy the same header/footer, change `<title>`, meta description, keywords and Open Graph per page.

## 4. Required page anatomy (`index.html`)

Order of elements, top to bottom:

1. `<head>`: `charset`, `viewport`, unique `<title>` = `New School – מתכננים למידה לבוחן`, `description`, `keywords`, `author`, `robots`, Open Graph (`og:title`, `og:description`, `og:type`, `og:locale` = `he_IL`), favicon, local Bootstrap RTL CSS (`assets/vendor/`), `css/styles.css`.
2. Skip link as the first element in `<body>`: `<a class="visually-hidden-focusable" href="#main-content">דלגו לתוכן הראשי</a>`.
3. `<header>` containing: logo (SVG, text "New School" visible), `<nav aria-label="תפריט ראשי">` with anchor links to the sections, and the intro (`<h1>`, one-sentence promise, badge "כ-10 דקות", CTA button "מתחילים" linking to `#step-goal`). Include a short learner instruction: read the three steps in order, open explanations in Noa's plan, then answer the quiz and read the feedback. Navbar collapses with the Bootstrap toggler (`aria-controls`, `aria-expanded`, `aria-label="פתיחת תפריט"`).
4. A sticky progress indicator below the header: `<div class="progress" role="progressbar" aria-label="התקדמות ביחידה" aria-valuenow aria-valuemin="0" aria-valuemax="100">` plus visible text "שלב X מתוך 5". Updated with IntersectionObserver in `main.js`. Do not announce it with `aria-live` (too noisy).
5. `<main id="main-content" tabindex="-1">` with these `<section>` elements, each with `aria-labelledby` pointing to its `<h2>`:
   - `#step-goal` - Step 1, clear goal (content block 1).
   - `#step-split` - Step 2, split into small tasks (content block 2, with accessible diagram).
   - `#step-review` - Step 3, review and practice (content block 3, with optional captioned video).
   - `#step-plan` - Interactive 3-day example plan: `<h2>`, one intro sentence, then the iframe `activities/study-plan.html` (section 6A).
   - `#step-quiz` - Summary form: `<h2>`, one intro sentence, then the iframe `activities/quiz.html` (section 6A).
6. `<footer>`: logo, copyright line (`© 2026 New School`), links to page sections, credits link (`CREDITS.md` text summary), course name.

Exactly one `<h1>`. Headings never skip levels. Every section has an `<h2>`.

## 5. Content blocks (Hebrew copy must be short and concrete)

### 5.1 Step 1 - clear goal (two comparison cards)
- Card "יעד מעורפל": "ללמוד לבוחן" with a ✗ icon and the label "פחות מועיל".
- Card "יעד ברור": "לסיים את נושא 1 ולפתור 5 תרגילים עד 19:00" with a ✓ icon and the label "מועיל יותר".
- One line below: a clear goal says what, how much, and by when.
- Cards use `row row-cols-1 row-cols-md-2 g-3`. Status is conveyed by icon + text, never color alone.

### 5.2 Step 2 - split into small tasks (accessible diagram)
- Inline SVG (or HTML/CSS boxes) showing one big topic splitting into 3 small tasks (example: "נושא 2" -> "לקרוא סיכום", "לסמן מושגים", "לפתור 3 שאלות").
- The SVG has `role="img"` with `<title>` and `<desc>`, and an adjacent visible text list that carries the same information, so the diagram is not the only carrier.

### 5.3 Step 3 - review and practice
- Short text explaining: review the previous day's material first, practice with questions on the day(s) closest to the test, leave the last day light.
- Optional video: `<video controls preload="none">` with `<track kind="captions" srclang="he" label="עברית">`. No autoplay. If no video asset exists, omit it; do not link external videos.

### 5.4 Fixed case used everywhere
Student: "נועה". Test in 3 days, three topics: **נושא א**, **נושא ב**, **נושא ג**. Topic names stay generic; do not invent a real school subject.

## 6A. Activities as iframes (required architecture)

Each activity is a complete, self-sufficient HTML document that works **both** embedded in `index.html` and opened/uploaded alone to the LMS.

### Activity document template (`activities/study-plan.html`, `activities/quiz.html`)
- Full document: `<!DOCTYPE html>`, `<html lang="he" dir="rtl">`, `charset`, `viewport`, its own meaningful `<title>` (e.g. `New School – תוכנית דוגמה לשלושה ימים`), description meta.
- Links: `../assets/vendor/bootstrap.rtl.min.css`, `../css/styles.css`. Scripts: `../assets/vendor/bootstrap.bundle.min.js`, then `<script type="module" src="../js/study-plan.js">` (or `quiz.js`).
- Body has a single `<main>` with an `<h1 class="visually-hidden">` (activity name) and the visible activity heading as `<h2>`-styled text is not needed; use the `<h1>` visibly if the file is opened alone. No header/footer/nav inside the activity (the main page owns them).
- Transparent/neutral background and no body min-height tricks, so it blends into the main page and does not create inner scrollbars.
- It must work with no dependency on `index.html`, on `main.js`, or on being inside a parent window.

### Embedding in `index.html`
```html
<iframe
  id="study-plan-frame"
  class="activity-frame"
  src="activities/study-plan.html"
  title="פעילות: תוכנית דוגמה לשלושה ימים - פתחו כל בלוק כדי לקרוא למה שובץ כך"
  loading="lazy"
  width="100%"
  height="600"></iframe>
```
- `title` is mandatory, in Hebrew, and describes the activity (WCAG 4.1.2 / 2.4.1).
- No `sandbox` attribute (an unsuitable sandbox breaks scripts or later SCORM API discovery). No `allowfullscreen` unless a video needs it.
- Add a visible fallback link under each iframe: `<a href="activities/study-plan.html" target="_blank" rel="noopener">פתיחת הפעילות בחלון נפרד</a>` (helps zoom/low-vision users and acts as the accessible alternative).
- CSS: `.activity-frame { width: 100%; border: 0; display: block; }`. Height is set by script (below), with the `height` attribute as a no-JS fallback.

### Auto-resize without inner scrollbars (same origin, `postMessage`)
- `js/activity-bridge.js` (loaded by each activity) sends the document height to the parent on load, on `ResizeObserver` changes, and after every accordion open/close and feedback render:
```js
// Send the current document height to the parent page (ignored when opened standalone).
export function reportHeight() {
  if (window.parent === window) return;
  window.parent.postMessage(
    { source: "school-new-activity", type: "resize", height: document.documentElement.scrollHeight },
    window.location.origin
  );
}
```
- `main.js` listens, validates `event.origin === window.location.origin` and `event.data.source === "school-new-activity"`, finds the iframe by `event.source` (loop over `.activity-frame` and compare `contentWindow`), and sets `iframe.style.height`. Setting height via JS `style` property is allowed (it is not an inline style attribute in the markup).
- Use `window.location.origin` for the target origin, never `"*"`. If `origin` is `"null"` (opened from `file://`), fall back gracefully: skip resizing and keep the default height.
- Reflow: at 320-360px width the activity must reflow without horizontal scroll inside the frame.

### Messages from the quiz to the parent page (optional, for the progress bar)
- After a completed submit, `quiz.js` sends `{ source: "school-new-activity", type: "quiz-result", points, maxPoints, percent, passed }`. `main.js` may use it to mark step 5 complete. Failure of this message must never break the quiz.

### Focus and keyboard with iframes
- Tab order goes naturally into the iframe and out of it; never trap focus.
- After submit, focus moves to the summary heading **inside** the iframe (`tabindex="-1"`), and the bridge scrolls the parent so the result is visible: send `{ type: "scroll-to-frame" }` and let `main.js` call `iframe.scrollIntoView({ block: "start" })` (respect reduced motion).
- Each iframe has its own `aria-live` regions inside the activity document, because live regions do not announce across frames.

### SCORM readiness with iframes (stage 2, do not implement now)
- The LMS will launch the page that holds the activity. SCORM API discovery walks up the `window.parent` chain, so keep the structure simple: one level of iframe, no sandbox, same origin.
- Keep scoring in `quiz.js` as pure functions and call a single hook `reportToLms(score)`, stubbed with a `// TODO (stage 2)` comment in `quiz.js` (the quiz owns the score, so the stub lives there, not in `main.js`).
- Packaging: README must explain how to zip. For an LMS upload of a single activity, zip the whole project folder (the activity needs `css/`, `js/`, `assets/`), with `index.html` or the chosen activity at the root as the launch file.

## 6. Interactive component - the 3-day plan (`study-plan.js`, inside `activities/study-plan.html`)

Data-driven. Define the plan as an array of days, render with a single `renderDay()` function. Do not hand-write three similar HTML blocks.

```js
// Plan data: each block has a type (learn | review | practice), a topic and an explanation.
export const STUDY_PLAN = [
  { day: 1, label: "יום 1", blocks: [
    { id: "d1-b1", type: "learn",    topic: "נושא א", task: "קריאת סיכום וסימון מושגים", minutes: 30,
      why: "מתחילים בנושא הכבד ביותר כשהריכוז גבוה. המשימה קטנה ומוגדרת, לכן קל להתחיל." },
    { id: "d1-b2", type: "practice", topic: "נושא א", task: "פתרון 5 שאלות", minutes: 20,
      why: "תרגול מיד אחרי הלמידה מראה מה באמת הובן." }
  ]},
  { day: 2, label: "יום 2", blocks: [
    { id: "d2-b1", type: "review",   topic: "נושא א", task: "חזרה קצרה על המושגים", minutes: 15,
      why: "חזרה למחרת מחזקת את הזיכרון לפני שעוברים הלאה." },
    { id: "d2-b2", type: "learn",    topic: "נושא ב", task: "קריאה ומיפוי הרעיונות", minutes: 30,
      why: "נושא חדש בא אחרי חזרה, כדי לא לשכוח את מה שנלמד." },
    { id: "d2-b3", type: "practice", topic: "נושא ב", task: "פתרון 5 שאלות", minutes: 20,
      why: "אותו דפוס בכל נושא: למידה ואז תרגול." }
  ]},
  { day: 3, label: "יום 3", blocks: [
    { id: "d3-b1", type: "learn",    topic: "נושא ג", task: "למידה של הנושא האחרון", minutes: 30,
      why: "הנושא הקל ביותר נשאר ליום האחרון, כדי לא להגיע לבוחן עייפים." },
    { id: "d3-b2", type: "review",   topic: "נושאים א + ב + ג", task: "חזרה מהירה על הכול", minutes: 25,
      why: "חזרה כוללת ביום האחרון מחברת בין הנושאים." },
    { id: "d3-b3", type: "practice", topic: "נושאים א + ב + ג", task: "שאלות מעורבות", minutes: 20,
      why: "שאלות מעורבות מדמות את הבוחן עצמו." }
  ]}
];

// Visual and textual identity per block type (never color alone).
export const BLOCK_TYPES = {
  learn:    { label: "למידה", icon: "📖", cssClass: "block--learn" },
  review:   { label: "חזרה",  icon: "🔁", cssClass: "block--review" },
  practice: { label: "תרגול", icon: "✏️", cssClass: "block--practice" }
};
```

Rendering rules:
- Container: `<div class="row g-3" id="study-plan">`. Each day is `<div class="col-12 col-lg-4"><article class="plan-day">`.
- In RTL, the first column (day 1) appears on the right automatically. Do not reverse the order manually.
- On mobile the days stack vertically (day 1 first). Use `order` utilities only if the logical order breaks.
- Each block is a Bootstrap **accordion item** (one accordion per day). The button text contains: icon, type label, topic, task, minutes. The collapse panel holds the `why` explanation under a visible label "למה?".
- Each accordion has a unique id per day; use `data-bs-parent` so one block is open at a time per day.
- Optional small extra interaction: a button "הצג/י את סוגי הבלוקים" that toggles a legend (learn / review / practice). Not required.
- Buttons are real `<button>` elements. Keyboard: Tab, Enter, Space work natively through Bootstrap. Keep the visible focus style.
- No animation longer than 200ms. Respect `prefers-reduced-motion`.

## 7. Summary form (`quiz-data.js`, `quiz.js`)

Requirements covered: at least 2 question types, at least 2 different field types, feedback for missing, validation error, correct, partially correct, wrong.

### 7.1 Questions (data only, in `quiz-data.js`)

| # | Type | Field | What it checks | Scoring |
|---|------|-------|----------------|---------|
| Q1 | `single` | radio group | Which of 3-4 goals is clear (what + how much + by when) | 1 or 0 |
| Q2 | `multi` | checkbox group | Which actions are useful in the 24 hours before a test | partial credit |
| Q3 | `order` | one `<select>` per position (no drag and drop) | Order a day's tasks: learn, practice, review of previous material first as designed | partial credit by correct positions |
| Q4 | `single` | radio group | Identify a small task with a defined action and finish, e.g. solving 3 questions on topic B, versus vague tasks | 1 or 0; explain action and scope, never prescribe an ideal number of tasks |
| Q5 | `goal` | action `<select>`, quantity `<input type="number" min="1" step="1">`, deadline `<input type="time">` | Build a goal using the taught components: what, how much, by when | require all fields; validate a positive whole quantity and a valid time; a concrete action plus quantity and deadline earns full credit; a vague action with quantity and deadline earns 2/3 and action-specific feedback |

Q5 uses labelled select, number and time fields, in addition to the radio, checkbox and select fields in the other questions. Do not assess an arbitrary preferred task count, a minimum text length or keyword matches in free text. A valid quantity is not graded by its size: the learner chooses a feasible scope. Keep the action choices bounded (for example, solving questions on topic A, reading summary pages on topic B, and the vague alternative "ללמוד לבוחן") so feedback evaluates the taught distinction without claiming natural-language understanding. Keep all five unless the user asks to trim; if trimmed, keep at least two question types and two field types.

Data model for each question:

```js
{
  id: "q1",
  type: "single",             // single | multi | order | goal
  prompt: "...",              // Hebrew
  options: [{ id: "a", text: "..." }],
  correct: ["b"],             // ids, ordered ids for "order", or concrete action ids for "goal"
  maxPoints: 1,
  feedback: {
    correct: "...",           // short, explains WHY
    partial: "...",           // says what was right and what to improve
    wrong: "...",             // explains the idea, points to the relevant step (e.g. "חזרו לשלב 1")
    missing: "..."            // asks to answer before moving on
  }
}
```

### 7.2 Logic (separation of concerns - important for SCORM later)

- `quiz.js` exports pure functions that take answers and return results, with no DOM access:
  - `evaluateQuestion(question, answer)` -> `{ status: "correct" | "partial" | "wrong" | "missing" | "invalid", points, message }`
  - `calculateScore(results)` -> `{ points, maxPoints, percent, passed }`
- DOM code lives in separate functions: `renderQuiz()`, `readAnswer(questionEl)`, `showFeedback(questionEl, result)`, `showSummary(score)`.
- Pass threshold constant: `PASS_PERCENT = 60`. Keep it in one place.
- The next stage will call something like `reportToLms(score)`. Add an empty documented stub `// TODO (stage 2): SCORM reporting hook` in `quiz.js` (the quiz lives in its own iframe document and owns the score), but do not implement SCORM now.
- The quiz is the standalone document `activities/quiz.html` (see section 6A). It must work when opened alone and when embedded, and after each submit it calls `reportHeight()` from `activity-bridge.js`.
- The form uses `novalidate` and custom validation so Hebrew messages are controlled. The submit button text: "בדיקת תשובות". A "נסו שוב" button resets everything.

### 7.3 Feedback states (all required)

| Status | When | Visual | Text starts with |
|--------|------|--------|------------------|
| `missing` | no answer | warning alert | "⚠ לא נבחרה תשובה." |
| `invalid` | field fails validation (non-positive or fractional quantity, malformed deadline) | danger-outline alert, field gets `aria-invalid="true"` and `aria-describedby` | "⚠ יש לתקן:" |
| `correct` | full points | success alert | "✓ נכון." |
| `partial` | some points | info/warning alert | "◐ כמעט." |
| `wrong` | zero points | danger alert | "✗ לא מדויק." |

- Feedback is visible text with an icon, never only color.
- Each question has its own feedback container: `<div class="quiz-feedback" id="q1-feedback" aria-live="polite"></div>`, created in HTML before content is injected (live regions must exist beforehand).
- After submit, move focus to the first question that needs fixing (missing/invalid); if all are valid, move focus to the summary heading (`tabindex="-1"`).
- Summary block: total score, percent, one short message by band (e.g. 0-39 / 40-79 / 80-100), and a list of steps to revisit (links to `#step-goal`, `#step-split`, `#step-review`) for the questions that were not fully correct.
- Wrong/partial feedback must always explain and direct to improvement, as the client requested. Never just say "wrong".

### 7.4 Form markup rules
- Each question is a `<fieldset>` with `<legend>`. Single/multi/order questions use `fieldset`; every goal field has its own `<label for>`. A goal answer is `{ action, quantity, deadline }`. Identify the missing/invalid goal field in the result so the UI can focus and mark that field.
- Required fields marked with visible text "(חובה)" and `required` attribute logic handled in JS.
- Radio/checkbox use Bootstrap `form-check`; selects use `form-select`; labels never rely on placeholder only.
- Touch targets at least 44x44px.

## 8. CSS rules (`css/styles.css`)

- One file, ordered with comment headers: `/* 1. Variables */`, `/* 2. Base */`, `/* 3. Layout */`, `/* 4. Components */`, `/* 5. Utilities */`, `/* 6. Media queries */`.
- Use CSS variables in `:root` and override Bootstrap variables where possible instead of rewriting components. Do not duplicate what Bootstrap already provides.

```css
:root {
  /* Brand colors (all text/background pairs must reach 4.5:1) */
  --color-primary: #0b3d91;
  --color-primary-dark: #082c68;
  --color-accent: #0f766e;
  --color-highlight: #fcd34d;
  --color-bg: #f7f9fc;
  --color-surface: #ffffff;
  --color-text: #1b2430;
  --color-muted: #4a5568;
  --color-border: #d5dde8;

  /* Block types: each also has an icon and a text label */
  --color-learn: #0b3d91;
  --color-review: #0f766e;
  --color-practice: #b45309;

  /* Typography and spacing */
  --font-base: "Heebo", system-ui, "Segoe UI", Arial, sans-serif;
  --font-size-base: 1.125rem;
  --line-height-base: 1.7;
  --radius: 0.75rem;
  --space-section: clamp(2rem, 5vw, 4rem);

  /* Bootstrap overrides */
  --bs-body-font-family: var(--font-base);
  --bs-body-font-size: var(--font-size-base);
  --bs-body-line-height: var(--line-height-base);
  --bs-body-color: var(--color-text);
  --bs-body-bg: var(--color-bg);
}
```

- Visible focus: `:focus-visible { outline: 3px solid var(--color-primary); outline-offset: 3px; }` (and a light variant on dark backgrounds).
- `@media (prefers-reduced-motion: reduce)` disables transitions and smooth scroll.
- Use logical properties (`margin-inline-start`, `padding-inline`, `text-align: start`) instead of left/right, so RTL stays correct.
- Sticky progress bar: `position: sticky; top: 0; z-index: 1020;` and `scroll-margin-top` on sections so anchors are not hidden.
- Mobile-first: base styles for 360px, then `@media (min-width: 768px)` and `@media (min-width: 1200px)` only when Bootstrap utilities are not enough.

## 9. Responsive behavior (acceptance targets)

| Width | Behavior |
|-------|----------|
| 360px | Single column. Navbar collapsed. Plan days stacked (day 1 first). Full-width buttons. No horizontal scroll. |
| 768px | Goal comparison cards and diagram + text in two columns. Plan days stacked or 2+1, whichever keeps day order readable. |
| 1200px | Plan in 3 columns (day 1 on the right). Intro in two columns (text + illustration). Content max width ~1140px. |

Rules: the content order in the DOM equals the logical reading order. Images use `img-fluid`. Wide content never forces body scroll. Tables (if any) wrapped in `.table-responsive`.

## 10. Accessibility (WCAG 2.1 AA)

Build these in from the first draft:
- Semantic landmarks: `header`, `nav`, `main`, `section`, `footer`. `nav` has `aria-label`.
- Skip link, one `<h1>`, logical headings, `lang="he"`.
- Alt text: meaningful images get a concise Hebrew `alt`; decorative images get `alt=""`.
- Contrast: text 4.5:1, large text and UI borders 3:1. Verify the palette when changing colors.
- Keyboard: everything reachable and operable; no keyboard traps; visible focus.
- Status is never color alone. Icons are `aria-hidden="true"` when text is next to them.
- Form: labels, `fieldset/legend`, `aria-invalid`, `aria-describedby`, `aria-live="polite"` on feedback.
- Video (if used): captions, no autoplay.
- Zoom to 200% and text spacing must not break the layout.
- If a component cannot meet WCAG, add a code comment `// ACCESSIBILITY NOTE: <reason> | Alternative: <accessible alternative>` and mention it in the reply, so the students can put it in their booklet. Known case: drag-and-drop ordering is avoided on purpose in favor of selects.

## 11. Metadata per page

```html
<meta name="description" content="יחידת למידה קצרה של New School: איך מגדירים יעד, מחלקים חומר למשימות ומתכננים חזרה ותרגול לפני בוחן.">
<meta name="keywords" content="תכנון למידה, בוחן, משימות למידה, חזרה, תרגול, New School">
<meta name="author" content="New School">
<meta property="og:title" content="מתכננים למידה לבוחן | New School">
<meta property="og:description" content="יחידה של 10 דקות שעוזרת לדעת מאיפה להתחיל להתכונן לבוחן.">
<meta property="og:type" content="website">
<meta property="og:locale" content="he_IL">
```

Change title, description, keywords and Open Graph for every added page.

## 12. Copyright and credits

Create/update `CREDITS.md` every time a library, font, image, or media file is added:

| Item | Version | License | Link | Used for |
|------|---------|---------|------|----------|
| Bootstrap | 5.3.3 | MIT | https://getbootstrap.com | Layout, components |
| Heebo font | (Google Fonts) | OFL | https://fonts.google.com/specimen/Heebo | Typography |

- AI-generated images: add a row with the tool, model, date and the prompt the students used. If the students did not generate any, write "אין תמונות שנוצרו ב-AI" only if that is true. Ask when unsure.
- Do not fetch images from random sites. Prefer inline SVG that you draw.

## 13. Workflow when generating or editing code

1. Briefly state the plan (3-5 lines) before large changes.
2. Produce complete files, not fragments, when creating the project: `index.html`, `css/styles.css`, all JS modules, `CREDITS.md`, `README.md`. Every file must run without edits (open `index.html` through a local server, since ES modules do not run from `file://` in some browsers - mention this in README).
3. After the change, list the files touched and what changed.
4. Suggest test cases for each new component (user behavior and edge cases), for example:
   - Quiz submit with nothing selected -> `missing` on every question.
   - Q4: a concrete small task -> `correct`; a broad task -> `wrong`; no selection -> `missing`.
   - Q5: each blank field -> `missing` and focus that field; quantity 0, a fraction or non-number -> `invalid`; a malformed time -> `invalid`; a vague action with valid quantity/time -> `partial`; a concrete action with quantity 1 or 11 and valid time -> `correct` (no arbitrary upper bound).
   - Keyboard-only run through accordion and form.
   - Viewports 360 / 768 / 1200, plus zoom 200%.
   - Screen reader announces feedback once per submit (inside the iframe).
   - Each activity opened alone (`activities/quiz.html`, `activities/study-plan.html`) works with no parent page.
   - Iframe height follows content: open/close accordions, show feedback, resize the window; no inner scrollbar.
   - Tab into the iframe and out of it with the keyboard; no focus trap.
   - Activity paths work from a different folder (zip, unzip elsewhere, open) - no absolute paths.
   Offer them as suggestions only; the students document the results themselves.
5. Do not add features beyond this spec without asking. Ask a single question when a real decision is needed (for example, whether to add the optional weekly planner).

## 14. Final self-check before answering

- [ ] `lang="he" dir="rtl"` in the main page and in every activity file; local Bootstrap RTL build used
- [ ] Both activities are standalone files in `activities/`, embedded with `<iframe>` that has a Hebrew `title`, no `sandbox`, a fallback link, and auto-resize via `postMessage` (same origin, never `"*"`)
- [ ] All paths relative; the package works when unzipped in any folder
- [ ] Each activity has its own `aria-live` regions, `<title>`, and works alone
- [ ] Unique `<title>`, full metadata
- [ ] header (logo + nav with `aria-label` + intro), footer present
- [ ] At least 3 instructional content blocks, 1 interactive component (the plan)
- [ ] Quiz: >= 2 question types, >= 2 field types, all five feedback states; Q4 assesses a concrete task and Q5 assesses action + quantity + deadline, with no arbitrary task-count or free-text keyword scoring
- [ ] Feedback visible as text, inside `aria-live="polite"` regions
- [ ] No inline styles or handlers, no `var`, comments in English
- [ ] CSS variables used, no duplicated rules; JS has no duplicated logic
- [ ] Quiz scoring separated from DOM code (SCORM-ready)
- [ ] No horizontal scroll at 360px; logical order on all breakpoints
- [ ] `CREDITS.md` updated
- [ ] Accessibility exceptions (if any) marked with `ACCESSIBILITY NOTE`
