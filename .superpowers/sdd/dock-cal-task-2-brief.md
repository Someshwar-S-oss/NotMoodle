# Task 2: Floating Frosted Pill Dock & Superuser Admin Shortcut

## Files
- Modify: `src/components/Dock.css`
- Modify: `src/components/NavigationDock.tsx`
- Modify: `src/__tests__/NavigationDock.test.tsx`

## Requirements
1. **Redesign Dock Styling (`src/components/Dock.css`)**:
   - Replace brutalist square corners and hard `4px 4px 0px var(--border)` offset box shadow with Warm Academic Editorial styling:
     - `.dock-panel`:
       `position: fixed; bottom: 2rem; left: 50%; transform: translateX(-50%); display: flex; align-items: center; width: fit-content; gap: 0.75rem; border-radius: 9999px; background-color: var(--card); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border: 1px solid var(--border); padding: 0.5rem 0.875rem; z-index: 100; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);`
     - `.dock-item`:
       `border-radius: 9999px; background-color: transparent; border: 1px solid transparent; cursor: pointer; color: var(--foreground); transition: background-color 0.2s ease, border-color 0.2s ease;`
     - `.dock-item:hover`:
       `background-color: var(--muted); border-color: var(--border);`
     - `.dock-item.active`:
       `background-color: var(--muted); border-color: var(--border);`
     - `.dock-item:focus-visible`:
       `outline: 2px solid var(--foreground); outline-offset: 2px;`
     - `.dock-label`:
       `border-radius: 0.5rem; border: 1px solid var(--border); background-color: var(--foreground); color: var(--background); padding: 0.25rem 0.625rem; font-family: var(--font-geist-mono), monospace; font-size: 0.7rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);`
   - Include `@media (prefers-reduced-motion: reduce)` block disabling transforms and transitions on dock elements.

2. **Update NavigationDock Component (`src/components/NavigationDock.tsx`)**:
   - Query Supabase profile for `is_superuser` on mount:
     ```typescript
     const { data: { user } } = await supabase.auth.getUser()
     if (user) {
       const { data } = await supabase.from('profiles').select('is_superuser').eq('id', user.id).maybeSingle()
       if (data?.is_superuser) setIsSuperuser(true)
     }
     ```
   - If `isSuperuser === true`, add an **Admin Console** shortcut item:
     - `icon: <Shield size={18} className={isAdminActive ? "text-foreground" : "text-foreground/75"} />`
     - `label: "Admin"`
     - `onClick: () => router.push("/admin")`
     - `isActive: currentPath === "/admin"`
   - Active Indicator:
     - Render a luminous soft dot (`w-1.5 h-1.5 rounded-full bg-foreground`) centered under the active route icon with `motion-reduce:transition-none`.

3. **Update NavigationDock Tests (`src/__tests__/NavigationDock.test.tsx`)**:
   - Test dock renders as rounded pill with active route indicator.
   - Test non-superuser profile renders Dashboard, Notifications, and Settings without Admin.
   - Test superuser profile renders Dashboard, Notifications, Settings, AND Admin item with `Shield` icon.

4. **Verification**:
   - Run `npx jest src/__tests__/NavigationDock.test.tsx` and full suite `npm test`.
   - Run `npm run build`.
   - Commit with message: `feat: modernize navigation dock into floating frosted pill with admin shortcut`.
