import type { ClockPort } from '@/application/shared/ports/ClockPort';

export class SystemClock implements ClockPort {
  now(): Date {
    return new Date();
  }
}
