import { AttendanceRecord } from "../config/database";
import { Knex } from "knex";

export class AttendanceRepository {
  private db: Knex;

  constructor(db: Knex) {
    this.db = db;
  }

  async insertAttendance(
    record: Omit<AttendanceRecord, "id">
  ): Promise<AttendanceRecord> {
    const [id] = await this.db("attendance").insert({
      userId: record.userId,
      username: record.username,
      firstName: record.firstName,
      lastName: record.lastName || null,
      timestamp: record.timestamp.toISOString(),
      status: record.status,
      date: record.date,
    });
    return { ...record, id };
  }

  async checkUserAttendanceToday(
    userId: number,
    date: string
  ): Promise<boolean> {
    const result = await this.db("attendance")
      .where({ userId, date })
      .count("* as count")
      .first();
    const count =
      typeof result?.count === "string"
        ? parseInt(result.count, 10)
        : result?.count || 0;
    return count > 0;
  }

  async getTodayAttendance(date: string): Promise<AttendanceRecord[]> {
    const rows = await this.db("attendance")
      .select(
        "id",
        "userId",
        "username",
        "firstName",
        "lastName",
        "timestamp",
        "status",
        "date"
      )
      .where({ date })
      .orderBy("timestamp", "asc");
    return rows.map((row: any) => ({
      id: row.id,
      userId: row.userId,
      username: row.username,
      firstName: row.firstName,
      lastName: row.lastName || undefined,
      timestamp: new Date(row.timestamp),
      status: row.status,
      date: row.date,
    }));
  }

  async getUserAttendanceHistory(
    userId: number,
    days: number = 30
  ): Promise<AttendanceRecord[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateString = startDate.toISOString().split("T")[0];
    const rows = await this.db("attendance")
      .select(
        "id",
        "userId",
        "username",
        "firstName",
        "lastName",
        "timestamp",
        "status",
        "date"
      )
      .where("userId", userId)
      .andWhere("date", ">=", startDateString)
      .orderBy("timestamp", "desc");
    return rows.map((row: any) => ({
      id: row.id,
      userId: row.userId,
      username: row.username,
      firstName: row.firstName,
      lastName: row.lastName || undefined,
      timestamp: new Date(row.timestamp),
      status: row.status,
      date: row.date,
    }));
  }

  async getAttendanceByDateRange(
    startDate: string,
    endDate: string
  ): Promise<AttendanceRecord[]> {
    const rows = await this.db("attendance")
      .select(
        "id",
        "userId",
        "username",
        "firstName",
        "lastName",
        "timestamp",
        "status",
        "date"
      )
      .whereBetween("date", [startDate, endDate])
      .orderBy("timestamp", "desc");
    return rows.map((row: any) => ({
      id: row.id,
      userId: row.userId,
      username: row.username,
      firstName: row.firstName,
      lastName: row.lastName || undefined,
      timestamp: new Date(row.timestamp),
      status: row.status,
      date: row.date,
    }));
  }
}
