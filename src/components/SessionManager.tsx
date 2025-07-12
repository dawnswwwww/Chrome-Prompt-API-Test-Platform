import { useState } from 'react';
import { useSessionState, useAppActions, useModelState } from '../contexts/AppContext';
import { SessionDB, MessageDB } from '../lib/database';
import { chromeAPI } from '../services/chromeApi';
import { SessionRecord } from '../types/database';
import { InitialPrompt } from '../types/chrome';

interface SessionManagerProps {
  className?: string;
  onSessionSelect?: (session: SessionRecord) => void;
}

export function SessionManager({ className = '', onSessionSelect }: SessionManagerProps) {
  const { sessions, currentSession } = useSessionState();
  const { availability, params } = useModelState();
  const { addSession, updateSession, deleteSession, setCurrentSession, setChromeSession, setError } = useAppActions();
  
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState('');
  const [topK, setTopK] = useState<number | undefined>(undefined);
  const [temperature, setTemperature] = useState<number | undefined>(undefined);
  const [initialSystemPrompt, setInitialSystemPrompt] = useState('');
  const [isCloning, setIsCloning] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const resetForm = () => {
    setName('');
    setTopK(undefined);
    setTemperature(undefined);
    setInitialSystemPrompt('');
  };

  const createSession = async () => {
    if (!name.trim()) {
      setError('Session name is required');
      return;
    }

    try {
      setIsCreating(true);
      
      // Validate session parameters if provided
      if (topK !== undefined || temperature !== undefined) {
        const validation = await chromeAPI.validateSessionParams(topK, temperature);
        if (!validation.valid) {
          setError(validation.errors.join(', '));
          return;
        }
      }

      // Prepare initial prompts if system prompt is provided
      const initialPrompts: InitialPrompt[] = [];
      if (initialSystemPrompt.trim()) {
        initialPrompts.push({
          role: 'system',
          content: initialSystemPrompt.trim()
        });
      }

      // Create Chrome session with parameters
      const chromeSession = await chromeAPI.createSession({
        topK: topK !== undefined ? topK : params?.defaultTopK,
        temperature: temperature !== undefined ? temperature : params?.defaultTemperature,
        initialPrompts: initialPrompts.length > 0 ? initialPrompts : undefined
      });

      // Get usage info from the session
      const { usage, quota } = chromeAPI.getSessionUsage(chromeSession);

      // Create session in database
      const newSession = await SessionDB.create({
        name: name.trim(),
        topK: topK !== undefined ? topK : params?.defaultTopK,
        temperature: temperature !== undefined ? temperature : params?.defaultTemperature,
        initialPrompts: initialPrompts.length > 0 ? initialPrompts : undefined,
        inputUsage: usage,
        inputQuota: quota
      });

      // Update application state
      addSession(newSession);
      setCurrentSession(newSession);
      setChromeSession(chromeSession);
      resetForm();
      setIsCreating(false);
    } catch (error) {
      setError(`Failed to create session: ${error}`);
      setIsCreating(false);
    }
  };

  const handleCloneSession = async (session: SessionRecord) => {
    if (!currentSession) return;
    
    try {
      setIsCloning(true);
      
      // Create a new Chrome session with same parameters
      const chromeSession = await chromeAPI.createSession({
        topK: session.topK,
        temperature: session.temperature,
        initialPrompts: session.initialPrompts
      });

      // Get usage info from the new session
      const { usage, quota } = chromeAPI.getSessionUsage(chromeSession);

      // Create cloned session in database
      const clonedSession = await SessionDB.create({
        name: `${session.name} (Clone)`,
        topK: session.topK,
        temperature: session.temperature,
        initialPrompts: session.initialPrompts,
        inputUsage: usage,
        inputQuota: quota
      });

      // Update application state
      addSession(clonedSession);
      setIsCloning(false);
    } catch (error) {
      setError(`Failed to clone session: ${error}`);
      setIsCloning(false);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      setIsDeleting(sessionId);
      
      // Delete session from database
      await SessionDB.delete(sessionId);
      
      // Delete session messages
      await MessageDB.deleteBySessionId(sessionId);
      
      // Update application state
      deleteSession(sessionId);
      
      // If deleted session was the current one, set current to null
      if (currentSession?.id === sessionId) {
        setCurrentSession(null);
        setChromeSession(null);
      }
      
      setIsDeleting(null);
    } catch (error) {
      setError(`Failed to delete session: ${error}`);
      setIsDeleting(null);
    }
  };

  const handleSelectSession = async (session: SessionRecord) => {
    try {
      setCurrentSession(session);
      
      if (onSessionSelect) {
        onSessionSelect(session);
      }
      
      // Create Chrome session with stored parameters
      const chromeSession = await chromeAPI.createSession({
        topK: session.topK,
        temperature: session.temperature,
        initialPrompts: session.initialPrompts
      });
      
      setChromeSession(chromeSession);
      
      // Update session usage info
      const { usage, quota } = chromeAPI.getSessionUsage(chromeSession);
      
      if (usage !== session.inputUsage || quota !== session.inputQuota) {
        await SessionDB.update(session.id, { inputUsage: usage, inputQuota: quota });
        updateSession({
          ...session,
          inputUsage: usage,
          inputQuota: quota
        });
      }
    } catch (error) {
      setError(`Failed to load session: ${error}`);
    }
  };

  const isModelAvailable = availability === 'available';

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Session Manager</h2>
        <p className="text-sm text-gray-600 mt-1">Create and manage Chrome Prompt API sessions</p>
      </div>
      
      <div className="p-4">
        {/* Create New Session Form */}
        <div className="space-y-4 mb-6">
          <h3 className="text-sm font-medium text-gray-900">Create New Session</h3>
          
          <div className="space-y-3">
            <div>
              <label htmlFor="session-name" className="block text-xs font-medium text-gray-700 mb-1">
                Session Name
              </label>
              <input
                id="session-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter session name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                disabled={!isModelAvailable || isCreating}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="top-k" className="block text-xs font-medium text-gray-700 mb-1">
                  Top-K (Optional)
                </label>
                <input
                  id="top-k"
                  type="number"
                  value={topK === undefined ? '' : topK}
                  onChange={(e) => setTopK(e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder={`Default: ${params?.defaultTopK || 3}`}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  min="1"
                  max={params?.maxTopK || 8}
                  disabled={!isModelAvailable || isCreating}
                />
              </div>
              
              <div>
                <label htmlFor="temperature" className="block text-xs font-medium text-gray-700 mb-1">
                  Temperature (Optional)
                </label>
                <input
                  id="temperature"
                  type="number"
                  value={temperature === undefined ? '' : temperature}
                  onChange={(e) => setTemperature(e.target.value ? parseFloat(e.target.value) : undefined)}
                  placeholder={`Default: ${params?.defaultTemperature || 1.0}`}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  step="0.1"
                  min="0"
                  max={params?.maxTemperature || 2.0}
                  disabled={!isModelAvailable || isCreating}
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="system-prompt" className="block text-xs font-medium text-gray-700 mb-1">
                System Prompt (Optional)
              </label>
              <textarea
                id="system-prompt"
                value={initialSystemPrompt}
                onChange={(e) => setInitialSystemPrompt(e.target.value)}
                placeholder="Enter system instructions for the model"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm min-h-[80px]"
                disabled={!isModelAvailable || isCreating}
              />
            </div>
            
            <button
              onClick={createSession}
              disabled={!isModelAvailable || isCreating || !name.trim()}
              className={`w-full px-4 py-2 text-sm font-medium rounded-md transition-colors
                ${isModelAvailable && !isCreating && name.trim()
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-200 text-gray-500 cursor-not-allowed'}`}
            >
              {isCreating ? 'Creating...' : 'Create Session'}
            </button>
          </div>
        </div>
        
        {/* Sessions List */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-900">Sessions ({sessions.length})</h3>
          
          {sessions.length === 0 ? (
            <div className="text-sm text-gray-500 p-4 text-center border border-dashed border-gray-300 rounded-md">
              No sessions created yet
            </div>
          ) : (
            <div className="space-y-2">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className={`border rounded-md p-3 transition-colors ${
                    currentSession?.id === session.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <button
                      className="text-left flex-grow"
                      onClick={() => handleSelectSession(session)}
                    >
                      <h4 className="text-sm font-medium text-gray-900 truncate">{session.name}</h4>
                      
                      <div className="mt-1 flex items-center text-xs text-gray-500">
                        <span className="flex items-center">
                          Top-K: {session.topK || 'Default'}
                        </span>
                        <span className="mx-2">•</span>
                        <span className="flex items-center">
                          Temp: {session.temperature || 'Default'}
                        </span>
                      </div>
                      
                      {/* Usage information */}
                      {session.inputQuota > 0 && (
                        <div className="mt-2">
                          <div className="flex justify-between text-xs mb-1">
                            <span>Usage</span>
                            <span>{Math.round((session.inputUsage / session.inputQuota) * 100)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div
                              className="bg-blue-600 h-1.5 rounded-full"
                              style={{
                                width: `${(session.inputUsage / session.inputQuota) * 100}%`
                              }}
                            ></div>
                          </div>
                        </div>
                      )}
                    </button>
                    
                    <div className="flex items-center space-x-2 ml-2">
                      <button
                        onClick={() => handleCloneSession(session)}
                        disabled={!isModelAvailable || isCloning}
                        className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-md"
                        title="Clone session"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M7 9a2 2 0 012-2h6a2 2 0 012 2v6a2 2 0 01-2 2H9a2 2 0 01-2-2V9z" />
                          <path d="M5 3a2 2 0 00-2 2v6a2 2 0 002 2V5h8a2 2 0 00-2-2H5z" />
                        </svg>
                      </button>
                      
                      <button
                        onClick={() => handleDeleteSession(session.id)}
                        disabled={isDeleting === session.id}
                        className="p-1.5 text-gray-500 hover:bg-red-100 hover:text-red-600 rounded-md"
                        title="Delete session"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  
                  {session.initialPrompts && session.initialPrompts.length > 0 && (
                    <div className="mt-2 bg-gray-50 p-2 rounded-md text-xs text-gray-600">
                      <div className="font-medium mb-1">System Prompt:</div>
                      <div className="italic">
                        {session.initialPrompts.find(p => p.role === 'system')?.content}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}