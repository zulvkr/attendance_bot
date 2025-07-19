import { ENV } from "./config/environment";
import { AttendanceService } from "./attendance";

import { Telegraf, Context, session } from "telegraf";
import { message } from "telegraf/filters";
import * as fs from "fs";

interface SessionData {
  awaitingDateRange?: boolean;
}

interface MyContext extends Context {
  session?: SessionData;
}

// Create attendance service instance
const attendanceService = new AttendanceService();

const bot = new Telegraf<MyContext>(ENV.BOT_TOKEN);

// Use session middleware
bot.use(session());

// Start command
bot.start((ctx) => {
  const welcomeMessage = `
🎯 *Selamat datang di Attendance Bot!*

Untuk absen, kirimkan kode OTP 6 digit Anda.

*Perintah yang Tersedia:*
📝 Kirim OTP - Absen
📊 /report - Lihat laporan absensi hari ini
📈 /history - Lihat riwayat absensi Anda
🏷️ /alias - Absen dengan nama lain
🔄 /status - Cek status absensi hari ini
📋 /fullreport - Download laporan lengkap (CSV)
❓ /help - Tampilkan pesan bantuan ini

*Catatan:* Absensi sebelum jam 9:00 pagi akan tercatat sebagai "Tepat Waktu", setelah jam 9:00 pagi akan tercatat sebagai "Terlambat".
  `;
  ctx.reply(welcomeMessage, { parse_mode: "Markdown" });
});

// Help command
bot.help((ctx) => {
  const helpMessage = `
❓ *Bantuan Attendance Bot*

*Cara menggunakan:*
1. Dapatkan OTP dari aplikasi autentikator Anda
2. Kirimkan kode 6 digit ke bot ini
3. Absensi Anda akan tercatat secara otomatis

*Perintah:*
📊 /report - Lihat laporan absensi hari ini
📈 /history - Lihat riwayat absensi Anda (30 hari terakhir)
🔄 /status - Cek apakah Anda sudah absen hari ini
🏷️ /alias - Gunakan nama panggilan/alias untuk absensi
   Format: \`/alias [Nama Depan] [Nama Belakang]\`
   Contoh: \`/alias John Doe\`
📋 /fullreport - Download laporan lengkap dalam format CSV
   Format: Masukkan rentang tanggal (YYYY-MM-DD YYYY-MM-DD)

*Peraturan:*
• Setiap orang hanya bisa absen sekali per hari
• Absensi sebelum jam 9:00 pagi = Tepat Waktu ✅
• Absensi setelah jam 9:00 pagi = Terlambat ⚠️
  `;
  ctx.reply(helpMessage, { parse_mode: "Markdown" });
});

// Report command
bot.command("report", async (ctx) => {
  try {
    const report = await attendanceService.generateAttendanceReport();
    ctx.reply(report, { parse_mode: "Markdown" });
  } catch (error) {
    console.error("Error generating report:", error);
    ctx.reply("❌ Terjadi kesalahan saat membuat laporan. Silakan coba lagi.");
  }
});

// History command
bot.command("history", async (ctx) => {
  try {
    const userId = ctx.from.id;
    const history = await attendanceService.getUserAttendanceHistory(
      userId,
      30
    );

    if (history.length === 0) {
      ctx.reply("📭 Tidak ada riwayat absensi dalam 30 hari terakhir.");
      return;
    }

    let historyMessage = `📈 *Riwayat Absensi Anda (30 hari terakhir)*\n\n`;
    history.forEach((record, index) => {
      const date = record.timestamp.toLocaleDateString();
      const time = record.timestamp.toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      });
      historyMessage += `${index + 1}. ${date} - ${time}\n`;
    });

    historyMessage += `\n*Ringkasan:*\n`;
    historyMessage += `📊 Total Hari: ${history.length}`;

    ctx.reply(historyMessage, { parse_mode: "Markdown" });
  } catch (error) {
    console.error("Error getting history:", error);
    ctx.reply(
      "❌ Terjadi kesalahan saat mengambil riwayat. Silakan coba lagi."
    );
  }
});

// Status command
bot.command("status", async (ctx) => {
  try {
    const userId = ctx.from.id;
    const today = await attendanceService.getTodayAttendance();
    const userToday = today.find((record) => record.userId === userId);

    if (userToday) {
      const time = userToday.timestamp.toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      });
      ctx.reply(
        `✅ *Status Absensi*\n\nAnda sudah absen hari ini pada ${time}`,
        { parse_mode: "Markdown" }
      );
    } else {
      ctx.reply(
        "❌ *Status Absensi*\n\nAnda belum absen hari ini.\nKirim OTP Anda untuk absen.",
        { parse_mode: "Markdown" }
      );
    }
  } catch (error) {
    console.error("Error checking status:", error);
    ctx.reply("❌ Terjadi kesalahan saat memeriksa status. Silakan coba lagi.");
  }
});

