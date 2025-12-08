// Local Storage Key for Holidays
const HOLIDAYS_KEY = 'dtrCustomHolidays'; // Existing key for custom holidays
const STATIC_HOLIDAYS_KEY = 'dtrStatutoryHolidays'; // New key for statutory holidays

/**
 * Loads holidays from Local Storage.
 * @returns {Array} List of saved holiday objects.
 */
function loadHolidays() {
    try {
        const holidays = JSON.parse(localStorage.getItem(HOLIDAYS_KEY)) || [];
        // Ensure holidays are sorted by date
        holidays.sort((a, b) => new Date(a.date) - new Date(b.date));
        return holidays;
    } catch (e) {
        console.error("Error loading holidays:", e);
        return [];
    }
}

/**
 * Saves the current list of holidays back to Local Storage.
 * @param {Array} holidays - List of holiday objects.
 */
function saveHolidays(holidays) {
    localStorage.setItem(HOLIDAYS_KEY, JSON.stringify(holidays));
    renderHolidayList();
}

/**
 * Saves the mutable statutory holidays (object format) back to Local Storage.
 */
function saveStatutoryHolidays(holidaysObject) {
    localStorage.setItem(STATIC_HOLIDAYS_KEY, JSON.stringify(holidaysObject));
}

/**
 * Loads the mutable statutory holidays (saved from script.js)
 * @returns {Object} Object of statutory holiday objects keyed by date.
 */
function loadStatutoryHolidays() {
    try {
        return JSON.parse(localStorage.getItem(STATIC_HOLIDAYS_KEY)) || {};
    } catch (e) {
        console.error("Error loading statutory holidays:", e);
        return {};
    }
}

/**
 * Saves the user-defined custom holidays back to Local Storage.
 */
function saveCustomHolidays(holidays) {
    localStorage.setItem(HOLIDAYS_KEY, JSON.stringify(holidays));
}

/**
 * Loads the user-defined custom holidays from Local Storage.
 * @returns {Array} List of custom holiday objects.
 */
function loadCustomHolidays() {
    try {
        const holidays = JSON.parse(localStorage.getItem(HOLIDAYS_KEY)) || [];
        holidays.sort((a, b) => new Date(a.date) - new Date(b.date));
        return holidays;
    } catch (e) {
        console.error("Error loading custom holidays:", e);
        return [];
    }
}

/**
 * Saves a new or edited holiday entry (applies to both Custom and Statutory).
 */
function saveHoliday() {
    const date = document.getElementById('holiday-date').value;
    const name = document.getElementById('holiday-name').value.trim();
    const type = document.getElementById('holiday-type').value;
    const isStatutory = document.getElementById('is-statutory-flag').value === 'true'; // Hidden field check

    if (!date || !name) {
        alert("Please enter both a date and a name for the holiday.");
        return;
    }

    if (isStatutory) {
        // --- SAVE TO STATUTORY LIST (OBJECT) ---
        const holidaysObject = loadStatutoryHolidays();
        
        // Remove old entry if date changed (optional, but good practice)
        // This is complex, so for simplicity, we just overwrite by date.
        
        holidaysObject[date] = { name, type };
        saveStatutoryHolidays(holidaysObject);
        alert(`Statutory Holiday for ${date} updated successfully!`);

    } else {
        // --- SAVE TO CUSTOM LIST (ARRAY) ---
        let holidays = loadCustomHolidays();
        
        // Check for existing custom holiday and update it, or add a new one
        let isUpdated = false;
        for (let i = 0; i < holidays.length; i++) {
            if (holidays[i].date === date) {
                holidays[i].name = name;
                holidays[i].type = type;
                isUpdated = true;
                break;
            }
        }

        if (!isUpdated) {
            holidays.push({ date, name, type });
        }
        saveCustomHolidays(holidays);
        alert(`Custom Holiday for ${date} saved successfully!`);
    }

    // Clear and re-render
    document.getElementById('holiday-date').value = '';
    document.getElementById('holiday-name').value = '';
    document.getElementById('is-statutory-flag').value = 'false'; // Reset flag
    renderHolidayList();
}

/**
 * Fills the form with data for the selected holiday to enable editing.
 * @param {string} dateToEdit - The date of the holiday.
 * @param {boolean} isStatutory - True if the holiday is from the statutory list.
 */
