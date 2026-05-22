import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/db/client';
import { reservations } from '@/db/schema';
import { addDaysKst, kstSlotStartEpoch, todayKst } from './kst';
import { getSettings, type AppSettings } from './settings';

export type CreateReservationInput = {
  userId: number;
  courtId: number;
  date: string;
  startHour: number;
  partySize: number;
};

export type ValidationFailure = { field: string; message: string };

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function validateCreateReservation(
  input: CreateReservationInput,
  s: AppSettings = getSettings(),
): ValidationFailure | null {
  if (!Number.isInteger(input.courtId) || input.courtId < 1 || input.courtId > s.court_count) {
    return { field: 'courtId', message: `코트는 1~${s.court_count} 사이여야 합니다.` };
  }
  if (!DATE_PATTERN.test(input.date)) {
    return { field: 'date', message: '날짜 형식이 올바르지 않습니다.' };
  }
  const today = todayKst();
  const maxDate = addDaysKst(today, s.reservation_horizon_days);
  if (input.date < today || input.date > maxDate) {
    return { field: 'date', message: `예약 가능 기간: ${today} ~ ${maxDate}` };
  }
  if (
    !Number.isInteger(input.startHour) ||
    input.startHour < s.operating_hour_start ||
    input.startHour >= s.operating_hour_end
  ) {
    return {
      field: 'startHour',
      message: `운영 시간: ${s.operating_hour_start}:00 ~ ${s.operating_hour_end}:00`,
    };
  }
  if (
    !Number.isInteger(input.partySize) ||
    input.partySize < s.party_size_min ||
    input.partySize > s.party_size_max
  ) {
    return {
      field: 'partySize',
      message: `인원: ${s.party_size_min}~${s.party_size_max}명`,
    };
  }
  // For today, prevent reserving slots whose start time already passed
  if (input.date === today) {
    const slotStart = kstSlotStartEpoch(input.date, input.startHour);
    if (Date.now() >= slotStart) {
      return { field: 'startHour', message: '이미 지난 시간은 예약할 수 없습니다.' };
    }
  }
  const existing = db
    .select({ c: sql<number>`count(*)` })
    .from(reservations)
    .where(
      and(
        eq(reservations.userId, input.userId),
        eq(reservations.date, input.date),
        eq(reservations.status, 'active'),
      ),
    )
    .get();
  if ((existing?.c ?? 0) >= s.daily_reservation_limit_per_user) {
    return {
      field: 'date',
      message: `같은 날 최대 ${s.daily_reservation_limit_per_user}개까지 예약 가능합니다.`,
    };
  }
  return null;
}

export function cancelDeadlineEpoch(date: string, startHour: number): number {
  const slotStart = kstSlotStartEpoch(date, startHour);
  const s = getSettings();
  return slotStart - s.cancel_deadline_hours * 3600 * 1000;
}

export function canCancelNow(date: string, startHour: number): boolean {
  return Date.now() < cancelDeadlineEpoch(date, startHour);
}
