import { AttendanceRecord } from "../config/database";
import { Knex } from "knex";

export class AttendanceRepository {
  async setUserAlias(
    userId: number,
    firstName: string,
    lastName?: string
  ): Promise<{ success: boolean; message: string }> {
    // Upsert alias
    try {
      const existing = await this.db("alias").where({ userId }).first();
      if (existing) {
        await this.db("alias")
          .where({ userId })
          .update({ firstName, lastName });
        return { success: true, message: "Alias berhasil diperbarui." };
      } else {
        await this.db("alias").insert({ userId, firstName, lastName });
        return { success: true, message: "Alias berhasil ditambahkan." };
      }
    } catch (error) {
      return { success: false, message: "Gagal menyimpan alias." };
    }
  }
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
    const rows = await this.db("attendance as a")
      .leftJoin("alias as al", "a.userId", "al.userId")
      .select(
        "a.id",
        "a.userId",
        "a.username",
        "a.firstName",
        "a.lastName",
        "a.timestamp",
        "a.status",
        "a.date",
        "al.firstName as aliasFirstName",
        "al.lastName as aliasLastName"
      )
      .where({ "a.date": date })
      .orderBy("a.timestamp", "asc");
    return rows.map((row: any) => {
      let alias = row.aliasFirstName
        ? row.aliasLastName
          ? `${row.aliasFirstName} ${row.aliasLastName}`
          : row.aliasFirstName
        : undefined;
      return {
        id: row.id,
        userId: row.userId,
        username: row.username,
        firstName: row.firstName,
        lastName: row.lastName || undefined,
        alias,
        timestamp: new Date(row.timestamp),
        status: row.status,
        date: row.date,
      };
    });
  }

  async getUserAttendanceHistory(
    userId: number,
    days: number = 30
  ): Promise<AttendanceRecord[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateString = startDate.toISOString().split("T")[0];
    const rows = await this.db("attendance as a")
      .leftJoin("alias as al", "a.userId", "al.userId")
      .select(
        "a.id",
        "a.userId",
        "a.username",
        "a.firstName",
        "a.lastName",
        "a.timestamp",
        "a.status",
        "a.date",
        "al.firstName as aliasFirstName",
        "al.lastName as aliasLastName"
      )
      .where("a.userId", userId)
      .andWhere("a.date", ">=", startDateString)
      .orderBy("a.timestamp", "desc");
    return rows.map((row: any) => {
      let alias = row.aliasFirstName
        ? row.aliasLastName
          ? `${row.aliasFirstName} ${row.aliasLastName}`
          : row.aliasFirstName
        : undefined;
      return {
        id: row.id,
        userId: row.userId,
        username: row.username,
        firstName: row.firstName,
        lastName: row.lastName || undefined,
        alias,
        timestamp: new Date(row.timestamp),
        status: row.status,
        date: row.date,
      };
    });
  }

  async getAttendanceByDateRange(
    startDate: string,
    endDate: string
  ): Promise<AttendanceRecord[]> {
    const rows = await this.db("attendance as a")
      .leftJoin("alias as al", "a.userId", "al.userId")
      .select(
        "a.id",
        "a.userId",
        "a.username",
        "a.firstName",
        "a.lastName",
        "a.timestamp",
        "a.status",
        "a.date",
        "al.firstName as aliasFirstName",
        "al.lastName as aliasLastName"
      )
      .whereBetween("a.date", [startDate, endDate])
      .orderBy("a.timestamp", "desc");
    return rows.map((row: any) => {
      let alias = row.aliasFirstName
        ? row.aliasLastName
          ? `${row.aliasFirstName} ${row.aliasLastName}`
          : row.aliasFirstName
        : undefined;
      return {
        id: row.id,
        userId: row.userId,
        username: row.username,
        firstName: row.firstName,
        lastName: row.lastName || undefined,
        alias,
        timestamp: new Date(row.timestamp),
        status: row.status,
        date: row.date,
      };
    });
  }
}
