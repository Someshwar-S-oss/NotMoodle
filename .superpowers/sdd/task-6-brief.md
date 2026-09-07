### Task 6: Interactive Drawers & Secondary Pages Polish

**Files:**
- Modify: `src/components/AssignmentDetails.tsx`
- Modify: `src/components/Drawer.tsx`
- Modify: `src/app/settings/page.tsx`
- Modify: `src/app/notifications/page.tsx`
- Test: `src/__tests__/DrawersAndSecondaryPages.test.tsx` (and run `npm test`)

**Interfaces:**
- Consumes: NextThemes (`useTheme`), Supabase user & notifications APIs, `Drawer`, `AssignmentDetails`.
- Produces: Polished sliding drawer experiences with clear status pills and escape key support; elevated settings page with visual theme segmented control, elevated calendar feed card, and Moodle sync card; tabbed notifications inbox with category tabs (`All`, `Unread`, `Deadlines`, `Grades`), relative timestamps, and friendly empty states.

**Global Constraints:**
- Preserve all existing Next.js App Router conventions and API route integrations.
- Maintain existing Supabase authentication and Moodle token synchronization logic.
- Ensure all color tokens support both Light mode and Dark mode with WCAG AA contrast compliance.
- Support `prefers-reduced-motion` for all new transitions and animations.
- Every task must be verified with `npm test` and `npm run build` or targeted component tests.

- [ ] **Step 1: Polish `src/components/AssignmentDetails.tsx` & `src/components/Drawer.tsx`**
- In `src/components/Drawer.tsx`:
  - Ensure backdrop blur (`backdrop-blur-md bg-background/60 dark:bg-background/70`), smooth slide animation, accessible close button with `aria-label="Close drawer"`, and keyboard `Escape` key dismissal.
- In `src/components/AssignmentDetails.tsx`:
  - Prominent status indicator at top:
    - If submitted: Sage green pill badge *"Submitted for grading"* with check icon.
    - If not submitted: Urgent amber/red pill badge *"Pending submission"* with remaining time countdown.
  - Due date & grading cutoff display in clean monospace / Clash Display hierarchy.
  - Attachment files rendered in elevated cards with file size, download icon, and hover highlight.
  - "Open in Moodle" primary action button with external link icon.

- [ ] **Step 2: Polish `src/app/settings/page.tsx`**
- Theme segmented controller:
  - Three visual buttons: `Light` (Sun icon), `Dark` (Moon icon), `System` (Laptop / Monitor icon) with active state highlighting.
- Google Calendar Sync card:
  - Clean card container with copy-to-clipboard button and real-time copied checkmark feedback.
  - 3-step illustrated setup guide with numbered badges.
- Moodle Connection card:
  - Active connection status badge (`Connected` in green or `Disconnected` in red).
  - Last synced timestamp or re-sync trigger button.

- [ ] **Step 3: Polish `src/app/notifications/page.tsx`**
- Filter tabs:
  - Segmented pills: `All` (count), `Unread` (count), `Deadlines` (count), `Grades` (count).
- Notification list items:
  - Type-specific icon badge (`Bell`, `Clock`, `Award`).
  - Unread indicator dot.
  - Relative timestamp (*"5m ago"*, *"2h ago"*, *"Yesterday"*).
  - Mark as read action button.
- Empty states:
  - When inbox or category is empty, render friendly editorial card with comforting copy (*"All clear — you're fully up to date!"*) and an ambient cloudy glow card.

- [ ] **Step 4: Add Unit/Integration Tests**
Create `src/__tests__/DrawersAndSecondaryPages.test.tsx` verifying:
- `Drawer` renders title, children, and responds to close button and Escape key.
- `AssignmentDetails` displays submission status pill and due date correctly.
- `SettingsPage` renders theme segmented buttons and switches theme.
- `NotificationsPage` renders category tabs and filters notifications.

- [ ] **Step 5: Verify build and test**
Run: `npm test` and `npm run build`
Expected: PASS

- [ ] **Step 6: Commit changes**
```bash
git add src/components/AssignmentDetails.tsx src/components/Drawer.tsx src/app/settings/page.tsx src/app/notifications/page.tsx src/__tests__/DrawersAndSecondaryPages.test.tsx
git commit -m "feat: polish assignment drawer, settings page, and notifications inbox"
```
