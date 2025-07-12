import { useState } from 'react';
import { AppProvider, useAppContext, useUIState } from './contexts/AppContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ModelManager } from './components/ModelManager';
import { SessionManager } from './components/SessionManager';
import { ChatInterface } from './components/ChatInterface';
import { DataManager } from './components/DataManager';

function AppContent() {
  const { state } = useAppContext();
  const { error, clearError } = useUIState();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'sessions' | 'data'>('sessions');

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Top Navigation */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-md hover:bg-gray-100 transition-colors"
            aria-label="Toggle sidebar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="text-xl font-semibold text-gray-900">Chrome Prompt API Test Platform</h1>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Model Status Indicator */}
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              state.modelAvailability === 'available' ? 'bg-green-500' :
              state.modelAvailability === 'downloadable' ? 'bg-yellow-500' :
              state.modelAvailability === 'downloading' ? 'bg-blue-500' :
              'bg-red-500'
            }`}></div>
            <span className="text-sm text-gray-600 capitalize">
              {state.modelAvailability}
            </span>
          </div>
          
          {/* Current Session Indicator */}
          {state.currentSession && (
            <div className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded-md">
              {state.currentSession.name}
            </div>
          )}
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className={`bg-white border-r border-gray-200 transition-all duration-300 ${
          sidebarOpen ? 'w-80' : 'w-0'
        } overflow-hidden flex flex-col`}>
          <div className="flex-1 overflow-y-auto">
            {/* Sidebar Tabs */}
            <div className="border-b border-gray-200">
              <nav className="flex">
                <button
                  onClick={() => setActiveTab('sessions')}
                  className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'sessions'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Sessions
                </button>
                <button
                  onClick={() => setActiveTab('data')}
                  className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'data'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Data
                </button>
              </nav>
            </div>

            {/* Model Manager - Always visible */}
            <div className="p-4 border-b border-gray-200">
              <ModelManager />
            </div>

            {/* Tab Content */}
            <div className="flex-1">
              {activeTab === 'sessions' ? (
                <SessionManager />
              ) : (
                <DataManager />
              )}
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col">
          <ChatInterface className="flex-1" />
        </main>
      </div>

      {/* Bottom Status Bar */}
      <footer className="bg-white border-t border-gray-200 px-4 py-2">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-4">
            <span>Sessions: {state.sessions.length}</span>
            <span>Messages: {state.currentMessages.length}</span>
            {state.chromeSession && (
              <span>
                Usage: {state.chromeSession.inputUsage}/{state.chromeSession.inputQuota}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-4">
            {state.isLoading && (
              <div className="flex items-center gap-1">
                <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Loading...</span>
              </div>
            )}
            
            <span>Chrome Prompt API Test Platform v1.0</span>
          </div>
        </div>
      </footer>

      {/* Global Error Display */}
      {error && (
        <div className="fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md shadow-lg z-50 max-w-md">
          <div className="flex items-start justify-between">
            <div className="flex items-start">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500 mr-2 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="font-medium text-sm">Error</p>
                <p className="text-sm mt-1">{error}</p>
              </div>
            </div>
            <button
              onClick={clearError}
              className="ml-2 text-red-500 hover:text-red-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </ErrorBoundary>
  );
}

export default App;