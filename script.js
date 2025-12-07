// --- INITIALIZATION ---
window.onload = () => {
    // Set today's date as default
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('dtr-date').value = today;

    // --- NEW: Load saved salary and allowance ---
    const savedSettings = JSON.parse(localStorage.getItem('dtrSettings'));
    if (savedSettings) {
        // Ensure values are numbers before setting
        document.getElementById('monthly-salary').value = savedSettings.monthlySalary || 0;
        document.getElementById('admin-allowance').value = savedSettings.adminAllowance || 0;
    }
    // ---------------------------------------------
    
    generatePayPeriods(); // Calls renderSummary() implicitly
    // renderSummary(); // Note: Removed this line because generatePayPeriods calls it
    
    document.getElementById('monthly-salary').addEventListener('input', renderSummary);
    document.getElementById('admin-allowance').addEventListener('input', renderSummary);
};

// --- HOLIDAY DATA STRUCTURE & UTILITIES (MOVED TO TOP) ---
const HOLIDAY_RATES = {
    // Regular Holidays (100% premium for working; total 200% pay)
    REGULAR: 2.00, 
    // Special Non-Working Holidays (30% premium for working; total 130% pay)
    SPECIAL: 1.30, 
    // Rest Day (Saturday) 
    SATURDAY: 1.30,
    // Rest Day (Sunday)
    SUNDAY: 1.50,
};

const STATIC_HOLIDAYS = {
    // REGULAR HOLIDAYS (Use YYYY-MM-DD format)
    "2025-01-01": { name: "New Year's Day", type: "REGULAR" },
    "2025-05-01": { name: "Labor Day", type: "REGULAR" },
    "2025-06-12": { name: "Independence Day", type: "REGULAR" },
    "2025-11-30": { name: "Bonifacio Day", type: "REGULAR" },
    "2025-12-25": { name: "Christmas Day", type: "REGULAR" },
    "2025-12-30": { name: "Rizal Day", type: "REGULAR" },
    
    // SPECIAL NON-WORKING HOLIDAYS
    "2025-02-25": { name: "EDSA Revolution Anniversary", type: "SPECIAL" },
    "2025-04-09": { name: "Day of Valor", type: "SPECIAL" },
    "2025-11-01": { name: "All Saints' Day", type: "SPECIAL" },
    "2025-12-08": { name: "Feast of the Immaculate Conception", type: "SPECIAL" },
    "2025-12-31": { name: "New Year's Eve", type: "SPECIAL" },
    // Moving holidays
    "2025-04-18": { name: "Maundy Thursday", type: "REGULAR" }, 
    "2025-04-19": { name: "Good Friday", type: "REGULAR" },
    "2025-04-20": { name: "Easter Sunday", type: "SPECIAL" },
};

const HOLIDAYS_KEY = 'dtrCustomHolidays';

/**
 * Combines static holidays with user-saved holidays for reference.
 * @param {string} dateStr - Date string (YYYY-MM-DD).
 * @returns {string | null} 'REGULAR', 'SPECIAL', or null.
 */
function getHolidayType(dateStr) {
    if (STATIC_HOLIDAYS[dateStr]) {
        return STATIC_HOLIDAYS[dateStr].type;
    }
    try {
        const customHolidays = JSON.parse(localStorage.getItem(HOLIDAYS_KEY)) || [];
        const customHoliday = customHolidays.find(h => h.date === dateStr);
        if (customHoliday) {
            return customHoliday.type;
        }
    } catch (e) {
        console.error("Could not read custom holidays:", e);
    }
    return null;
}
// --- END HOLIDAY DATA STRUCTURE ---


// --- UTILITY FUNCTIONS ---

/**
 * Converts a time string (e.g., "09:00") into total minutes since 00:00.
 */
function timeToMinutes(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return (hours * 60) + minutes;
}

/**
 * Calculates work hours and categorizes them based on Location, Day of the Week, and Holiday status.
 * (FIXED: Added Holiday logic and return values)
 */
