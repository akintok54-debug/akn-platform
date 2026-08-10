export const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null');
  } catch {
    return null;
  }
};

export const getStoredToken = () => localStorage.getItem('token') || '';

export const isAuthenticated = () => Boolean(getStoredToken() && getStoredUser());

export const getStoredPermissions = () => {
  try {
    return JSON.parse(localStorage.getItem('permissions') || '{}');
  } catch {
    return {};
  }
};

export const canAccessModule = (moduleName) => {
  const user = getStoredUser();
  if (!user) return false;

  if (user.role === 'SUPER_ADMIN') return true;
  if (user.role === 'owner' || user.role === 'admin') return true;
  if (user.role === 'sales' && moduleName === 'sales') return true;

  const permissions = getStoredPermissions();
  if (moduleName === 'suppliers') {
    return permissions.suppliers === true || permissions.customers === true;
  }
  return permissions[moduleName] === true;
};

export const setStoredPermissions = (permissions) => {
  localStorage.setItem('permissions', JSON.stringify(permissions || {}));
};

export const clearStoredAuth = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('permissions');
  localStorage.removeItem('dealerToken');
  sessionStorage.removeItem('token');
  sessionStorage.removeItem('user');
  sessionStorage.removeItem('permissions');
  sessionStorage.removeItem('dealerToken');
};
