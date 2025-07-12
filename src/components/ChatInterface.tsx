import { useState, useRef, useEffect } from 'react';
import { useSessionState, useChromeSession, useAppActions } from '../contexts/AppContext';
import { MessageDB } from '../lib/database';
import { chromeAPI } from '../services/chromeApi';
import { MessageRecord } from '../types/database';

interface ChatInterfaceProps {
  className?: string;
}

export function ChatInterface({ className = '' }: ChatInterfaceProps) {
  const { currentSession, messages } = useSessionState();
  const chromeSession = useChromeSession();
  const { addMessage, updateMessage, setError, updateSession } = useAppActions();

  const [inputText, setInputText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [useStreaming, setUseStreaming] = useState(true);
  const [responseId, setResponseId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Send message on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || !currentSession || !chromeSession || isSubmitting) return;

    try {
      setIsSubmitting(true);

      // Create user message
      const userMessage = await MessageDB.create({
        sessionId: currentSession.id,
        role: 'user',
        content: inputText.trim()
      });

      // Add user message to UI
      addMessage(userMessage);
      setInputText('');

      // Create placeholder for AI response
      const aiMessage = await MessageDB.create({
        sessionId: currentSession.id,
        role: 'assistant',
        content: '',
        isStreaming: true
      });

      // Store response ID for tracking current response
      setResponseId(aiMessage.id);
      addMessage(aiMessage);

      // Create abort controller for cancellation
      abortControllerRef.current = new AbortController();
      
      if (useStreaming) {
        await handleStreamingResponse(userMessage, aiMessage);
      } else {
        await handleNonStreamingResponse(userMessage, aiMessage);
      }

      // Update session usage info
      const { usage, quota } = chromeAPI.getSessionUsage(chromeSession);
      await updateSession({
        ...currentSession,
        inputUsage: usage,
        inputQuota: quota
      });

    } catch (error: any) {
      if (error.name !== 'AbortError') {
        setError(`Failed to get response: ${error}`);
        
        // Update message to show error if it still exists
        if (responseId) {
          const errorMessage: Partial<MessageRecord> = {
            content: 'Error: Failed to get response',
            isStreaming: false,
            isError: true
          };
          
          await MessageDB.update(responseId, errorMessage);
          updateMessage({
            ...messages.find(m => m.id === responseId)!,
            ...errorMessage
          });
        }
      }
    } finally {
      setIsSubmitting(false);
      setIsStreaming(false);
      abortControllerRef.current = null;
      setResponseId(null);
    }
  };

  const handleNonStreamingResponse = async (userMessage: MessageRecord, aiMessage: MessageRecord) => {
    try {
      // Execute non-streaming prompt
      const response = await chromeAPI.prompt(
        chromeSession!, 
        userMessage.content,
        { signal: abortControllerRef.current?.signal }
      );
      
      // Update AI message with response
      const updatedMessage: Partial<MessageRecord> = {
        content: response,
        isStreaming: false
      };
      
      await MessageDB.update(aiMessage.id, updatedMessage);
      updateMessage({
        ...aiMessage,
        ...updatedMessage
      });
    } catch (error) {
      throw error;
    }
  };

  const handleStreamingResponse = async (userMessage: MessageRecord, aiMessage: MessageRecord) => {
    try {
      setIsStreaming(true);
      
      // Execute streaming prompt
      const stream = await chromeAPI.promptStreaming(
        chromeSession!,
        userMessage.content,
        { signal: abortControllerRef.current?.signal }
      );

      let accumulatedContent = '';
      const reader = stream.getReader();
      
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        // Accumulate content
        accumulatedContent += value;
        
        // Update message with streaming content
        const updatedMessage: Partial<MessageRecord> = {
          content: accumulatedContent,
          isStreaming: true
        };
        
        // Update in UI (don't await database to keep streaming smooth)
        updateMessage({
          ...aiMessage,
          ...updatedMessage
        });

        // Save to database periodically (every 5 chunks or so)
        if (Math.random() < 0.2) {
          MessageDB.update(aiMessage.id, updatedMessage).catch(console.error);
        }
      }
      
      // Final update to database with complete content and isStreaming=false
      const finalMessage: Partial<MessageRecord> = {
        content: accumulatedContent,
        isStreaming: false
      };
      
      await MessageDB.update(aiMessage.id, finalMessage);
      updateMessage({
        ...aiMessage,
        ...finalMessage
      });
      
    } catch (error) {
      throw error;
    } finally {
      setIsStreaming(false);
    }
  };

  const handleCancelResponse = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsStreaming(false);
      setIsSubmitting(false);
      
      // Update the message to indicate cancellation
      if (responseId) {
        const cancelledMessage = messages.find(m => m.id === responseId);
        if (cancelledMessage) {
          const updatedContent = cancelledMessage.content + "\n[Response cancelled]";
          
          MessageDB.update(responseId, {
            content: updatedContent,
            isStreaming: false
          }).then(() => {
            updateMessage({
              ...cancelledMessage,
              content: updatedContent,
              isStreaming: false
            });
          }).catch(console.error);
        }
      }
    }
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Chat Header */}
      <div className="bg-white border-b border-gray-200 p-4 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            {currentSession ? currentSession.name : 'Select a Session'}
          </h2>
          {currentSession && (
            <div className="text-xs text-gray-500 flex items-center gap-2">
              <span>Top-K: {currentSession.topK || 'Default'}</span>
              <span>•</span>
              <span>Temp: {currentSession.temperature || 'Default'}</span>
              <span>•</span>
              <span>Usage: {Math.round((currentSession.inputUsage / currentSession.inputQuota) * 100)}%</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center">
            <span className="text-xs text-gray-600 mr-2">Streaming</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={useStreaming}
                onChange={() => setUseStreaming(!useStreaming)}
                className="sr-only peer"
                disabled={isSubmitting}
              />
              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      {currentSession ? (
        <div className="flex-grow overflow-y-auto bg-gray-50 p-4">
          <div className="space-y-4">
            {messages.length === 0 ? (
              <div className="text-center p-8 text-gray-400">
                <p>No messages yet. Start a conversation!</p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`p-4 rounded-lg max-w-[85%] ${
                    message.role === 'user'
                      ? 'bg-blue-100 text-gray-900 ml-auto'
                      : 'bg-white border border-gray-200 mr-auto'
                  }`}
                >
                  <div className={`prose ${message.isError ? 'text-red-600' : ''}`}>
                    {message.content || (message.isStreaming ? 'Thinking...' : '')}
                    {message.isStreaming && (
                      <span className="inline-block h-4 w-2 ml-1 bg-gray-400 animate-pulse"></span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-1 flex justify-between items-center">
                    <span>
                      {message.role === 'user' ? 'You' : 'Assistant'} • {new Date(message.timestamp).toLocaleTimeString()}
                    </span>
                    {message.isStreaming && (
                      <button 
                        onClick={handleCancelResponse}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      ) : (
        <div className="flex-grow flex items-center justify-center bg-gray-50">
          <div className="text-center text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-lg">Select or create a session to start chatting</p>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="bg-white border-t border-gray-200 p-4">
        <div className="flex items-end gap-2">
          <textarea
            value={inputText}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={currentSession ? "Type your message..." : "Select a session to start chatting"}
            className="flex-grow p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            rows={3}
            disabled={!currentSession || isSubmitting}
          />
          <button
            onClick={handleSendMessage}
            disabled={!currentSession || !inputText.trim() || isSubmitting}
            className={`px-4 py-3 rounded-lg flex items-center justify-center ${
              !currentSession || !inputText.trim() || isSubmitting
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isSubmitting ? (
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        </div>
        
        {/* Status indicator */}
        <div className="mt-2 text-xs text-gray-500 flex items-center justify-between">
          <div>
            {isStreaming && <span className="text-blue-600">Streaming response...</span>}
            {isSubmitting && !isStreaming && <span className="text-yellow-600">Processing...</span>}
            {!isSubmitting && currentSession && messages.length > 0 && <span>Ready for input</span>}
          </div>
          
          {/* Character count */}
          <div className={`${inputText.length > 500 ? 'text-yellow-600' : ''}`}>
            {inputText.length} characters
          </div>
        </div>
      </div>
    </div>
  );
}