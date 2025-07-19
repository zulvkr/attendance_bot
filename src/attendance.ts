import { authenticator } from "otplib";
import { ENV } from "./environment";
import { formatDate, formatTime } from "./dateUtils";
import { DatabaseService, AttendanceRecord } from "./database";

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
      const hasAttendance = await this.db.checkUserAttendanceToday(
        userId,
        dateKey
      );
      if (hasAttendance) {
        return {
          success: false,
          message: "Anda sudah absen hari ini!",
        };
      }

      // Determine if late (after 9 AM)
      const cutoffTime = new Date(now);
      cutoffTime.setHours(9, 0, 0, 0);
      const status: "present" | "late" =
        now.getHours() >= 9 ? "late" : "present";

      const record = {
        userId,
        username,
        firstName,
        lastName,
        timestamp: now,
        status,
        date: dateKey,
      };

      // Store the record in database
      const savedRecord = await this.db.insertAttendance(record);

      const statusMessage =
        status === "late" ? "⚠️ Late arrival" : "✅ On time";

      return {
        success: true,
        message: `Absensi berhasil dicatat! ${
          statusMessage === "⚠️ Late arrival"
            ? "⚠️ Terlambat"
            : "✅ Tepat Waktu"
        }\nWaktu: ${formatTime(now, "HH:mm")}`,
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
    return await this.db.getTodayAttendance(today);
  }

  async getUserAttendanceHistory(
    userId: number,
    days: number = 30
  ): Promise<AttendanceRecord[]> {
    return await this.db.getUserAttendanceHistory(userId, days);
  }

  async generateAttendanceReport(): Promise<string> {
    const today = await this.getTodayAttendance();
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

  async close(): Promise<void> {
    await this.db.close();
  }
}
