import { useState, useEffect } from 'react';
import { useModelState, useAppActions } from '../contexts/AppContext';
import { SessionCreateOptions, InitialPrompt } from '../types/chrome';
import { chromeAPI } from '../services/chromeApi';

interface SessionCreatorProps {
  isOpen: boolean;
  onClose: () => void;
  onSessionCreated?: (sessionId: string) => void;
}

export function SessionCreator({ isOpen, onClose, onSessionCreated }: SessionCreatorProps) {
  const { params } = useModelState();
  const { setError, addSession, setCurrentSession, setChromeSession } = useAppActions();
  
  const [name, setName] = useState('');
  const [topK, setTopK] = useState<number | undefined>(undefined);
  const [temperature, setTemperature] = useState<number | undefined>(undefined);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [userPrompt, setUserPrompt] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  
  // Reset form when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      setName(`New Session ${new Date().toLocaleTimeString()}`);
      setTopK(undefined);
      setTemperature(undefined);
      setSystemPrompt('');
      setUserPrompt('');
    }
  }, [isOpen]);
  
  const handleCreateSession = async () => {
    if (!name.trim()) {
      setError('Session name is required');
      return;
    }

    try {
      setIsCreating(true);
      
      // Validate parameters
      const validation = await chromeAPI.validateSessionParams(topK, temperature);
      if (!validation.valid) {
        setError(validation.errors.join(', '));
        setIsCreating(false);
        return;
      }
      
      // Prepare initial prompts
      const initialPrompts: InitialPrompt[] = [];
      
      if (systemPrompt.trim()) {
        initialPrompts.push({
          role: 'system',
          content: systemPrompt.trim()
        });
      }
      
      if (userPrompt.trim()) {
        initialPrompts.push({
          role: 'user',
          content: userPrompt.trim()
        });
      }
      
      // Create session options
      const options: SessionCreateOptions = {
        topK: topK !== undefined ? topK : params?.defaultTopK,
        temperature: temperature !== undefined ? temperature : params?.defaultTemperature,
        initialPrompts: initialPrompts.length > 0 ? initialPrompts : undefined
      };
      
      // Create Chrome session
      const chromeSession = await chromeAPI.createSession(options);
      const { usage, quota } = chromeAPI.getSessionUsage(chromeSession);
      
      // Create session in database
      const newSession = await import('../lib/database').then(db => db.SessionDB.create({
        name: name.trim(),
        topK: options.topK,
        temperature: options.temperature,
        initialPrompts: options.initialPrompts,
        inputUsage: usage,
        inputQuota: quota
      }));
      
      // Update application state
      addSession(newSession);
      setCurrentSession(newSession);
      setChromeSession(chromeSession);
      
      // Notify parent component
      if (onSessionCreated) {
        onSessionCreated(newSession.id);
      }
      
      // Close dialog
      onClose();
    } catch (error) {
      setError(`Failed to create session: ${error}`);
    } finally {
      setIsCreating(false);
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Create New Session</h2>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600"
            disabled={isCreating}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label htmlFor="session-name" className="block text-sm font-medium text-gray-700 mb-1">
              Session Name
            </label>
            <input
              id="session-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              placeholder="Enter a name for this session"
              disabled={isCreating}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="top-k" className="block text-sm font-medium text-gray-700 mb-1">
                Top-K
              </label>
              <input
                id="top-k"
                type="number"
                value={topK === undefined ? '' : topK}
                onChange={(e) => setTopK(e.target.value ? parseInt(e.target.value) : undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                placeholder={`Default: ${params?.defaultTopK || 3}`}
                min="1"
                max={params?.maxTopK || 8}
                disabled={isCreating}
              />
              <p className="mt-1 text-xs text-gray-500">
                Range: 1-{params?.maxTopK || 8}
              </p>
            </div>
            
            <div>
              <label htmlFor="temperature" className="block text-sm font-medium text-gray-700 mb-1">
                Temperature
              </label>
              <input
                id="temperature"
                type="number"
                value={temperature === undefined ? '' : temperature}
                onChange={(e) => setTemperature(e.target.value ? parseFloat(e.target.value) : undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                placeholder={`Default: ${params?.defaultTemperature || 1.0}`}
                step="0.1"
                min="0"
                max={params?.maxTemperature || 2.0}
                disabled={isCreating}
              />
              <p className="mt-1 text-xs text-gray-500">
                Range: 0-{params?.maxTemperature || 2.0}
              </p>
            </div>
          </div>
          
          <div>
            <label htmlFor="system-prompt" className="block text-sm font-medium text-gray-700 mb-1">
              System Prompt (Optional)
            </label>
            <textarea
              id="system-prompt"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm min-h-[80px]"
              placeholder="Instructions for the model (e.g., 'You are a helpful assistant')"
              disabled={isCreating}
            />
          </div>
          
          <div>
            <label htmlFor="user-prompt" className="block text-sm font-medium text-gray-700 mb-1">
              Initial User Message (Optional)
            </label>
            <textarea
              id="user-prompt"
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm min-h-[80px]"
              placeholder="First message to the model (e.g., 'Tell me about Chrome Prompt API')"
              disabled={isCreating}
            />
          </div>
          
          <div className="mt-6 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              disabled={isCreating}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreateSession}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-blue-300"
              disabled={isCreating || !name.trim()}
            >
              {isCreating ? 'Creating...' : 'Create Session'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}