function calculateDayMetrics(dtrDateStr, location, timeInStr, timeOutStr, breakMins) {
    const timeInMins = timeToMinutes(timeInStr);
    const timeOutMins = timeToMinutes(timeOutStr);
    
    let totalDurationMins = timeOutMins - timeInMins;
    if (totalDurationMins < 0) {
        totalDurationMins += 1440;
    }
    
    const netWorkMins = totalDurationMins - breakMins;
    const netWorkHours = netWorkMins / 60;
    
    // NEW: Initialize holiday hours
    let regularHolidayHrs = 0;
    let specialHolidayHrs = 0;

    if (netWorkHours <= 0) {
        return { netWorkHours: 0, regularHours: 0, saturdayHours: 0, sundayHours: 0, weekdayOT: 0, regularHolidayHrs: 0, specialHolidayHrs: 0 };
    }

    const date = new Date(dtrDateStr + 'T00:00:00');
    const dayOfWeek = date.getDay(); // 0=Sunday, 6=Saturday
    const holidayType = getHolidayType(dtrDateStr); // NEW: Check for holiday
    
    let regularHoursLimit = 0;
    
    // RULE 1: Determine Regular Hours Limit based on Location
    if (location && location.trim() !== '') {
        regularHoursLimit = 8;
    } else {
        regularHoursLimit = 9.5;
    }

    let regularHours = 0;
    let weekdayOT = 0;
    let saturdayHours = 0;
    let sundayHours = 0;
    
    // --- HOLIDAY CHECK (Highest Priority) ---
    if (holidayType === 'REGULAR') {
        regularHolidayHrs = netWorkHours;
    } else if (holidayType === 'SPECIAL') {
        specialHolidayHrs = netWorkHours;
    }
    // --- END HOLIDAY CHECK ---
    
    // If not a holiday, proceed with normal rules (Weekend priority over Weekday)
    else if (dayOfWeek === 6) { // Saturday
        saturdayHours = netWorkHours;
    } else if (dayOfWeek === 0) { // Sunday
        sundayHours = netWorkHours;
    } else { // Monday to Friday
        regularHours = Math.min(netWorkHours, regularHoursLimit);
        weekdayOT = Math.max(0, netWorkHours - regularHoursLimit);
    }

    return { 
        netWorkHours, 
        regularHours, 
        saturdayHours, 
        sundayHours, 
        weekdayOT,
        regularHolidayHrs, 
        specialHolidayHrs 
    };
}

/**
 * Saves a new DTR entry and the current settings to Local Storage.
 * (FIXED: Added Holiday return values to newEntry)
 */
function saveDTR() {
    const monthlySalary = parseFloat(document.getElementById('monthly-salary').value) || 0;
    const adminAllowance = parseFloat(document.getElementById('admin-allowance').value) || 0;
    const dtrLocation = document.getElementById('dtr-location').value;
    const dtrDate = document.getElementById('dtr-date').value;
    const timeInStr = document.getElementById('time-in').value;
    const timeOutStr = document.getElementById('time-out').value;
    const breakMinutes = parseFloat(document.getElementById('break-minutes').value) || 0;
    
    if (!dtrDate || !timeInStr || !timeOutStr) {
        alert("Please fill in Date, Time In, and Time Out.");
        return;
    }

    const settings = { monthlySalary: monthlySalary, adminAllowance: adminAllowance };
    localStorage.setItem('dtrSettings', JSON.stringify(settings));

    const metrics = calculateDayMetrics(dtrDate, dtrLocation, timeInStr, timeOutStr, breakMinutes);
    
    if (metrics.netWorkHours <= 0) {
        alert("Net work duration is zero or negative. Check your time inputs and break time.");
        return;
    }

    const newEntry = {
        date: dtrDate,
        location: dtrLocation,
        timeIn: timeInStr,
        timeOut: timeOutStr,
        breakMins: breakMinutes,
        regHrs: parseFloat(metrics.regularHours.toFixed(2)),
        satHrs: parseFloat(metrics.saturdayHours.toFixed(2)),
        sunHrs: parseFloat(metrics.sundayHours.toFixed(2)),
        otHrs: parseFloat(metrics.weekdayOT.toFixed(2)),
        regHoliHrs: parseFloat(metrics.regularHolidayHrs.toFixed(2)), // ADDED
        specHoliHrs: parseFloat(metrics.specialHolidayHrs.toFixed(2)), // ADDED
    };

    let entries = JSON.parse(localStorage.getItem('dtrEntries')) || [];
    entries = entries.filter(entry => entry.date !== dtrDate);
    entries.push(newEntry);
    entries.sort((a, b) => new Date(a.date) - new Date(b.date));
    localStorage.setItem('dtrEntries', JSON.stringify(entries));

    generatePayPeriods();
    renderSummary();
    alert(`DTR for ${dtrDate} saved successfully!`);
}

