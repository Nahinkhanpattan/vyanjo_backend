const moment = require("moment-timezone");

const weekStartDate = "2026-01-12";
const tz = "Asia/Kolkata";

console.log("Input:", weekStartDate);

// Current Logic
const normalizedWeekStart = moment(weekStartDate)
  .tz(tz)
  .startOf("isoWeek")
  .toDate();

console.log("Current Logic (Date Object):", normalizedWeekStart.toISOString());
// Expected: Something on Jan 11th UTC (Sunday)

// Proposed Logic (Noon)
const noonWeekStart = moment(weekStartDate)
  .tz(tz)
  .startOf("isoWeek")
  .hour(12)
  .toDate();

console.log("Noon Logic (Date Object):", noonWeekStart.toISOString());
// Expected: Something on Jan 12th UTC (Monday)
