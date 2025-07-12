import React, { useState, useEffect } from 'react';
import { DataManager as DataManagerService } from '../lib/database';
import { useAppActions } from '../contexts/AppContext';
import { ExportData, StorageStats } from '../types/database';

interface DataManagerProps {
  className?: string;
}

export function DataManager({ className = '' }: DataManagerProps) {
  const { setError, setLoading } = useAppActions();
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [exportUrl, setExportUrl] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchStats();
    
    return () => {
      if (exportUrl) {
        URL.revokeObjectURL(exportUrl);
      }
    };
  }, []);

  const fetchStats = async () => {
    try {
      const storageStats = await DataManagerService.getStorageStats();
      setStats(storageStats);
    } catch (error) {
      setError(`Failed to get storage statistics: ${error}`);
    }
  };

  const handleExportData = async () => {
    try {
      setIsExporting(true);
      setLoading(true);
      
      // Clean up previous export URL if exists
      if (exportUrl) {
        URL.revokeObjectURL(exportUrl);
        setExportUrl(null);
      }
      
      // Export data
      const data = await DataManagerService.exportData();
      
      // Create a Blob and URL
      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      setExportUrl(url);
      setIsExporting(false);
      setLoading(false);
    } catch (error) {
      setError(`Failed to export data: ${error}`);
      setIsExporting(false);
      setLoading(false);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsImporting(true);
      setLoading(true);
      
      // Read the file
      const text = await file.text();
      const importedData: ExportData = JSON.parse(text);
      
      // Validate imported data
      if (!importedData.sessions || !importedData.messages) {
        throw new Error('Invalid import file format');
      }
      
      // Import data
      await DataManagerService.importData(importedData);
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // Refresh stats
      await fetchStats();
      
      setIsImporting(false);
      setLoading(false);
      
      // Show success message
      alert(`Successfully imported ${importedData.sessions.length} sessions and ${importedData.messages.length} messages`);
    } catch (error) {
      setError(`Failed to import data: ${error}`);
      setIsImporting(false);
      setLoading(false);
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleClearData = async () => {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
    
    try {
      setIsClearing(true);
      setLoading(true);
      
      // Clear all data
      await DataManagerService.clearAllData();
      
      // Reset stats
      setStats({
        sessionCount: 0,
        messageCount: 0,
        estimatedSize: 0
      });
      
      setIsClearing(false);
      setConfirmClear(false);
      setLoading(false);
      
      // Show success message
      alert('All data has been cleared successfully');
    } catch (error) {
      setError(`Failed to clear data: ${error}`);
      setIsClearing(false);
      setConfirmClear(false);
      setLoading(false);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const cancelClearConfirmation = () => {
    setConfirmClear(false);
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Data Manager</h2>
        <p className="text-sm text-gray-600 mt-1">Manage your sessions and chat data</p>
      </div>

      <div className="p-4 space-y-6">
        {/* Storage Statistics */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-900">Storage Statistics</h3>
          
          {stats ? (
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-gray-50 rounded-md p-3 text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.sessionCount}</div>
                <div className="text-xs text-gray-600 mt-1">Sessions</div>
              </div>
              
              <div className="bg-gray-50 rounded-md p-3 text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.messageCount}</div>
                <div className="text-xs text-gray-600 mt-1">Messages</div>
              </div>
              
              <div className="bg-gray-50 rounded-md p-3 text-center">
                <div className="text-2xl font-bold text-blue-600">{formatBytes(stats.estimatedSize)}</div>
                <div className="text-xs text-gray-600 mt-1">Storage Used</div>
              </div>
            </div>
          ) : (
            <div className="text-center p-4 text-sm text-gray-500">
              Loading statistics...
            </div>
          )}
          
          <button
            onClick={fetchStats}
            className="text-xs text-blue-600 hover:text-blue-800 mt-2"
          >
            Refresh Statistics
          </button>
        </div>
        
        {/* Data Export */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-900">Export Data</h3>
          <p className="text-xs text-gray-600">
            Export all your sessions and messages as a JSON file.
          </p>
          
          <div className="flex gap-3">
            <button
              onClick={handleExportData}
              disabled={isExporting}
              className={`px-3 py-1.5 text-sm font-medium rounded-md ${
                isExporting
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isExporting ? 'Exporting...' : 'Export All Data'}
            </button>
            
            {exportUrl && (
              <a
                href={exportUrl}
                download="chrome-prompt-data.json"
                className="px-3 py-1.5 text-sm font-medium text-green-700 bg-green-100 rounded-md hover:bg-green-200"
              >
                Download JSON
              </a>
            )}
          </div>
        </div>
        
        {/* Data Import */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-900">Import Data</h3>
          <p className="text-xs text-gray-600">
            Import sessions and messages from a previously exported JSON file.
          </p>
          
          <input
            type="file"
            ref={fileInputRef}
            accept=".json"
            onChange={handleFileChange}
            className="hidden"
          />
          
          <button
            onClick={handleImportClick}
            disabled={isImporting}
            className={`px-3 py-1.5 text-sm font-medium rounded-md ${
              isImporting
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                : 'bg-amber-600 text-white hover:bg-amber-700'
            }`}
          >
            {isImporting ? 'Importing...' : 'Import Data'}
          </button>
        </div>
        
        {/* Data Clear */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-900">Clear Data</h3>
          <p className="text-xs text-gray-600">
            Remove all sessions and messages from storage. This action cannot be undone.
          </p>
          
          <div className="flex items-center gap-3">
            <button
              onClick={handleClearData}
              disabled={isClearing}
              className={`px-3 py-1.5 text-sm font-medium rounded-md ${
                confirmClear
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-red-100 text-red-700 hover:bg-red-200'
              } ${isClearing ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isClearing
                ? 'Clearing...'
                : confirmClear
                ? 'Confirm Clear'
                : 'Clear All Data'}
            </button>
            
            {confirmClear && (
              <button
                onClick={cancelClearConfirmation}
                className="px-3 py-1.5 text-sm font-medium bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
        
        {/* Help Information */}
        <div className="border-t border-gray-200 pt-3 mt-6">
          <div className="text-xs text-gray-500 space-y-2">
            <p><strong>Export:</strong> Save your data to keep a backup of your sessions and messages.</p>
            <p><strong>Import:</strong> Restore previously exported data or transfer data between devices.</p>
            <p><strong>Clear:</strong> Remove all data to start fresh or free up storage space.</p>
          </div>
        </div>
      </div>
    </div>
  );
}