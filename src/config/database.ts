import knex, { Knex } from "knex";
import { AttendanceRepository } from "../repository/attendanceRepository";

export interface AttendanceRecord {
  id?: number;
  userId: number;
  username: string;
  firstName: string;
  lastName?: string;
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

  constructor(dbPath: string = "attendance.db") {
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
      // Create table if it doesn't exist
      const hasTable = await this.db.schema.hasTable("attendance");
      if (!hasTable) {
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

          // Create indexes
          table.index(["userId", "date"], "idx_user_date");
          table.index("date", "idx_date");
        });
        console.log("Database initialized successfully");
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
