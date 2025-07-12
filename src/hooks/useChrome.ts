import { useState, useEffect, useCallback } from 'react';
import { chromeAPI } from '../services/chromeApi';
import { 
  ModelAvailability, 
  ModelParams, 
  LanguageModelSession, 
  SessionCreateOptions, 
  PromptOptions
} from '../types/chrome';

/**
 * Custom hook to manage Chrome Prompt API availability status
 */
export function useModelAvailability() {
  const [availability, setAvailability] = useState<ModelAvailability>('unavailable');
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkAvailability = useCallback(async () => {
    try {
      setIsChecking(true);
      setError(null);
      const status = await chromeAPI.checkAvailability();
      setAvailability(status);
      return status;
    } catch (err: any) {
      const errorMessage = `Failed to check model availability: ${err}`;
      setError(errorMessage);
      return 'unavailable' as ModelAvailability;
    } finally {
      setIsChecking(false);
    }
  }, []);

  // Check availability on mount
  useEffect(() => {
    checkAvailability();
  }, [checkAvailability]);

  return {
    availability,
    isChecking,
    error,
    checkAvailability
  };
}

/**
 * Custom hook to manage model parameters
 */
export function useModelParams() {
  const [params, setParams] = useState<ModelParams | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadParams = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const modelParams = await chromeAPI.getModelParams();
      setParams(modelParams);
      return modelParams;
    } catch (err: any) {
      const errorMessage = `Failed to load model parameters: ${err}`;
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load params on mount
  useEffect(() => {
    loadParams();
  }, [loadParams]);

  return {
    params,
    isLoading,
    error,
    loadParams
  };
}

/**
 * Custom hook to manage Chrome Prompt API session
 */
export function useModelSession() {
  const [session, setSession] = useState<LanguageModelSession | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [progress, setProgress] = useState<{ loaded: number; total?: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const createSession = useCallback(async (options: SessionCreateOptions = {}) => {
    try {
      setIsCreating(true);
      setError(null);
      setProgress(null);

      // Add progress monitoring if not provided
      if (!options.monitor) {
        options.monitor = (monitor) => {
          monitor.addEventListener('downloadprogress', (event) => {
            setProgress({ loaded: event.loaded, total: event.total });
          });
        };
      }

      const modelSession = await chromeAPI.createSession(options);
      setSession(modelSession);
      return modelSession;
    } catch (err: any) {
      const errorMessage = `Failed to create session: ${err}`;
      setError(errorMessage);
      return null;
    } finally {
      setIsCreating(false);
      setProgress(null);
    }
  }, []);

  const destroySession = useCallback(() => {
    if (session) {
      try {
        chromeAPI.destroySession(session);
        setSession(null);
      } catch (err: any) {
        console.warn('Error destroying session:', err);
      }
    }
  }, [session]);

  // Clean up session on unmount
  useEffect(() => {
    return () => {
      destroySession();
    };
  }, [destroySession]);

  return {
    session,
    isCreating,
    progress,
    error,
    createSession,
    destroySession
  };
}

/**
 * Custom hook to execute prompts with Chrome Prompt API
 */
export function usePromptExecution(session: LanguageModelSession | null) {
  const [isExecuting, setIsExecuting] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  const executePrompt = useCallback(async (input: string, options: PromptOptions = {}) => {
    if (!session) {
      setError('No active session');
      return null;
    }

    try {
      setIsExecuting(true);
      setError(null);
      
      // Set up abort controller if not provided
      let controller: AbortController | undefined;
      if (!options.signal) {
        controller = new AbortController();
        options.signal = controller.signal;
        setAbortController(controller);
      }

      const response = await chromeAPI.prompt(session, input, options);
      return response;
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        const errorMessage = `Failed to execute prompt: ${err}`;
        setError(errorMessage);
      }
      return null;
    } finally {
      setIsExecuting(false);
      setAbortController(null);
    }
  }, [session]);

  const executeStreamingPrompt = useCallback(async (input: string, options: PromptOptions = {}, onChunk?: (chunk: string) => void) => {
    if (!session) {
      setError('No active session');
      return null;
    }

    try {
      setIsExecuting(true);
      setIsStreaming(true);
      setError(null);
      
      // Set up abort controller if not provided
      let controller: AbortController | undefined;
      if (!options.signal) {
        controller = new AbortController();
        options.signal = controller.signal;
        setAbortController(controller);
      }

      const stream = await chromeAPI.promptStreaming(session, input, options);
      
      // Process the stream
      let fullResponse = '';
      const reader = stream.getReader();
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          // Accumulate response
          fullResponse += value;
          
          // Call callback with each chunk if provided
          if (onChunk) {
            onChunk(value);
          }
        }
        
        return fullResponse;
      } finally {
        reader.releaseLock();
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        const errorMessage = `Failed to execute streaming prompt: ${err}`;
        setError(errorMessage);
      }
      return null;
    } finally {
      setIsExecuting(false);
      setIsStreaming(false);
      setAbortController(null);
    }
  }, [session]);

  const cancelExecution = useCallback(() => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
    }
  }, [abortController]);

  return {
    isExecuting,
    isStreaming,
    error,
    executePrompt,
    executeStreamingPrompt,
    cancelExecution
  };
}

/**
 * Custom hook to check browser support for Chrome Prompt API
 */
export function useBrowserSupport() {
  const [isSupported, setIsSupported] = useState<boolean | null>(null);
  const [issues, setIssues] = useState<string[]>([]);
  const [isChecking, setIsChecking] = useState(false);

  const checkSupport = useCallback(async () => {
    try {
      setIsChecking(true);
      const support = await chromeAPI.checkBrowserSupport();
      setIsSupported(support.supported);
      setIssues(support.issues);
      return support;
    } catch (err: any) {
      console.error('Error checking browser support:', err);
      setIsSupported(false);
      setIssues([`Error checking support: ${err}`]);
      return { supported: false, issues: [`Error checking support: ${err}`] };
    } finally {
      setIsChecking(false);
    }
  }, []);

  // Check support on mount
  useEffect(() => {
    checkSupport();
  }, [checkSupport]);

  return {
    isSupported,
    issues,
    isChecking,
    checkSupport
  };
}

/**
 * Combined hook for all Chrome Prompt API functionality
 */
export function useChrome() {
  const modelAvailability = useModelAvailability();
  const modelParams = useModelParams();
  const modelSession = useModelSession();
  const browserSupport = useBrowserSupport();
  
  const promptExecution = usePromptExecution(modelSession.session);

  const isModelReady = modelAvailability.availability === 'available' && modelSession.session !== null;

  return {
    ...modelAvailability,
    ...modelParams,
    ...modelSession,
    ...promptExecution,
    ...browserSupport,
    isModelReady
  };
}

/**
 * Custom hook providing model state for components
 */
export function useModelState() {
  const { availability, params, error } = useChrome();
  return {
    availability,
    params,
    error
  };
}

export default useChrome;