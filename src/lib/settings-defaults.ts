export const DEFAULT_SETTINGS = {
  operating_hour_start: 6,
  operating_hour_end: 22,
  court_count: 2,
  party_size_min: 1,
  party_size_max: 4,
  reservation_horizon_days: 30,
  cancel_deadline_hours: 6,
  daily_reservation_limit_per_user: 1,
} as const;

export type SettingKey = keyof typeof DEFAULT_SETTINGS;
