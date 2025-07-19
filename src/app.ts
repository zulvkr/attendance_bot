import { ENV } from "./config/environment";
import { AttendanceService } from "./attendance";

import { Telegraf, Context } from "telegraf";
import { message } from "telegraf/filters";

// Create attendance service instance
const attendanceService = new AttendanceService();

const bot = new Telegraf(ENV.BOT_TOKEN);

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
🏷️ /alias - Absen dengan nama lain
   Format: \`/alias [OTP] [Nama Depan] [Nama Belakang]\`
   Contoh: \`/alias 123456 John Doe\`

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
      `❓ *Cara Menggunakan Alias*\n\nFormat: \`/alias [OTP] [Nama Depan] [Nama Belakang (opsional)]\`\n\n*Contoh:*\n\`/alias 123456 John Doe\`\n\`/alias 123456 Jane\`\n\n*Catatan:* Fitur ini memungkinkan Anda absen dengan nama yang berbeda.`,
      { parse_mode: "Markdown" }
    );
    return;
  }

  const otp = args[0];
  const firstName = args[1];
  const lastName = args.length > 2 ? args.slice(2).join(" ") : undefined;

  // Validate OTP format (6 digits)
  if (!/^\d{6}$/.test(otp)) {
    ctx.reply("❌ OTP harus berupa 6 digit angka. Contoh: 123456");
    return;
  }

  try {
    const userId = ctx.from.id;
    const username = ctx.from.username || "unknown";

    // Verifikasi OTP
    if (!attendanceService.verifyOTP(otp)) {
      ctx.reply(
        "❌ Kode OTP tidak valid. Silakan cek aplikasi autentikator Anda dan coba lagi."
      );
      return;
    }

    // Tandai absensi dengan alias
    const result = await attendanceService.markAttendanceWithAlias(
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
    console.error("Error processing alias attendance:", error);
    ctx.reply(
      "❌ Terjadi kesalahan saat memproses absensi. Silakan coba lagi."
    );
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
bot.on(message("text"), (ctx) => {
  ctx.reply(
    "🤔 Silakan kirim kode OTP 6 digit untuk absen, atau gunakan /help untuk melihat perintah yang tersedia."
  );
});

export function startBot() {
  bot
    .launch()
    .then(() => {
      console.log("Bot is running...");
    })
    .catch((error) => {
      console.error("Failed to start bot:", error);
    });
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
