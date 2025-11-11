import React, { useState, useEffect } from 'react';
import {
  initWorkspaceDB,
  getCurrentWorkspace,
  switchWorkspace,
  createWorkspace,
  deleteWorkspace,
  listWorkspaces,
  getCacheStats,
  clearCASCache,
  clearTransformersCache,
  clearDiagnosticLogs,
  exportWorkspace,
  importWorkspace,
  getDiagnosticLogs,
  getStorageEstimate,
  logDiagnostic
} from '../utils/workspaceDB.js';

export default function DatabasePage() {
  const [workspaces, setWorkspaces] = useState([]);
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState('default');
  const [stats, setStats] = useState(null);
  const [logs, setLogs] = useState([]);
  const [storageInfo, setStorageInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // overview, logs, import-export

  // Form states
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [newWorkspaceDesc, setNewWorkspaceDesc] = useState('');

  // Log filter states
  const [logLevelFilter, setLogLevelFilter] = useState('');
  const [logSourceFilter, setLogSourceFilter] = useState('');
  const [logTagFilter, setLogTagFilter] = useState('');
  const [logLimit, setLogLimit] = useState(100);

  useEffect(() => {
    initializeDatabase();
  }, []);

  useEffect(() => {
    if (currentWorkspaceId) {
      loadStats();
      loadLogs();
    }
  }, [currentWorkspaceId]);

  const initializeDatabase = async () => {
    try {
      await initWorkspaceDB();
      const current = getCurrentWorkspace();
      setCurrentWorkspaceId(current);
      await loadWorkspaces();
      await loadStorageInfo();
      setLoading(false);
    } catch (error) {
      console.error('Failed to initialize database:', error);
      setLoading(false);
    }
  };

  const loadWorkspaces = async () => {
    try {
      const workspaceList = await listWorkspaces();
      setWorkspaces(workspaceList);
    } catch (error) {
      console.error('Failed to load workspaces:', error);
    }
  };

  const loadStats = async () => {
    try {
      const cacheStats = await getCacheStats();
      setStats(cacheStats);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const loadLogs = async () => {
    try {
      const filters = {
        limit: logLimit,
        level: logLevelFilter || null,
        source: logSourceFilter || null,
        tags: logTagFilter ? [logTagFilter] : null
      };
      const diagnosticLogs = await getDiagnosticLogs(filters);
      setLogs(diagnosticLogs);
    } catch (error) {
      console.error('Failed to load logs:', error);
    }
  };

  // Reload logs when filters change
  useEffect(() => {
    if (currentWorkspaceId && activeTab === 'logs') {
      loadLogs();
    }
  }, [logLevelFilter, logSourceFilter, logTagFilter, logLimit, activeTab]);

  const handleExportLogsToClipboard = async () => {
    try {
      const logText = logs.map(log => {
        const timestamp = new Date(log.timestamp).toISOString();
        const perfMs = log.perfTimestamp || 0;
        const meta = Object.keys(log.metadata || {}).length > 0
          ? '\n  ' + JSON.stringify(log.metadata, null, 2).split('\n').join('\n  ')
          : '';
        const tags = log.tags && log.tags.length > 0 ? ` [${log.tags.join(', ')}]` : '';

        return `[${timestamp}] [${perfMs}ms] [${log.level.toUpperCase()}] [${log.source}]${tags}\n${log.message}${meta}`;
      }).join('\n\n' + '='.repeat(80) + '\n\n');

      await navigator.clipboard.writeText(logText);
      alert(`✓ Copied ${logs.length} log entries to clipboard`);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      alert(`Failed to copy to clipboard: ${error.message}`);
    }
  };

  const loadStorageInfo = async () => {
    try {
      const estimate = await getStorageEstimate();
      setStorageInfo(estimate);
    } catch (error) {
      console.error('Failed to load storage info:', error);
    }
  };

  const handleSwitchWorkspace = async (workspaceId) => {
    try {
      await switchWorkspace(workspaceId);
      setCurrentWorkspaceId(workspaceId);
      await loadStats();
      await loadLogs();
    } catch (error) {
      console.error('Failed to switch workspace:', error);
      alert(`Failed to switch workspace: ${error.message}`);
    }
  };

  const handleCreateWorkspace = async (e) => {
    e.preventDefault();
    if (!newWorkspaceName.trim()) {
      alert('Workspace name is required');
      return;
    }

    try {
      const workspace = await createWorkspace({
        id: `workspace-${Date.now()}`,
        name: newWorkspaceName,
        description: newWorkspaceDesc
      });

      await loadWorkspaces();
      setNewWorkspaceName('');
      setNewWorkspaceDesc('');
      alert(`Workspace "${workspace.name}" created successfully!`);
    } catch (error) {
      console.error('Failed to create workspace:', error);
      alert(`Failed to create workspace: ${error.message}`);
    }
  };

  const handleDeleteWorkspace = async (workspaceId) => {
    if (workspaceId === 'default') {
      alert('Cannot delete default workspace');
      return;
    }

    if (!confirm(`Are you sure you want to delete this workspace? This action cannot be undone.`)) {
      return;
    }

    try {
      await deleteWorkspace(workspaceId);
      await loadWorkspaces();
      if (currentWorkspaceId === workspaceId) {
        setCurrentWorkspaceId('default');
      }
      alert('Workspace deleted successfully');
    } catch (error) {
      console.error('Failed to delete workspace:', error);
      alert(`Failed to delete workspace: ${error.message}`);
    }
  };

  const handleClearCASCache = async () => {
    if (!confirm('Are you sure you want to clear the CAS cache? This will remove all cached canonical forms.')) {
      return;
    }

    try {
      const count = await clearCASCache();
      await loadStats();
      alert(`Cleared ${count} CAS cache entries`);
    } catch (error) {
      console.error('Failed to clear CAS cache:', error);
      alert(`Failed to clear cache: ${error.message}`);
    }
  };

  const handleClearTransformersCache = async () => {
    if (!confirm('Are you sure you want to clear the transformers cache metadata?')) {
      return;
    }

    try {
      const count = await clearTransformersCache();
      await loadStats();
      alert(`Cleared ${count} transformer cache entries`);
    } catch (error) {
      console.error('Failed to clear transformers cache:', error);
      alert(`Failed to clear cache: ${error.message}`);
    }
  };

  const handleClearLogs = async () => {
    if (!confirm('Are you sure you want to clear diagnostic logs?')) {
      return;
    }

    try {
      const count = await clearDiagnosticLogs();
      await loadLogs();
      alert(`Cleared ${count} log entries`);
    } catch (error) {
      console.error('Failed to clear logs:', error);
      alert(`Failed to clear logs: ${error.message}`);
    }
  };

  const handleExportWorkspace = async () => {
    try {
      const data = await exportWorkspace(currentWorkspaceId);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `texo-workspace-${currentWorkspaceId}-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      await logDiagnostic('info', 'export', `Exported workspace: ${currentWorkspaceId}`);
      alert('Workspace exported successfully!');
    } catch (error) {
      console.error('Failed to export workspace:', error);
      alert(`Failed to export workspace: ${error.message}`);
    }
  };

  const handleImportWorkspace = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      const newWorkspaceId = prompt('Enter a new workspace ID (leave blank to use original):');
      const overwrite = confirm('Overwrite existing workspace if it exists?');

      await importWorkspace(data, {
        newWorkspaceId: newWorkspaceId || null,
        overwrite
      });

      await loadWorkspaces();
      await loadStats();
      alert('Workspace imported successfully!');
    } catch (error) {
      console.error('Failed to import workspace:', error);
      alert(`Failed to import workspace: ${error.message}`);
    }

    // Reset file input
    e.target.value = '';
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleString();
  };

  const getLevelColor = (level) => {
    switch (level) {
      case 'error': return 'text-red-600';
      case 'warn': return 'text-yellow-600';
      case 'info': return 'text-blue-600';
      case 'debug': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading database...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">IndexedDB Management</h1>
          <p className="text-gray-600">Manage workspaces, cache, and diagnostic data</p>
        </div>

        {/* Workspace Selector */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Current Workspace</h2>
          <div className="flex items-center gap-4">
            <select
              value={currentWorkspaceId}
              onChange={(e) => handleSwitchWorkspace(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {workspaces.map((ws) => (
                <option key={ws.id} value={ws.id}>
                  {ws.name} {ws.id === 'default' ? '(Default)' : ''}
                </option>
              ))}
            </select>
            <button
              onClick={() => handleDeleteWorkspace(currentWorkspaceId)}
              disabled={currentWorkspaceId === 'default'}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              Delete
            </button>
          </div>

          {/* Create New Workspace */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-semibold mb-3">Create New Workspace</h3>
            <form onSubmit={handleCreateWorkspace} className="flex flex-col gap-3">
              <input
                type="text"
                placeholder="Workspace name"
                value={newWorkspaceName}
                onChange={(e) => setNewWorkspaceName(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <input
                type="text"
                placeholder="Description (optional)"
                value={newWorkspaceDesc}
                onChange={(e) => setNewWorkspaceDesc(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Create Workspace
              </button>
            </form>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {['overview', 'logs', 'import-export'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Cache Statistics */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Cache Statistics</h2>
              {stats ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="text-sm text-gray-600 mb-1">CAS Cache Entries</div>
                    <div className="text-2xl font-bold text-blue-600">{stats.casCache.count}</div>
                    {stats.casCache.count > 0 && (
                      <div className="text-xs text-gray-500 mt-2">
                        <div>Oldest: {formatTimestamp(stats.casCache.oldestEntry)}</div>
                        <div>Newest: {formatTimestamp(stats.casCache.newestEntry)}</div>
                      </div>
                    )}
                  </div>

                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="text-sm text-gray-600 mb-1">Transformers Cache</div>
                    <div className="text-2xl font-bold text-green-600">{stats.transformersCache.count}</div>
                  </div>

                  <div className="p-4 bg-purple-50 rounded-lg">
                    <div className="text-sm text-gray-600 mb-1">Session State Items</div>
                    <div className="text-2xl font-bold text-purple-600">{stats.sessionState.count}</div>
                  </div>

                  <div className="p-4 bg-orange-50 rounded-lg">
                    <div className="text-sm text-gray-600 mb-1">Diagnostic Logs</div>
                    <div className="text-2xl font-bold text-orange-600">{stats.diagnosticLogs.count}</div>
                    {Object.keys(stats.diagnosticLogs.byLevel).length > 0 && (
                      <div className="text-xs text-gray-500 mt-2">
                        {Object.entries(stats.diagnosticLogs.byLevel).map(([level, count]) => (
                          <div key={level}>{level}: {count}</div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-gray-500">Loading statistics...</div>
              )}

              {/* Cache Actions */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-lg font-semibold mb-3">Cache Management</h3>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={handleClearCASCache}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    Clear CAS Cache
                  </button>
                  <button
                    onClick={handleClearTransformersCache}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    Clear Transformers Cache
                  </button>
                  <button
                    onClick={handleClearLogs}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    Clear Diagnostic Logs
                  </button>
                  <button
                    onClick={loadStats}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                  >
                    Refresh Stats
                  </button>
                </div>
              </div>
            </div>

            {/* Storage Information */}
            {storageInfo && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold mb-4">Storage Information</h2>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Used:</span>
                    <span className="font-semibold">{formatBytes(storageInfo.usage || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Quota:</span>
                    <span className="font-semibold">{formatBytes(storageInfo.quota || 0)}</span>
                  </div>
                  {storageInfo.quota && storageInfo.usage && (
                    <div className="mt-4">
                      <div className="w-full bg-gray-200 rounded-full h-4">
                        <div
                          className="bg-blue-600 h-4 rounded-full"
                          style={{ width: `${(storageInfo.usage / storageInfo.quota) * 100}%` }}
                        />
                      </div>
                      <div className="text-sm text-gray-600 mt-1 text-center">
                        {((storageInfo.usage / storageInfo.quota) * 100).toFixed(2)}% used
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Diagnostic Logs Tab */}
        {activeTab === 'logs' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Diagnostic Logs</h2>
                <div className="flex gap-2">
                  <button
                    onClick={handleExportLogsToClipboard}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    disabled={logs.length === 0}
                  >
                    📋 Copy to Clipboard
                  </button>
                  <button
                    onClick={loadLogs}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                  >
                    Refresh
                  </button>
                </div>
              </div>

              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Level
                  </label>
                  <select
                    value={logLevelFilter}
                    onChange={(e) => setLogLevelFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                  >
                    <option value="">All Levels</option>
                    <option value="debug">Debug</option>
                    <option value="info">Info</option>
                    <option value="warn">Warn</option>
                    <option value="error">Error</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Source
                  </label>
                  <input
                    type="text"
                    value={logSourceFilter}
                    onChange={(e) => setLogSourceFilter(e.target.value)}
                    placeholder="e.g. EquivalenceChecker"
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Tag
                  </label>
                  <input
                    type="text"
                    value={logTagFilter}
                    onChange={(e) => setLogTagFilter(e.target.value)}
                    placeholder="e.g. equivalence"
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Limit
                  </label>
                  <select
                    value={logLimit}
                    onChange={(e) => setLogLimit(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                  >
                    <option value="50">50</option>
                    <option value="100">100</option>
                    <option value="200">200</option>
                    <option value="500">500</option>
                  </select>
                </div>
              </div>

              {/* Log Count */}
              <div className="mb-3 text-sm text-gray-600">
                Showing {logs.length} {logs.length === 1 ? 'entry' : 'entries'}
                {(logLevelFilter || logSourceFilter || logTagFilter) && ' (filtered)'}
              </div>

              {/* Logs List */}
              <div className="space-y-2 max-h-96 overflow-y-auto border border-gray-200 rounded-lg p-3">
                {logs.length === 0 ? (
                  <div className="text-gray-500 text-center py-8">
                    No logs match the current filters
                  </div>
                ) : (
                  logs.map((log) => (
                    <div
                      key={log.id}
                      className={`border-l-4 pl-3 py-2 ${
                        log.level === 'error'
                          ? 'border-red-500 bg-red-50'
                          : log.level === 'warn'
                          ? 'border-yellow-500 bg-yellow-50'
                          : log.level === 'info'
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-300 bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start gap-2 flex-wrap">
                        <span className={`font-semibold text-xs ${getLevelColor(log.level)}`}>
                          [{log.level.toUpperCase()}]
                        </span>
                        <span className="text-xs text-gray-500">[{log.source || log.category}]</span>
                        {log.perfTimestamp !== undefined && (
                          <span className="text-xs text-purple-600 font-mono">
                            [{log.perfTimestamp}ms]
                          </span>
                        )}
                        {log.tags && log.tags.length > 0 && (
                          <span className="text-xs text-blue-600">
                            {log.tags.map(tag => `#${tag}`).join(' ')}
                          </span>
                        )}
                        <span className="text-sm flex-1">{log.message}</span>
                        <span className="text-xs text-gray-400 whitespace-nowrap">
                          {formatTimestamp(log.timestamp)}
                        </span>
                      </div>
                      {Object.keys(log.metadata || {}).length > 0 && (
                        <details className="mt-2">
                          <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-800">
                            Metadata ({Object.keys(log.metadata).length} fields)
                          </summary>
                          <pre className="text-xs text-gray-600 mt-1 ml-4 overflow-x-auto bg-white p-2 rounded border border-gray-200">
                            {JSON.stringify(log.metadata, null, 2)}
                          </pre>
                        </details>
                      )}
                      {log.stackTrace && (
                        <details className="mt-2">
                          <summary className="text-xs text-red-600 cursor-pointer hover:text-red-800">
                            Stack Trace
                          </summary>
                          <pre className="text-xs text-red-600 mt-1 ml-4 overflow-x-auto bg-white p-2 rounded border border-red-200">
                            {log.stackTrace}
                          </pre>
                        </details>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Log Helper Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">Log Filtering Tips</h3>
              <ul className="list-disc list-inside text-sm text-blue-800 space-y-1">
                <li><strong>Level:</strong> Filter by severity (debug, info, warn, error)</li>
                <li><strong>Source:</strong> Filter by component (e.g., EquivalenceChecker, Algebrite)</li>
                <li><strong>Tag:</strong> Filter by category tags (e.g., equivalence, parse, algebrite)</li>
                <li><strong>Performance timestamps:</strong> Shown in purple as [Xms] from page load</li>
                <li><strong>Metadata:</strong> Click to expand detailed information</li>
                <li><strong>Copy to Clipboard:</strong> Export visible logs as formatted text</li>
              </ul>
            </div>
          </div>
        )}

        {/* Import/Export Tab */}
        {activeTab === 'import-export' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Export Workspace</h2>
              <p className="text-gray-600 mb-4">
                Export the current workspace including all cache data, session state, and diagnostic logs.
              </p>
              <button
                onClick={handleExportWorkspace}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Export Current Workspace
              </button>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Import Workspace</h2>
              <p className="text-gray-600 mb-4">
                Import a previously exported workspace. You'll be prompted to choose a new workspace ID and whether to overwrite existing data.
              </p>
              <input
                type="file"
                accept=".json"
                onChange={handleImportWorkspace}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-lg file:border-0
                  file:text-sm file:font-semibold
                  file:bg-blue-50 file:text-blue-700
                  hover:file:bg-blue-100"
              />
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <h3 className="font-semibold text-yellow-900 mb-2">Important Notes</h3>
              <ul className="list-disc list-inside text-sm text-yellow-800 space-y-1">
                <li>Exported files contain all workspace data including cache and logs</li>
                <li>Import can create a new workspace or overwrite an existing one</li>
                <li>The default workspace cannot be deleted but can be overwritten</li>
                <li>Workspace IDs must be unique</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
