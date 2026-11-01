type UserRole = "admin" | "company-admin" | "staff";

const ALL_INVITABLE_ROLES: UserRole[] = ["admin", "company-admin", "staff"];

const getAllowedInviteRoles = (inviterRole: UserRole): UserRole[] => {
  if (inviterRole === "admin") {
    return ALL_INVITABLE_ROLES;
  }

  if (inviterRole === "company-admin") {
    // Later business rule update:
    // company-admin should only invite company-admin and staff (not admin).
    return ALL_INVITABLE_ROLES;
  }

  return [];
};

const canInviteRole = (inviterRole: UserRole, targetRole: UserRole): boolean => {
  return getAllowedInviteRoles(inviterRole).includes(targetRole);
};

module.exports = {
  ALL_INVITABLE_ROLES,
  getAllowedInviteRoles,
  canInviteRole,
};