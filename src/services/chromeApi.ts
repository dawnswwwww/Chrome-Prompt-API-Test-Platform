// Chrome Prompt API Service
// Encapsulates Chrome Prompt API calls for model availability, downloading, session creation, dialogue execution, and streaming

import { 
  ModelAvailability, 
  ModelParams, 
  LanguageModelSession, 
  SessionCreateOptions,
  PromptOptions,
  DownloadProgressMonitor
} from '../types/chrome';

// Error classes for different API failures
export class ChromeAPIError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'ChromeAPIError';
  }
}

export class ModelUnavailableError extends ChromeAPIError {
  constructor() {
    super('Chrome Prompt API is not available on this device', 'MODEL_UNAVAILABLE');
  }
}

export class SessionCreationError extends ChromeAPIError {
  constructor(message: string) {
    super(`Failed to create session: ${message}`, 'SESSION_CREATION_FAILED');
  }
}

export class PromptExecutionError extends ChromeAPIError {
  constructor(message: string) {
    super(`Failed to execute prompt: ${message}`, 'PROMPT_EXECUTION_FAILED');
  }
}

// Chrome API Service class
export class ChromeAPIService {
  private static instance: ChromeAPIService | null = null;

  // Singleton pattern
  static getInstance(): ChromeAPIService {
    if (!ChromeAPIService.instance) {
      ChromeAPIService.instance = new ChromeAPIService();
    }
    return ChromeAPIService.instance;
  }

  // Check if Chrome Prompt API is supported
  isSupported(): boolean {
    return 'ai' in window && 'languageModel' in window.ai!;
  }

  // Check model availability
  async checkAvailability(): Promise<ModelAvailability> {
    if (!this.isSupported()) {
      return 'unavailable';
    }

    try {
      const availability = await window.ai!.languageModel.availability();
      return availability;
    } catch (error) {
      console.error('Failed to check model availability:', error);
      return 'unavailable';
    }
  }

  // Get model parameters
  async getModelParams(): Promise<ModelParams> {
    if (!this.isSupported()) {
      throw new ModelUnavailableError();
    }

    try {
      const params = await window.ai!.languageModel.params();
      return params;
    } catch (error) {
      throw new ChromeAPIError(`Failed to get model parameters: ${error}`);
    }
  }

  // Create a new language model session
  async createSession(options: SessionCreateOptions = {}): Promise<LanguageModelSession> {
    if (!this.isSupported()) {
      throw new ModelUnavailableError();
    }

    const availability = await this.checkAvailability();
    if (availability === 'unavailable') {
      throw new ModelUnavailableError();
    }

    try {
      const session = await window.ai!.languageModel.create(options);
      return session;
    } catch (error) {
      throw new SessionCreationError(`${error}`);
    }
  }

  // Create session with download progress monitoring
  async createSessionWithProgress(
    options: SessionCreateOptions = {},
    onProgress?: (loaded: number, total?: number) => void
  ): Promise<LanguageModelSession> {
    const createOptions: SessionCreateOptions = {
      ...options,
      monitor: (monitor: DownloadProgressMonitor) => {
        monitor.addEventListener('downloadprogress', (event) => {
          if (onProgress) {
            onProgress(event.loaded, event.total);
          }
        });
      }
    };

    return this.createSession(createOptions);
  }

  // Execute a prompt (non-streaming)
  async prompt(
    session: LanguageModelSession, 
    input: string, 
    options: PromptOptions = {}
  ): Promise<string> {
    try {
      const result = await session.prompt(input, options);
      return result;
    } catch (error) {
      throw new PromptExecutionError(`${error}`);
    }
  }

  // Execute a prompt with streaming response
  async promptStreaming(
    session: LanguageModelSession,
    input: string,
    options: PromptOptions = {}
  ): Promise<ReadableStream<string>> {
    try {
      const stream = session.promptStreaming(input, options);
      return stream;
    } catch (error) {
      throw new PromptExecutionError(`${error}`);
    }
  }

