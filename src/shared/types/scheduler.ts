export type RepeatType = 'daily' | 'weekly' | 'custom';

export type SessionSchedulerConfig = {
  startDate: string;        // YYYY-MM-DD
  repeatType: RepeatType;
  repeatValue?: number;     // chỉ dùng khi custom

  startHour: number;        // giờ bắt đầu
  startMinute: number;      // phút bắt đầu
};