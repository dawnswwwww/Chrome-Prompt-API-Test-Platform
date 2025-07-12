import { openDB, DBSchema, IDBPDatabase } from 'idb';

// Database interfaces
export interface SessionRecord {
  id: string;
  name: string;
  topK?: number;
  temperature?: number;
  initialPrompts?: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  createdAt: Date;
  updatedAt: Date;
  inputUsage: number;
  inputQuota: number;
}

export interface MessageRecord {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  isError?: boolean;
}

// Database schema
interface ChatDBSchema extends DBSchema {
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

// Database instance
let dbInstance: IDBPDatabase<ChatDBSchema> | null = null;

// Initialize database
export async function initDB(): Promise<IDBPDatabase<ChatDBSchema>> {
  if (dbInstance) {
    return dbInstance;
  }

  dbInstance = await openDB<ChatDBSchema>('ChromePromptDB', 1, {
    upgrade(db) {
      // Create sessions store
      const sessionsStore = db.createObjectStore('sessions', {
        keyPath: 'id',
      });
      sessionsStore.createIndex('by-created', 'createdAt');
      sessionsStore.createIndex('by-updated', 'updatedAt');

      // Create messages store
      const messagesStore = db.createObjectStore('messages', {
        keyPath: 'id',
      });
      messagesStore.createIndex('by-session', 'sessionId');
      messagesStore.createIndex('by-timestamp', 'timestamp');
      messagesStore.createIndex('by-session-timestamp', ['sessionId', 'timestamp']);
    },
  });

  return dbInstance;
}

// Session CRUD operations
export class SessionDB {
  static async create(session: Omit<SessionRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<SessionRecord> {
    const db = await initDB();
    const id = crypto.randomUUID();
    const now = new Date();
    
    const newSession: SessionRecord = {
      ...session,
      id,
      createdAt: now,
      updatedAt: now,
    };

    await db.add('sessions', newSession);
    return newSession;
  }

  static async getById(id: string): Promise<SessionRecord | undefined> {
    const db = await initDB();
    return await db.get('sessions', id);
  }

  static async getAll(): Promise<SessionRecord[]> {
    const db = await initDB();
    return await db.getAllFromIndex('sessions', 'by-updated');
  }

  static async update(id: string, updates: Partial<Omit<SessionRecord, 'id' | 'createdAt'>>): Promise<SessionRecord | undefined> {
    const db = await initDB();
    const existing = await db.get('sessions', id);
    
    if (!existing) {
      return undefined;
    }

    const updated: SessionRecord = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };

    await db.put('sessions', updated);
    return updated;
  }

  static async delete(id: string): Promise<boolean> {
    const db = await initDB();
    const tx = db.transaction(['sessions', 'messages'], 'readwrite');
    
    // Delete session
    await tx.objectStore('sessions').delete(id);
    
    // Delete all messages for this session
    const messagesIndex = tx.objectStore('messages').index('by-session');
    const messageKeys = await messagesIndex.getAllKeys(id);
    
    for (const key of messageKeys) {
      await tx.objectStore('messages').delete(key);
    }

    await tx.done;
    return true;
  }
}

// Message CRUD operations
export class MessageDB {
  static async create(message: Omit<MessageRecord, 'id' | 'timestamp'>): Promise<MessageRecord> {
    const db = await initDB();
    const id = crypto.randomUUID();
    
    const newMessage: MessageRecord = {
      ...message,
      id,
      timestamp: new Date(),
    };

    await db.add('messages', newMessage);
    return newMessage;
  }

  static async getById(id: string): Promise<MessageRecord | undefined> {
    const db = await initDB();
    return await db.get('messages', id);
  }

  static async getBySessionId(sessionId: string): Promise<MessageRecord[]> {
    const db = await initDB();
    return await db.getAllFromIndex('messages', 'by-session-timestamp', IDBKeyRange.bound([sessionId, new Date(0)], [sessionId, new Date()]));
  }

  static async update(id: string, updates: Partial<Omit<MessageRecord, 'id' | 'timestamp'>>): Promise<MessageRecord | undefined> {
    const db = await initDB();
    const existing = await db.get('messages', id);
    
    if (!existing) {
      return undefined;
    }

    const updated: MessageRecord = {
      ...existing,
      ...updates,
    };

    await db.put('messages', updated);
    return updated;
  }

  static async delete(id: string): Promise<boolean> {
    const db = await initDB();
    await db.delete('messages', id);
    return true;
  }

  static async deleteBySessionId(sessionId: string): Promise<number> {
    const db = await initDB();
    const tx = db.transaction('messages', 'readwrite');
    const index = tx.store.index('by-session');
    const keys = await index.getAllKeys(sessionId);
    
    for (const key of keys) {
      await tx.store.delete(key);
    }
    
    await tx.done;
    return keys.length;
  }
}

// Data export/import functionality
export class DataManager {
  static async exportData(): Promise<{ sessions: SessionRecord[]; messages: MessageRecord[] }> {
    const sessions = await SessionDB.getAll();
    const db = await initDB();
    const messages = await db.getAll('messages');
    
    return { sessions, messages };
  }

  static async importData(data: { sessions: SessionRecord[]; messages: MessageRecord[] }): Promise<void> {
    const db = await initDB();
    const tx = db.transaction(['sessions', 'messages'], 'readwrite');
    
    // Import sessions
    for (const session of data.sessions) {
      await tx.objectStore('sessions').put(session);
    }
    
    // Import messages
    for (const message of data.messages) {
      await tx.objectStore('messages').put(message);
    }
    
    await tx.done;
  }

  static async clearAllData(): Promise<void> {
    const db = await initDB();
    const tx = db.transaction(['sessions', 'messages'], 'readwrite');
    
    await tx.objectStore('sessions').clear();
    await tx.objectStore('messages').clear();
    
    await tx.done;
  }

  static async getStorageStats(): Promise<{ sessionCount: number; messageCount: number; estimatedSize: number }> {
    const db = await initDB();
    const sessionCount = await db.count('sessions');
    const messageCount = await db.count('messages');
    
    // Rough estimation of storage size
    const data = await this.exportData();
    const estimatedSize = JSON.stringify(data).length;
    
    return { sessionCount, messageCount, estimatedSize };
  }
}

// Utility functions
export function generateId(): string {
  return crypto.randomUUID();
}

export function formatDate(date: Date): string {
  return date.toLocaleString();
}

// Initialize database on module load
initDB().catch(console.error);
