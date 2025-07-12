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
- Chrome version 128+ with experimental AI features enabled
- HTTPS development environment (required for Chrome Prompt API)

### Environment Setup

1. Clone the repository:
```bash
git clone https://github.com/your-username/chrome-prompt-api-test.git
cd chrome-prompt-api-test
```

2. Install dependencies:
```bash
pnpm install
```

3. Create a local `.env` file based on the provided example:
```bash
cp .env.example .env
```

4. Configure your HTTPS development environment:
   - The project is configured to use Vite's built-in self-signed certificates
   - For custom certificates, specify paths in your `.env` file:
     ```
     VITE_SSL_CERT_PATH=/path/to/cert.pem
     VITE_SSL_KEY_PATH=/path/to/key.pem
     ```

5. Start the development server:
```bash
pnpm dev
```

The application will be available at `https://localhost:5173` by default (HTTPS is required for Chrome Prompt API access).

### Server Port Configuration

You can customize server ports if the default ones are unavailable:

1. In your `.env` file:
```
VITE_PORT=8000      # Custom development server port
VITE_PREVIEW_PORT=8080  # Custom preview server port
```

2. Start with custom port via command line:
```bash
pnpm dev --port 8000
```

3. When accessing from different devices on your network, use your machine's IP address:
```
https://192.168.1.xxx:5173
```

## Usage

### Chrome Setup Requirements

1. **Chrome Version**: You must use Chrome version 128 or higher
   - Check your version at `chrome://version`
   - Update to the latest version if needed

2. **Enable Experimental Web Features**: 
   - Navigate to `chrome://flags/`
   - Enable the following flags:
     - `#enable-experimental-web-platform-features`
     - `#enable-ai-api`
     - `#optimization-guide-on-device-model` - Set to "Enabled BypassPerfRequirement"
     - `#prompt-api-for-gemini-nano` - Set to "Enabled"

3. **Configure Chrome to Trust Local Certificates**:
   - If you see security warnings, navigate to `chrome://flags/#allow-insecure-localhost`
   - Enable "Allow invalid certificates for resources loaded from localhost"

4. **Restart Chrome** after enabling the flags

5. **Verify API Availability**: Open DevTools Console and check:
```javascript
console.log('Prompt API available:', 'ai' in window && 'languageModel' in window.ai);
```

### Application Usage

1. **Model Management**: Use the Model Manager to check available models and create new language model sessions
2. **Create Sessions**: Set up conversation sessions with custom system prompts and temperature settings
3. **Chat Testing**: Test prompts and responses through the interactive chat interface
4. **Data Export**: Export your session data for backup or sharing with other developers

## Troubleshooting

### Common Issues and Solutions

1. **"Prompt API not available" error**:
   - Verify Chrome version is 128+
   - Ensure all required flags are enabled in `chrome://flags/`
   - Restart Chrome completely after changing flags
   - Make sure you're accessing the application via HTTPS

2. **HTTPS Certificate Warnings**:
   - Click "Advanced" and then "Proceed to site (unsafe)"
   - Or enable `chrome://flags/#allow-insecure-localhost`

3. **CORS or Network Errors**:
   - Ensure you're accessing the application via HTTPS
   - Check that no browser extensions are blocking access
   - Verify your firewall allows connections to the development port

4. **"Not secure" warning in browser**:
   - This is normal when using self-signed certificates for development
   - No action required as long as you can access the application

5. **Unable to access on different devices**:
   - Ensure the `host` is set to `true` or `0.0.0.0` in your vite.config.ts
   - Check if your firewall allows incoming connections to the development port
   - Use your machine's actual IP address instead of localhost

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