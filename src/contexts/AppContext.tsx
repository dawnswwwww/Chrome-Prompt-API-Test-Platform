import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { SessionRecord, MessageRecord } from '../types/database';
import { ModelAvailability, ModelParams, LanguageModelSession } from '../types/chrome';
import { SessionDB, MessageDB } from '../lib/database';

// Application state interface
export interface AppState {
  // Model state
  modelAvailability: ModelAvailability;
  modelParams: ModelParams | null;
  modelError: string | null;
  
  // Session state
  sessions: SessionRecord[];
  currentSession: SessionRecord | null;
  currentMessages: MessageRecord[];
  
  // UI state
  isLoading: boolean;
  error: string | null;
  
  // Chrome API session
  chromeSession: LanguageModelSession | null;
}

// Action types
export type AppAction =
  | { type: 'SET_MODEL_AVAILABILITY'; payload: ModelAvailability }
  | { type: 'SET_MODEL_PARAMS'; payload: ModelParams }
  | { type: 'SET_MODEL_ERROR'; payload: string | null }
  | { type: 'SET_SESSIONS'; payload: SessionRecord[] }
  | { type: 'ADD_SESSION'; payload: SessionRecord }
  | { type: 'UPDATE_SESSION'; payload: SessionRecord }
  | { type: 'DELETE_SESSION'; payload: string }
  | { type: 'SET_CURRENT_SESSION'; payload: SessionRecord | null }
  | { type: 'SET_CURRENT_MESSAGES'; payload: MessageRecord[] }
  | { type: 'ADD_MESSAGE'; payload: MessageRecord }
  | { type: 'UPDATE_MESSAGE'; payload: MessageRecord }
  | { type: 'DELETE_MESSAGE'; payload: string }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_CHROME_SESSION'; payload: LanguageModelSession | null }
  | { type: 'CLEAR_ERROR' };

// Initial state
const initialState: AppState = {
  modelAvailability: 'unavailable',
  modelParams: null,
  modelError: null,
  sessions: [],
  currentSession: null,
  currentMessages: [],
  isLoading: false,
  error: null,
  chromeSession: null,
};

// Reducer function
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_MODEL_AVAILABILITY':
      return { ...state, modelAvailability: action.payload };
    
    case 'SET_MODEL_PARAMS':
      return { ...state, modelParams: action.payload };
    
    case 'SET_MODEL_ERROR':
      return { ...state, modelError: action.payload };
    
    case 'SET_SESSIONS':
      return { ...state, sessions: action.payload };
    
    case 'ADD_SESSION':
      return { ...state, sessions: [action.payload, ...state.sessions] };
    
    case 'UPDATE_SESSION':
      return {
        ...state,
        sessions: state.sessions.map(session =>
          session.id === action.payload.id ? action.payload : session
        ),
        currentSession: state.currentSession?.id === action.payload.id ? action.payload : state.currentSession,
      };
    
    case 'DELETE_SESSION':
      return {
        ...state,
        sessions: state.sessions.filter(session => session.id !== action.payload),
        currentSession: state.currentSession?.id === action.payload ? null : state.currentSession,
        currentMessages: state.currentSession?.id === action.payload ? [] : state.currentMessages,
      };
    
    case 'SET_CURRENT_SESSION':
      return { ...state, currentSession: action.payload };
    
    case 'SET_CURRENT_MESSAGES':
      return { ...state, currentMessages: action.payload };
    
    case 'ADD_MESSAGE':
      return { ...state, currentMessages: [...state.currentMessages, action.payload] };
    
    case 'UPDATE_MESSAGE':
      return {
        ...state,
        currentMessages: state.currentMessages.map(message =>
          message.id === action.payload.id ? action.payload : message
        )
      };
    
    case 'DELETE_MESSAGE':
      return {
        ...state,
        currentMessages: state.currentMessages.filter(message => message.id !== action.payload)
      };
    
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    
    case 'SET_CHROME_SESSION':
      return { ...state, chromeSession: action.payload };
    
    case 'CLEAR_ERROR':
      return { ...state, error: null, modelError: null };
    
    default:
      return state;
  }
}

// Context
const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
} | undefined>(undefined);

// Provider component
export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Load sessions on mount
  useEffect(() => {
    const loadSessions = async () => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        const sessions = await SessionDB.getAll();
        dispatch({ type: 'SET_SESSIONS', payload: sessions });
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: `Failed to load sessions: ${error}` });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    loadSessions();
  }, []);

  // Load messages when current session changes
  useEffect(() => {
    const loadMessages = async () => {
      if (!state.currentSession) {
        dispatch({ type: 'SET_CURRENT_MESSAGES', payload: [] });
        return;
      }

      try {
        const messages = await MessageDB.getBySessionId(state.currentSession.id);
        dispatch({ type: 'SET_CURRENT_MESSAGES', payload: messages });
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: `Failed to load messages: ${error}` });
      }
    };

    loadMessages();
  }, [state.currentSession]);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

// Hook to use the context
export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}

// Selector hooks for specific state slices
export function useModelState() {
  const { state } = useAppContext();
  return {
    availability: state.modelAvailability,
    params: state.modelParams,
    error: state.modelError,
  };
}

export function useSessionState() {
  const { state } = useAppContext();
  return {
    sessions: state.sessions,
    currentSession: state.currentSession,
    messages: state.currentMessages,
  };
}

export function useUIState() {
  const { state, dispatch } = useAppContext();
  return {
    isLoading: state.isLoading,
    error: state.error,
    clearError: () => dispatch({ type: 'CLEAR_ERROR' }),
  };
}

export function useChromeSession() {
  const { state } = useAppContext();
  return state.chromeSession;
}

// Action creators for common operations
export function useAppActions() {
  const { dispatch } = useAppContext();

  return {
    // Model actions
    setModelAvailability: (availability: ModelAvailability) =>
      dispatch({ type: 'SET_MODEL_AVAILABILITY', payload: availability }),
    
    setModelParams: (params: ModelParams) =>
      dispatch({ type: 'SET_MODEL_PARAMS', payload: params }),
    
    setModelError: (error: string | null) =>
      dispatch({ type: 'SET_MODEL_ERROR', payload: error }),

    // Session actions
    addSession: (session: SessionRecord) =>
      dispatch({ type: 'ADD_SESSION', payload: session }),
    
    updateSession: (session: SessionRecord) =>
      dispatch({ type: 'UPDATE_SESSION', payload: session }),
    
    deleteSession: (sessionId: string) =>
      dispatch({ type: 'DELETE_SESSION', payload: sessionId }),
    
    setCurrentSession: (session: SessionRecord | null) =>
      dispatch({ type: 'SET_CURRENT_SESSION', payload: session }),

    // Message actions
    addMessage: (message: MessageRecord) =>
      dispatch({ type: 'ADD_MESSAGE', payload: message }),
    
    updateMessage: (message: MessageRecord) =>
      dispatch({ type: 'UPDATE_MESSAGE', payload: message }),
    
    deleteMessage: (messageId: string) =>
      dispatch({ type: 'DELETE_MESSAGE', payload: messageId }),

    // UI actions
    setLoading: (loading: boolean) =>
      dispatch({ type: 'SET_LOADING', payload: loading }),
    
    setError: (error: string | null) =>
      dispatch({ type: 'SET_ERROR', payload: error }),
    
    clearError: () =>
      dispatch({ type: 'CLEAR_ERROR' }),

    // Chrome session actions
    setChromeSession: (session: LanguageModelSession | null) =>
      dispatch({ type: 'SET_CHROME_SESSION', payload: session }),
  };
}