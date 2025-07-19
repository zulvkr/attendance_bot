import { authenticator } from "otplib";
import { ENV } from "./config/environment";
import { formatDate, formatTime } from "./utils/dateUtils";
import { DatabaseService, AttendanceRecord } from "./config/database";
import * as createCsvWriter from "csv-writer";
import * as path from "path";
import * as fs from "fs";

export class AttendanceService {
  async setUserAlias(
    userId: number,
    firstName: string,
    lastName?: string
  ): Promise<{ success: boolean; message: string }> {
    return await this.db.attendance.setUserAlias(userId, firstName, lastName);
  }
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

  async markAttendanceWithAlias(
    userId: number,
    username: string,
    aliasFirstName: string,
    aliasLastName?: string
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
        firstName: aliasFirstName,
        lastName: aliasLastName,
        timestamp: now,
        date: dateKey,
      };

      // Store the record in database
      const savedRecord = await this.db.attendance.insertAttendance(record);

      let aliasName: string;
      if (aliasLastName) {
        aliasName = `${aliasFirstName} ${aliasLastName}`;
      } else {
        aliasName = aliasFirstName;
      }

      return {
        success: true,
        message: `Absensi berhasil dicatat dengan nama: *${aliasName}*\nWaktu: ${formatTime(
          now,
          "HH:mm"
        )}`,
        record: savedRecord,
      };
    } catch (error) {
      console.error("Error marking attendance with alias:", error);
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

  async getAttendanceByDateRange(
    startDate: string,
    endDate: string
  ): Promise<AttendanceRecord[]> {
    return await this.db.attendance.getAttendanceByDateRange(
      startDate,
      endDate
    );
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
      let name: string;
      if (record.alias) {
        name = record.alias;
      } else if (record.lastName) {
        name = `${record.firstName} ${record.lastName}`;
      } else {
        name = record.firstName;
      }
      const time = formatTime(record.timestamp, "HH:mm");
      report += `${index + 1}. ${name} - ${time}\n`;
    });

    return report;
  }

  async generateCSVReport(
    startDate: string,
    endDate: string
  ): Promise<{ filePath: string; recordCount: number }> {
    const records = await this.getAttendanceByDateRange(startDate, endDate);

    if (records.length === 0) {
      throw new Error("Tidak ada data absensi dalam rentang tanggal tersebut");
    }

    // Create CSV file path
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const fileName = `attendance_${startDate}_to_${endDate}_${timestamp}.csv`;
    const filePath = path.join(process.cwd(), "temp", fileName);

    // Ensure temp directory exists
    const tempDir = path.dirname(filePath);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Create CSV writer
    const csvWriter = createCsvWriter.createObjectCsvWriter({
      path: filePath,
      header: [
        { id: "date", title: "Tanggal" },
        { id: "time", title: "Waktu" },
        { id: "name", title: "Nama" },
        { id: "username", title: "Username" },
        { id: "userId", title: "User ID" },
        { id: "status", title: "Status" },
      ],
    });

    // Prepare data for CSV
    const csvData = records.map((record) => {
      let name: string;
      if (record.alias) {
        name = record.alias;
      } else if (record.lastName) {
        name = `${record.firstName} ${record.lastName}`;
      } else {
        name = record.firstName;
      }
      let status: string | undefined;
      if (record.status === "present") {
        status = "Tepat Waktu";
      } else if (record.status === "late") {
        status = "Terlambat";
      }
      return {
        date: record.date,
        time: formatTime(record.timestamp, "HH:mm:ss"),
        name,
        username: record.username,
        userId: record.userId.toString(),
        status,
      };
    });

    // Write CSV file
    await csvWriter.writeRecords(csvData);

    return {
      filePath,
      recordCount: records.length,
    };
  }

  async close(): Promise<void> {
    await this.db.close();
  }
}
