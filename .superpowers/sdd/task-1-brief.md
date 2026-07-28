### Task 1: Project Scaffolding & Setup

**Files:**
- Create: `package.json`, `next.config.js`, `tsconfig.json`, `tailwind.config.ts`, `postcss.config.js`, `jest.config.ts`

**Interfaces:**
- Consumes: N/A
- Produces: Initialized Next.js project with Jest configured.

- [ ] **Step 1: Scaffold Next.js App**
Run: `npx create-next-app@latest . --ts --tailwind --eslint --app --src-dir --use-npm --no-import-alias`
(Since the directory is not empty due to `docs`, you might need to run this in a temp folder and move it, or just force it depending on npm version. Assuming standard Next.js setup with `src/app`).

- [ ] **Step 2: Install Dependencies**
Run: `npm install @supabase/supabase-js lucide-react`
Run: `npm install -D jest @testing-library/react @testing-library/jest-dom jest-environment-jsdom ts-node`

- [ ] **Step 3: Configure Jest**
Create `jest.config.ts`:
```typescript
import type { Config } from 'jest';
import nextJest from 'next/jest.js';

const createJestConfig = nextJest({
  dir: './',
});

const config: Config = {
  coverageProvider: 'v8',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
};
export default createJestConfig(config);
```
Create `jest.setup.ts`:
```typescript
import '@testing-library/jest-dom';
```

- [ ] **Step 4: Commit**
```bash
git add .
git commit -m "chore: initial next.js setup with jest and supabase"
```
