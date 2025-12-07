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
 * Permanently deletes all DTR entries, salary settings, and custom holidays 
 * from the browser's Local Storage.
 */
function clearAllDTRData() {
    if (confirm("WARNING: This will permanently delete ALL saved DTR entries, salary settings, and custom holidays. Are you sure you want to proceed?")) {
        localStorage.removeItem('dtrEntries');
        localStorage.removeItem('dtrSettings');
        localStorage.removeItem(HOLIDAYS_KEY); // Use the constant HOLIDAYS_KEY defined earlier
        
        // Reload settings and summary to reflect the empty state
        window.location.reload(); 
    }
}

/**
 * Deletes a DTR entry based on its date.
 * @param {string} dateToDelete - The date (YYYY-MM-DD) of the entry to delete.
 */
function deleteEntry(dateToDelete) {
    if (confirm(`Are you sure you want to delete the entry for ${dateToDelete}? This cannot be undone.`)) {
        let entries = JSON.parse(localStorage.getItem('dtrEntries')) || [];
        // Filter out the entry with the matching date
        entries = entries.filter(entry => entry.date !== dateToDelete);
        
        localStorage.setItem('dtrEntries', JSON.stringify(entries));
        
        // Regenerate the UI
        generatePayPeriods(); // Update period selector if necessary
        renderSummary();     // Update the list and summary totals
        alert(`Entry for ${dateToDelete} deleted successfully.`);
    }
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

    // Always include 'All' option
    periodsMap.set('All', 'All Entries');

    if (entries.length === 0) {
        const option = new Option('No Data', 'No Data');
        select.add(option);
        renderSummary(); // Ensure summary runs even if empty
        return;
    }

    // Use a temporary structure to easily find the latest date
    let latestEntryDate = null;

    entries.forEach(entry => {
        const date = new Date(entry.date + 'T00:00:00');
        
        // Track the latest date
        if (!latestEntryDate || date > latestEntryDate) {
            latestEntryDate = date;
        }

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
        
        // Add unique periods
        periodsMap.set(periodKey, periodLabel);
    });
    
    // Convert Map to Array of options, excluding 'All' for sorting
    const periodOptions = Array.from(periodsMap).filter(([key]) => key !== 'All');

    // Sort periods: latest period should be first (Reverse chronological order)
    periodOptions.sort((a, b) => new Date(b[0]) - new Date(a[0]));

    // Re-insert 'All' at the beginning
    periodOptions.unshift(['All', 'All Entries']);

    // Add sorted options to the selector
    periodOptions.forEach(([key, label]) => {
        const option = new Option(label, key);
        select.add(option);
    });

    // --- NEW LOGIC: Set the select value to the latest period ---
    // The latest period is now the second element in the sorted array (index 1),
    // provided there are entries (length > 1 because 'All' is index 0).
    const latestPeriodKey = periodOptions.length > 1 ? periodOptions[1][0] : 'All';
    select.value = latestPeriodKey;

    // Call renderSummary() to display the entries for the selected period
    renderSummary(); 
}

/**
 * Filters entries by the selected pay period and updates the log and summary totals.
 * (FIXED: Added Holiday accumulation and calculation logic)
 */
