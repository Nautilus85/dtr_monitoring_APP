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
 * Calculates net work hours and salary for a single day.
 * @param {string} timeInStr 
 * @param {string} timeOutStr 
 * @param {number} breakMins 
 * @returns {object} - { netWorkHours: number }
 */
function calculateDayMetrics(timeInStr, timeOutStr, breakMins) {
    const timeInMins = timeToMinutes(timeInStr);
    const timeOutMins = timeToMinutes(timeOutStr);
    
    let totalDurationMins = timeOutMins - timeInMins;
    if (totalDurationMins < 0) {
        // Handle time crossing midnight (24 hours * 60 mins/hr = 1440)
        totalDurationMins += 1440;
    }
    
    const netWorkMins = totalDurationMins - breakMins;
    const netWorkHours = netWorkMins / 60;
    
    // For simplicity, we define 8 hours as regular and anything over as OT
    const regularHours = Math.min(netWorkHours, 8);
    const otHours = Math.max(0, netWorkHours - 8);

    return { netWorkHours, regularHours, otHours };
}

/**
 * Saves a new DTR entry to Local Storage.
 */
function saveDTR() {
    // 1. Get Input Values
    const dtrDate = document.getElementById('dtr-date').value;
    const timeInStr = document.getElementById('time-in').value;
    const timeOutStr = document.getElementById('time-out').value;
    const breakMinutes = parseFloat(document.getElementById('break-minutes').value) || 0;
    
    if (!dtrDate || !timeInStr || !timeOutStr) {
        alert("Please fill in Date, Time In, and Time Out.");
        return;
    }

    // 2. Perform Daily Calculation
    const { netWorkHours, regularHours, otHours } = calculateDayMetrics(timeInStr, timeOutStr, breakMinutes);

    if (netWorkHours <= 0) {
        alert("Net work duration is zero or negative. Check your time inputs and break time.");
        return;
    }

    // 3. Create Entry Object
    const newEntry = {
        date: dtrDate,
        timeIn: timeInStr,
        timeOut: timeOutStr,
        breakMins: breakMinutes,
        hours: parseFloat(netWorkHours.toFixed(2)),
        regHrs: parseFloat(regularHours.toFixed(2)),
        otHrs: parseFloat(otHours.toFixed(2)),
    };

    // 4. Load, Check for Duplicates, and Save
    let entries = JSON.parse(localStorage.getItem('dtrEntries')) || [];
    
    // Remove existing entry for the same date to allow editing
    entries = entries.filter(entry => entry.date !== dtrDate);
    
    entries.push(newEntry);
    
    // Sort by date before saving
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
    // Reset inputs, keeping default time/break values
    document.getElementById('dtr-date').value = ''; 
    // document.getElementById('time-in').value = '09:00'; 
    // document.getElementById('time-out').value = '18:00';
    // document.getElementById('break-minutes').value = '60';
}

/**
 * Generates pay period options (1st half and 2nd half of each month)
 */
function generatePayPeriods() {
    const entries = JSON.parse(localStorage.getItem('dtrEntries')) || [];
    const select = document.getElementById('pay-period-select');
    
    // Clear existing options
    select.innerHTML = '';
    
    // Map to store unique pay periods (e.g., "2025-11-15" for Nov 1-15)
    const periodsMap = new Map(); 

    // Add a default "All Entries" option
    periodsMap.set('All', 'All Entries');

    if (entries.length === 0) {
        const option = new Option('No Data', 'No Data');
        select.add(option);
        return;
    }

    entries.forEach(entry => {
        const date = new Date(entry.date + 'T00:00:00'); // Use T00:00:00 to avoid timezone issues
        const year = date.getFullYear();
        const month = date.getMonth(); // 0-11
        const monthName = date.toLocaleString('default', { month: 'short' });
        const day = date.getDate();

        let periodKey, periodLabel;

        // Period 1: Day 1-15
        if (day <= 15) {
            periodKey = `${year}-${month + 1}-15`;
            periodLabel = `${monthName} 1 - 15, ${year}`;
        } 
        // Period 2: Day 16-End of Month
        else {
            periodKey = `${year}-${month + 1}-30`; // Key doesn't matter as much as month/year
            periodLabel = `${monthName} 16 - End, ${year}`;
        }
        
        periodsMap.set(periodKey, periodLabel);
    });

    // Populate the dropdown
    periodsMap.forEach((label, key) => {
        const option = new Option(label, key);
        select.add(option);
    });
    
    // Set default selection to the first available period (usually the current/latest)
    select.value = select.options[1] ? select.options[1].value : 'All';
}

/**
 * Filters entries by the selected pay period and updates the log and summary totals.
 */
function renderSummary() {
    const entries = JSON.parse(localStorage.getItem('dtrEntries')) || [];
    const selectedPeriodKey = document.getElementById('pay-period-select').value;
    const logList = document.getElementById('dtr-log');
    
    if (entries.length === 0) {
        logList.innerHTML = '<li style="text-align: center; color: #777;">No entries saved yet.</li>';
        document.getElementById('total-reg-hrs').value = '0.00';
        document.getElementById('total-ot-hrs').value = '0.00';
        document.getElementById('total-salary').value = '0.00';
        return;
    }
    
    let filteredEntries = [];
    let totalRegHrs = 0;
    let totalOtHrs = 0;
    
    // Filter logic
    if (selectedPeriodKey === 'All') {
        filteredEntries = entries;
    } else {
        const [year, month, dayLimit] = selectedPeriodKey.split('-').map(Number);
        const isFirstHalf = dayLimit === 15;

        filteredEntries = entries.filter(entry => {
            const date = new Date(entry.date + 'T00:00:00');
            const entryYear = date.getFullYear();
            const entryMonth = date.getMonth() + 1; // 1-12
            const entryDay = date.getDate();

            if (entryYear === year && entryMonth === month) {
                if (isFirstHalf && entryDay <= 15) {
                    return true;
                }
                if (!isFirstHalf && entryDay > 15) {
                    return true;
                }
            }
            return false;
        });
    }

    // Update Log List
    logList.innerHTML = '';
    filteredEntries.forEach(entry => {
        totalRegHrs += entry.regHrs;
        totalOtHrs += entry.otHrs;

        const listItem = document.createElement('li');
        listItem.innerHTML = `
            ${entry.date}: 
            <span>${entry.timeIn} - ${entry.timeOut}</span>
            <span style="color: green;">Reg: ${entry.regHrs.toFixed(2)}h | OT: ${entry.otHrs.toFixed(2)}h</span>
        `;
        logList.appendChild(listItem);
    });

    // Final Salary Calculation
    const monthlySalary = parseFloat(document.getElementById('monthly-salary').value) || 0;
    const adminAllowance = parseFloat(document.getElementById('admin-allowance').value) || 0;
    
    // Simple conversion: Assume 22 working days/month for hourly rate
    const dailyRate = monthlySalary / 22;
    const assumedRegularHours = 8;
    const hourlyRate = dailyRate / assumedRegularHours; 
    
    // Total Pay calculation for the period
    const regularPay = totalRegHrs * hourlyRate;
    // Assuming OT is 1.25x (or 125%) of the regular hourly rate
    const otRate = hourlyRate * 1.25;
    const otPay = totalOtHrs * otRate;
    
    const totalGrossSalary = regularPay + otPay + adminAllowance;

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
    
    // Load existing settings and data
    generatePayPeriods();
    renderSummary(); 
    
    // Add event listeners for instant summary updates when settings change
    document.getElementById('monthly-salary').addEventListener('input', renderSummary);
    document.getElementById('admin-allowance').addEventListener('input', renderSummary);
};
