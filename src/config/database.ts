import knex, { Knex } from "knex";
import { AttendanceRepository } from "../repository/attendanceRepository";
import path from "node:path";
import fs from "node:fs";

export interface AttendanceRecord {
  id?: number;
  userId: number;
  username: string;
  firstName: string;
  lastName?: string;
  alias?: string;
  timestamp: Date;
  status?: "present" | "late";
  date: string; // Date in YYYY-MM-DD format for easy querying
}

interface AttendanceTable {
  id: number;
  userId: number;
  username: string;
  firstName: string;
  lastName: string | null;
  timestamp: string;
  status: "present" | "late";
  date: string;
}

export class DatabaseService {
  public attendance: AttendanceRepository;
  private db: Knex;

  constructor(dbPath: string = "data/attendance.db") {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = knex({
      client: "sqlite3",
      connection: {
        filename: dbPath,
      },
      useNullAsDefault: true,
    });
    this.initDatabase().catch(console.error);
    this.attendance = new AttendanceRepository(this.db);
  }

  private async initDatabase(): Promise<void> {
    try {
      // Create attendance table if it doesn't exist
      const hasAttendanceTable = await this.db.schema.hasTable("attendance");
      if (!hasAttendanceTable) {
        await this.db.schema.createTable("attendance", (table) => {
          table.increments("id").primary();
          table.integer("userId").notNullable();
          table.string("username").notNullable();
          table.string("firstName").notNullable();
          table.string("lastName").nullable();
          table.string("timestamp").notNullable();
          table.enu("status", ["present", "late"]).nullable();
          table.string("date").notNullable();
          table.unique(["userId", "date"]);
          table.index(["userId", "date"], "idx_user_date");
          table.index("date", "idx_date");
        });
        console.log("Attendance table initialized successfully");
      }

      // Create alias table if it doesn't exist
      const hasAliasTable = await this.db.schema.hasTable("alias");
      if (!hasAliasTable) {
        await this.db.schema.createTable("alias", (table) => {
          table.integer("userId").primary();
          table.string("firstName").notNullable();
          table.string("lastName").nullable();
        });
        console.log("Alias table initialized successfully");
      }
    } catch (error) {
      console.error("Error initializing database:", error);
    }
  }

  async close(): Promise<void> {
    try {
      await this.db.destroy();
      console.log("Database connection closed");
    } catch (error) {
      console.error("Error closing database:", error);
    }
  }
}
