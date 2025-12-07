/**
 * Converts a time string (e.g., "09:00") into a total number of minutes
 * since the start of the day (00:00).
 * @param {string} timeStr - The time string (HH:MM).
 * @returns {number} - Total minutes.
 */
function timeToMinutes(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return (hours * 60) + minutes;
}

/**
 * Calculates the net working hours and the gross daily pay.
 */
function calculateSalary() {
    // 1. Get Input Values
    const hourlyRate = parseFloat(document.getElementById('rate').value);
    const timeInStr = document.getElementById('time-in').value;
    const timeOutStr = document.getElementById('time-out').value;
    const breakMinutes = parseFloat(document.getElementById('break-minutes').value);

    // Basic validation
    if (isNaN(hourlyRate) || hourlyRate < 0) {
        alert("Please enter a valid hourly rate.");
        return;
    }
    if (!timeInStr || !timeOutStr) {
        alert("Please enter both Time In and Time Out.");
        return;
    }
    if (isNaN(breakMinutes) || breakMinutes < 0) {
        alert("Please enter a valid break time in minutes.");
        return;
    }

    // 2. Convert Time to Minutes
    const timeInMins = timeToMinutes(timeInStr);
    const timeOutMins = timeToMinutes(timeOutStr);

    // Handle Time Out being on the next day (e.g., crossing midnight)
    let totalDurationMins = timeOutMins - timeInMins;
    if (totalDurationMins < 0) {
        // Assume Time Out is on the next day: 24 hours * 60 mins/hr = 1440
        totalDurationMins += 1440;
    }

    // 3. Calculate Net Work Hours
    const netWorkMins = totalDurationMins - breakMinutes;

    if (netWorkMins <= 0) {
        document.getElementById('work-hours').textContent = "0";
        document.getElementById('daily-pay').textContent = "0.00";
        alert("Net work duration is zero or negative. Check your time inputs and break time.");
        return;
    }

    const netWorkHours = netWorkMins / 60; // Convert net minutes to hours

    // 4. Calculate Daily Pay
    const dailyPay = netWorkHours * hourlyRate;

    // 5. Display Results
    document.getElementById('work-hours').textContent = netWorkHours.toFixed(2);
    document.getElementById('daily-pay').textContent = dailyPay.toFixed(2);
}

// Initial calculation to display default values on load
calculateSalary();