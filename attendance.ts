import { authenticator } from "otplib";
import { ENV } from "./environment";
import { formatDate, formatTime } from "./dateUtils";

export interface AttendanceRecord {
  userId: number;
  username: string;
  firstName: string;
  lastName?: string;
  timestamp: Date;
  status: "present" | "late";
}

export class AttendanceService {
  private attendanceRecords: Map<string, AttendanceRecord[]> = new Map();
  private todayAttendance: Set<number> = new Set();

  constructor() {
    this.resetDailyAttendance();
  }

  private resetDailyAttendance() {
    const now = new Date();
    const nextMidnight = new Date(now);
    nextMidnight.setHours(24, 0, 0, 0);
    const timeUntilMidnight = nextMidnight.getTime() - now.getTime();

    setTimeout(() => {
      this.todayAttendance.clear();
      this.resetDailyAttendance(); // Schedule next reset
    }, timeUntilMidnight);
  }

  verifyOTP(otp: string): boolean {
    try {
      return authenticator.verify({
        token: otp,
        secret: ENV.TOTP_SECRET,
      });
    } catch (error) {
      console.error("OTP verification error:", error);
      return false;
    }
  }

  markAttendance(
    userId: number,
    username: string,
    firstName: string,
    lastName?: string
  ): {
    success: boolean;
    message: string;
    record?: AttendanceRecord;
  } {
    // Check if user already marked attendance today
    if (this.todayAttendance.has(userId)) {
      return {
        success: false,
        message: "Anda sudah absen hari ini!",
      };
    }

    const now = new Date();
    const dateKey = formatDate(now, "yyyy-MM-dd");

    // Determine if late (after 9 AM)
    const cutoffTime = new Date(now);
    cutoffTime.setHours(9, 0, 0, 0);
    const status: "present" | "late" = now.getHours() >= 9 ? "late" : "present";

    const record: AttendanceRecord = {
      userId,
      username,
      firstName,
      lastName,
      timestamp: now,
      status,
    };

    // Store the record
    if (!this.attendanceRecords.has(dateKey)) {
      this.attendanceRecords.set(dateKey, []);
    }
    this.attendanceRecords.get(dateKey)!.push(record);
    this.todayAttendance.add(userId);

    const statusMessage = status === "late" ? "⚠️ Late arrival" : "✅ On time";

    return {
      success: true,
      message: `Absensi berhasil dicatat! ${
        statusMessage === "⚠️ Late arrival" ? "⚠️ Terlambat" : "✅ Tepat Waktu"
      }\nWaktu: ${formatTime(now, "HH:mm")}`,
      record,
    };
  }

  getTodayAttendance(): AttendanceRecord[] {
    const today = formatDate(new Date(), "yyyy-MM-dd");
    return this.attendanceRecords.get(today) || [];
  }

  getUserAttendanceHistory(
    userId: number,
    days: number = 30
  ): AttendanceRecord[] {
    const history: AttendanceRecord[] = [];
    const now = new Date();

    for (let i = 0; i < days; i++) {
      const date = new Date(now);
      date.setDate(now.getDate() - i);
      const dateKey = formatDate(date, "yyyy-MM-dd");

      const dayRecords = this.attendanceRecords.get(dateKey) || [];
      const userRecord = dayRecords.find((record) => record.userId === userId);
      if (userRecord) {
        history.push(userRecord);
      }
    }

    return history.reverse(); // Most recent first
  }

  generateAttendanceReport(): string {
    const today = this.getTodayAttendance();
    if (today.length === 0) {
      return "Tidak ada data absensi hari ini.";
    }

    const present = today.filter((r) => r.status === "present").length;
    const late = today.filter((r) => r.status === "late").length;

    let report = `📊 *Today's Attendance Report*\n\n`;
    report += `✅ Tepat Waktu: ${present}\n`;
    report += `⚠️ Terlambat: ${late}\n`;
    report += `📈 Total: ${today.length}\n\n`;

    report += `*Daftar Absensi:*\n`;
    today.forEach((record, index) => {
      const status = record.status === "present" ? "✅" : "⚠️";
      const name = record.lastName
        ? `${record.firstName} ${record.lastName}`
        : record.firstName;
      const time = formatTime(record.timestamp, "HH:mm");
      report += `${index + 1}. ${status} ${name} - ${time}\n`;
    });

    return report;
  }
}
