# Attendance Master - Quick Reference Guide

> Version 1.0 | Last Updated: May 2026 | © 2026 Attendance Master

---

# 📱 System Requirements

- Web browser:
  - Chrome
  - Firefox
  - Safari
  - Edge
- Internet connection
- Excel file (`.xls` or `.xlsx`)
- Maximum file size: **10MB**
- No installation required

---

# 🚀 Quick Start (3 Steps)

1. Open the application
2. Click **"Choose File"** or drag & drop your Excel file
3. View your attendance report instantly

**⏱️ Processing Time:** 1–2 seconds

---

# 📊 What You Get In Your Report

## Summary Statistics (8 Cards)

- Present Days
- Absent Days
- Late Days Count
- Total Working Hours
- Weekly Off Days
- Holiday Count
- Early Days Count
- Avg Daily Hours

---

## Detailed Table

| Date | Day | Status | InTime | OutTime | Duration |
|------|-----|--------|--------|---------|----------|

Additional Details:
- Late Time & Status (`A1 / A2 / A3 / A4`)
- Early Time & Status (`B1 / B2 / B3 / B4`)

---

## Filters & Sort

### Filter By
- All
- P
- A
- WO
- H
- PL
- HP

### Sort By
- Date
- Status
- Late Time
- Early Time

### Order
- Ascending
- Descending

---

# 📋 Excel File Format Checklist

## Required Elements

- [ ] Month & Year (Example: `Apr 2026`) — Must be within first 12 rows
- [ ] Employee Name with `Employee:` label in first 20 rows
- [ ] Shift Details (Optional) with `Shift:` label
- [ ] Day Headers numbered `1–31`
- [ ] Status Row labeled `Status`
- [ ] InTime Row labeled `InTime`
- [ ] OutTime Row labeled `OutTime`
- [ ] Duration Row (Optional) labeled `Duration`

---

# 🧾 Example Excel Structure

```text
Row 1:  Monthly Status Report (Title)
Row 3:  Apr 01 2026 To Apr 30 2026 (Date Range)
Row 4:  Company Information

Row 7:
1 W | 2 Th | 3 F | 4 Sa | ... 31 ...

Row 11:
Employee: John Doe | Shift: General

Row 12:
Status | P | P | WO | P | ...

Row 13:
InTime | 09:15 | 09:30 | - | 09:00 | ...

Row 14:
OutTime | 18:00 | 17:45 | - | 18:00 | ...

Row 15:
Duration | 08:45 | 08:15 | - | 09:00 | ...
```

---

# 📌 Status Codes

| Code | Meaning |
|------|----------|
| P | Present |
| A | Absent |
| WO | Weekly Off |
| WOP | Weekly Off - Present |
| H | Holiday |
| HP | Holiday Present |
| PL | Paid Leave / Personal Leave |
| C OFF | Compensatory Off |

---

# ⏱️ Time Format

## Use 24-Hour Format

### ✅ Correct
```text
09:00
09:30
17:45
18:00
```

### ❌ Wrong
```text
9:00 AM
09:30 a.m.
5:45 PM
6 PM
```

---

## Office Hours (Default)

| Type | Time |
|------|------|
| In Time | 09:00 |
| Out Time | 18:00 |

---

# ⚡ Late Arrival Categories

| Category | Rule |
|----------|------|
| A1 | ≤ 10 minutes late |
| A2 | > 10 and ≤ 30 minutes late |
| A3 | > 30 and ≤ 45 minutes late |
| A4 | > 45 minutes late |

### Example
Employee arrives at **09:20** → 20 minutes late → **A2**

---

# ⏭️ Early Departure Categories

| Category | Rule |
|----------|------|
| B1 | ≤ 10 minutes early |
| B2 | > 10 and ≤ 30 minutes early |
| B3 | > 30 and ≤ 45 minutes early |
| B4 | > 45 minutes early |

### Example
Employee leaves at **17:30** → 30 minutes early → **B2**

---

# 🎮 How To Use Filters & Sort

## Filter By Status

| Filter | Description |
|--------|-------------|
| All Status | Show all records |
| P | Present days only |
| A | Absent days only |
| WO | Weekly Off days |
| H | Holiday records |
| PL | Leave records |
| HP | Holiday Present |

---

## Sort Options

### Sort By
- Date
- Status
- Late Time
- Early Time

### Order
- Ascending → A to Z / 1 to 9
- Descending → Z to A / 9 to 1

---

# 💾 Exporting & Printing

## Export Button
- Downloads as `.xlsx`
- Includes summary + detailed data
- Proper Excel formatting
- Includes filtered/sorted data

## Print Button
- Opens print dialog
- Save as PDF supported
- Clean professional layout
- Only report data shown

## New File Button
- Clears current report
- Ready for next upload
- Resets filters and sorting

---

# 🛠️ Troubleshooting Quick Fixes

| Issue | Solution |
|------|----------|
| File size exceeds 10MB | Reduce file size or split data |
| Employee name not found | Add `Employee:` label |
| Day headers not recognized | Format as `1 W`, `2 Th` |
| Status row not found | Ensure row labeled `Status` exists |
| Invalid time format | Use `HH:MM` 24-hour format |
| Wrong totals | Check status codes |
| Browser not working | Use latest Chrome/Firefox/Safari/Edge |
| Slow processing | Check internet connection |
| Can't open file | Ensure `.xls` or `.xlsx` format |

---

# ❓ Frequently Asked Questions

## Is my data saved?
No. Data is processed locally in your browser and is not stored on any server.

---

## Can I process multiple employees?
Yes. Upload each employee file separately.

---

## What if I have data for only 20 days?
The app automatically adapts to the available number of days.

---

## Can I change office hours?
Yes, but it requires code modification. Default is `09:00 AM – 06:00 PM`.

---

## Does it work on mobile?
Yes. The application is fully mobile-responsive.

---

## Can I filter by date range?
Edit the Excel file before uploading to include only the desired dates.

---

## Which browsers work best?
Latest versions of:
- Chrome
- Firefox
- Safari
- Edge

---

## Is internet required?
Yes, an active internet connection is required.

---

# 📞 Support

**Email:** gholapabhishek9@gmail.com 
**Response Time:** 24–48 hours

---

## Full User Manual Includes

- Detailed step-by-step guide
- Example Excel layouts
- Complete feature explanations
- Extended troubleshooting

---