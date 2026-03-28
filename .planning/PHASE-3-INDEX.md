# Phase 3: Journal & Activity Editing — Complete Plan Index

**Start here.** This index points you to the right document for your needs.

---

## What You're Building

**Phase 3 Goal:** User can write/voice journal entries and edit parsed activities.

**Output:** Two new features fully integrated into the app:
1. **Journal Entries** — Text or voice narrative, reverse-chronological history
2. **Activity Editing** — Click timeline activity to edit name, duration, category; delete activity; gaps recalculate automatically

**Effort:** ~4–5 hours (3 hours dev + 1–2 hours testing)
**Timeline:** Days 2–3 (2026-03-29 to 2026-03-30)

---

## Document Guide

| Document | Purpose | Read If... |
|----------|---------|-----------|
| **PHASE-3-SUMMARY.md** | Big picture & context | You're new or need overview |
| **PHASE-3-PLAN.md** | Detailed task breakdown | You're about to start coding |
| **PHASE-3-QUICK-REFERENCE.md** | Code snippets & debugging | You're debugging or need copy-paste templates |
| **PHASE-3-DATA-FLOW.md** | Architecture & data flow | You need to understand system design |
| **PHASE-3-INDEX.md** | This file — navigation | You're lost or need to jump to a section |

---

## Quick Navigation

### "I'm just starting Phase 3. What should I do?"

1. **Read:** PHASE-3-SUMMARY.md (10 min)
   - Understand what you're building and why
   - See effort breakdown and task order
   - Check dependencies and prerequisites

2. **Start coding:** PHASE-3-PLAN.md, Task 3.1 (45 min)
   - Follow step-by-step implementation
   - Copy code examples directly
   - Test as you go

3. **Stuck?** Jump to PHASE-3-QUICK-REFERENCE.md
   - Search for your issue (Journal Form Not Saving? etc.)
   - Use debugging checklist
   - Copy code snippet to fix it

---

### "I need to understand how the system works"

→ **Read:** PHASE-3-DATA-FLOW.md

Includes:
- Complete flow diagrams (entry creation, editing, deletion)
- State architecture (what goes where)
- RLS & permission checks (security flow)
- Gap recalculation algorithm
- Error handling patterns

---

### "I'm debugging X"

→ **Go to:** PHASE-3-QUICK-REFERENCE.md, **Debugging Checklist** section

Search for your symptom:
- **"Journal entry doesn't save"** → Follow the checklist
- **"Activity edit fails"** → Follow the checklist
- **"Timeline doesn't refresh"** → Follow the checklist
- **"Voice input not working"** → Follow the checklist

---

### "I need code I can copy-paste"

→ **Go to:** PHASE-3-QUICK-REFERENCE.md, **Code Snippets** section

Includes minimal working versions of:
- JournalForm (form + voice)
- ActivityEditForm (edit modal + delete)
- Hooks and utils

---

### "I want to see what success looks like"

→ **Go to:** PHASE-3-PLAN.md, **Verification Checklist** section

Lists every feature that must work:
- Journal: create, display, persist, voice
- Activity editing: edit modal, save, refresh, gaps
- Integration: error handling, performance

---

### "I need a visual overview"

→ **Go to:** PHASE-3-QUICK-REFERENCE.md

Includes:
- Feature diagrams (user flows)
- Component tree
- Task execution paths (sequential vs. parallel)
- File reference (what to create/modify)

---

### "I'm done coding. How do I test?"

→ **Go to:** PHASE-3-QUICK-REFERENCE.md, **Testing Scenarios** section

Four complete test scenarios:
1. Create & persist journal entry
2. Edit activity duration
3. Delete activity & gap recalculation
4. Voice input failure fallback

Follow each scenario step-by-step.

---

### "I finished Phase 3. What's next?"

→ **Go to:** PHASE-3-SUMMARY.md, **Handoff Checklist** section

Verify all 5 tasks are complete, then start Phase 4 (Chat Analytics).

---

## Document Summaries

### PHASE-3-SUMMARY.md

**Length:** ~15 min read
**Contains:**
- What you're building (journal entries + activity editing)
- Why Phase 3 comes after Phase 2
- Effort breakdown (3 hours dev + 1-2 testing)
- Files you'll create/modify
- Task execution order
- Key technical decisions (already locked)
- Success criteria
- Common pitfalls & fixes
- Debugging workflow
- Handoff checklist for Phase 4

