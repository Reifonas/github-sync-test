# AI Development Rules for Gatohub Sync Pro

This document outlines the technical stack and development guidelines for AI agents working on this project. Adhering to these rules ensures consistency, maintainability, and code quality.

## Tech Stack Overview

The application is built with the following technologies:

*   **Frontend**: React 18 with TypeScript, built using Vite.
*   **Backend**: A lightweight Node.js server with Express for handling API requests and authentication callbacks.
*   **Styling**: Tailwind CSS for all UI styling, following a utility-first approach.
*   **UI Components**: A combination of custom components and the shadcn/ui library for a consistent look and feel.
*   **State Management**: Zustand for managing global application state in a simple, hook-based manner.
*   **Routing**: React Router for all client-side navigation and page routing.
*   **Data Storage**: A local file-based system using JSON files in the `/data` directory, managed by a dedicated service.
*   **Icons**: `lucide-react` is the exclusive icon library for the project.

## Library Usage and Coding Rules

### 1. UI and Styling
*   **Component Library**: **Always** use components from the pre-built `shadcn/ui` library located in `src/components/ui`. Only create a new component if a suitable one does not exist.
*   **Styling**: **Only** use Tailwind CSS utility classes for styling. Do not write custom CSS files or use inline `style` objects. Use the `cn` utility function (`src/lib/utils.ts`) for conditional class names.
*   **Icons**: **Only** use icons from the `lucide-react` package.

### 2. State Management
*   **Global State**: Use **Zustand** for all global state management. Create separate stores for distinct domains (e.g., `authStore`, `syncStore`).
*   **Local State**: Use React's built-in `useState` and `useEffect` hooks for state that is local to a single component.

### 3. API and Data Handling
*   **Frontend API Calls**: All API requests from the frontend to the backend **must** go through the `apiService` singleton (`src/services/apiService.ts`).
*   **GitHub API Calls**: All interactions with the external GitHub API **must** be handled by the `githubService` singleton (`src/services/githubService.ts`).
*   **Backend Data Storage**: All backend operations that read from or write to the local JSON database **must** use the `LocalStorageService` (`api/services/LocalStorageService.js`).

### 4. User Feedback
*   **Notifications**: Use the `sonner` library for all toast notifications to the user (e.g., success, error, info messages). Import the `toast` function and use it directly.

### 5. Routing
*   **Navigation**: Use React Router for all routing. Routes are defined in `src/App.tsx`. Use the `<Link>` component for declarative navigation and hooks like `useNavigate` for programmatic navigation.