function renderSummary() {
    const entries = JSON.parse(localStorage.getItem('dtrEntries')) || [];
    const selectedPeriodKey = document.getElementById('pay-period-select').value;
    const logList = document.getElementById('dtr-log');    

    // Logic to handle empty entries (using the first entry to define the selected pay period)
    let filteredEntries = entries;
    if (selectedPeriodKey !== 'All' && selectedPeriodKey !== 'No Data') {
        const [year, month, day] = selectedPeriodKey.split('-').map(Number);
        
        filteredEntries = entries.filter(entry => {
            const entryDate = new Date(entry.date + 'T00:00:00');
            const entryYear = entryDate.getFullYear();
            const entryMonth = entryDate.getMonth() + 1; // getMonth() is 0-indexed
            const entryDay = entryDate.getDate();

            if (day === 15) {
                return entryYear === year && entryMonth === month && entryDay <= 15;
            } else if (day === 30) {
                return entryYear === year && entryMonth === month && entryDay > 15;
            }
            return false;
        });
    }

    let totalRegHrs = 0;
    let totalOtHrs = 0; // Total OT (Weekday + Sat + Sun + Holidays) for display
    let totalSatHrs = 0;
    let totalSunHrs = 0;
    let totalRegHoliHrs = 0;
    let totalSpecHoliHrs = 0;
    
    // Accumulate Totals
    logList.innerHTML = '';
    
    if (filteredEntries.length === 0) {
        logList.innerHTML = '<li style="text-align: center; color: #777;">No entries found for this period.</li>';
    }

    filteredEntries.forEach(entry => {
        totalRegHrs += entry.regHrs;
        totalSatHrs += entry.satHrs;
        totalSunHrs += entry.sunHrs;
        totalRegHoliHrs += entry.regHoliHrs;
        totalSpecHoliHrs += entry.specHoliHrs;

        // Accumulate ALL premium hours for the total-ot-hrs display
        totalOtHrs += entry.otHrs + entry.satHrs + entry.sunHrs + entry.regHoliHrs + entry.specHoliHrs;

        const listItem = document.createElement('li');
        
        // Determine the most significant hour type for the list display
        let hoursDisplay = `Reg: ${entry.regHrs.toFixed(2)}h`;
        let color = '#007bff'; // Default color for Reg hours
        
        if (entry.regHoliHrs > 0) {
            hoursDisplay = `HOLIDAY (R): ${entry.regHoliHrs.toFixed(2)}h`;
            color = '#dc3545'; // Red for Regular Holiday
        } else if (entry.specHoliHrs > 0) {
            hoursDisplay = `HOLIDAY (S): ${entry.specHoliHrs.toFixed(2)}h`;
            color = '#ffc107'; // Yellow for Special Holiday
        } else if (entry.sunHrs > 0) {
            hoursDisplay = `SUNDAY: ${entry.sunHrs.toFixed(2)}h`;
            color = '#20c997'; // Greenish for Sunday
        } else if (entry.satHrs > 0) {
            hoursDisplay = `SATURDAY: ${entry.satHrs.toFixed(2)}h`;
            color = '#17a2b8'; // Cyan for Saturday
        } else if (entry.otHrs > 0) {
             hoursDisplay = `OT (W/D): ${entry.otHrs.toFixed(2)}h`;
             color = '#fd7e14'; // Orange for Weekday OT
        }
        
        // --- UPDATED LIST ITEM STRUCTURE ---
        listItem.innerHTML = `
            <div class="entry-details">
                ${entry.date}: ${entry.location ? `(${entry.location})` : ''}
                <span style="color: ${color}; font-weight: bold;">${hoursDisplay}</span>
            </div>
            <div class="entry-actions">
                <button onclick="deleteEntry('${entry.date}')" class="action-btn delete-btn">Delete</button>
            </div>
        `;
        // ------------------------------------
        
        logList.appendChild(listItem);
    });
    
    // --- START UPDATED SALARY CALCULATION ---
    const monthlySalary = parseFloat(document.getElementById('monthly-salary').value) || 0;
    const adminAllowance = parseFloat(document.getElementById('admin-allowance').value) || 0;
    
    // 1. Calculate Base Hourly Rate (HR)
    const annualSalary = monthlySalary * 12;
    const dailyRate = annualSalary / 261; 
    const standardDailyHours = 8; 
    const hourlyRate = dailyRate / standardDailyHours; 
    
    // 2. Calculate Allowance Pay
    const DAYS_IN_THE_MONTH_FOR_ALLOWANCE = 26;
    const dailyAllowance = adminAllowance / DAYS_IN_THE_MONTH_FOR_ALLOWANCE;
    const daysWorkedInPeriod = filteredEntries.length;
    const totalAllowancePay = dailyAllowance * daysWorkedInPeriod;
    
    // 3. Calculate Premium Pay (DOLE Rates)
    const saturdayRate = hourlyRate * HOLIDAY_RATES.SATURDAY;
    const sundayRate = hourlyRate * HOLIDAY_RATES.SUNDAY;
    const weekdayOTRate = hourlyRate * 1.25; 
    
    // Holiday Rates (200% and 130% pay)
    const regularHolidayRate = hourlyRate * HOLIDAY_RATES.REGULAR;
    const specialHolidayRate = hourlyRate * HOLIDAY_RATES.SPECIAL;
    
    // Pay components
    const regularPay = totalRegHrs * hourlyRate;
    const saturdayPay = totalSatHrs * saturdayRate;
    const sundayPay = totalSunHrs * sundayRate;
    const regularHolidayPay = totalRegHoliHrs * regularHolidayRate;
    const specialHolidayPay = totalSpecHoliHrs * specialHolidayRate;
    
    // Weekday OT Pay: Total OT - (All Premium Hours)
    const allPremiumHours = totalSatHrs + totalSunHrs + totalRegHoliHrs + totalSpecHoliHrs;
    const weekdayOtHours = totalOtHrs - allPremiumHours;
    const weekdayOtPay = weekdayOtHours * weekdayOTRate;

    // 4. Final Gross Salary
    const totalGrossSalary = regularPay 
                             + saturdayPay 
                             + sundayPay 
                             + regularHolidayPay
                             + specialHolidayPay
                             + weekdayOtPay 
                             + totalAllowancePay;

    // --- END UPDATED SALARY CALCULATION ---

    // Update Summary Boxes
    document.getElementById('total-reg-hrs').value = totalRegHrs.toFixed(2);
    document.getElementById('total-ot-hrs').value = totalOtHrs.toFixed(2);
    document.getElementById('total-salary').value = totalGrossSalary.toFixed(2);
}





