import { useEffect, useState } from 'react';
import { useModelState, useAppActions } from '../contexts/AppContext';
import { chromeAPI } from '../services/chromeApi';
import { ModelAvailability } from '../types/chrome';

interface ModelManagerProps {
  className?: string;
}

export function ModelManager({ className = '' }: ModelManagerProps) {
  const { availability, params, error } = useModelState();
  const { setModelAvailability, setModelParams, setModelError } = useAppActions();
  
  const [isChecking, setIsChecking] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<{ loaded: number; total?: number } | null>(null);
  const [browserSupport, setBrowserSupport] = useState<{ supported: boolean; issues: string[]; recommendations: string[] } | null>(null);
  const [apiDiagnostics, setApiDiagnostics] = useState<{
    apiAvailable: boolean;
    chromeVersion: string | null;
    isHttps: boolean;
    isChromeBrowser: boolean;
    details: string;
  } | null>(null);

  // Check model availability on component mount
  useEffect(() => {
    checkModelStatus();
    checkBrowserSupport();
    checkApiDiagnostics();
  }, []);

  const checkModelStatus = async () => {
    setIsChecking(true);
    setModelError(null);
    
    try {
      const modelAvailability = await chromeAPI.checkAvailability();
      setModelAvailability(modelAvailability);
      
      if (modelAvailability !== 'unavailable') {
        const modelParams = await chromeAPI.getModelParams();
        setModelParams(modelParams);
      }
    } catch (error) {
      setModelError(`Failed to check model status: ${error}`);
    } finally {
      setIsChecking(false);
    }
  };

  const checkBrowserSupport = async () => {
    const support = await chromeAPI.checkBrowserSupport();
    setBrowserSupport(support);
  };

  const checkApiDiagnostics = async () => {
    const diagnostics = await chromeAPI.getApiDiagnostics();
    setApiDiagnostics(diagnostics);
  };

  const handleDownloadModel = async () => {
    if (availability !== 'downloadable') return;
    
    setDownloadProgress({ loaded: 0 });
    setModelError(null);
    
    try {
      await chromeAPI.createSessionWithProgress(
        {},
        (loaded, total) => {
          setDownloadProgress({ loaded, total });
        }
      );
      
      // Refresh model status after download
      await checkModelStatus();
      setDownloadProgress(null);
    } catch (error) {
      setModelError(`Model download failed: ${error}`);
      setDownloadProgress(null);
    }
  };

  const getAvailabilityStatusText = (status: ModelAvailability): string => {
    switch (status) {
      case 'unavailable':
        return 'Unavailable';
      case 'downloadable':
        return 'Ready to Download';
      case 'downloading':
        return 'Downloading...';
      case 'available':
        return 'Available';
      default:
        return 'Unknown';
    }
  };

  const getAvailabilityStatusColor = (status: ModelAvailability): string => {
    switch (status) {
      case 'unavailable':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'downloadable':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'downloading':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'available':
        return 'text-green-600 bg-green-50 border-green-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const formatProgress = (progress: { loaded: number; total?: number }): string => {
    if (progress.total) {
      const percentage = Math.round((progress.loaded / progress.total) * 100);
      return `${percentage}%`;
    }
    return `${Math.round(progress.loaded * 100)}%`;
  };

  const renderExternalLink = (url: string, text: string) => (
    <a 
      href={url} 
      target="_blank" 
      rel="noopener noreferrer" 
      className="text-blue-600 hover:text-blue-800 hover:underline"
    >
      {text}
    </a>
  );

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Model Manager</h2>
        <p className="text-sm text-gray-600 mt-1">Chrome Prompt API Model Status</p>
      </div>

      <div className="p-4 space-y-4">
        {/* API Diagnostics Section */}
        {apiDiagnostics && !apiDiagnostics.apiAvailable && (
          <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
            <h3 className="text-sm font-medium text-amber-800">Chrome Prompt API Setup Required</h3>
            <p className="mt-1 text-sm text-amber-700">{apiDiagnostics.details}</p>
            
            {!apiDiagnostics.isChromeBrowser && (
              <div className="mt-2">
                <p className="text-sm text-amber-700 font-semibold">Required Action:</p>
                <p className="text-sm text-amber-700">
                  Please use {renderExternalLink("https://www.google.com/chrome/", "Google Chrome")} browser version 128+
                </p>
              </div>
            )}
            
            {apiDiagnostics.isChromeBrowser && apiDiagnostics.chromeVersion && parseInt(apiDiagnostics.chromeVersion) < 128 && (
              <div className="mt-2">
                <p className="text-sm text-amber-700 font-semibold">Required Action:</p>
                <p className="text-sm text-amber-700">
                  Please update to Chrome 128+ or use {renderExternalLink("https://www.google.com/chrome/canary/", "Chrome Canary")}
                </p>
              </div>
            )}
            
            {!apiDiagnostics.isHttps && (
              <div className="mt-2">
                <p className="text-sm text-amber-700 font-semibold">Required Action:</p>
                <p className="text-sm text-amber-700">
                  This app must run on an HTTPS connection
                </p>
              </div>
            )}
            
            {apiDiagnostics.isChromeBrowser && parseInt(apiDiagnostics.chromeVersion || "0") >= 128 && apiDiagnostics.isHttps && (
              <div className="mt-2">
                <p className="text-sm text-amber-700 font-semibold">Required Actions:</p>
                <ol className="list-decimal ml-5 mt-1 space-y-1 text-sm text-amber-700">
                  <li>Open {renderExternalLink("chrome://flags/#prompt-api", "chrome://flags/#prompt-api")}</li>
                  <li>Set to "Enabled"</li>
                  <li>Open {renderExternalLink("chrome://flags/#enable-experimental-web-platform-features", "chrome://flags/#enable-experimental-web-platform-features")}</li>
                  <li>Set to "Enabled"</li>
                  <li>Restart Chrome browser</li>
                  <li>Return to this page and refresh</li>
                </ol>
              </div>
            )}
          </div>
        )}

        {/* Browser Support Status with Recommendations */}
        {browserSupport && !browserSupport.supported && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <h3 className="text-sm font-medium text-red-800">Browser Compatibility Issues</h3>
            <ul className="mt-2 text-sm text-red-700 space-y-1">
              {browserSupport.issues.map((issue, index) => (
                <li key={index} className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>{issue}</span>
                </li>
              ))}
            </ul>
            
            {browserSupport.recommendations.length > 0 && (
              <>
                <h4 className="text-sm font-medium text-red-800 mt-3">Recommendations</h4>
                <ul className="mt-1 text-sm text-red-700 space-y-1">
                  {browserSupport.recommendations.map((recommendation, index) => (
                    <li key={index} className="flex items-start">
                      <span className="mr-2">→</span>
                      <span>{recommendation}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}

        {/* Model Status */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-900">Model Status</h3>
            <button
              onClick={() => {
                checkModelStatus();
                checkBrowserSupport();
                checkApiDiagnostics();
              }}
              disabled={isChecking}
              className="px-3 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 disabled:text-gray-400"
            >
              {isChecking ? 'Checking...' : 'Refresh'}
            </button>
          </div>

          <div className={`px-3 py-2 rounded-md border text-sm font-medium ${getAvailabilityStatusColor(availability)}`}>
            {getAvailabilityStatusText(availability)}
          </div>

          {/* Download Progress */}
          {downloadProgress && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Download Progress</span>
                <span className="font-medium">{formatProgress(downloadProgress)}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: downloadProgress.total
                      ? `${(downloadProgress.loaded / downloadProgress.total) * 100}%`
                      : `${downloadProgress.loaded * 100}%`
                  }}
                />
              </div>
            </div>
          )}

          {/* Download Button */}
          {availability === 'downloadable' && !downloadProgress && (
            <button
              onClick={handleDownloadModel}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              Download Model
            </button>
          )}
        </div>

        {/* Model Parameters */}
        {params && availability === 'available' && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-900">Model Parameters</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-gray-50 rounded-md p-3">
                <div className="text-gray-600 mb-1">Top-K</div>
                <div className="font-medium">
                  Default: {params.defaultTopK} / Max: {params.maxTopK}
                </div>
              </div>
              <div className="bg-gray-50 rounded-md p-3">
                <div className="text-gray-600 mb-1">Temperature</div>
                <div className="font-medium">
                  Default: {params.defaultTemperature} / Max: {params.maxTemperature}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <p className="mt-1 text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Model Information */}
        <div className="space-y-2 text-xs text-gray-500 border-t border-gray-200 pt-3">
          <p>Chrome Prompt API uses Gemini Nano model</p>
          <p>Requires Chrome 128+ with 4GB+ GPU VRAM</p>
          <p>Model size: ~22GB storage required</p>
          <p>
            Learn more: {renderExternalLink(
              "https://developer.chrome.com/docs/web-platform/prompt-api",
              "Chrome Prompt API Documentation"
            )}
          </p>
        </div>
      </div>
    </div>
  );
}