import { useRef, useEffect } from 'react';
import { MessageRecord } from '../types/database';

interface MessageListProps {
  messages: MessageRecord[];
  currentSessionId?: string;
  onMessageClick?: (message: MessageRecord) => void;
  showTimestamp?: boolean;
  className?: string;
}

export function MessageList({
  messages,
  currentSessionId,
  onMessageClick,
  showTimestamp = true,
  className = '',
}: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Filter messages by current session if provided
  const filteredMessages = currentSessionId
    ? messages.filter(msg => msg.sessionId === currentSessionId)
    : messages;

  if (filteredMessages.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center py-10 ${className}`}>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <p className="text-gray-400 text-center">No messages yet. Start a conversation!</p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 py-4 ${className}`}>
      {filteredMessages.map((message) => (
        <div
          key={message.id}
          onClick={() => onMessageClick && onMessageClick(message)}
          className={`p-4 rounded-lg max-w-[85%] cursor-default transition-all 
            ${message.role === 'user'
              ? 'bg-blue-100 text-gray-900 ml-auto'
              : 'bg-white border border-gray-200 mr-auto'
            }
            ${onMessageClick ? 'hover:shadow-md cursor-pointer' : ''}`
          }
        >
          <div className={`whitespace-pre-wrap ${message.isError ? 'text-red-600' : ''}`}>
            {message.content || (message.isStreaming ? 'Thinking...' : '')}
            {message.isStreaming && (
              <span className="inline-block h-4 w-2 ml-1 bg-gray-400 animate-pulse"></span>
            )}
          </div>
          
          {showTimestamp && (
            <div className="text-xs text-gray-500 mt-1 flex justify-between items-center">
              <span className="flex items-center gap-1">
                {message.role === 'user' ? (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                    <span>You</span>
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" />
                      <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" />
                    </svg>
                    <span>Assistant</span>
                  </>
                )}
                <span>•</span>
                <span>{new Date(message.timestamp).toLocaleTimeString()}</span>
              </span>
              
              {/* Message status indicators */}
              <div className="flex items-center">
                {message.isStreaming && (
                  <span className="text-xs text-blue-600 flex items-center gap-1">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                    </span>
                    Streaming
                  </span>
                )}
                
                {message.isError && (
                  <span className="text-xs text-red-600 flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    Error
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}