  // Clone an existing session
  async cloneSession(
    session: LanguageModelSession,
    signal?: AbortSignal
  ): Promise<LanguageModelSession> {
    try {
      const clonedSession = await session.clone({ signal });
      return clonedSession;
    } catch (error) {
      throw new SessionCreationError(`Failed to clone session: ${error}`);
    }
  }

  // Destroy a session to free resources
  destroySession(session: LanguageModelSession): void {
    try {
      session.destroy();
    } catch (error) {
      console.warn('Error destroying session:', error);
    }
  }

  // Get session usage information
  getSessionUsage(session: LanguageModelSession): { usage: number; quota: number } {
    return {
      usage: session.inputUsage,
      quota: session.inputQuota
    };
  }

  // Check if session is near quota limit
  isSessionNearLimit(session: LanguageModelSession, threshold: number = 0.9): boolean {
    const { usage, quota } = this.getSessionUsage(session);
    return quota > 0 && (usage / quota) >= threshold;
  }

  // Validate session parameters against model limits
  async validateSessionParams(topK?: number, temperature?: number): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    
    try {
      const params = await this.getModelParams();
      
      if (topK !== undefined) {
        if (topK < 1 || topK > params.maxTopK) {
          errors.push(`topK must be between 1 and ${params.maxTopK}`);
        }
      }
      
      if (temperature !== undefined) {
        if (temperature < 0 || temperature > params.maxTemperature) {
          errors.push(`temperature must be between 0 and ${params.maxTemperature}`);
        }
      }
      
      return { valid: errors.length === 0, errors };
    } catch (error) {
      return { valid: false, errors: [`Failed to validate parameters: ${error}`] };
    }
  }

  // Wait for model to be available (with timeout)
  async waitForAvailability(timeoutMs: number = 30000): Promise<ModelAvailability> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      const availability = await this.checkAvailability();
      
      if (availability === 'available' || availability === 'unavailable') {
        return availability;
      }
      
      // Wait 1 second before checking again
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    throw new ChromeAPIError('Timeout waiting for model availability', 'AVAILABILITY_TIMEOUT');
  }

  // Stream reader helper for processing streaming responses
  async *readStream(stream: ReadableStream<string>): AsyncGenerator<string, void, unknown> {
    const reader = stream.getReader();
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        yield value;
      }
    } finally {
      reader.releaseLock();
    }
  }

  // Execute prompt with retry logic
  async promptWithRetry(
    session: LanguageModelSession,
    input: string,
    options: PromptOptions = {},
    maxRetries: number = 3
  ): Promise<string> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this.prompt(session, input, options);
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < maxRetries) {
          // Wait before retry (exponential backoff)
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw new PromptExecutionError(`Failed after ${maxRetries + 1} attempts. Last error: ${lastError?.message}`);
  }

  // Check if browser supports required features
  async checkBrowserSupport(): Promise<{ supported: boolean; issues: string[]; recommendations: string[] }> {
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    // Check HTTPS requirement
    if (window.location.protocol !== 'https:') {
      issues.push('Chrome Prompt API requires HTTPS');
      recommendations.push('Use HTTPS when accessing this application.');
    }
    
    if (!('ai' in window)) {
      issues.push('Chrome AI APIs not available');
      recommendations.push('Enable Chrome Experimental Web Platform features flag: chrome://flags/#enable-experimental-web-platform-features');
    }
    
    if (!window.ai?.languageModel) {
      issues.push('Language Model API not available');
      recommendations.push('Enable Chrome Prompt API flag: chrome://flags/#prompt-api');
    }
    
    // Check for required browser version (Chrome 128+)
    const userAgent = navigator.userAgent;
    const chromeMatch = userAgent.match(/Chrome\/(\d+)/);
    if (!chromeMatch) {
      issues.push('Not running in Chrome browser');
      recommendations.push('Chrome browser version 128+ is required for Prompt API.');
    } else {
      const version = parseInt(chromeMatch[1]);
      if (version < 128) {
        issues.push(`Chrome version ${version} detected. Minimum version 128 required.`);
        recommendations.push('Update Chrome to version 128 or newer: chrome://settings/help');
      }
    }
    
    // Check for Chrome Canary/Dev channel if version is too low
    if (chromeMatch && parseInt(chromeMatch[1]) < 128) {
      recommendations.push('Consider using Chrome Canary or Dev channel: https://www.google.com/chrome/canary/');
    }
    
    // Check for sufficient memory (rough estimation)
    if ('deviceMemory' in navigator && (navigator as any).deviceMemory < 4) {
      issues.push('Insufficient device memory detected. 4GB+ recommended.');
    }
    
    // Check for private browsing mode (which might affect IndexedDB)
    try {
      const testDb = window.indexedDB.open('test');
      testDb.onerror = () => {
        issues.push('Private browsing mode may affect model storage');
        recommendations.push('Disable private browsing mode for full functionality.');
      };
      testDb.onsuccess = (event) => {
        (event.target as IDBOpenDBRequest).result.close();
        window.indexedDB.deleteDatabase('test');
      };
    } catch (e) {
      // Ignore errors in the test
    }
    
    return {
      supported: issues.length === 0,
      issues,
      recommendations
    };
  }

  // Get detailed information about why the API might not be working
  async getApiDiagnostics(): Promise<{
    apiAvailable: boolean;
    chromeVersion: string | null;
    isHttps: boolean;
    isChromeBrowser: boolean;
    details: string;
  }> {
    // Check Chrome browser
    const userAgent = navigator.userAgent;
    const chromeMatch = userAgent.match(/Chrome\/(\d+)/);
    const isChrome = !!chromeMatch;
    const chromeVersion = chromeMatch ? chromeMatch[1] : null;
    
    // Check HTTPS
    const isHttps = window.location.protocol === 'https:';
    
    // Check API availability
    const apiAvailable = this.isSupported();
    
    // Generate detailed message
    let details = '';
    
    if (!isChrome) {
      details = 'Chrome Prompt API is only available in Chrome browsers.';
    } else if (!isHttps) {
      details = 'Chrome Prompt API requires HTTPS. Switch to an HTTPS connection.';
    } else if (chromeVersion && parseInt(chromeVersion) < 128) {
      details = `Chrome version ${chromeVersion} detected, but version 128+ is required. Please update Chrome or use Chrome Canary.`;
    } else if (!apiAvailable) {
      details = 'Chrome Prompt API is not enabled. Enable the required Chrome flags:\n' +
                '1. Open chrome://flags/#prompt-api and enable the flag\n' +
                '2. Open chrome://flags/#enable-experimental-web-platform-features and enable the flag\n' +
                '3. Restart your browser';
    } else {
      details = 'Chrome Prompt API appears to be configured correctly.';
    }
    
    return {
      apiAvailable,
      chromeVersion,
      isHttps,
      isChromeBrowser: isChrome,
      details
    };
  }
}

// Export singleton instance
export const chromeAPI = ChromeAPIService.getInstance();

// Export convenience functions
export async function checkModelAvailability(): Promise<ModelAvailability> {
  return chromeAPI.checkAvailability();
}

export async function getModelParameters(): Promise<ModelParams> {
  return chromeAPI.getModelParams();
}

export async function createLanguageSession(options?: SessionCreateOptions): Promise<LanguageModelSession> {
  return chromeAPI.createSession(options);
}

export async function executePrompt(
  session: LanguageModelSession,
  input: string,
  options?: PromptOptions
): Promise<string> {
  return chromeAPI.prompt(session, input, options);
}

export async function executeStreamingPrompt(
  session: LanguageModelSession,
  input: string,
  options?: PromptOptions
): Promise<ReadableStream<string>> {
  return chromeAPI.promptStreaming(session, input, options);
}