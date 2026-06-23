# Shadcn UI React Component Integration Instructions

## Project Analysis
The current codebase is a Vanilla JavaScript Vite project using Tailwind CSS. It does not currently use React or TypeScript out of the box, nor does it have shadcn CLI initialized.

### Setup Instructions for React, TypeScript, and shadcn UI CLI

1. **Install React & TypeScript:**
   Since this is a Vite project, you can add React support and TypeScript.
   ```bash
   pnpm install react react-dom
   pnpm install -D @vitejs/plugin-react typescript @types/react @types/react-dom
   ```
   Then configure `vite.config.js` (or change to `.ts`) to include the React plugin.

2. **Initialize shadcn UI CLI:**
   You can initialize shadcn UI in your project using:
   ```bash
   pnpm dlx shadcn-ui@latest init
   ```
   During initialization, you will be prompted to configure your project.
   - Choose TypeScript.
   - Choose Tailwind CSS.
   - Set the default path for your components to `src/components/ui`.
   - Set the default path for your styles (e.g., `src/index.css` or `src/globals.css`).

### Default Paths & Importance of `/components/ui`
- **Default Path for Components:** The standard default path in shadcn projects is `src/components` with reusable UI elements placed in `src/components/ui`.
- **Default Path for Styles:** Usually `src/index.css` or `src/app/globals.css`.
- **Why a dedicated `/components/ui` folder?**
  Placing shadcn components in a dedicated `/components/ui` directory separates these reusable, low-level primitive components (like buttons, dialogs, inputs) from complex, domain-specific components (like page layouts, forms, and business logic components). This keeps the `components` directory organized and makes it immediately clear which components are structural/foundational versus feature-specific.

## Questions Answered

- **What data/props will be passed to this component?**
  The `GooeyText` component accepts:
  - `texts`: An array of strings to morph between.
  - `morphTime`: Number (seconds) determining how long the morph transition takes.
  - `cooldownTime`: Number (seconds) determining how long a text remains before morphing.
  - `className`: Optional string for outer container styling.
  - `textClassName`: Optional string for text element styling.

- **Are there any specific state management requirements?**
  No external state management (Redux, Zustand) is required. The component uses React's `useRef` and `useEffect` internally to manage animation timings and DOM manipulation directly without triggering React re-renders for the animation loop.

- **Are there any required assets (images, icons, etc.)?**
  No external assets are required for the `GooeyText` component. It relies entirely on standard text and inline SVG filters for the gooey effect.

- **What is the expected responsive behavior?**
  The outer container adjusts via standard Tailwind classes (if provided). The text itself uses responsive text sizing: `text-6xl md:text-[60pt]`.

- **What is the best place to use this component in the app?**
  This component is ideal for landing pages, hero sections, loading screens, or emphasis blocks where visually engaging, dynamic text transitions are appropriate without being distracting.
