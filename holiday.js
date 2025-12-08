// Local Storage Key for Holidays
const HOLIDAYS_KEY = 'dtrCustomHolidays'; // Key for custom holidays (Array)
const STATIC_HOLIDAYS_KEY = 'dtrStatutoryHolidays'; // Key for statutory holidays (Object)

// --- LOADER FUNCTIONS (Cleaned up) ---

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
 * Saves the mutable statutory holidays (object format) back to Local Storage.
 */
function saveStatutoryHolidays(holidaysObject) {
    localStorage.setItem(STATIC_HOLIDAYS_KEY, JSON.stringify(holidaysObject));
}


/**
 * Loads the user-defined custom holidays from Local Storage.
 * @returns {Array} List of custom holiday objects.
 */
function loadCustomHolidays() {
    try {
        const holidays = JSON.parse(localStorage.getItem(HOLIDAYS_KEY)) || [];
        // Ensure holidays are sorted by date
        holidays.sort((a, b) => new Date(a.date) - new Date(b.date));
        return holidays;
    } catch (e) {
        console.error("Error loading custom holidays:", e);
        return [];
    }
}

/**
 * Saves the user-defined custom holidays back to Local Storage.
 */
function saveCustomHolidays(holidays) {
    localStorage.setItem(HOLIDAYS_KEY, JSON.stringify(holidays));
    renderHolidayList();
}


// --- MAIN LOGIC ---

/**
 * Renders the list of saved holidays in the HTML (Statutory and Custom).
 */
function renderHolidayList() {
    // 1. Get Statutory Holidays and convert to Array
    const statutoryHolidaysObject = loadStatutoryHolidays();
    const statutoryHolidaysArray = Object.keys(statutoryHolidaysObject).map(date => ({
        date: date,
        name: statutoryHolidaysObject[date].name,
        type: statutoryHolidaysObject[date].type,
        isStatutory: true,
    }));

    // 2. Get Custom Holidays
    const customHolidaysArray = loadCustomHolidays();

    // 3. Combine and Sort
    const combinedHolidays = [...statutoryHolidaysArray, ...customHolidaysArray];
    combinedHolidays.sort((a, b) => new Date(a.date) - new Date(b.date));

    // 4. Render
    const listElement = document.getElementById('saved-holidays-list'); // Assuming your list element has this ID
    listElement.innerHTML = '';

    if (combinedHolidays.length === 0) {
        listElement.innerHTML = '<li style="text-align: center; color: #777;">No holidays saved.</li>';
        return;
    }

    combinedHolidays.forEach(holiday => {
        const listItem = document.createElement('li');
        
        // Actions: Edit is available for all, Delete is available for custom only
        const isStatutory = holiday.isStatutory || false;
        const actions = `
            <button onclick="editHoliday('${holiday.date}', ${isStatutory})" class="action-btn edit-btn">Edit</button>
            ${isStatutory ? '' : `<button onclick="deleteHoliday('${holiday.date}')" class="action-btn delete-btn">Delete</button>`}
        `;
        
        const status = isStatutory ? `(STATUTORY - ${holiday.type})` : `(CUSTOM - ${holiday.type})`;
        
        listItem.innerHTML = `
            <div class="holiday-details">
                <strong>${holiday.date}</strong>: ${holiday.name} <span style="font-size: 0.9em; color: #555;">${status}</span>
            </div>
            <div class="holiday-actions">
                ${actions}
            </div>
        `;
        listElement.appendChild(listItem);
    });
}


/**
 * Saves a new or edited holiday entry (handles both Custom and Statutory).
 */
function saveHoliday() {
    const date = document.getElementById('holiday-date').value;
    const name = document.getElementById('holiday-name').value.trim();
    const type = document.getElementById('holiday-type').value;
    // CRITICAL: Get the flag set by editHoliday
    const isStatutoryStr = document.getElementById('is-statutory-flag').value; 
    const isStatutory = isStatutoryStr === 'true'; 

    if (!date || !name) {
        alert("Please enter both a date and a name for the holiday.");
        return;
    }

    if (isStatutory) {
        // --- SAVE TO STATUTORY LIST (OBJECT) ---
        const holidaysObject = loadStatutoryHolidays();
        holidaysObject[date] = { name, type };
        saveStatutoryHolidays(holidaysObject);
        alert(`Statutory Holiday for ${date} updated successfully!`);
    } else {
        // --- SAVE TO CUSTOM LIST (ARRAY) ---
        let holidays = loadCustomHolidays();
        let isUpdated = false;
        
        // Find and replace existing entry by date
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
        saveCustomHolidays(holidays); // This calls renderHolidayList()
        alert(`Custom Holiday for ${date} saved successfully!`);
    }

    // Clear inputs after saving
    document.getElementById('holiday-date').value = '';
    document.getElementById('holiday-name').value = '';
    document.getElementById('is-statutory-flag').value = 'false'; // Reset flag for new entry
}


/**
 * Fills the form with data for the selected holiday to enable editing.
 * CRITICAL: Must accept the isStatutory flag from the list item
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
        // CRITICAL: Set the hidden flag so saveHoliday() knows where to save
        document.getElementById('is-statutory-flag').value = isStatutory ? 'true' : 'false';
        
        // Focus the input to draw attention to the form
        document.getElementById('holiday-date').focus();
    }
}


/**
 * Deletes a holiday entry based on its date (ONLY for custom holidays).
 */
function deleteHoliday(dateToDelete) {
    if (!confirm(`Are you sure you want to delete the custom holiday on ${dateToDelete}?`)) {
        return;
    }
    const holidays = loadCustomHolidays();
    const filteredHolidays = holidays.filter(holiday => holiday.date !== dateToDelete);
    saveCustomHolidays(filteredHolidays); // This calls renderHolidayList()
    alert(`Holiday on ${dateToDelete} deleted.`);
}

// Initialize the holiday list when the page loads
window.onload = () => {
    // You need a hidden field for the flag in your HTML: <input type="hidden" id="is-statutory-flag" value="false">
    document.getElementById('is-statutory-flag').value = 'false'; 
    
    // Wire up the save button (assuming your button has onclick="saveHoliday()")
    renderHolidayList(); 
};
