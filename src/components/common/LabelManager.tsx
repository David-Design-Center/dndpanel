import React, { useState } from 'react';
import { Plus, Edit, Trash, Check, X } from 'lucide-react';
import { useLabel } from '../../contexts/LabelContext';
import { GmailLabel } from '../../types';

function LabelManager() {
  const {
    labels,
    loadingLabels,
    addLabel,
    editLabel,
    deleteLabel,
    isAddingLabel,
    addLabelError,
    isEditingLabel,
    editLabelError,
    isDeletingLabel,
    deleteLabelError
  } = useLabel();

  const [newLabelName, setNewLabelName] = useState('');
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
  const [editingLabelName, setEditingLabelName] = useState('');

  // Filter to show only user-created labels for management
  const userLabels = labels.filter(label => label.type === 'user');

  const handleAddLabel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabelName.trim()) return;

    try {
      await addLabel(newLabelName.trim());
      setNewLabelName('');
    } catch (error) {
      // Error handling is managed by the context
    }
  };

  const handleEditLabel = async (id: string, newName: string) => {
    if (!newName.trim()) return;

    try {
      await editLabel(id, newName.trim());
      setEditingLabelId(null);
      setEditingLabelName('');
    } catch (error) {
      // Error handling is managed by the context
    }
  };

  const handleDeleteLabel = async (id: string, labelName: string) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete the label "${labelName}"? This action cannot be undone.`
    );
    
    if (!confirmed) return;

    try {
      await deleteLabel(id);
    } catch (error) {
      // Error handling is managed by the context
    }
  };

  const startEditingLabel = (label: GmailLabel) => {
    setEditingLabelId(label.id);
    setEditingLabelName(label.name);
  };

  const cancelEditing = () => {
    setEditingLabelId(null);
    setEditingLabelName('');
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm">
      <h2 className="text-lg font-semibold mb-6">Manage Gmail Labels</h2>
      
      {/* Add New Label Section */}
      <div className="mb-8">
        <h3 className="text-md font-medium mb-3">Add New Label</h3>
        <form onSubmit={handleAddLabel} className="flex gap-3">
          <input
            type="text"
            value={newLabelName}
            onChange={(e) => setNewLabelName(e.target.value)}
            placeholder="Enter label name"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isAddingLabel}
          />
          <button
            type="submit"
            disabled={!newLabelName.trim() || isAddingLabel}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Plus className="w-4 h-4" />
            {isAddingLabel ? 'Adding...' : 'Add Label'}
          </button>
        </form>
        {addLabelError && (
          <p className="mt-2 text-sm text-red-600">{addLabelError}</p>
        )}
      </div>

      {/* Labels List Section */}
      <div>
        <h3 className="text-md font-medium mb-3">Your Labels</h3>
        
        {loadingLabels ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading labels...</span>
          </div>
        ) : userLabels.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No custom labels found.</p>
            <p className="text-sm">Create your first label using the form above.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {userLabels.map((label) => (
              <div
                key={label.id}
                className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {editingLabelId === label.id ? (
                  <div className="flex items-center gap-3 flex-1">
                    <input
                      type="text"
                      value={editingLabelName}
                      onChange={(e) => setEditingLabelName(e.target.value)}
                      className="flex-1 px-3 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      autoFocus
                      disabled={isEditingLabel}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditLabel(label.id, editingLabelName)}
                        disabled={!editingLabelName.trim() || isEditingLabel}
                        className="p-1 text-green-600 hover:text-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Save changes"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={cancelEditing}
                        disabled={isEditingLabel}
                        className="p-1 text-gray-600 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Cancel editing"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{label.name}</span>
                      <div className="flex gap-1 text-xs text-gray-500">
                        {label.messagesTotal !== undefined && (
                          <span>({label.messagesTotal} messages)</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEditingLabel(label)}
                        disabled={isEditingLabel || isDeletingLabel}
                        className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        title="Edit label"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteLabel(label.id, label.name)}
                        disabled={isEditingLabel || isDeletingLabel}
                        className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        title="Delete label"
                      >
                        <Trash className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
        
        {editLabelError && (
          <p className="mt-2 text-sm text-red-600">{editLabelError}</p>
        )}
        
        {deleteLabelError && (
          <p className="mt-2 text-sm text-red-600">{deleteLabelError}</p>
        )}
      </div>

      {/* Information Section */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="text-sm font-medium text-blue-800 mb-2">About Label Management</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Only custom labels you've created can be edited or deleted</li>
          <li>• System labels (Inbox, Sent, Drafts, etc.) cannot be modified</li>
          <li>• Deleting a label will remove it from all associated emails</li>
          <li>• Changes sync directly with your Gmail account</li>
        </ul>
      </div>
    </div>
  );
}

export default LabelManager;