function editHoliday(dateToEdit, isStatutory) {
    let holiday;
    
    if (isStatutory) {
        const holidaysObject = loadStatutoryHolidays();
        holiday = holidaysObject[dateToEdit];
    } else {
        const holidaysArray = loadCustomHolidays();
        holiday = holidaysArray.find(h => h.date === dateToEdit);
    }
    
    if (holiday) {
        document.getElementById('holiday-date').value = dateToEdit;
        document.getElementById('holiday-name').value = holiday.name;
        document.getElementById('holiday-type').value = holiday.type;
        // Set a hidden flag to tell saveHoliday() where to save the changes
        document.getElementById('is-statutory-flag').value = isStatutory ? 'true' : 'false'; 
        document.getElementById('holiday-date').focus();
    }
}

/**
 * Renders the list of saved holidays in the HTML.
 */
/**
 * Renders the list of saved holidays in the HTML.
 */
function renderHolidayList() {
    // 1. Get CUSTOM holidays
    const customHolidaysArray = loadCustomHolidays();
    
    // 2. Get STATUTORY holidays (Object)
    const statutoryHolidaysObject = loadStatutoryHolidays();
    
    // Convert the statutory object into an array format for combination and display
    const statutoryHolidaysArray = Object.keys(statutoryHolidaysObject).map(date => ({
        date: date,
        name: statutoryHolidaysObject[date].name,
        type: statutoryHolidaysObject[date].type,
        isStatutory: true // Flag this for display and preventing deletion
    }));

    // 3. Combine both lists
    const combinedHolidays = [...statutoryHolidaysArray, ...customHolidaysArray];

    // 4. Sort the list by date
    combinedHolidays.sort((a, b) => new Date(a.date) - new Date(b.date));

    const listElement = document.getElementById('saved-holidays-list');
    listElement.innerHTML = '';

    if (combinedHolidays.length === 0) {
        listElement.innerHTML = '<li>No holidays saved.</li>';
        return;
    }
    
    // 5. Generate the HTML with Edit/Delete buttons
    combinedHolidays.forEach(holiday => {
        const listItem = document.createElement('li');
        
        // Determine the action buttons available
        const actions = `
            <button onclick="editHoliday('${holiday.date}', ${holiday.isStatutory || false})" class="action-btn edit-btn">Edit</button>
            ${holiday.isStatutory ? 
                '' : // Cannot delete statutory holidays
                `<button onclick="deleteHoliday('${holiday.date}')" class="action-btn delete-btn">Delete</button>`
            }
        `;
        
        // Determine the label
        const status = holiday.isStatutory ? `(STATUTORY - ${holiday.type})` : `(CUSTOM - ${holiday.type})`;
        
        listItem.innerHTML = `
            <div class="holiday-details">
                ${holiday.date}: ${holiday.name} ${status}
            </div>
            <div class="holiday-actions">
                ${actions}
            </div>
        `;
        listElement.appendChild(listItem);
    });
}

/**
 * Saves a new or edited holiday entry.
 */
function saveHoliday() {
    const date = document.getElementById('holiday-date').value;
    const name = document.getElementById('holiday-name').value.trim();
    const type = document.getElementById('holiday-type').value;

    if (!date || !name) {
        alert("Please enter both a date and a name for the holiday.");
        return;
    }

    const holidays = loadHolidays();
    
    // Check for existing holiday and update it, or add a new one
    let isUpdated = false;
    for (let i = 0; i < holidays.length; i++) {
        if (holidays[i].date === date) {
            holidays[i].name = name;
            holidays[i].type = type;
            isUpdated = true;
            break;
        }
    }

    if (!isUpdated) {
        holidays.push({ date, name, type });
    }

    saveHolidays(holidays);
    // Clear inputs after saving
    document.getElementById('holiday-date').value = '';
    document.getElementById('holiday-name').value = '';
    alert(`Holiday for ${date} saved successfully!`);
}

/**
 * Fills the form with data for the selected holiday to enable editing.
 */
function editHoliday(dateToEdit) {
    const holidays = loadHolidays();
    const holiday = holidays.find(h => h.date === dateToEdit);
    
    if (holiday) {
        document.getElementById('holiday-date').value = holiday.date;
        document.getElementById('holiday-name').value = holiday.name;
        document.getElementById('holiday-type').value = holiday.type;
        // Prompt user to resave
        document.getElementById('holiday-date').focus();
    }
}

/**
 * Deletes a holiday entry based on its date.
 */
function deleteHoliday(dateToDelete) {
    if (!confirm(`Are you sure you want to delete the holiday on ${dateToDelete}?`)) {
        return;
    }
    const holidays = loadHolidays();
    const filteredHolidays = holidays.filter(holiday => holiday.date !== dateToDelete);
    saveHolidays(filteredHolidays);
    alert(`Holiday on ${dateToDelete} deleted.`);
}

// Initialize the holiday list when the page loads
window.onload = renderHolidayList;
