import { authenticator } from "otplib";
import * as QRCode from "qrcode";

// Generate a new TOTP secret
const secret = authenticator.generateSecret();
console.log("Generated TOTP Secret:", secret);

// Create the service name and account name for the QR code
const serviceName = "Attendance Bot";
const accountName = "Employee"; // You can customize this

// Generate the otpauth URL
const otpauthUrl = authenticator.keyuri(accountName, serviceName, secret);
console.log("OTP Auth URL:", otpauthUrl);

// Generate QR code
QRCode.toString(otpauthUrl, { type: "terminal" }, (err, url) => {
  if (err) {
    console.error("Error generating QR code:", err);
    return;
  }

  console.log("\n=== QR Code ===");
  console.log(url);
  console.log("\n=== Authenticator Key ===");
  console.log("Secret Key:", secret);
  console.log("\n=== Setup Instructions ===");
  console.log("1. Copy the TOTP Secret above to your .env file as TOTP_SECRET");
  console.log(
    "2. Scan the QR code with your authenticator app (Google Authenticator, Authy, etc.)"
  );
  console.log("3. Or manually enter the secret in your authenticator app");
  console.log("4. Start the bot and test with the 6-digit code from your app");
});

// Test token generation
console.log("\nCurrent TOTP token:", authenticator.generate(secret));
