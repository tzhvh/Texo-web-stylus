import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  getDatabaseStats,
  clearAllCaches,
  exportDatabase,
  importDatabase,
  createWorkspace,
  listWorkspaces,
  deleteWorkspace,
  saveWorkspaceSnapshot,
  restoreWorkspaceSnapshot,
  getWorkspace,
  updateWorkspace
} from '../utils/versionedIndexedDBManager';

export default function ManageDBPage() {
  const [stats, setStats] = useState(null);
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('stats'); // stats, workspaces, import-export
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [newWorkspaceDesc, setNewWorkspaceDesc] = useState('');
  const [clearingCache, setClearingCache] = useState(false);
  const [exportingData, setExportingData] = useState(false);
  const [importingData, setImportingData] = useState(false);
  const [savingSnapshot, setSavingSnapshot] = useState(null);
  const [restoringSnapshot, setRestoringSnapshot] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  // Load initial data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsData, workspacesList] = await Promise.all([
        getDatabaseStats(),
        listWorkspaces()
      ]);
      setStats(statsData);
      setWorkspaces(workspacesList);
      setError(null);
    } catch (err) {
      setError(`Failed to load data: ${err.message}`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleClearCache = async () => {
    if (!window.confirm('Are you sure you want to clear all caches? This cannot be undone.')) {
      return;
    }

    try {
      setClearingCache(true);
      await clearAllCaches();
      setSuccessMessage('✓ All caches cleared successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
      await loadData();
    } catch (err) {
      setError(`Failed to clear cache: ${err.message}`);
    } finally {
      setClearingCache(false);
    }
  };

  const handleExportData = async () => {
    try {
      setExportingData(true);
      const data = await exportDatabase();
      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `texo-db-export-${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setSuccessMessage('✓ Database exported successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(`Failed to export database: ${err.message}`);
    } finally {
      setExportingData(false);
    }
  };

  const handleImportData = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!window.confirm('This will import data into your database. Continue?')) {
      event.target.value = '';
      return;
    }

    try {
      setImportingData(true);
      const text = await file.text();
      const data = JSON.parse(text);

      const result = await importDatabase(data, { mergeMode: true });
      setSuccessMessage(
        `✓ Import successful! Imported ${result.imported.cache} cache entries, ${result.imported.workspaces} workspaces, ${result.imported.metadata} metadata items.`
      );
      setTimeout(() => setSuccessMessage(''), 5000);
      await loadData();
    } catch (err) {
      setError(`Failed to import database: ${err.message}`);
    } finally {
      setImportingData(false);
      event.target.value = '';
    }
  };

  const handleCreateWorkspace = async () => {
    if (!newWorkspaceName.trim()) {
      setError('Workspace name is required');
      return;
    }

    try {
      await createWorkspace(newWorkspaceName, newWorkspaceDesc);
      setSuccessMessage('✓ Workspace created successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
      setNewWorkspaceName('');
      setNewWorkspaceDesc('');
      await loadData();
    } catch (err) {
      setError(`Failed to create workspace: ${err.message}`);
    }
  };

  const handleDeleteWorkspace = async (id) => {
    if (!window.confirm('Are you sure you want to delete this workspace?')) {
      return;
    }

    try {
      await deleteWorkspace(id);
      setSuccessMessage('✓ Workspace deleted successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
      await loadData();
    } catch (err) {
      setError(`Failed to delete workspace: ${err.message}`);
    }
  };

  const handleSaveSnapshot = async (id) => {
    try {
      setSavingSnapshot(id);
      await saveWorkspaceSnapshot(id);
      setSuccessMessage('✓ Snapshot saved successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
      await loadData();
    } catch (err) {
      setError(`Failed to save snapshot: ${err.message}`);
    } finally {
      setSavingSnapshot(null);
    }
  };

  const handleRestoreSnapshot = async (id) => {
    if (!window.confirm('This will restore your cache to the state when the snapshot was saved. Continue?')) {
      return;
    }

    try {
      setRestoringSnapshot(id);
      const result = await restoreWorkspaceSnapshot(id);
      setSuccessMessage(`✓ Snapshot restored! Restored ${result.restored} cache entries.`);
      setTimeout(() => setSuccessMessage(''), 3000);
      await loadData();
    } catch (err) {
      setError(`Failed to restore snapshot: ${err.message}`);
    } finally {
      setRestoringSnapshot(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center h-96">
            <div className="text-white text-lg">Loading database information...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Database Manager</h1>
            <p className="text-slate-400">Manage IndexedDB cache, workspaces, and data</p>
          </div>
          <Link
            to="/"
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition"
          >
            ← Back
          </Link>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/50 border border-red-700 rounded-lg text-red-200">
            {error}
            <button
              onClick={() => setError(null)}
              className="float-right ml-2 text-red-300 hover:text-red-100"
            >
              ✕
            </button>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 p-4 bg-green-900/50 border border-green-700 rounded-lg text-green-200">
            {successMessage}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b border-slate-700">
          <button
            onClick={() => setActiveTab('stats')}
            className={`px-4 py-3 font-medium transition ${
              activeTab === 'stats'
                ? 'border-b-2 border-blue-500 text-blue-400'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            📊 Statistics
          </button>
          <button
            onClick={() => setActiveTab('workspaces')}
            className={`px-4 py-3 font-medium transition ${
              activeTab === 'workspaces'
                ? 'border-b-2 border-blue-500 text-blue-400'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            💼 Workspaces
          </button>
          <button
            onClick={() => setActiveTab('import-export')}
            className={`px-4 py-3 font-medium transition ${
              activeTab === 'import-export'
                ? 'border-b-2 border-blue-500 text-blue-400'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            📦 Import/Export
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'stats' && (
          <div className="space-y-6">
            {/* Database Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-6">
                <div className="text-slate-400 text-sm mb-2">Cache Entries</div>
                <div className="text-3xl font-bold text-white">{stats?.cache.count || 0}</div>
                <div className="text-xs text-slate-500 mt-2">
                  ~{Math.round((stats?.cache.estimatedSize || 0) / 1024)} KB
                </div>
              </div>

              <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-6">
                <div className="text-slate-400 text-sm mb-2">Workspaces</div>
                <div className="text-3xl font-bold text-white">{stats?.workspaces.count || 0}</div>
              </div>

              <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-6">
                <div className="text-slate-400 text-sm mb-2">Metadata Entries</div>
                <div className="text-3xl font-bold text-white">{stats?.metadata.count || 0}</div>
              </div>

              <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-6">
                <div className="text-slate-400 text-sm mb-2">Schema Version</div>
                <div className="text-3xl font-bold text-white">{stats?.version || 0}</div>
              </div>
            </div>

            {/* Clear Cache Action */}
            <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Cache Management</h3>
              <p className="text-slate-400 mb-4">
                This will clear all cached canonical forms, transformers, and other cached data. This action cannot be undone.
              </p>
              <button
                onClick={handleClearCache}
                disabled={clearingCache}
                className="px-6 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-800 disabled:opacity-50 text-white font-medium rounded-lg transition"
              >
                {clearingCache ? 'Clearing...' : '🗑️ Clear All Caches'}
              </button>
            </div>

            {/* Database Info */}
            <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Database Information</h3>
              <div className="space-y-2 text-slate-300 font-mono text-sm">
                <div>Database Name: <span className="text-blue-400">{stats?.dbName}</span></div>
                <div>Schema Version: <span className="text-blue-400">v{stats?.version}</span></div>
                <div>Total Entries: <span className="text-blue-400">{stats?.totalEntries}</span></div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'workspaces' && (
          <div className="space-y-6">
            {/* Create Workspace */}
            <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Create New Workspace</h3>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Workspace name"
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                />
                <textarea
                  placeholder="Description (optional)"
                  value={newWorkspaceDesc}
                  onChange={(e) => setNewWorkspaceDesc(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 h-24"
                />
                <button
                  onClick={handleCreateWorkspace}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition"
                >
                  ✨ Create Workspace
                </button>
              </div>
            </div>

            {/* Workspaces List */}
            <div className="space-y-3">
              {workspaces.length === 0 ? (
                <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-6 text-center text-slate-400">
                  No workspaces yet. Create one above to get started.
                </div>
              ) : (
                workspaces.map((workspace) => (
                  <div key={workspace.id} className="bg-slate-700/50 border border-slate-600 rounded-lg p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h4 className="text-xl font-semibold text-white">{workspace.name}</h4>
                        {workspace.description && (
                          <p className="text-slate-400 text-sm mt-1">{workspace.description}</p>
                        )}
                        <div className="flex gap-4 mt-3 text-xs text-slate-500">
                          <div>Created: {new Date(workspace.createdAt).toLocaleDateString()}</div>
                          <div>Updated: {new Date(workspace.updatedAt).toLocaleDateString()}</div>
                          {workspace.cacheSnapshot && (
                            <div className="text-green-400">
                              ✓ Snapshot: {new Date(workspace.cacheSnapshot.timestamp).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => handleSaveSnapshot(workspace.id)}
                        disabled={savingSnapshot === workspace.id}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:opacity-50 text-white text-sm font-medium rounded transition"
                      >
                        {savingSnapshot === workspace.id ? 'Saving...' : '💾 Save Snapshot'}
                      </button>
                      {workspace.cacheSnapshot && (
                        <button
                          onClick={() => handleRestoreSnapshot(workspace.id)}
                          disabled={restoringSnapshot === workspace.id}
                          className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-800 disabled:opacity-50 text-white text-sm font-medium rounded transition"
                        >
                          {restoringSnapshot === workspace.id ? 'Restoring...' : '↩️ Restore Snapshot'}
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteWorkspace(workspace.id)}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded transition"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'import-export' && (
          <div className="space-y-6">
            {/* Export Section */}
            <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Export Database</h3>
              <p className="text-slate-400 mb-4">
                Download your entire database as a JSON file. This includes all cache entries, workspaces, and metadata.
              </p>
              <button
                onClick={handleExportData}
                disabled={exportingData}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:opacity-50 text-white font-medium rounded-lg transition"
              >
                {exportingData ? 'Exporting...' : '⬇️ Export Database'}
              </button>
            </div>

            {/* Import Section */}
            <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Import Database</h3>
              <p className="text-slate-400 mb-4">
                Upload a previously exported JSON file. Your current data will be merged with the imported data (existing entries are updated if they have the same key).
              </p>
              <label className="inline-block">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportData}
                  disabled={importingData}
                  className="hidden"
                />
                <div
                  className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:opacity-50 text-white font-medium rounded-lg transition cursor-pointer inline-block"
                  style={{ opacity: importingData ? 0.5 : 1, pointerEvents: importingData ? 'none' : 'auto' }}
                >
                  {importingData ? 'Importing...' : '⬆️ Import Database'}
                </div>
              </label>
            </div>

            {/* Import/Export Info */}
            <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">📋 About Import/Export</h3>
              <ul className="text-slate-400 space-y-2 text-sm">
                <li>• Exported files can be imported on other devices or browsers</li>
                <li>• All data is stored as plain JSON for transparency</li>
                <li>• Import merge mode will update existing entries with the same keys</li>
                <li>• You can use this for backup and recovery purposes</li>
                <li>• File format includes schema version for compatibility checking</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
