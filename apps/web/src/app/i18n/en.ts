/**
 * English translation dictionary (the source of truth for keys).
 * Every user-facing string that supports translation has an entry here.
 * The Afaan Oromo file (om.ts) mirrors these keys.
 */
export const en = {
  // App shell / navigation
  "nav.dashboard": "Dashboard",
  "nav.employees": "Employees",
  "nav.students": "Students",
  "nav.gradeEntry": "Grade Entry",
  "nav.gradingSetup": "Grading Setup",
  "nav.departments": "Departments",
  "nav.academic": "Academic",
  "nav.transcripts": "Transcripts",
  "nav.reports": "Reports",
  "nav.administration": "Administration",

  // Top bar
  "topbar.searchPlaceholder": "Search (coming soon)…",
  "topbar.notifications": "Notifications",
  "topbar.signOut": "Sign out",
  "topbar.language": "Language",
  "topbar.lightMode": "Light mode",
  "topbar.darkMode": "Dark mode",

  // Common actions
  "action.create": "Create",
  "action.save": "Save",
  "action.saveChanges": "Save changes",
  "action.cancel": "Cancel",
  "action.edit": "Edit",
  "action.delete": "Delete",
  "action.remove": "Remove",
  "action.confirm": "Confirm",
  "action.print": "Print",
  "action.retry": "Retry",
  "action.view": "View",
  "action.search": "Search",

  // Common states
  "state.loading": "Loading…",
  "state.error": "Something went wrong.",
  "state.empty": "No records found.",

  // Auth
  "auth.signInTitle": "Sign in to DBPCMS",
  "auth.email": "Email",
  "auth.password": "Password",
  "auth.signIn": "Sign in",
  "auth.signingIn": "Signing in…",

  // Dashboard
  "dashboard.welcome": "Welcome",
  "dashboard.recentActivity": "Recent activity",
} as const;

export type TranslationKey = keyof typeof en;
