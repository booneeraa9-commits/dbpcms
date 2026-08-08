/**
 * Keys and defaults for admin-editable system settings. Business rules read
 * these instead of hardcoded values, so they can change without code edits.
 */
export const SETTING_KEYS = {
  RETIREMENT_AGE: "retirement_age",
  CONTRACT_EXPIRY_WINDOW_DAYS: "contract_expiry_window_days",
  INSTITUTION_NAME: "institution_name",
} as const;

export type SettingKey = (typeof SETTING_KEYS)[keyof typeof SETTING_KEYS];

/** Default values seeded on first run; editable by an admin afterwards. */
export const SETTING_DEFAULTS: Record<SettingKey, string> = {
  [SETTING_KEYS.RETIREMENT_AGE]: "60",
  [SETTING_KEYS.CONTRACT_EXPIRY_WINDOW_DAYS]: "60",
  [SETTING_KEYS.INSTITUTION_NAME]: "Donna Barbar Polytechnic College",
};

export const SETTING_DESCRIPTIONS: Record<SettingKey, string> = {
  [SETTING_KEYS.RETIREMENT_AGE]:
    "Age at which an employee appears in the Retirement List report.",
  [SETTING_KEYS.CONTRACT_EXPIRY_WINDOW_DAYS]:
    "Default number of days ahead the Contract Expiry report looks.",
  [SETTING_KEYS.INSTITUTION_NAME]:
    "Institution name shown on printed documents and reports.",
};
