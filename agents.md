# AGENTS.md — what-do

Context for AI agents working on the **what-do** task management app (kanban board with notes, subtasks, themes, and CSV export).

## Project Snapshot

what-do is a task tracker featuring:
- Kanban-style boards with draggable cards
- Subtasks with progress tracking (e.g. `6/11` completion)
- Notes linked to tasks
- Light/dark theming with customization options
- CSV export/import of tasks

## Current Board State

### 🔵 Doing (1)

#### improving ui — `6/11`
Tags: `what-do`, `High`

- [x] fix sidepanel
- [x] add keyboard shortcuts button (`i`)
- [x] fix overlaps
- [x] optimise right sidepanel behaviour
- [x] add close (and close shortcut) to everything
- [ ] (optional) resizable side panels
- [ ] draggability in kanban mode and calendar — calendar moves should auto-update dates when a task is dragged between dates
- [x] browse for better monospace fonts
- [ ] subtask font color
- [ ] change messages on loading screen
- [ ] settings page?

### ⚪ To Do (6)

#### save subtasks as draft too
No subtasks yet.

#### change theme customisation options — `0/3`
- [ ] light/dark mode uncustomisable colours
- [ ] only custom features remaining will be font and accent colours
- [ ] theme options change font style and colour palette

#### fix note shortcut
No subtasks yet.

#### link notes to tasks feature
No subtasks yet.

#### add error message for 'task already exists' — `0/2`
- [ ] error toast upon name completion instead of after trying to save
- [ ] expand existing task with same name (or give an option to, or something — idk)

#### fix download csv — `0/2`
Note: known issue — **column mismatched**
- [ ] fix column mismatch
- [ ] add subtask list in csv

## Notes for Agents

- All tasks above are tagged `what-do` in the source board; keep that tag/label convention when creating or referencing tasks in code (e.g. seed data, fixtures, issue templates).
- Progress fractions (`x/y`) reflect subtask checklist completion, not code coverage or test status — don't conflate the two.
- "improving ui" is the active work item; prioritize UI/UX-related changes (sidepanel behavior, shortcuts, fonts, drag-and-drop, loading states, settings page) over backlog items unless directed otherwise.
- The CSV export bug ("column mismatched") should be treated as a defect, not a feature request — fix before extending CSV functionality (e.g. adding subtask lists to export).
