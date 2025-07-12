# Chrome Prompt API Test Platform

A comprehensive testing platform for Chrome's experimental Prompt API, built with modern web technologies to help developers explore and test AI-powered features in Chrome browsers.

## Features

- **Model Management**: Discover, create, and manage AI language models available through Chrome's Prompt API
- **Session Management**: Create and manage conversation sessions with different models and configurations
- **Chat Interface**: Interactive chat interface for testing prompts and responses with AI models
- **Data Management**: Export and import session data, manage IndexedDB storage with backup and restore functionality

## Technology Stack

- **Vite**: Fast build tool and development server
- **React**: Component-based UI library with hooks and context
- **TypeScript**: Type-safe JavaScript with full IDE support
- **TailwindCSS**: Utility-first CSS framework for rapid styling
- **IndexedDB**: Client-side database for persistent data storage

## Deployment

This project is automatically deployed to GitHub Pages using GitHub Actions. The deployment workflow triggers on:
- Push to main branch
- Manual workflow dispatch

Visit the live demo: [Chrome Prompt API Test Platform](https://your-username.github.io/chrome-prompt-api-test/)

## Development

### Prerequisites

- Node.js 20 or higher
- pnpm package manager
- Chrome Canary with experimental AI features enabled

### Setup

1. Clone the repository:
```bash
git clone https://github.com/your-username/chrome-prompt-api-test.git
cd chrome-prompt-api-test
```

2. Install dependencies:
```bash
pnpm install
```

3. Start the development server (requires HTTPS):
```bash
pnpm dev
```

The application will be available at `https://localhost:5173` (HTTPS is required for Chrome Prompt API access).

## Usage

### Chrome Setup

1. **Install Chrome Canary**: Download from [Chrome Canary](https://www.google.com/chrome/canary/)

2. **Enable Experimental Features**: Navigate to `chrome://flags/` and enable:
   - `#optimization-guide-on-device-model` - Set to "Enabled BypassPerfRequirement"
   - `#prompt-api-for-gemini-nano` - Set to "Enabled"

3. **Restart Chrome Canary** after enabling the flags

4. **Verify API Availability**: Open DevTools Console and check:
```javascript
console.log('Prompt API available:', 'ai' in window && 'languageModel' in window.ai);
```

### Application Usage

1. **Model Management**: Use the Model Manager to check available models and create new language model sessions
2. **Create Sessions**: Set up conversation sessions with custom system prompts and temperature settings
3. **Chat Testing**: Test prompts and responses through the interactive chat interface
4. **Data Export**: Export your session data for backup or sharing with other developers

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      ...tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      ...tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      ...tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])