// Alias command
bot.command("alias", async (ctx) => {
  const args = ctx.message.text.split(" ").slice(1); // Remove /alias from the command

  if (args.length < 2) {
    ctx.reply(
      `❓ *Cara Menggunakan Alias*\n\nFormat: \`/alias [Nama Depan] [Nama Belakang (opsional)]\`\n\n*Contoh:*\n\`/alias John Doe\`\n\`/alias Jane\`\n\n*Catatan:* Fitur ini memungkinkan Anda menggunakan nama panggilan/alias untuk absensi.`,
      { parse_mode: "Markdown" }
    );
    return;
  }

  const firstName = args[0];
  const lastName = args.length > 1 ? args.slice(1).join(" ") : undefined;

  try {
    const userId = ctx.from.id;
    // Simpan alias ke database
    const result = await attendanceService.setUserAlias(
      userId,
      firstName,
      lastName
    );

    if (result.success) {
      ctx.reply(
        `✅ Alias berhasil disimpan: *${firstName}${
          lastName ? " " + lastName : ""
        }*`,
        { parse_mode: "Markdown" }
      );
    } else {
      ctx.reply(`❌ Gagal menyimpan alias: ${result.message}`);
    }
  } catch (error) {
    console.error("Error saving alias:", error);
    ctx.reply("❌ Terjadi kesalahan saat menyimpan alias. Silakan coba lagi.");
  }
});

// Full report command
bot.command("fullreport", async (ctx) => {
  try {
    ctx.reply(
      `📊 *Laporan Lengkap Absensi*\n\nSilakan masukkan password admin dan rentang tanggal dalam format:\n\`[password] YYYY-MM-DD YYYY-MM-DD\`\n\n*Contoh:*\n\`admin123 2025-01-01 2025-01-31\`\n\n*Catatan:* Laporan akan dikirim dalam format CSV.`,
      { parse_mode: "Markdown" }
    );

    // Store user state for awaiting date range
    ctx.session = ctx.session || {};
    ctx.session.awaitingDateRange = true;
  } catch (error) {
    console.error("Error initiating full report:", error);
    ctx.reply("❌ Terjadi kesalahan. Silakan coba lagi.");
  }
});

// Handle OTP messages (6-digit numbers)
bot.hears(/^\d{6}$/, async (ctx) => {
  try {
    const otp = ctx.message.text;
    const userId = ctx.from.id;
    const username = ctx.from.username || "unknown";
    const firstName = ctx.from.first_name;
    const lastName = ctx.from.last_name;

    // Verifikasi OTP
    if (!attendanceService.verifyOTP(otp)) {
      ctx.reply(
        "❌ Kode OTP tidak valid. Silakan cek aplikasi autentikator Anda dan coba lagi."
      );
      return;
    }

    // Tandai absensi
    const result = await attendanceService.markAttendance(
      userId,
      username,
      firstName,
      lastName
    );

    if (result.success) {
      ctx.reply(`🎉 ${result.message}`, { parse_mode: "Markdown" });
    } else {
      ctx.reply(`❌ ${result.message}`);
    }
  } catch (error) {
    console.error("Error processing OTP:", error);
    ctx.reply(
      "❌ Terjadi kesalahan saat memproses absensi. Silakan coba lagi."
    );
  }
});

// Handle invalid messages
bot.on(message("text"), async (ctx) => {
  const text = ctx.message.text;

  // Check if user is awaiting date range input for full report
  if (ctx.session?.awaitingDateRange) {
    ctx.session.awaitingDateRange = false;

    // Validate password and date range format
    const dateRangeRegex =
      /^([\S]+)\s+(\d{4}-\d{2}-\d{2})\s+(\d{4}-\d{2}-\d{2})$/;
    const match = text.match(dateRangeRegex);

    if (!match) {
      ctx.reply(
        "❌ Format input tidak valid. Gunakan format: [password] YYYY-MM-DD YYYY-MM-DD\n\nContoh: admin123 2025-01-01 2025-01-31"
      );
      return;
    }

    const [, password, startDate, endDate] = match;

    // Check password
    if (password !== ENV.ADMIN_PASSWORD) {
      ctx.reply("❌ Password admin salah. Akses ditolak.");
      return;
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      ctx.reply("❌ Tanggal tidak valid. Pastikan format tanggal benar.");
      return;
    }

    if (start > end) {
      ctx.reply("❌ Tanggal mulai tidak boleh lebih besar dari tanggal akhir.");
      return;
    }

    // Generate and send CSV report
    try {
      ctx.reply("⏳ Membuat laporan CSV... Mohon tunggu.");

      const { filePath, recordCount } =
        await attendanceService.generateCSVReport(startDate, endDate);

      // Send CSV file
      await ctx.replyWithDocument(
        {
          source: filePath,
          filename: `attendance_${startDate}_to_${endDate}.csv`,
        },
        {
          caption: `📊 *Laporan Absensi*\n\n📅 Periode: ${startDate} s/d ${endDate}\n📈 Total Records: ${recordCount}`,
          parse_mode: "Markdown",
        }
      );

      // Clean up temp file
      fs.unlinkSync(filePath);
    } catch (error) {
      console.error("Error generating CSV report:", error);
      ctx.reply(
        `❌ ${
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan saat membuat laporan."
        }`
      );
    }
    return;
  }

  // Handle OTP or show help
  ctx.reply(
    "🤔 Silakan kirim kode OTP 6 digit untuk absen, atau gunakan /help untuk melihat perintah yang tersedia."
  );
});

export function startBot() {
  bot.launch();
  console.log("Bot is running...");
}

// Graceful shutdown
async function shutdown() {
  console.log("Shutting down...");
  bot.stop("SIGTERM");
  // Close database connection
  await attendanceService.close();
  process.exit(0);
}

// Enable graceful stop
process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
