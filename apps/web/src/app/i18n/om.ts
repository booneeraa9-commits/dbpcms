import type { TranslationKey } from "./en.js";

/**
 * Afaan Oromo (om) translations. These are BEST-EFFORT starting translations —
 * edit any value here to refine the wording natively. Keys must match en.ts.
 * If a key is missing here, the app falls back to the English text automatically.
 */
export const om: Partial<Record<TranslationKey, string>> = {
  // Navigation
  "nav.dashboard": "Daashboordii",
  "nav.employees": "Hojjettoota",
  "nav.students": "Barattoota",
  "nav.gradeEntry": "Galmee Qabxii",
  "nav.gradingSetup": "Qindaa'ina Qabxii",
  "nav.departments": "Muummeewwan",
  "nav.academic": "Barnoota",
  "nav.transcripts": "Ragaa Barnootaa",
  "nav.reports": "Gabaasota",
  "nav.administration": "Bulchiinsa",

  // Top bar
  "topbar.searchPlaceholder": "Barbaadi (dhufaa jira)…",
  "topbar.notifications": "Beeksisoota",
  "topbar.signOut": "Ba'i",
  "topbar.language": "Afaan",
  "topbar.lightMode": "Halluu ifaa",
  "topbar.darkMode": "Halluu dukkanaa",

  // Common actions
  "action.create": "Uumi",
  "action.save": "Olkaa'i",
  "action.saveChanges": "Jijjiirama olkaa'i",
  "action.cancel": "Dhiisi",
  "action.edit": "Gulaali",
  "action.delete": "Haqi",
  "action.remove": "Balleessi",
  "action.confirm": "Mirkaneessi",
  "action.print": "Maxxansi",
  "action.retry": "Irra deebi'i",
  "action.view": "Ilaali",
  "action.search": "Barbaadi",

  // Common states
  "state.loading": "Fe'aa jira…",
  "state.error": "Rakkoon uumameera.",
  "state.empty": "Galmeen hin argamne.",

  // Auth
  "auth.signInTitle": "Gara DBPCMS seeni",
  "auth.email": "Imeelii",
  "auth.password": "Jecha darbii",
  "auth.signIn": "Seeni",
  "auth.signingIn": "Seenaa jira…",

  // Dashboard
  "dashboard.welcome": "Baga nagaan dhufte",
  "dashboard.recentActivity": "Sochii dhiheenyaa",
};
