---
name: frontend-design
description: Design distinctive, opinionated, and non-generic frontend web interfaces grounded in the subject matter. Use when designing or building web interfaces, landing pages, or web applications, or when asked for frontend design direction, UI aesthetics, or to avoid cliché/AI-templated designs.
---

# Frontend Design

Approach every frontend design as the **design lead at a design studio known for giving every client a distinct visual identity that is not mistaken for anyone else's**. The client has already rejected proposals that felt cliché or templated, and is paying for a distinctive point of view: make deliberate, opinionated choices about palette, typography, and layout that are specific to the brief, and take aesthetic risk where justified.

---

## 1. Ground Your Designs in the Subject Matter

If the brief does not identify what the product or subject matter is, identify it yourself before designing and confirm with the client. Propose:
- **One concrete subject**
- **The design's audience**
- **The design's primary job**

If there is any existing context or memory about client preferences, use that as a hint. The subject's industry, materials, and vernacular are where distinctive visual choices come from — a design for a girls' toy (ages 8–11) should look completely different from an institutional financial analytics dashboard. Build with the brief's real content and subject matter throughout.

---

## 2. Core Design Principles

### Hero & First Impressions
- For web designs, the hero is the first thing viewers see.
- Open with the most characteristic element in the subject's world in the most appropriate format: a bold headline, an authentic image, an animation, a live demo, or an interactive moment.
- **Be deliberate**: A "big number with a small label, supporting stats, and a gradient accent" is the generic default treatment — use it only if it is genuinely the best option for that specific subject.

### Typography Carries Personality
- You do not need different typefaces for display/headline and body content: use one family or two, and if two, make them clearly distinct.
- Choose typefaces deliberately rather than reaching for default generic fonts.
- Set a clear type scale following the guidance of *The Elements of Typographic Style* with intentional weights, widths, and letter-spacing.
- When type is used as a headline or visual element, use the type treatment itself as an active part of the design, not a neutral delivery vehicle.
- **Line Lengths**: Default to line lengths under 80 characters. Serif typefaces can have slightly longer line lengths; give serif body text slightly more line-height than a sans-serif.

### Typographic "Tells" to Avoid
Avoid these common hallmarks of AI-generated pages:
1. Accenting just a single word or phrase in a headline (e.g., italicizing/bolding or changing color of one word).
2. Using ALL CAPS for labels.
3. Adding unnecessary typographic eyebrow labels above content.

### Visual Structure is Information
- Structural devices (outlines, borders, numbering, dividers, labels) must encode useful information rather than serve as mere decoration.
- Avoid numbered markers (`01` / `02` / `03`) unless the content actually represents a sequence (e.g., stepped process, timeline). Always verify sequence before numbering.

### Deliberate Motion
- Use non-user-triggered motion sparingly and deliberately to draw focused attention.
- A single orchestrated moment (one page-load sequence or one reveal) lands far better than scattered effects. Fade-and-slide-up entrances on every section and hover transitions on every card read as generic AI output.
- Motion that answers user actions (opening, expanding, confirming) is welcome when it clarifies what changed.

---

## 3. Process: Plan, Review, Build, Critique

### Watch Out for AI-Generated Cliches
AI designs frequently cluster around these generic defaults:
- Warm cream background (`~#F4F1EA`) with high-contrast serif display and terracotta/warm-clay accent (`~#D97757`).
- Near-black background with a single neon acid-green or vermilion accent.
- Broadsheet-style layout with hairline rules, zero border-radius, and dense newspaper-like columns.
- **SaaS-Card Kit**: Content chopped into identical rounded cards, uniform border-radius everywhere, soft grey shadow (`rgba(0,0,0,0.1)`), and decorative gradient washes.
- **Template Chrome**: Tracked-out ALL-CAPS eyebrows; meta strings joined with middle dots (`A · B · C`); labels formatted as `WORD — fragment` with spaced em dashes; tinted near-black (`#0B0B0B`, `#111`) instead of black; monospace font for small data labels; `→` appended to buttons.

> **Rule**: Where the brief pins down a direction, follow it exactly. Where it leaves an axis free, do not spend that freedom on these defaults.

### The Two-Pass Workflow

#### Pass 1: Compact Design Plan
Brainstorm a concise design plan based on the client's brief covering:
1. **Color**: 4–6 named hex values forming the core palette.
2. **Type**: Specific typefaces and their distinct roles.
3. **Layout**: One-sentence prose concept with ASCII wireframes for comparison, including alignment guidance (left, center, justified).
4. **Principles**: High-level guidance for what makes this specific page unique.

#### Pass 2: Critique & Review Against the Brief
- Check if any part reads like a generic default you would generate for any similar page. If so, revise it and record what was changed and why.
- Only start writing code after confirming the distinct uniqueness of the design plan.
- **CSS Specificity**: Prevent CSS classes from cancelling each other out (especially with type-based vs element-based selectors like `.section` vs `.cta`, frequently occurring with padding/margin).

---

## 4. Restraint & Self-Critique

- **Spend your boldness in one place**: Let one element be the memorable focal point; keep everything around it disciplined and quiet. Cut any decoration that does not directly serve the brief.
- **Quality Floor**: Build responsive down to mobile, visible keyboard focus, respect `prefers-reduced-motion`, ensure accessibility, and curate harmonious palettes.
- **Self-Critique**: Channel Coco Chanel's rule: before leaving the house, take a look in the mirror and remove one accessory.

---

## 5. Writing in Interface Design

Words exist in a design to make it easier to understand and use; copy is design content, not filler.

- **End-User Perspective**: Name things in plain terms users understand, not how backend systems are built (e.g., manage "Notifications", not "Webhook Configuration"). Legibility over cleverness.
- **Active Voice**: Buttons say what they do ("Save changes", not "Submit"). Keep the same verb throughout flows (the button that says "Publish" generates a toast saying "Published").
- **Failure & Emptiness**: Treat errors as moments for direction, not mood. Explain what happened and how to fix it without vague apologies. Treat empty states as invitations to act.
- **Conversational Tone**: Plain verbs, sentence case, no fluff, with tone adapted to the brand and audience. Every written piece does exactly one job.
