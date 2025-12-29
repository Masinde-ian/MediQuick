import React, { useState, useMemo, useCallback } from 'react';

const UsersTab = React.memo(({
  users = [],
  loading,
  userFilters = {},
  setUserFilters,
  refreshUsers,
  formatDate,
  onUpdateUserRole,
  onToggleUserStatus,
  showNotification
}) => {
  const [updatingUser, setUpdatingUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Helper function to get safe values
  const getSafeValue = (obj, path, defaultValue = '') => {
    try {
      const keys = path.split('.');
      let result = obj;
      for (const key of keys) {
        result = result?.[key];
        if (result === undefined || result === null) return defaultValue;
      }
      return result;
    } catch {
      return defaultValue;
    }
  };

  // Filter users
  const filteredUsers = useMemo(() => {
    return (users || []).filter(user => {
      if (!user || typeof user !== 'object') return false;
      
      const role = getSafeValue(user, 'role', 'USER');
      const isActive = getSafeValue(user, 'isActive', true);
      const name = getSafeValue(user, 'name', '').toLowerCase();
      const email = getSafeValue(user, 'email', '').toLowerCase();
      
      // Role filter
      if (userFilters.role && userFilters.role !== 'all' && role !== userFilters.role) {
        return false;
      }
      
      // Status filter
      if (userFilters.status && userFilters.status !== 'all') {
        if (userFilters.status === 'active' && !isActive) return false;
        if (userFilters.status === 'inactive' && isActive) return false;
      }
      
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return name.includes(query) || email.includes(query);
      }
      
      return true;
    });
  }, [users, userFilters, searchQuery]);

  const handleRoleUpdate = useCallback(async (userId, currentRole) => {
    const newRole = currentRole === 'ADMIN' ? 'USER' : 'ADMIN';
    if (window.confirm(`Change user role to ${newRole}?`)) {
      setUpdatingUser(userId);
      try {
        await onUpdateUserRole(userId, newRole);
      } catch (error) {
        showNotification('error', 'Error', 'Failed to update role');
      } finally {
        setUpdatingUser(null);
      }
    }
  }, [onUpdateUserRole, showNotification]);

  const handleStatusToggle = useCallback(async (userId, currentStatus) => {
    const action = currentStatus ? 'deactivate' : 'activate';
    if (window.confirm(`Are you sure you want to ${action} this user?`)) {
      setUpdatingUser(userId);
      try {
        await onToggleUserStatus(userId, currentStatus);
      } catch (error) {
        showNotification('error', 'Error', 'Failed to update user status');
      } finally {
        setUpdatingUser(null);
      }
    }
  }, [onToggleUserStatus, showNotification]);

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Users</h2>
          <p className="text-sm text-gray-600">
            Showing {filteredUsers.length} of {(users || []).length} users
          </p>
        </div>
        <button 
          onClick={refreshUsers}
          className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
          disabled={loading}
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded shadow-sm p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border rounded text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role
            </label>
            <select
              value={userFilters.role || 'all'}
              onChange={(e) => setUserFilters(prev => ({ ...prev, role: e.target.value }))}
              className="w-full px-3 py-2 border rounded text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Roles</option>
              <option value="USER">Users</option>
              <option value="ADMIN">Admins</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={userFilters.status || 'all'}
              onChange={(e) => setUserFilters(prev => ({ ...prev, status: e.target.value }))}
              className="w-full px-3 py-2 border rounded text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className="flex items-end gap-2">
            <button
              onClick={refreshUsers}
              className="flex-1 px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
            >
              Apply Filters
            </button>
            <button
              onClick={() => {
                setUserFilters({ role: 'all', status: 'all' });
                setSearchQuery('');
              }}
              className="flex-1 px-3 py-2 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Users List */}
      {loading ? (
        <div className="bg-white rounded shadow-sm p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-sm text-gray-600">Loading users...</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="bg-white rounded shadow-sm p-8 text-center">
          <div className="text-4xl mb-4">👥</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
          <p className="text-gray-600">
            {searchQuery || Object.values(userFilters).some(f => f && f !== 'all') 
              ? "Try changing your filters" 
              : "No users found in the system"}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredUsers.map((user, index) => {
                  const userName = getSafeValue(user, 'name', 'No Name');
                  const userEmail = getSafeValue(user, 'email', '');
                  const phone = getSafeValue(user, 'phone', '');
                  const createdAt = getSafeValue(user, 'createdAt', '');
                  const role = getSafeValue(user, 'role', 'USER');
                  const isActive = getSafeValue(user, 'isActive', true);
                  const userId = getSafeValue(user, 'id', '');

                  return (
                    <tr key={userId || `user-${index}`} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="h-8 w-8 bg-gray-200 rounded-full flex items-center justify-center">
                            <span className="text-gray-600 font-medium text-sm">
                              {userName.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 text-sm">{userName}</p>
                            <p className="text-xs text-gray-500">ID: {userId.slice(-6)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-900">{userEmail}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-900">{phone || 'N/A'}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-600">{formatDate(createdAt)}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs rounded ${
                          role === 'ADMIN' 
                            ? 'bg-red-100 text-red-800' 
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs rounded ${
                          isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleRoleUpdate(userId, role)}
                            disabled={updatingUser === userId}
                            className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50"
                          >
                            {updatingUser === userId ? '...' : role === 'ADMIN' ? 'Make User' : 'Make Admin'}
                          </button>
                          <button
                            onClick={() => handleStatusToggle(userId, isActive)}
                            disabled={updatingUser === userId}
                            className={`px-2 py-1 text-xs rounded ${
                              isActive 
                                ? 'bg-red-600 text-white hover:bg-red-700' 
                                : 'bg-green-600 text-white hover:bg-green-700'
                            } disabled:opacity-50`}
                          >
                            {updatingUser === userId ? '...' : isActive ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
});

UsersTab.displayName = 'UsersTab';

export default UsersTab;