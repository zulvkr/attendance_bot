import { authenticator } from "otplib";
import { ENV } from "./config/environment";
import { formatDate, formatTime } from "./utils/dateUtils";
import { DatabaseService, AttendanceRecord } from "./config/database";

export class AttendanceService {
  private db: DatabaseService;

  constructor() {
    this.db = new DatabaseService();
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

  async markAttendance(
    userId: number,
    username: string,
    firstName: string,
    lastName?: string
  ): Promise<{
    success: boolean;
    message: string;
    record?: AttendanceRecord;
  }> {
    const now = new Date();
    const dateKey = formatDate(now, "yyyy-MM-dd");

    // Check if user already marked attendance today
    try {
      const hasAttendance = await this.db.attendance.checkUserAttendanceToday(
        userId,
        dateKey
      );
      if (hasAttendance) {
        return {
          success: false,
          message: "Anda sudah absen hari ini!",
        };
      }

      const record = {
        userId,
        username,
        firstName,
        lastName,
        timestamp: now,
        date: dateKey,
      };

      // Store the record in database
      const savedRecord = await this.db.attendance.insertAttendance(record);

      return {
        success: true,
        message: `Absensi berhasil dicatat!\nWaktu: ${formatTime(
          now,
          "HH:mm"
        )}`,
        record: savedRecord,
      };
    } catch (error) {
      console.error("Error marking attendance:", error);
      return {
        success: false,
        message: "Terjadi kesalahan saat mencatat absensi. Silakan coba lagi.",
      };
    }
  }

  async getTodayAttendance(): Promise<AttendanceRecord[]> {
    const today = formatDate(new Date(), "yyyy-MM-dd");
    return await this.db.attendance.getTodayAttendance(today);
  }

  async getUserAttendanceHistory(
    userId: number,
    days: number = 30
  ): Promise<AttendanceRecord[]> {
    return await this.db.attendance.getUserAttendanceHistory(userId, days);
  }

  async generateAttendanceReport(): Promise<string> {
    const today = await this.getTodayAttendance();
    if (today.length === 0) {
      return "Tidak ada data absensi hari ini.";
    }

    let report = `📊 *Laporan Absensi Hari Ini*\n\n`;
    report += `📈 Total: ${today.length}\n\n`;

    report += `*Daftar Absensi:*\n`;
    today.forEach((record, index) => {
      const name = record.lastName
        ? `${record.firstName} ${record.lastName}`
        : record.firstName;
      const time = formatTime(record.timestamp, "HH:mm");
      report += `${index + 1}. ${name} - ${time}\n`;
    });

    return report;
  }

  async close(): Promise<void> {
    await this.db.close();
  }
}
