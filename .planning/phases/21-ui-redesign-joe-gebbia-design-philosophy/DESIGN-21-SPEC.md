# Phase 21: Design Specification
## UI Redesign — Joe Gebbia Design Philosophy

**Version:** 1.0
**Status:** Active
**Last Updated:** 2026-03-29

---

## Design Ancestry & Philosophy

This redesign is rooted in **three converging traditions**:

1. **Joe Gebbia's Design Lineage** — Trained in Bauhaus gospel under Charles and Ray Eames; applies their principle: "Create the best design for the most people for the least price. Democratize design for the masses."

2. **Bauhaus Minimalism** — "Less is more, but **only when it serves the human at the center**." Not for aesthetics. Every element earns its place through utility and clarity.

3. **Anthropic's Brand Restraint** — Pure typographic approach with single standout details (slash as code reference). No decoration. Every element must justify its existence.

### Core Mandate
**Remove everything unnecessary until only the essential remains, and then make that essential thing feel inevitable.**

This is a tool for serious self-reflection. Design must match that weight: calm, considered, expensive-looking without trying to look expensive.

---

## Design Principles (Not Suggestions)

### 1. Typography as Primary Tool

**Typography does the work. Not color. Not illustration. Not components.**

#### Implementation
- **Primary Typeface:** Serif (Fraunces or Playfair Display)
  - Educated, prestigious, trustworthy (aligned with health/coaching context)
  - Strong weight options (200-900) enable extreme contrast without size increases
  - Reference: Government design uses Instrument Serif; Anthropic uses Tiempos serif

- **Secondary Typeface:** Geometric sans (IBM Plex Sans or similar)
  - Neutral, lets content shine
  - Used only for labels, captions, interface text
  - Never the primary heading typeface

