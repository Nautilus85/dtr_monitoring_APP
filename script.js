// --- UTILITY FUNCTIONS ---

/**
 * Converts a time string (e.g., "09:00") into total minutes since 00:00.
 * @param {string} timeStr - The time string (HH:MM).
 * @returns {number} - Total minutes.
 */
function timeToMinutes(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return (hours * 60) + minutes;
}

/**
 * Calculates work hours and categorizes them based on Location and Day of the Week.
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
    
    if (netWorkHours <= 0) {
        return { netWorkHours: 0, regularHours: 0, saturdayHours: 0, sundayHours: 0, weekdayOT: 0 };
    }

    const date = new Date(dtrDateStr + 'T00:00:00');
    const dayOfWeek = date.getDay(); // 0=Sunday, 6=Saturday
    
    let regularHoursLimit = 0;
    
    // RULE 1: Determine Regular Hours Limit based on Location
    if (location && location.trim() !== '') {
        regularHoursLimit = 8; // 8 hours if Location is filled
    } else {
        regularHoursLimit = 9.5; // 9.5 hours if Location is NOT filled
    }

    let regularHours = 0;
    let weekdayOT = 0;
    let saturdayHours = 0;
    let sundayHours = 0;
    
    // RULE 2 & 3: Apply Weekend Overtime Rules
    if (dayOfWeek === 6) { // Saturday
        saturdayHours = netWorkHours;
    } else if (dayOfWeek === 0) { // Sunday
        sundayHours = netWorkHours;
    } else { // Monday to Friday
        regularHours = Math.min(netWorkHours, regularHoursLimit);
        weekdayOT = Math.max(0, netWorkHours - regularHoursLimit);
    }

    return { netWorkHours, regularHours, saturdayHours, sundayHours, weekdayOT };
}

/**
 * Saves a new DTR entry and the current settings to Local Storage.
 */
function saveDTR() {
    // 1. Get Input Values
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

    // --- NEW: Save Monthly Salary and Admin Allowance Settings ---
    const settings = {
        monthlySalary: monthlySalary,
        adminAllowance: adminAllowance
    };
    localStorage.setItem('dtrSettings', JSON.stringify(settings));
    // -----------------------------------------------------------------

    // 2. Perform Daily Calculation
    const metrics = calculateDayMetrics(dtrDate, dtrLocation, timeInStr, timeOutStr, breakMinutes);
    
    if (metrics.netWorkHours <= 0) {
        alert("Net work duration is zero or negative. Check your time inputs and break time.");
        return;
    }

    // 3. Create Entry Object
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
    };

    // 4. Load, Check for Duplicates, and Save Entries
    let entries = JSON.parse(localStorage.getItem('dtrEntries')) || [];
    entries = entries.filter(entry => entry.date !== dtrDate); // Allows editing
    entries.push(newEntry);
    entries.sort((a, b) => new Date(a.date) - new Date(b.date));
    localStorage.setItem('dtrEntries', JSON.stringify(entries));

    // 5. Update UI
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
 * Generates pay period options (remains the same).
 */
// --- HOLIDAY DATA STRUCTURE (Add this near the top of script.js) ---
const HOLIDAY_RATES = {
    // Regular Holidays (100% premium for working; total 200% pay)
    REGULAR: 2.00, 
    // Special Non-Working Holidays (30% premium for working; total 130% pay)
    SPECIAL: 1.30, 
    // Rest Day (Saturday) (30% premium for working; total 130% pay)
    SATURDAY: 1.30,
    // Rest Day (Sunday) (50% premium for working; total 150% pay - as per previous setup)
    SUNDAY: 1.50,
};

// NOTE: Use YYYY-MM-DD format for lookup
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
    // NOTE: Moving holidays like Holy Week/Eid must be updated here or in the custom list.
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
    // 1. Check Static Holidays
    if (STATIC_HOLIDAYS[dateStr]) {
        return STATIC_HOLIDAYS[dateStr].type;
    }

    // 2. Check Custom (User-Saved) Holidays from Local Storage
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
 * Filters entries by the selected pay period and updates the log and summary totals (remains the same).
 */
