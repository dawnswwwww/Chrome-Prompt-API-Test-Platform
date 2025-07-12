// Chrome Prompt API Type Definitions
// Based on: https://developer.chrome.com/docs/extensions/ai/prompt-api

declare global {
  interface Window {
    ai?: {
      languageModel: LanguageModelNamespace;
    };
  }
}

// Availability status for the language model
export type ModelAvailability = 'unavailable' | 'downloadable' | 'downloading' | 'available';

// Model parameters interface
export interface ModelParams {
  defaultTopK: number;
  maxTopK: number;
  defaultTemperature: number;
  maxTemperature: number;
}

// Session creation options
export interface SessionCreateOptions {
  topK?: number;
  temperature?: number;
  signal?: AbortSignal;
  monitor?: (monitor: DownloadProgressMonitor) => void;
  initialPrompts?: InitialPrompt[];
}

// Initial prompt for session context
export interface InitialPrompt {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// Download progress monitor
export interface DownloadProgressMonitor {
  addEventListener(type: 'downloadprogress', listener: (event: DownloadProgressEvent) => void): void;
  removeEventListener(type: 'downloadprogress', listener: (event: DownloadProgressEvent) => void): void;
}

// Download progress event
export interface DownloadProgressEvent extends Event {
  loaded: number;
  total?: number;
}

// Session clone options
export interface SessionCloneOptions {
  signal?: AbortSignal;
}

// Prompt options
export interface PromptOptions {
  signal?: AbortSignal;
}

// Language model session interface
export interface LanguageModelSession {
  prompt(input: string, options?: PromptOptions): Promise<string>;
  promptStreaming(input: string, options?: PromptOptions): ReadableStream<string>;
  clone(options?: SessionCloneOptions): Promise<LanguageModelSession>;
  destroy(): void;
  readonly inputUsage: number;
  readonly inputQuota: number;
}

// Language model namespace interface
export interface LanguageModelNamespace {
  availability(): Promise<ModelAvailability>;
  params(): Promise<ModelParams>;
  create(options?: SessionCreateOptions): Promise<LanguageModelSession>;
}

// Global Chrome AI interface
export interface ChromeAI {
  languageModel: LanguageModelNamespace;
}

export {};