**Start here if:** This is your first time reading Phase 3 docs.

---

### PHASE-3-PLAN.md

**Length:** ~1 hour read/reference
**Contains:**
- Summary of phase
- 5 detailed tasks (3.1–3.5) with implementation steps
- Code examples for each component
- Dependency graph & task sizing
- Technical requirements & assumptions
- Data model reference
- Verification checklist
- Error handling strategy
- Risks & mitigations
- Integration points with other phases
- Code organization & structure
- Testing notes
- Success criteria
- Next steps

**Start here if:** You're ready to code. Follow Task 3.1, then 3.2, etc.

---

### PHASE-3-QUICK-REFERENCE.md

**Length:** ~30 min reference (not a continuous read)
**Contains:**
- Phase at a glance (goals, effort)
- Feature overview diagrams
- Component tree
- Task execution path (sequential vs. parallel)
- File reference table
- Database operations checklist (SQL examples)
- Code snippets (JournalForm minimal, ActivityEditForm minimal)
- Testing scenarios (4 complete workflows)
- Debugging checklist (troubleshoot common issues)
- Performance tips
- Rollback/undo plan
- Integration handoff to Phase 4
- Sign-off checklist

**Use this if:** You're coding and need quick references, debugging help, or code templates.

---

### PHASE-3-DATA-FLOW.md

**Length:** ~20 min read
**Contains:**
- High-level data flow (journal entry creation, activity edit, deletion)
- Component & state architecture
- State synchronization patterns
- Supabase RLS permission checks (INSERT, SELECT, UPDATE, DELETE)
- Error handling data flow
- Voice input data flow
- Gap recalculation algorithm (with examples)
- Data at rest vs. in transit

**Use this if:** You need to understand the system design, debug state issues, or understand security/RLS.

---

## Recommended Reading Order

### Option A: Start Coding ASAP

1. **5 min:** PHASE-3-SUMMARY.md — Context
2. **45 min:** PHASE-3-PLAN.md, Task 3.1 — Start building JournalForm
3. **As needed:** PHASE-3-QUICK-REFERENCE.md — Debugging & snippets
4. **After each task:** PHASE-3-PLAN.md verification checklist

### Option B: Understand First, Then Code

1. **15 min:** PHASE-3-SUMMARY.md — Big picture
2. **20 min:** PHASE-3-DATA-FLOW.md — Architecture
3. **30 min:** PHASE-3-PLAN.md, Task 3.1 — Start building
4. **As needed:** PHASE-3-QUICK-REFERENCE.md — Debugging

### Option C: Just Debug (Skip to the Problem)

1. **3 min:** This file (PHASE-3-INDEX.md) — You're here
2. **2 min:** PHASE-3-QUICK-REFERENCE.md, find your issue
3. **5 min:** Follow debugging checklist
4. **Copy-paste:** Code snippet to fix it

---

## Key Decisions (Already Locked)

These are NON-NEGOTIABLE:

- **Journal has no time association** → Text only, no datetime
- **Voice input uses Web Speech API** → Reuses Phase 2 hook
- **Activity editing via modal** → Not sidebar, not inline editing
- **Delete requires confirmation** → Prevents accidents
- **Gaps recalculate automatically** → No manual button
- **No pagination on journal history** → Load all entries upfront
- **No undo for deleted activities** → Add in Phase 7 backlog

---

## Critical Checklist

### Before You Start

