import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

export const PORT = process.env.PORT || 3005;
export const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";
export const RESEND_API_KEY = process.env.RESEND_API_KEY || "re_123456789"; // Replace with your actual key
