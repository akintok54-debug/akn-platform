export const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null');
  } catch {
    return null;
  }
};

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

 if (
  user.role === 'owner' ||
  user.role === 'admin' ||
  user.role === 'SUPER_ADMIN'
) return true;

  const permissions = getStoredPermissions();
  return permissions[moduleName] === true;
};

export const setStoredPermissions = (permissions) => {
  localStorage.setItem('permissions', JSON.stringify(permissions || {}));
};
