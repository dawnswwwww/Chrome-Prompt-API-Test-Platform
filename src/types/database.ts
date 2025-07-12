// Database type definitions for Chrome Prompt API Test Platform
// Interfaces for session records, message records, and database operations

// Initial prompt configuration for sessions
export interface InitialPrompt {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// Session record stored in IndexedDB
export interface SessionRecord {
  id: string;
  name: string;
  topK?: number;
  temperature?: number;
  initialPrompts?: InitialPrompt[];
  createdAt: Date;
  updatedAt: Date;
  inputUsage: number;
  inputQuota: number;
}

// Message record stored in IndexedDB
export interface MessageRecord {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  isError?: boolean;
}

// Database schema interface for IndexedDB
export interface ChatDBSchema {
  sessions: {
    key: string;
    value: SessionRecord;
    indexes: {
      'by-created': Date;
      'by-updated': Date;
    };
  };
  messages: {
    key: string;
    value: MessageRecord;
    indexes: {
      'by-session': string;
      'by-timestamp': Date;
      'by-session-timestamp': [string, Date];
    };
  };
}

// Data export/import structure
export interface ExportData {
  sessions: SessionRecord[];
  messages: MessageRecord[];
}

// Storage statistics
export interface StorageStats {
  sessionCount: number;
  messageCount: number;
  estimatedSize: number;
}

// Session creation parameters
export interface CreateSessionParams {
  name: string;
  topK?: number;
  temperature?: number;
  initialPrompts?: InitialPrompt[];
  inputUsage?: number;
  inputQuota?: number;
}

// Session update parameters
export interface UpdateSessionParams {
  name?: string;
  topK?: number;
  temperature?: number;
  initialPrompts?: InitialPrompt[];
  inputUsage?: number;
  inputQuota?: number;
}

// Message creation parameters
export interface CreateMessageParams {
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
  isError?: boolean;
}

// Message update parameters
export interface UpdateMessageParams {
  content?: string;
  isStreaming?: boolean;
  isError?: boolean;
}

// Database operation result types
export type DatabaseResult<T> = {
  success: true;
  data: T;
} | {
  success: false;
  error: string;
};

// Query options for database operations
export interface QueryOptions {
  limit?: number;
  offset?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'timestamp';
  sortOrder?: 'asc' | 'desc';
}

// Session query filters
export interface SessionQueryFilters extends QueryOptions {
  namePattern?: string;
  createdAfter?: Date;
  createdBefore?: Date;
}

// Message query filters
export interface MessageQueryFilters extends QueryOptions {
  sessionId?: string;
  role?: 'user' | 'assistant';
  timestampAfter?: Date;
  timestampBefore?: Date;
  contentPattern?: string;
}
