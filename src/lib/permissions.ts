/**
 * Role hierarchy for the Boiler Management System.
 * Higher number = more privileges.
 */
export const ROLES = {
  CEO: 'CEO',
  Manager: 'Manager',
  'Plant Engineer': 'Plant Engineer',
  'Shift Engineer': 'Shift Engineer',
  Supervisor: 'Supervisor',
  'Boiler Operator': 'Boiler Operator',
} as const;

// Admin/SuperAdmin from old accounts get same access as CEO
const FULL_ACCESS = [ROLES.CEO, ROLES.Manager, ROLES['Plant Engineer'], ROLES['Shift Engineer'], ROLES.Supervisor, ROLES['Boiler Operator'], 'Admin', 'SuperAdmin'] as const;
const MGMT_ACCESS = [ROLES.CEO, ROLES.Manager, ROLES['Plant Engineer'], ROLES.Supervisor, ROLES['Shift Engineer'], 'Admin', 'SuperAdmin'] as const;
const ENGR_ACCESS = [ROLES.CEO, ROLES.Manager, ROLES['Plant Engineer'], ROLES.Supervisor, 'Admin', 'SuperAdmin'] as const;
const MGR_ONLY = [ROLES.CEO, ROLES.Manager, 'Admin', 'SuperAdmin'] as const;
const TECH_EDIT = [ROLES.CEO, ROLES.Manager, ROLES['Plant Engineer'], 'Admin', 'SuperAdmin'] as const;

export const ROLE_LEVELS: Record<string, number> = {
  [ROLES.CEO]: 60,
  [ROLES.Manager]: 50,
  [ROLES['Plant Engineer']]: 40,
  [ROLES['Shift Engineer']]: 30,
  [ROLES.Supervisor]: 20,
  [ROLES['Boiler Operator']]: 10,
  Admin: 60,
  SuperAdmin: 70,
};

export const ALL_ROLES = Object.values(ROLES);

export const ROLE_DESCRIPTIONS: Record<string, string> = {
  [ROLES.CEO]: 'Full access to all factories, users, and data',
  [ROLES.Manager]: 'Manage users, view/edit all records, approve maintenance',
  [ROLES['Plant Engineer']]: 'View all data, edit technical calculations & water chemistry',
  [ROLES['Shift Engineer']]: 'Log operation data, view dashboards & reports',
  [ROLES.Supervisor]: 'View dashboards, reports, approve maintenance tasks',
  [ROLES['Boiler Operator']]: 'Log daily operation data only',
  Admin: 'Full access (legacy role — same as CEO)',
  SuperAdmin: 'Full system access (legacy role)',
};

export function getRoleLevel(role: string): number {
  return ROLE_LEVELS[role] ?? 0;
}

export function hasMinRole(userRole: string, requiredRole: string): boolean {
  return getRoleLevel(userRole) >= getRoleLevel(requiredRole);
}

/** Permission map: what each role CAN do */
export const PERMISSIONS = {
  viewDashboard: FULL_ACCESS,
  viewOperationLogs: FULL_ACCESS,
  createOperationLog: FULL_ACCESS,
  editOperationLog: [...FULL_ACCESS].filter(r => r !== 'Boiler Operator'),
  deleteOperationLog: ENGR_ACCESS,

  viewCalculations: MGMT_ACCESS,
  createCalculation: TECH_EDIT,
  editCalculation: TECH_EDIT,
  deleteCalculation: MGR_ONLY,

  viewWaterChemistry: ENGR_ACCESS,
  createWaterChemistry: TECH_EDIT,
  editWaterChemistry: TECH_EDIT,
  deleteWaterChemistry: MGR_ONLY,

  viewMaintenance: FULL_ACCESS,
  createMaintenance: [...FULL_ACCESS].filter(r => r !== 'Boiler Operator' && r !== 'Supervisor'),
  editMaintenance: TECH_EDIT,
  deleteMaintenance: MGR_ONLY,
  approveMaintenance: MGR_ONLY,

  viewInspections: [...FULL_ACCESS].filter(r => r !== 'Boiler Operator'),
  createInspection: TECH_EDIT,
  editInspection: TECH_EDIT,
  deleteInspection: MGR_ONLY,

  viewAIInsights: FULL_ACCESS,
  viewAIAssistant: FULL_ACCESS,
  viewExecutiveDashboard: MGR_ONLY,
  editPricing: MGR_ONLY,
  viewReports: MGMT_ACCESS,
  exportReports: TECH_EDIT,

  manageFactories: MGR_ONLY,
  manageUsers: MGR_ONLY,
  manageBoilers: TECH_EDIT,

  changePassword: FULL_ACCESS,
} as const;

export function can(userRole: string, permission: keyof typeof PERMISSIONS): boolean {
  return (PERMISSIONS[permission] as readonly string[]).includes(userRole);
}