- [ ] Phase 1 complete (Supabase project, auth working)
- [ ] Phase 2 complete (Timeline component, activities displayed)
- [ ] `.env.local` has `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- [ ] Dev server runs: `npm run dev`
- [ ] Can log in to the app

### Before You Commit

- [ ] All 5 tasks completed
- [ ] Journal entries persist
- [ ] Activities can be edited and saved
- [ ] Activities can be deleted
- [ ] Timeline refreshes after edit/delete
- [ ] Gaps recalculate correctly
- [ ] No console errors
- [ ] Tested on Chrome (or Edge/Safari)

### Before You Start Phase 4

- [ ] Phase 3 code committed to git
- [ ] All features verified working
- [ ] You understand the data model
- [ ] You're ready to query activities for Claude API

---

## Task Breakdown Quick Reference

| Task | Focus | Files | Effort |
|------|-------|-------|--------|
| 3.1 | Journal form + voice input | JournalForm.tsx, useWebSpeechAPI.ts | 45 min |
| 3.2 | Journal history display | JournalHistory.tsx | 35 min |
| 3.3 | Activity edit modal | ActivityEditForm.tsx, Timeline.tsx | 50 min |
| 3.4 | Delete activity | ActivityEditForm.tsx (add delete button) | 20 min |
| 3.5 | Timeline refresh + gaps | Timeline.tsx (integration) | 30 min |
| **Total** | | | **180 min (3 hours)** |

---

## File Reference

### Create These (New)

```
src/components/JournalForm.tsx              (Task 3.1)
src/components/JournalHistory.tsx           (Task 3.2)
src/components/ActivityEditForm.tsx         (Task 3.3)
src/pages/Journal.tsx                       (Task 3.1/3.2)
src/hooks/useWebSpeechAPI.ts                (Task 3.1, if not from Phase 2)
src/utils/timelineUtils.ts                  (Task 3.4)
```

### Modify These (Existing)

```
src/components/Timeline.tsx                 (Task 3.3/3.5: add click handler, modal)
src/App.tsx                                 (Task 3.1: add Journal route)
```

### No Changes Needed

```
.env.local                                  (Reuse from Phase 1)
src/lib/supabase.ts                         (Reuse from Phase 1)
src/store/authStore.ts                      (Reuse from Phase 1)
```

---

## Common Questions

### Q: Can I do Journal and Activity Editing in parallel?

**A:** Yes, if you have capacity. They're independent features:
- Tasks 3.1–3.2 (Journal) can run parallel with Tasks 3.3–3.5 (Activity)
- Task 3.5 (integration) depends on 3.3, so do those sequentially
- Recommended: Do sequentially (easier to manage, fewer merge conflicts)

### Q: Do I need to rewrite Timeline from Phase 2?

**A:** No. Just add:
- Click handler on activity elements
- State for `editingActivity`
- Conditional render of edit modal
- Refresh trigger on save

### Q: What if Web Speech API doesn't work in my browser?

**A:** Fallback to text-only input:
- Voice button should gracefully disable
- User can still type and submit
- Add to Phase 7 backlog: "Implement audio file upload fallback"

### Q: How do I test without creating 100 entries?

**A:** Create 3–5 test entries by hand, then test editing/deleting those.

### Q: What if RLS blocks my operations?

**A:** It's not a bug—it's a feature. Verify:
1. User is authenticated (`auth.uid()` is set)
2. RLS policy exists for that table & operation
3. `WHERE user_id = auth.uid()` is in the policy

If still blocked, check Supabase dashboard → Authentication → Policies.

### Q: Can I skip voice input for MVP?

**A:** Yes. Journal entries can be text-only. Add voice in Phase 7 if Web Speech API is unreliable.

---

## Support Resources

**Within this phase:**
- PHASE-3-QUICK-REFERENCE.md → Debugging checklists
- PHASE-3-DATA-FLOW.md → Architecture questions
- PHASE-3-PLAN.md → Detailed implementation steps

**Beyond Phase 3:**
- REQUIREMENTS.md → What the app needs to do
- PROJECT.md → Vision & constraints
- ROADMAP.md → Full 6-phase plan
- STATE.md → Current project state

**External:**
- Supabase Docs: https://supabase.com/docs
- React Docs: https://react.dev
- Web Speech API: https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API

---

## You Are Here

```
Phase 1: Backend Setup ✅
Phase 2: Voice & Timeline ✅
Phase 3: Journal & Editing 🚀 ← YOU ARE HERE
Phase 4: Chat Analytics
Phase 5: Design & Polish
Phase 6: Test & Deploy
```

**Progress: 50% of MVP complete after Phase 3.**

Next phase (4) adds chat analytics. Phase 5 makes it beautiful. Phase 6 ships it.

---

## Let's Build

**Ready to start?** Open PHASE-3-PLAN.md and start with Task 3.1: JournalForm.

**Got a bug?** Jump to PHASE-3-QUICK-REFERENCE.md, find your symptom, follow the checklist.

**Want architecture details?** Read PHASE-3-DATA-FLOW.md.

**Need context?** Start with PHASE-3-SUMMARY.md.

---

**Phase 3 is the inflection point. After this, your app can log, edit, and reflect. Then we make it beautiful and ship it.**

**Go build something great.**
