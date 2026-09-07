# React Bits Folder Component Integration for Dashboard Course Cards - Design Spec

## 1. Overview & Context
This specification details the integration of the open-source **React Bits <Folder />** 3D component into NotMoodle's dashboard course cards. It transforms the placeholder geometric icons (Hexagon, Circle, Triangle) on each enrolled course card into interactive, 3D animated academic folders color-coded with the course's distinctive palette, revealing assignment sheets and navigating to the course page upon click.

## 2. Architecture & Component Design

### 2.1 File Structure
- src/components/Folder.tsx: Client component implementation in TypeScript.
- src/components/Folder.css: CSS for 3D perspective, paper skewing, magnet effect, and light/dark theme variables.
- src/app/dashboard/page.tsx: Enrolled Modules section updated to render <Folder /> with course items and accents.
- src/__tests__/Folder.test.tsx: Unit tests for <Folder /> rendering, interactions, accessibility, and reduced motion.

### 2.2 Component API (src/components/Folder.tsx)
`	ypescript
export interface FolderProps {
  color?: string;
  size?: number;
  items?: React.ReactNode[];
  className?: string;
  open?: boolean;
  onToggle?: (open: boolean) => void;
  interactive?: boolean; // When rendered inside a parent link, interactive controls click capture
}
`

### 2.3 Color Science & Accessibility
- darkenColor function handles light/dark shade generation for folder back and paper shadows.
- Respects prefers-reduced-motion with motion-reduce:transform-none transitions.
- Fully accessible with ole="presentation" or ole="button" when standalone.

### 2.4 Enrolled Course Card Integration (src/app/dashboard/page.tsx)
- Inside courses.map((course, i) => ...):
  - Extract up to 3 upcoming assignments/events for that course.
  - Map each item to a mini paper tab (e.g. assignment icon, abbreviated name or dot).
  - Pass color={accent.hex} using getCourseAccent(course.id, i).
  - Pass size={0.65} to scale nicely within the card header without overflow.
  - The card remains wrapped in <Link href={/course/}>, so clicking anywhere (including the folder) navigates to the course page.
  - Card hover triggers the folder open state via CSS (group-hover .folder) or controlled prop.

## 3. Verification & Testing
- Unit tests in src/__tests__/Folder.test.tsx verifying:
  - Custom color application and CSS custom variables.
  - Paper items rendering (up to 3 items).
  - Keyboard accessibility and aria attributes.
- Update src/__tests__/DashboardTimelineCourses.test.tsx:
  - Verify <Folder /> presence within enrolled course cards.
- Run 
pm test and 
pm run build with zero regressions.