#### Extreme Weight Contrast (Required)
- **Headings:** 700–900 weight (bold, commanding presence)
- **Body text:** 400 weight (readable, calm)
- **Labels & UI text:** 200–300 weight (recedes, doesn't distract)
- **Contrast ratio minimum:** 2:1 visual weight difference between hierarchy levels

#### Size Jumps (Minimum 3x)
- H1 (page title): 48–56px
- H2 (section): 20–24px
- H3 (subsection): 16–18px
- Body: 14–16px
- Label: 12px
- **Never use incremental steps** (14px → 15px → 16px). Jump boldly.

#### Why Typography First
- Gives clear information hierarchy without relying on color coding
- Accessible by default (text scales; colors don't convey meaning alone)
- Emphasizes content over decoration
- Matches app's core value (conversational AI) — text is the interface

#### Design Test
Replace color palette with grayscale. Can you still understand the hierarchy, priority, and structure using only type weight and size? If no, restructure.

---

### 2. Color Palette — Almost Absent

**One background. One text color. One accent. That's all.**

#### Palette
- **Background:** Off-white or warm white (#f5f5f5–#fafaf8)
  - Warm off-white preferred (less clinical than pure white)
  - Rationale: Reduces eye strain, conveys warmth and accessibility

- **Text (primary):** Dark charcoal (#1a1a1a)
  - NOT pure black (#000000) — too harsh
  - Conveys seriousness without coldness

- **Accent (single):** Muted terra-cotta (~#a0644e) or muted navy (~#1a3a52)
  - Used ONLY for:
    - Active/selected state
    - Links (underlined, not colored text alone)
    - Micro-interactions that indicate state change
    - Never decorative

- **Disabled/Muted:** #737373 (text-muted)
  - For secondary text, disabled buttons, hints

- **Borders:** #e5e5e5 (subtle, minimal, only when structure requires)
  - 1px solid maximum
  - Thin. Muted. Present only where layout genuinely requires structure.

#### No Gradients, Ever
- Flat surfaces throughout
- Subtle shadows → removed entirely (no skeuomorphic depth)
- Color transitions are instant, not gradient

#### Why Almost No Color
- Forces content to carry meaning, not decoration
- Reduces cognitive load (users scan for type hierarchy, not color regions)
- Maintains focus on text/conversation (chat is primary)
- "Expensive feeling" comes from restraint, not variety

#### Design Test
Describe the page structure to someone using ONLY type hierarchy and whitespace. If you need to reference color to explain layout, restructure.

---

### 3. Whitespace is Structural

**Padding is generous to the point of feeling excessive. Then add more.**

#### Implementation Rules
- **Top/bottom padding on sections:** 60–80px minimum
  - Standard web pages: 20–40px. This feels excessive by comparison. Good.

- **Left/right padding on containers:** 40–60px minimum
  - Content width should feel narrow, not stretched

- **Gap between vertical blocks:** 40–60px minimum
  - Force visual pause between ideas

- **Inside card/container:** 32–48px padding
  - No crowded edges

#### The Magazine Test
Does the page layout resemble an editorial magazine spread (thoughtful breathing room, clear hierarchy, generous margins) or a dashboard (dense grids, packed information)? **It must resemble the magazine.**

#### Empty States
- Are not "blank" or "no results" states
- Centered typography saying "No conversations yet." with breathing room
- Single-color background (no gradients, no illustrations)
- Large, calm heading (H2/H3) in serif
- Optional: one-liner description in body text

#### Why Structural Whitespace
- Reduces decision fatigue (fewer things to process at once)
- Makes content scannable without effort
- Conveys "calm, considered" feeling (expensive feeling, not "trying" to look expensive)
- Matches Bauhaus principle of clarity through elimination

#### Design Test
If a screen feels crowded, **the answer is always to remove an element, never to compress spacing.** Cut scope; don't cut padding.

---

### 4. No Decorative Components

**Every element must earn its place. No decoration allowed.**

#### Removed Entirely
- Card shadows (trying to create depth)
- Rounded corners on cards (use only on buttons/inputs, and sparingly)
- Floating action buttons (FAB)
- Gradient text or background
- Icons used decoratively (only use icons for clarity, not aesthetics)
- Animations that "bounce" or "spin" unnecessarily
- Visual effects that don't serve function
- Emojis (NEVER)
- Color used solely for decoration (only for state or attention direction)

#### Borders
- Use thin, 1px solid borders only where structure genuinely requires them
- Muted color (#e5e5e5)
- Examples: form input borders, dividing sections if whitespace alone isn't enough
- Avoid: borders around cards, decorative lines, rounded border-radius for visual interest

#### Buttons
- Minimal: dark text on transparent background with 1px border
- Active state: background fills with accent color, text remains dark
- No shadow. No rounded corners (or very subtle, 2px max for functional affordance)
- Text (not icon-based) preferred; if icon used, must clarify action

#### Links
- Underlined by default (not just color)
- Color: accent color + underline
- Hover: underline remains, text weight may increase

#### Why No Decoration
- Clarity. Decoration creates visual noise.
- Focus. Users should see content/conversation, not UI chrome
- Professionalism. A health coaching app should feel trustworthy, not playful
- Accessibility. Decorative elements can confuse screen readers and keyboard navigation

#### Design Test
Remove all color from the page. Is it still clear what's clickable? What's a heading? What's content? If not, you've relied on color/decoration instead of structure.

---

### 5. Motion is Restrained and Purposeful

**One well-orchestrated transition per screen load. Nothing bounces or spins.**

#### Required Motion Rules
- **Page load:** Subtle fade-in of content (300–500ms) OR reveal via typography stagger
  - Fade recommended (simplest, calmest)
  - If stagger: heading fades first, body text follows (100–200ms delay)

- **User interactions:**
  - Micro-interactions only where they confirm action or indicate state
  - Examples: button press (subtle highlight), checkbox toggle (instant check), form submission (loading spinner)
  - Duration: 150–300ms max
  - Easing: ease-out (feels natural, not mechanical)

- **Never:**
  - Bounce animations
  - Spinning loaders (use pulse or text + loading bar instead)
  - Floating/wiggling elements
  - Parallax scrolling
  - "Delight" animations that distract from purpose

#### Chat Interface Motion
- Messages appear via fade-in (no slide)
- Typing indicator: simple pulsing dot (no animation bounce)
- New message: fade in at bottom, list auto-scrolls smoothly (no jump)

#### Why Restrained Motion
- Conveys calm, considered feeling
- Doesn't distract from content
- Accessible (reduces motion sickness for vestibular sensitivity)
- Professional (not playful or "trendy")

#### Design Test
A user should never be aware of motion. The transition should feel like the natural way content appears, not like a special effect.

---

## Application to Osmpsm Health Coach App

### Chat Interface (Primary)
- Messages in serif body text
- User message: standard left alignment, dark text on off-white background
- Assistant (osmPosm): same, right alignment, with weight/size distinction (label above in 200-weight "osmPosm")
- No bubble backgrounds, no avatars, no colored message containers
- Links in messages: underlined, terracotta accent color
- Typography hierarchy carries conversation flow, not visual containers

### Sidebar Navigation (if present)
- Single column, top-to-bottom
- Navigation items: serif H3 weight
- Active state: accent color + border-left (1px terracotta)
- No icons except user profile
- Generous spacing between items (40px vertical gap minimum)

### Dashboards (Today, Data, etc.)
- Single column on mobile, max-width 800px on desktop
- Large serif headings (H1: 48px, 800-weight)
- Data cards: no background color, just typography + subtle border if needed
- Charts: muted colors only (grays, single accent for key metric)
- No decorative stat card badges

### Forms (Login, Settings)
- Single column, centered
- Labels: 200-weight serif, dark charcoal
- Input fields: 1px border, #e5e5e5, no rounded corners
- Buttons: minimal (dark text, clear border, accent fill on hover)
- Error text: #d32f2f (red status), clear serif body

### Empty States (No conversations, no data)
- Centered on screen
- H2 heading in large serif (800-weight)
- One-line description (body text, 400-weight)
- Generous whitespace around text
- No illustration, no icon

---

## Verification Checklist

Before shipping any screen, verify:

- [ ] **Typography:** Is hierarchy clear using only weight/size? (Grayscale test)
- [ ] **Color:** Page uses only off-white, dark charcoal, and accent color? No gradients?
- [ ] **Whitespace:** Would this look at home in an editorial magazine? Excessive padding?
- [ ] **Decoration:** Every element serves function? No shadows, unnecessary corners, emojis?
- [ ] **Motion:** Max one transition per screen load? No bouncing/spinning?
- [ ] **Accessibility:** Clear without color? Readable at all sizes? Keyboard navigable?
- [ ] **First Impression:** Would a senior designer at Apple/Anthropic believe a world-class design team made this? Or does it feel "trendy" or "over-designed"?

**If you answer "no" to any question, redesign that element. Do not ship.**

---

## Canonical References

- [From Airbnb to the Oval Office: Joe Gebbia Takes Aim at the Bureaucratic Beast — Architect Magazine](https://www.architectmagazine.com/design/designing-democracy-joe-gebbias-bold-new-role-in-reimagining-the-u-s-government)
- [What Airbnb's Joe Gebbia owes to Charles and Ray Eames — Fast Company](https://www.fastcompany.com/90736433/what-airbnbs-joe-gebbia-owes-to-charles-and-ray-eames)
- [Geist — Anthropic Brand Design](https://geist.co/work/anthropic)
- [Building A Large-Scale Design System For The U.S. Government — Smashing Magazine](https://www.smashingmagazine.com/2017/10/large-scale-design-system-us-government/)
- [Improving Our Nation Through Better Design — The White House](https://www.whitehouse.gov/presidential-actions/2025/08/improving-our-nation-through-better-design/)

---

## Decision Framework

**When making any design decision, ask:**

1. "What would Joe Gebbia choose?"
2. "Does this element serve the user or just look good?"
3. "Can I remove this without losing meaning?"
4. "Does this feel calm and considered, or decorative?"
5. "Would someone believe a world-class design team made this?"

**If you answer no to #2–5, redesign.**

---

*This spec is not a suggestion. It is the foundation for all Phase 21 implementation decisions. Every page, component, and interaction must conform to these principles.*

*Design is not the look and feel. Design is the whole experience. Every interaction, every transition, every empty state is a design decision. Make them intentional.*