function renderSummary() {
    // ... [existing code for loading entries, filtering, and accumulating totals remains the same] ...
    
    // NOTE: This section uses the existing variables:
    // filteredEntries: Array of DTR entries in the period.
    // totalRegHrs: Accumulated Regular Hours for the period.
    // totalOtHrs: Accumulated TOTAL Overtime Hours for the period (Weekday OT + Sat + Sun).
    // totalSatHrs: Accumulated Saturday Hours for the period.
    // totalSunHrs: Accumulated Sunday Hours for the period.

    let filteredEntries = [];
    let totalRegHrs = 0;
    let totalOtHrs = 0;
    let totalSatHrs = 0;
    let totalSunHrs = 0;
    
    // Load entries and apply filtering logic here (as per previous version)
    // ...
    
    // Accumulate Totals
    logList.innerHTML = '';
    filteredEntries.forEach(entry => {
        totalRegHrs += entry.regHrs;
        totalOtHrs += entry.otHrs + entry.satHrs + entry.sunHrs;
        totalSatHrs += entry.satHrs;
        totalSunHrs += entry.sunHrs;

        const listItem = document.createElement('li');
        listItem.innerHTML = `
            ${entry.date}: 
            <span>${entry.timeIn} - ${entry.timeOut}</span>
            <span style="color: green;">Reg: ${entry.regHrs.toFixed(2)}h | OT/Sat/Sun: ${ (entry.otHrs + entry.satHrs + entry.sunHrs).toFixed(2)}h</span>
        `;
        logList.appendChild(listItem);
    });
    
    // --- START UPDATED SALARY CALCULATION ---

    const monthlySalary = parseFloat(document.getElementById('monthly-salary').value) || 0;
    const adminAllowance = parseFloat(document.getElementById('admin-allowance').value) || 0;
    
    // 1. Calculate Base Hourly Rate (HR) - ONLY uses Monthly Salary
    const annualSalary = monthlySalary * 12;
    // Assumed 261 working days per year for Monthly Salary conversion
    const dailyRate = annualSalary / 261; 
    const standardDailyHours = 8; 
    const hourlyRate = dailyRate / standardDailyHours; 
    
    // 2. Calculate Allowance Pay
    const DAYS_IN_THE_MONTH_FOR_ALLOWANCE = 26; // Custom rule: Allowance divided by 26 days
    const dailyAllowance = adminAllowance / DAYS_IN_THE_MONTH_FOR_ALLOWANCE;
    
    // Allowance is paid ONLY for the days recorded in the period
    const daysWorkedInPeriod = filteredEntries.length;
    const totalAllowancePay = dailyAllowance * daysWorkedInPeriod;
    
    // 3. Calculate Premium Pay (DOLE Rates)
    const saturdayRate = hourlyRate * 1.30; 
    const sundayRate = hourlyRate * 1.50; 
    const weekdayOTRate = hourlyRate * 1.25; 
    
    // Pay components
    const regularPay = totalRegHrs * hourlyRate;
    const saturdayPay = totalSatHrs * saturdayRate;
    const sundayPay = totalSunHrs * sundayRate;
    
    // Total OT Hours minus the already separated Sat/Sun Hours
    const weekdayOtHours = totalOtHrs - totalSatHrs - totalSunHrs; 
    const weekdayOtPay = weekdayOtHours * weekdayOTRate;

    // 4. Final Gross Salary
    // Total Pay = Regular Pay + All Premiums/OT + Total Allowance
    const totalGrossSalary = regularPay + saturdayPay + sundayPay + weekdayOtPay + totalAllowancePay;

    // --- END UPDATED SALARY CALCULATION ---

    // Update Summary Boxes
    document.getElementById('total-reg-hrs').value = totalRegHrs.toFixed(2);
    document.getElementById('total-ot-hrs').value = totalOtHrs.toFixed(2);
    document.getElementById('total-salary').value = totalGrossSalary.toFixed(2);
}


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
    
    generatePayPeriods();
    renderSummary(); 
    
    document.getElementById('monthly-salary').addEventListener('input', renderSummary);
    document.getElementById('admin-allowance').addEventListener('input', renderSummary);
};


