## Current Board State

### 🔵 Doing (1)

#### improving ui — `7/11`
Tags: `what-do`, `High`

- [x] fix sidepanel
- [x] add keyboard shortcuts button (`i`)
- [x] fix overlaps
- [x] optimise right sidepanel behaviour
- [x] add close (and close shortcut) to everything
- [x] browse for better monospace fonts
- [x] draggability in kanban mode and calendar — calendar moves should auto-update dates when a task is dragged between dates
- [ ] (optional) resizable side panels
- [ ] subtask font color
- [ ] change messages on loading screen
- [ ] settings page?

### ⚪ To Do (5)

#### save subtasks as draft too
No subtasks yet. Note: `pendingSubtasks` state in AddTask exists but isn't persisted via `useDraft` — only form fields are currently saved.

#### change theme customisation options — `0/3`
- [ ] light/dark mode uncustomisable colours
- [ ] only custom features remaining will be font and accent colours
- [ ] theme options change font style and colour palette

#### fix note shortcut
No subtasks yet. Needs repro steps — keyboard handler logic looks correct on inspection (isTyping guard covers inputs/contentEditable).

#### link notes to tasks feature
No subtasks yet. Requires data model change: StickyNote/NotePayload need a task reference field.

#### add error message for 'task already exists' — `0/2`
- [ ] error toast upon name completion instead of after trying to save
- [ ] expand existing task with same name (or give an option to, or something — idk)

### ✅ Done

#### fix download csv — `2/2`
- [x] fix column mismatch (escape all fields, not just title)
- [x] add subtask list in csv

## Notes for Agents

- All tasks above are tagged `what-do` in the source board; keep that tag/label convention when creating or referencing tasks in code (e.g. seed data, fixtures, issue templates).
- Progress fractions (`x/y`) reflect subtask checklist completion, not code coverage or test status — don't conflate the two.
- "improving ui" is the active work item; prioritize UI/UX-related changes (sidepanel behavior, shortcuts, fonts, drag-and-drop, loading states, settings page) over backlog items unless directed otherwise.
- Settings page work should absorb theme customisation controls currently living in the usernav drawer (theme toggle, custom colors, email, delete account) rather than duplicating a separate surface.