/**
 * Clears the daily input fields.
 */
function clearInputs() {
    document.getElementById('dtr-date').value = ''; 
    document.getElementById('dtr-location').value = '';
}

/**
 * Generates pay period options (Unchanged).
 */
function generatePayPeriods() {
    const entries = JSON.parse(localStorage.getItem('dtrEntries')) || [];
    const select = document.getElementById('pay-period-select');
    
    select.innerHTML = '';
    const periodsMap = new Map(); 

    periodsMap.set('All', 'All Entries');

    if (entries.length === 0) {
        const option = new Option('No Data', 'No Data');
        select.add(option);
        return;
    }

    entries.forEach(entry => {
        const date = new Date(entry.date + 'T00:00:00');
        const year = date.getFullYear();
        const month = date.getMonth();
        const monthName = date.toLocaleString('default', { month: 'short' });
        const day = date.getDate();

        let periodKey, periodLabel;

        if (day <= 15) {
            periodKey = `${year}-${month + 1}-15`;
            periodLabel = `${monthName} 1 - 15, ${year}`;
        } else {
            periodKey = `${year}-${month + 1}-30`;
            periodLabel = `${monthName} 16 - End, ${year}`;
        }
        
        periodsMap.set(periodKey, periodLabel);
    });

    periodsMap.forEach((label, key) => {
        const option = new Option(label, key);
        select.add(option);
    });
    
    select.value = select.options[1] ? select.options[1].value : 'All';
}

/**
 * Filters entries by the selected pay period and updates the log and summary totals.
 * (FIXED: Added Holiday accumulation and calculation logic)
 */
function renderSummary() {
    const entries = JSON.parse(localStorage.getItem('dtrEntries')) || [];
    const selectedPeriodKey = document.getElementById('pay-period-select').value;
    const logList = document.getElementById('dtr-log');

    // ... [existing logic to handle empty entries] ...

    let filteredEntries = [];
    let totalRegHrs = 0;
    let totalOtHrs = 0; // Total OT (Weekday + Sat + Sun + Holidays) for display
    let totalSatHrs = 0;
    let totalSunHrs = 0;
    let totalRegHoliHrs = 0; // ADDED
    let totalSpecHoliHrs = 0; // ADDED
    
    // ... [existing filtering logic remains the same] ...

    // Accumulate Totals
    logList.innerHTML = '';
    filteredEntries.forEach(entry => {
        totalRegHrs += entry.regHrs;
        totalSatHrs += entry.satHrs;
        totalSunHrs += entry.sunHrs;
        totalRegHoliHrs += entry.regHoliHrs; // ADDED
        totalSpecHoliHrs += entry.specHoliHrs; // ADDED

        // Accumulate ALL premium hours for the total-ot-hrs display
        totalOtHrs += entry.otHrs + entry.satHrs + entry.sunHrs + entry.regHoliHrs + entry.specHoliHrs;

        const listItem = document.createElement('li');
        // Update display to include Holiday pay details
        let hoursDisplay = `Reg: ${entry.regHrs.toFixed(2)}h`;
        if (entry.regHoliHrs > 0) hoursDisplay = `HOLIDAY (R): ${entry.regHoliHrs.toFixed(2)}h`;
        if (entry.specHoliHrs > 0) hoursDisplay = `HOLIDAY (S): ${entry.specHoliHrs.toFixed(2)}h`;
        if (entry.satHrs > 0 || entry.sunHrs > 0) hoursDisplay = `W/END: ${(entry.satHrs + entry.sun

