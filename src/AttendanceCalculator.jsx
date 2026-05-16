import React, { useState, useRef } from "react";
import * as XLSX from "xlsx";

const AttendanceCalculator = () => {
  const [data, setData] = useState(null);
  const [sortConfig, setSortConfig] = useState({
    key: "day",
    direction: "asc",
  });
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [validationErrors, setValidationErrors] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef(null);

  const OFFICE_IN_TIME = "09:00";
  const OFFICE_OUT_TIME = "18:00";

  const timeToMinutes = (time) => {
    if (!time) return 0;
    const parts = String(time).trim().split(":");
    if (parts.length < 2) return 0;
    return (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0);
  };

  const minutesToTime = (mins) => {
    const total = Math.max(0, Math.round(mins));
    const h = Math.floor(total / 60);
    const m = total % 60;
    return `${h}:${String(m).padStart(2, "0")}`;
  };

  const isValidTime = (time) => {
    if (!time) return true;
    const pattern = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return pattern.test(String(time).trim());
  };

  const getLateStatus = (inTime) => {
    if (!inTime) return "";
    const actual = timeToMinutes(inTime);
    const expected = timeToMinutes(OFFICE_IN_TIME);
    const late = actual - expected;
    if (late <= 0) return "";
    if (late <= 10) return "A1";
    if (late > 60) return "A4";
    if (late > 45) return "A3";
    if (late > 30) return "A2";
    return "A1";
  };

  const getEarlyStatus = (outTime) => {
    if (!outTime) return "";
    const actual = timeToMinutes(outTime);
    const expected = timeToMinutes(OFFICE_OUT_TIME);
    const early = expected - actual;
    if (early <= 0) return "";
    if (early <= 10) return "B1";
    if (early > 60) return "B4";
    if (early > 45) return "B3";
    if (early > 30) return "B2";
    return "B1";
  };

  const calculateSummary = (attendanceRows) => {
    let present = 0,
      absent = 0,
      weeklyOff = 0,
      holidays = 0;
    let totalMinutes = 0,
      lateCount = 0,
      earlyCount = 0,
      presentDays = 0;

    attendanceRows.forEach((row) => {
      const status = String(row.status || "").toUpperCase();
      if (status === "P") present++;
      else if (status === "A") absent++;
      else if (
        status === "WO" ||
        status === "WOP" ||
        status === "C OFF" ||
        status === "PL" ||
        status === "CL"
      )
        weeklyOff++;
      else if (status === "H" || status === "HP") holidays++;

      if (status === "P" && row.inTime && row.outTime) {
        presentDays++;
        const inMin = timeToMinutes(row.inTime);
        const outMin = timeToMinutes(row.outTime);
        let diff = outMin - inMin;
        if (diff < 0) diff += 24 * 60;
        totalMinutes += diff;
      }

      if (status === "P" && row.lateStatus && row.lateStatus !== "")
        lateCount++;
      if (status === "P" && row.earlyStatus && row.earlyStatus !== "")
        earlyCount++;
    });

    const avgHours =
      presentDays > 0 ? minutesToTime(totalMinutes / presentDays) : "0:00";

    return {
      present,
      absent,
      weeklyOff,
      holidays,
      totalWorkDuration: minutesToTime(totalMinutes),
      avgDailyHours: avgHours,
      lateCount,
      earlyCount,
      totalDaysConsidered: attendanceRows.length,
    };
  };

  const extractEmployeeName = (rows) => {
    for (let i = 0; i < Math.min(rows.length, 20); i++) {
      const row = rows[i];
      for (let j = 0; j < row.length; j++) {
        const cell = String(row[j] || "").trim();
        if (/employee/i.test(cell)) {
          const inline = cell.replace(/employee\s*:?\s*/i, "").trim();
          if (inline && inline.toLowerCase() !== "employee") return inline;
          for (let k = j + 1; k < row.length; k++) {
            const next = String(row[k] || "").trim();
            if (
              next &&
              !/department|designation|date|status|shift|company|days/i.test(
                next,
              )
            ) {
              return next;
            }
          }
        }
      }
    }
    return "";
  };

  const extractShift = (rows) => {
    for (let i = 0; i < Math.min(rows.length, 20); i++) {
      const row = rows[i];
      for (let j = 0; j < row.length; j++) {
        const cell = String(row[j] || "").trim();
        if (/shift/i.test(cell)) {
          const inline = cell.replace(/shift\s*:?\s*/i, "").trim();
          if (inline && inline.toLowerCase() !== "shift") return inline;
          for (let k = j + 1; k < row.length; k++) {
            const next = String(row[k] || "").trim();
            if (
              next &&
              !/employee|department|designation|company|days/i.test(next)
            ) {
              return next;
            }
          }
        }
      }
    }
    return "";
  };

  const extractMonthYearFromExcel = (rows) => {
    const monthMap = {
      jan: 1,
      january: 1,
      feb: 2,
      february: 2,
      mar: 3,
      march: 3,
      apr: 4,
      april: 4,
      may: 5,
      jun: 6,
      june: 6,
      jul: 7,
      july: 7,
      aug: 8,
      august: 8,
      sep: 9,
      sept: 9,
      september: 9,
      oct: 10,
      october: 10,
      nov: 11,
      november: 11,
      dec: 12,
      december: 12,
    };

    for (let i = 0; i < Math.min(rows.length, 12); i++) {
      const rowText = rows[i].join(" ").toLowerCase();
      const yearMatch = rowText.match(/\b(20\d{2})\b/);
      for (const key in monthMap) {
        if (rowText.includes(key)) {
          return {
            month: monthMap[key],
            year: yearMatch ? Number(yearMatch[1]) : new Date().getFullYear(),
          };
        }
      }
    }

    return { month: new Date().getMonth() + 1, year: new Date().getFullYear() };
  };

  const formatMonthTitle = (month, year) => {
    if (!month || !year) return "";
    return new Date(year, month - 1, 1).toLocaleString("en-IN", {
      month: "long",
      year: "numeric",
    });
  };

  const formatFullDate = (day, month, year) => {
    if (!day || !month || !year) return { date: "", day: "" };
    const dateObj = new Date(year, month - 1, day);
    return {
      date: `${String(day).padStart(2, "0")} ${dateObj.toLocaleString("en-IN", { month: "short" })} ${year}`,
      day: dateObj.toLocaleString("en-IN", { weekday: "short" }),
    };
  };

  const extractDayNumbers = (rows) => {
    for (let i = 0; i < Math.min(rows.length, 20); i++) {
      const row = rows[i];
      const dayNumbers = [];
      let foundDays = false;

      for (let j = 0; j < row.length; j++) {
        const cell = String(row[j] || "").trim();
        const dayMatch = cell.match(/^(\d{1,2})\s*[A-Z]*/);
        if (dayMatch) {
          dayNumbers.push({ day: parseInt(dayMatch[1], 10), columnIndex: j });
          foundDays = true;
        }
      }

      if (foundDays && dayNumbers.length > 0) return dayNumbers;
    }
    return [];
  };

  const parseExcel = (rows) => {
    const errors = [];

    if (rows.length === 0) {
      errors.push("Excel file is empty");
      setValidationErrors(errors);
      setIsLoading(false);
      alert("Excel file is empty");
      return;
    }

    const employeeName = extractEmployeeName(rows);
    if (!employeeName) errors.push("⚠️ Employee name not found");

    const shift = extractShift(rows);

    const statusRow = rows.find(
      (r) => String(r[0]).trim().toLowerCase() === "status",
    );
    if (!statusRow) {
      errors.push("Status row not found");
      setValidationErrors(errors);
      setIsLoading(false);
      alert("Attendance data (Status row) not found in Excel");
      return;
    }

    const inRow = rows.find(
      (r) => String(r[0]).trim().toLowerCase() === "intime",
    );
    const outRow = rows.find(
      (r) => String(r[0]).trim().toLowerCase() === "outtime",
    );
    const durationRow = rows.find(
      (r) => String(r[0]).trim().toLowerCase() === "duration",
    );
    const lateRow = rows.find(
      (r) => String(r[0]).trim().toLowerCase() === "late by",
    );
    const earlyRow = rows.find(
      (r) => String(r[0]).trim().toLowerCase() === "early by",
    );

    const dayNumbers = extractDayNumbers(rows);
    if (dayNumbers.length === 0) {
      errors.push("Day headers not found");
      setValidationErrors(errors);
      setIsLoading(false);
      alert("Could not find day headers in Excel");
      return;
    }

    const { month, year } = extractMonthYearFromExcel(rows);
    const monthTitle = formatMonthTitle(month, year);
    const firstDay = Math.min(...dayNumbers.map((d) => d.day));
    const lastDay = Math.max(...dayNumbers.map((d) => d.day));
    const firstDate = formatFullDate(firstDay, month, year).date;
    const lastDate = formatFullDate(lastDay, month, year).date;

    const attendanceRows = [];

    dayNumbers.forEach((dayInfo) => {
      const { day, columnIndex } = dayInfo;
      const status = String(statusRow[columnIndex] || "")
        .trim()
        .toUpperCase();
      const inTime = inRow?.[columnIndex] || "";
      const outTime = outRow?.[columnIndex] || "";

      if (inTime && !isValidTime(inTime))
        errors.push(`Day ${day}: Invalid In Time "${inTime}"`);
      if (outTime && !isValidTime(outTime))
        errors.push(`Day ${day}: Invalid Out Time "${outTime}"`);

      let lateTime = lateRow?.[columnIndex] || "";
      let earlyTime = earlyRow?.[columnIndex] || "";

      if (!lateTime && status === "P" && inTime) {
        const lateMins = timeToMinutes(inTime) - timeToMinutes(OFFICE_IN_TIME);
        lateTime = lateMins > 0 ? minutesToTime(lateMins) : "0:00";
      }

      if (!earlyTime && status === "P" && outTime) {
        const earlyMins =
          timeToMinutes(OFFICE_OUT_TIME) - timeToMinutes(outTime);
        earlyTime = earlyMins > 0 ? minutesToTime(earlyMins) : "0:00";
      }

      const dateInfo = formatFullDate(day, month, year);

      attendanceRows.push({
        day,
        date: dateInfo.date,
        weekDay: dateInfo.day,
        status,
        inTime,
        outTime,
        duration: durationRow?.[columnIndex] || "",
        lateTime,
        earlyTime,
        lateStatus: status === "P" ? getLateStatus(inTime) : "",
        earlyStatus: status === "P" ? getEarlyStatus(outTime) : "",
      });
    });

    attendanceRows.sort((a, b) => a.day - b.day);
    setValidationErrors(errors);
    setData({
      employeeName,
      shift,
      monthTitle,
      rangeText: `${firstDate} to ${lastDate}`,
      attendanceRows,
      summary: calculateSummary(attendanceRows),
    });
    setIsLoading(false);
  };

  const handleFileUpload = (file) => {
    if (!file) return;

    const ext = file.name.split(".").pop().toLowerCase();
    if (ext !== "xls" && ext !== "xlsx") {
      alert("Only Excel files are supported (.xls, .xlsx)");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert("File size exceeds 10MB. Please upload a smaller file.");
      return;
    }

    setIsLoading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const workbook = XLSX.read(e.target.result, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
        parseExcel(rows);
      } catch (err) {
        console.error(err);
        alert(
          "Unable to parse Excel file. Please check the file format.\n\nError: " +
            err.message,
        );
        setIsLoading(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const getSortedAndFilteredRows = () => {
    let filtered = data.attendanceRows;

    if (filterStatus !== "ALL") {
      filtered = filtered.filter((row) => row.status === filterStatus);
    }

    return filtered.sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];

      if (sortConfig.key === "day") {
        return sortConfig.direction === "asc" ? aVal - bVal : bVal - aVal;
      }

      if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  };

  const exportToExcel = () => {
    const ws_data = [
      ["Attendance Report"],
      ["Employee:", data.employeeName],
      ["Shift:", data.shift],
      ["Period:", data.monthTitle],
      ["Date Range:", data.rangeText],
      [],
      ["Summary"],
      ["Present", data.summary.present],
      ["Absent", data.summary.absent],
      ["Weekly Off", data.summary.weeklyOff],
      ["Holiday", data.summary.holidays],
      ["Total Work Duration", data.summary.totalWorkDuration],
      ["Avg Daily Hours", data.summary.avgDailyHours],
      ["Late Days", data.summary.lateCount],
      ["Early Days", data.summary.earlyCount],
      [],
      ["Attendance Details"],
      [
        "Date",
        "Day",
        "Status",
        "In Time",
        "Out Time",
        "Duration",
        "Late Time",
        "Late",
        "Early Time",
        "Early",
      ],
      ...getSortedAndFilteredRows().map((row) => [
        row.date,
        row.weekDay,
        row.status,
        row.inTime,
        row.outTime,
        row.duration,
        row.lateTime,
        row.lateStatus,
        row.earlyTime,
        row.earlyStatus,
      ]),
    ];

    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance");
    XLSX.writeFile(
      wb,
      `Attendance_${data.employeeName}_${data.monthTitle}.xlsx`,
    );
  };

  const cardBg = "white";
  const textColor = "#111827";
  const borderColor = "#e5e7eb";
  const headerBg = "#f3f4f6";

  const UploadIcon = () => (
    <svg
      width="80"
      height="80"
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="80" height="80" rx="16" fill="#f0f4ff" />
      <path
        d="M40 28V48M40 28L32 36M40 28L48 36"
        stroke="#4f46e5"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M28 52H52C53.1046 52 54 52.8954 54 54V56C54 57.1046 53.1046 58 52 58H28C26.8954 58 26 57.1046 26 56V54C26 52.8954 26.8954 52 28 52Z"
        stroke="#4f46e5"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  const CheckIcon = () => (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M10 0C4.48 0 0 4.48 0 10s4.48 10 10 10 10-4.48 10-10S15.52 0 10 0zm-2 15l-5-5 1.41-1.41L8 12.17l7.59-7.59L17 6l-9 9z"
        fill="#4f46e5"
      />
    </svg>
  );

  const CalendarIcon = () => (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        x="3"
        y="4"
        width="18"
        height="18"
        rx="2"
        stroke="#4f46e5"
        strokeWidth="2"
      />
      <path
        d="M16 2V6"
        stroke="#4f46e5"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M8 2V6" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M3 10H21"
        stroke="#4f46e5"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );

  const UserIcon = () => (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="12" cy="8" r="4" stroke="#4f46e5" strokeWidth="2" />
      <path
        d="M4 20C4 15.5817 7.58172 12 12 12C16.4183 12 20 15.5817 20 20"
        stroke="#4f46e5"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );

  const ChartIcon = () => (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        x="3"
        y="13"
        width="4"
        height="8"
        stroke="#4f46e5"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <rect
        x="10"
        y="7"
        width="4"
        height="14"
        stroke="#4f46e5"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <rect
        x="17"
        y="3"
        width="4"
        height="18"
        stroke="#4f46e5"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );

  const StatusIcon = () => (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M9 12L11 14L15 10"
        stroke="#4f46e5"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="9" stroke="#4f46e5" strokeWidth="2" />
    </svg>
  );

  const ClockIcon = () => (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="12" cy="12" r="9" stroke="#4f46e5" strokeWidth="2" />
      <path
        d="M12 6V12L16 14"
        stroke="#4f46e5"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );

  const ExportIcon = () => (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 2V14M12 14L7 9M12 14L17 9"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M3 20H21" stroke="white" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );

  const PrintIcon = () => (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        x="2"
        y="4"
        width="20"
        height="12"
        rx="1"
        stroke="white"
        strokeWidth="2"
      />
      <path
        d="M6 16V20C6 20.5523 6.44772 21 7 21H17C17.5523 21 18 20.5523 18 20V16"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <rect
        x="8"
        y="8"
        width="8"
        height="5"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );

  const NewFileIcon = () => (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 2V12M12 12H2M12 12H22M12 12V22"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  const LoadingSpinner = () => (
    <svg
      width="40"
      height="40"
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="20" cy="20" r="18" stroke="#e5e7eb" strokeWidth="3" />
      <circle
        cx="20"
        cy="20"
        r="18"
        stroke="#4f46e5"
        strokeWidth="3"
        strokeDasharray="28.27"
        strokeDashoffset="0"
        style={{ animation: "spin 1s linear infinite" }}
      />
    </svg>
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #f5f7fa 0%, #dfe9f3 100%)",
        padding: "24px",
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        color: textColor,
      }}
    >
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @media print {
          body, html {
            background: white !important;
          }
          .print-hide {
            display: none !important;
          }
          .upload-container, .upload-card, .requirements-card, .header-section {
            display: none !important;
          }
          .print-area {
            max-width: 100% !important;
            padding: 0 !important;
          }
          .print-area > div:first-child {
            display: none !important;
          }
        }
        @media (max-width: 768px) {
          .upload-container {
            flex-direction: column !important;
          }
            @media (max-width: 768px) {
  .upload-container {
    flex-direction: column !important;
  }

  .upload-card,
  .requirements-card {
    width: 100% !important;
    min-height: auto !important;
    padding: 24px 18px !important;
  }

  .mobile-header h1 {
    font-size: 34px !important;
  }

  .mobile-header p {
    font-size: 14px !important;
  }

  .summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    gap: 12px !important;
  }

  .summary-card {
    padding: 14px !important;
    border-radius: 10px !important;
  }

  .summary-card-title {
    font-size: 11px !important;
  }

  .summary-card-value {
    font-size: 18px !important;
  }

  .filters-grid {
    grid-template-columns: 1fr !important;
  }

  .table-wrap {
    display: none !important;
  }

  .mobile-cards {
    display: flex !important;
    flex-direction: column;
    gap: 12px;
  }

  .mobile-actions {
    width: 100%;
    display: grid !important;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .mobile-actions button:last-child {
    grid-column: span 2;
  }
}

@media (min-width: 769px) {
  .mobile-cards {
    display: none !important;
  }
}

          .upload-card,
          .requirements-card {
            width: 100% !important;
            min-height: auto !important;
            padding: 24px 18px !important;
          }

          .mobile-header-title {
            font-size: 32px !important;
          }

          .mobile-header-subtitle {
            font-size: 14px !important;
          }

          .summary-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 12px !important;
          }

          .summary-card {
            padding: 14px !important;
            border-radius: 10px !important;
          }

          .summary-card-title {
            font-size: 10px !important;
          }

          .summary-card-value {
            font-size: 18px !important;
          }

          .filters-grid {
            grid-template-columns: 1fr !important;
          }

          .mobile-table {
            font-size: 12px !important;
          }

          .mobile-table th,
          .mobile-table td {
            padding: 8px 4px !important;
          }

          .mobile-actions {
            display: grid !important;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
          }

          .mobile-actions button {
            padding: 8px 12px !important;
            font-size: 12px !important;
          }

          .mobile-actions button:nth-child(3) {
            grid-column: span 2;
          }
        }
      `}</style>

      <div
        className="print-area"
        style={{ maxWidth: "1400px", margin: "0 auto", width: "100%" }}
      >
        {!data ? (
          <div
            style={{
              minHeight: "100vh",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              padding: "40px 20px",
            }}
          >
            {/* Header */}
            <div
              className="header-section"
              style={{
                textAlign: "center",
                marginBottom: "60px",
                animation: "slideIn 0.6s ease",
              }}
            >
              <h1
                className="mobile-header-title"
                style={{
                  margin: "0 0 12px 0",
                  fontSize: "52px",
                  fontWeight: "800",
                  color: "#0f172a",
                  letterSpacing: "-1px",
                }}
              >
                Attendance Report
              </h1>
              <p
                className="mobile-header-subtitle"
                style={{
                  margin: "0",
                  fontSize: "18px",
                  color: "#64748b",
                  fontWeight: "500",
                  maxWidth: "600px",
                }}
              >
                Upload your Excel file to generate detailed attendance analytics
                and insights
              </p>
            </div>

            {/* Main Content - Side by Side */}
            <div
              className="upload-container"
              style={{
                display: "flex",
                gap: "32px",
                width: "100%",
                maxWidth: "1200px",
                animation: "slideIn 0.8s ease",
              }}
            >
              {/* Upload Card */}
              <div
                className="upload-card"
                onClick={() => fileInputRef.current.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  e.currentTarget.style.borderColor = "#4f46e5";
                  e.currentTarget.style.background = "#f8f7ff";
                }}
                onDragLeave={(e) => {
                  e.currentTarget.style.borderColor = "#e5e7eb";
                  e.currentTarget.style.background = cardBg;
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  e.currentTarget.style.borderColor = "#e5e7eb";
                  e.currentTarget.style.background = cardBg;
                  if (e.dataTransfer.files.length > 0) {
                    handleFileUpload(e.dataTransfer.files[0]);
                  }
                }}
                style={{
                  flex: 1,
                  background: cardBg,
                  borderRadius: "20px",
                  padding: "50px 40px",
                  textAlign: "center",
                  cursor: "pointer",
                  border: "2px solid #e5e7eb",
                  boxShadow: "0 10px 40px rgba(0, 0, 0, 0.06)",
                  transition: "all 0.3s ease",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  alignItems: "center",
                  minHeight: "360px",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow =
                    "0 20px 60px rgba(79, 70, 229, 0.15)";
                  e.currentTarget.style.borderColor = "#d4d1f7";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow =
                    "0 10px 40px rgba(0, 0, 0, 0.06)";
                  e.currentTarget.style.borderColor = "#e5e7eb";
                }}
              >
                {/* Icon */}
                <div
                  style={{
                    marginBottom: "24px",
                    animation: "float 3s ease-in-out infinite",
                  }}
                >
                  <UploadIcon />
                </div>

                {/* Title */}
                <h2
                  style={{
                    margin: "0 0 10px 0",
                    fontSize: "26px",
                    fontWeight: "700",
                    color: "#0f172a",
                  }}
                >
                  Upload Excel File
                </h2>

                {/* Subtitle */}
                <p
                  style={{
                    margin: "0 0 28px 0",
                    fontSize: "15px",
                    color: "#64748b",
                    lineHeight: "1.6",
                    maxWidth: "320px",
                  }}
                >
                  Drag and drop your file or click to browse from your computer
                </p>

                {/* Button */}
                <button
                  disabled={isLoading}
                  style={{
                    background: isLoading
                      ? "#cbd5e1"
                      : "linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)",
                    color: "white",
                    border: "none",
                    padding: "12px 36px",
                    borderRadius: "10px",
                    fontWeight: "600",
                    cursor: isLoading ? "not-allowed" : "pointer",
                    fontSize: "15px",
                    boxShadow: "0 4px 15px rgba(79, 70, 229, 0.3)",
                    transition: "all 0.3s ease",
                    marginBottom: "16px",
                    opacity: isLoading ? 0.7 : 1,
                  }}
                  onMouseEnter={(e) => {
                    if (!isLoading) {
                      e.currentTarget.style.transform = "translateY(-2px)";
                      e.currentTarget.style.boxShadow =
                        "0 8px 25px rgba(79, 70, 229, 0.4)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  {isLoading ? "Processing..." : "Choose File"}
                </button>

                <p
                  style={{
                    margin: "0",
                    fontSize: "12px",
                    color: "#94a3b8",
                  }}
                >
                  XLS, XLSX • Max 10MB
                </p>
              </div>

              {/* Requirements Card */}
              <div
                className="requirements-card"
                style={{
                  flex: 1,
                  background: cardBg,
                  borderRadius: "20px",
                  padding: "40px",
                  border: `1px solid ${borderColor}`,
                  boxShadow: "0 10px 40px rgba(0, 0, 0, 0.06)",
                  minHeight: "360px",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <h3
                  style={{
                    margin: "0 0 28px 0",
                    fontSize: "18px",
                    fontWeight: "700",
                    color: "#0f172a",
                    paddingBottom: "16px",
                    borderBottom: `2px solid #f0f4ff`,
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                  }}
                >
                  <CheckIcon />
                  Required Format
                </h3>

                <div style={{ display: "grid", gap: "16px", flex: 1 }}>
                  {[
                    {
                      icon: <CalendarIcon />,
                      title: "Month & Year",
                      desc: 'e.g., "Apr 2026"',
                    },
                    {
                      icon: <UserIcon />,
                      title: "Employee Name",
                      desc: "In header section",
                    },
                    {
                      icon: <ChartIcon />,
                      title: "Day Headers",
                      desc: "1, 2, 3...31 with days",
                    },
                    {
                      icon: <StatusIcon />,
                      title: "Status Row",
                      desc: "P, A, WO, H, PL, HP",
                    },
                    {
                      icon: <ClockIcon />,
                      title: "Time Rows",
                      desc: "HH:MM format",
                    },
                  ].map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        gap: "12px",
                        padding: "12px",
                        borderRadius: "10px",
                        background: "#f8fafc",
                        border: `1px solid ${borderColor}`,
                        transition: "all 0.2s ease",
                        cursor: "default",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#f0f4ff";
                        e.currentTarget.style.borderColor = "#d4d1f7";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "#f8fafc";
                        e.currentTarget.style.borderColor = borderColor;
                      }}
                    >
                      <div
                        style={{
                          minWidth: "24px",
                          textAlign: "center",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {item.icon}
                      </div>
                      <div>
                        <div
                          style={{
                            fontSize: "13px",
                            fontWeight: "700",
                            color: "#0f172a",
                            marginBottom: "2px",
                          }}
                        >
                          {item.title}
                        </div>
                        <div
                          style={{
                            fontSize: "12px",
                            color: "#64748b",
                          }}
                        >
                          {item.desc}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".xls,.xlsx"
              style={{ display: "none" }}
              onChange={(e) => handleFileUpload(e.target.files[0])}
              aria-label="Upload attendance file"
            />
          </div>
        ) : isLoading ? (
          <div
            style={{
              minHeight: "100vh",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              gap: "20px",
            }}
          >
            <LoadingSpinner />
            <p
              style={{
                fontSize: "18px",
                fontWeight: "600",
                color: "#4f46e5",
              }}
            >
              Processing your file...
            </p>
          </div>
        ) : (
          <>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: "25px",
                flexWrap: "wrap",
                gap: "12px",
              }}
            >
              <div>
                <h1 style={{ margin: 0, color: textColor }}>
                  Attendance Report
                </h1>
                <p style={{ marginTop: "6px", color: "#6b7280" }}>
                  Employee: <strong>{data.employeeName || "—"}</strong>
                </p>
                <p style={{ marginTop: "4px", color: "#6b7280" }}>
                  Summary: <strong>{data.shift || "—"}</strong>
                </p>
              </div>

              <div
                className="print-hide mobile-actions"
                style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}
              >
                <button
                  onClick={exportToExcel}
                  style={{
                    background: "#10b981",
                    color: "white",
                    border: "none",
                    padding: "10px 16px",
                    borderRadius: "8px",
                    fontWeight: "600",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                  }}
                >
                  <ExportIcon /> Export
                </button>

                <button
                  onClick={() => window.print()}
                  style={{
                    background: "#059669",
                    color: "white",
                    border: "none",
                    padding: "10px 16px",
                    borderRadius: "8px",
                    fontWeight: "600",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                  }}
                >
                  <PrintIcon /> Print
                </button>

                <button
                  onClick={() => setData(null)}
                  style={{
                    background: "#4f46e5",
                    color: "white",
                    border: "none",
                    padding: "10px 16px",
                    borderRadius: "8px",
                    fontWeight: "600",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                  }}
                >
                  <NewFileIcon /> New File
                </button>
              </div>
            </div>

            {validationErrors.length > 0 && (
              <div
                style={{
                  background: "#fee2e2",
                  border: "1px solid #fca5a5",
                  color: "#dc2626",
                  padding: "14px 16px",
                  borderRadius: "8px",
                  marginBottom: "20px",
                  fontSize: "14px",
                }}
              >
                <strong style={{ display: "block", marginBottom: "8px" }}>
                  ⚠️ Notes:
                </strong>
                {validationErrors.map((err, i) => (
                  <div
                    key={i}
                    style={{
                      marginBottom: i < validationErrors.length - 1 ? "6px" : 0,
                    }}
                  >
                    • {err}
                  </div>
                ))}
              </div>
            )}

            <div
              className="summary-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                gap: "16px",
                marginBottom: "30px",
              }}
            >
              {[
                ["Present", data.summary.present],
                ["Absent", data.summary.absent],
                ["Weekly Off", data.summary.weeklyOff],
                ["Holiday", data.summary.holidays],
                ["Late Days", data.summary.lateCount],
                ["Early Days", data.summary.earlyCount],
                ["Total Hours", data.summary.totalWorkDuration],
                ["Avg Daily", data.summary.avgDailyHours],
              ].map(([title, value], i) => (
                <div
                  key={i}
                  className="summary-card"
                  style={{
                    background: cardBg,
                    padding: "18px",
                    borderRadius: "12px",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                    border: `1px solid ${borderColor}`,
                    textAlign: "center",
                    transition: "all 0.2s ease",
                  }}
                >
                  <div
                    className="summary-card-title"
                    style={{
                      color: "#6b7280",
                      fontSize: "12px",
                      marginBottom: "8px",
                      fontWeight: "600",
                      textTransform: "uppercase",
                      letterSpacing: "0.4px",
                    }}
                  >
                    {title}
                  </div>

                  <div
                    className="summary-card-value"
                    style={{
                      fontSize: "24px",
                      fontWeight: "700",
                      color: "#4f46e5",
                    }}
                  >
                    {value}
                  </div>
                </div>
              ))}
            </div>

            <div
              className="print-hide"
              style={{
                background: cardBg,
                borderRadius: "12px",
                padding: "20px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                border: `1px solid ${borderColor}`,
                marginBottom: "20px",
              }}
            >
              <h3
                style={{
                  margin: "0 0 18px 0",
                  fontSize: "16px",
                  fontWeight: "700",
                  color: "#1f2937",
                }}
              >
                Filters & Sort
              </h3>

              <div
                className="filters-grid"
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: "16px",
                  alignItems: "end",
                }}
              >
                <div>
                  <label
                    style={{
                      fontSize: "13px",
                      fontWeight: "600",
                      marginBottom: "8px",
                      display: "block",
                      color: "#374151",
                    }}
                  >
                    Status
                  </label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    aria-label="Filter by status"
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      border: `1px solid ${borderColor}`,
                      background: cardBg,
                      color: textColor,
                      cursor: "pointer",
                      fontSize: "14px",
                      fontWeight: "500",
                      transition: "border-color 0.2s ease",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "#4f46e5")}
                    onBlur={(e) => (e.target.style.borderColor = borderColor)}
                  >
                    <option value="ALL">All Status</option>
                    <option value="P">Present</option>
                    <option value="A">Absent</option>
                    <option value="WO">Weekly Off</option>
                    <option value="H">Holiday</option>
                    <option value="PL">Leave</option>
                    <option value="HP">Holiday Present</option>
                  </select>
                </div>

                <div>
                  <label
                    style={{
                      fontSize: "13px",
                      fontWeight: "600",
                      marginBottom: "8px",
                      display: "block",
                      color: "#374151",
                    }}
                  >
                    Sort by
                  </label>
                  <select
                    value={sortConfig.key}
                    onChange={(e) =>
                      setSortConfig({ ...sortConfig, key: e.target.value })
                    }
                    aria-label="Sort by field"
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      border: `1px solid ${borderColor}`,
                      background: cardBg,
                      color: textColor,
                      cursor: "pointer",
                      fontSize: "14px",
                      fontWeight: "500",
                      transition: "border-color 0.2s ease",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "#4f46e5")}
                    onBlur={(e) => (e.target.style.borderColor = borderColor)}
                  >
                    <option value="day">Date</option>
                    <option value="status">Status</option>
                    <option value="lateTime">Late Time</option>
                    <option value="earlyTime">Early Time</option>
                  </select>
                </div>

                <div>
                  <label
                    style={{
                      fontSize: "13px",
                      fontWeight: "600",
                      marginBottom: "8px",
                      display: "block",
                      color: "#374151",
                    }}
                  >
                    Order
                  </label>
                  <button
                    onClick={() =>
                      setSortConfig({
                        ...sortConfig,
                        direction:
                          sortConfig.direction === "asc" ? "desc" : "asc",
                      })
                    }
                    aria-label="Toggle sort direction"
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      border: "2px solid #4f46e5",
                      background: "#4f46e5",
                      color: "white",
                      cursor: "pointer",
                      fontWeight: "600",
                      fontSize: "14px",
                      transition: "all 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#4338ca";
                      e.currentTarget.style.transform = "translateY(-2px)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "#4f46e5";
                      e.currentTarget.style.transform = "translateY(0)";
                    }}
                  >
                    {sortConfig.direction === "asc"
                      ? "↑ Ascending"
                      : "↓ Descending"}
                  </button>
                </div>
              </div>
            </div>

            <div
              style={{
                background: cardBg,
                borderRadius: "12px",
                padding: "20px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                border: `1px solid ${borderColor}`,
                overflowX: "auto",
              }}
            >
              <h3
                style={{
                  margin: "0 0 15px 0",
                  fontSize: "16px",
                  fontWeight: "700",
                }}
              >
                Detail Attendance
              </h3>
              <p
                style={{
                  margin: "0 0 12px 0",
                  color: "#6b7280",
                  fontSize: "13px",
                }}
              >
                <strong>{data.monthTitle}</strong> — {data.rangeText} (Showing{" "}
                {getSortedAndFilteredRows().length} of{" "}
                {data.attendanceRows.length})
              </p>

              <table
                className="mobile-table"
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "13px",
                }}
              >
                <thead>
                  <tr
                    style={{
                      background: headerBg,
                      borderBottom: `2px solid ${borderColor}`,
                    }}
                  >
                    <th
                      style={{
                        padding: "12px 8px",
                        textAlign: "center",
                        fontWeight: "600",
                      }}
                    >
                      Date
                    </th>
                    <th
                      style={{
                        padding: "12px 8px",
                        textAlign: "center",
                        fontWeight: "600",
                      }}
                    >
                      Day
                    </th>
                    <th
                      style={{
                        padding: "12px 8px",
                        textAlign: "center",
                        fontWeight: "600",
                      }}
                    >
                      Status
                    </th>
                    <th
                      style={{
                        padding: "12px 8px",
                        textAlign: "center",
                        fontWeight: "600",
                      }}
                    >
                      In Time
                    </th>
                    <th
                      style={{
                        padding: "12px 8px",
                        textAlign: "center",
                        fontWeight: "600",
                      }}
                    >
                      Out Time
                    </th>
                    <th
                      style={{
                        padding: "12px 8px",
                        textAlign: "center",
                        fontWeight: "600",
                      }}
                    >
                      Duration
                    </th>
                    <th
                      style={{
                        padding: "12px 8px",
                        textAlign: "center",
                        fontWeight: "600",
                      }}
                    >
                      Late
                    </th>
                    <th
                      style={{
                        padding: "12px 8px",
                        textAlign: "center",
                        fontWeight: "600",
                      }}
                    >
                      Early
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {getSortedAndFilteredRows().map((row, idx) => (
                    <tr
                      key={idx}
                      style={{
                        borderBottom: `1px solid ${borderColor}`,
                        background: idx % 2 === 0 ? "transparent" : "#fafafa",
                      }}
                    >
                      <td style={{ padding: "10px 8px", textAlign: "center" }}>
                        {row.date}
                      </td>
                      <td style={{ padding: "10px 8px", textAlign: "center" }}>
                        {row.weekDay}
                      </td>
                      <td
                        style={{
                          padding: "10px 8px",
                          textAlign: "center",
                          fontWeight: "700",
                          color:
                            row.status === "P"
                              ? "#10b981"
                              : row.status === "A"
                                ? "#ef4444"
                                : "#3b82f6",
                        }}
                      >
                        {row.status}
                      </td>
                      <td style={{ padding: "10px 8px", textAlign: "center" }}>
                        {row.inTime || "-"}
                      </td>
                      <td style={{ padding: "10px 8px", textAlign: "center" }}>
                        {row.outTime || "-"}
                      </td>
                      <td style={{ padding: "10px 8px", textAlign: "center" }}>
                        {row.duration || "-"}
                      </td>
                      <td
                        style={{
                          padding: "10px 8px",
                          textAlign: "center",
                          color: "#dc2626",
                        }}
                      >
                        {row.lateTime} {row.lateStatus && `(${row.lateStatus})`}
                      </td>
                      <td
                        style={{
                          padding: "10px 8px",
                          textAlign: "center",
                          color: "#ea580c",
                        }}
                      >
                        {row.earlyTime}{" "}
                        {row.earlyStatus && `(${row.earlyStatus})`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AttendanceCalculator;
