// Local Storage Key for Holidays
const HOLIDAYS_KEY = 'dtrCustomHolidays';

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
 * Renders the list of saved holidays in the HTML.
 */
function renderHolidayList() {
    const holidays = loadHolidays();
    const listElement = document.getElementById('holiday-list');
    listElement.innerHTML = '';

    if (holidays.length === 0) {
        listElement.innerHTML = '<li style="text-align: center; color: #777;">No custom holidays saved.</li>';
        return;
    }

    holidays.forEach(holiday => {
        const listItem = document.createElement('li');
        const typeLabel = holiday.type === 'REGULAR' ? 'Regular' : 'Special';
        
        listItem.innerHTML = `
            ${holiday.date}: <strong>${holiday.name}</strong> (${typeLabel})
            <div>
                <button onclick="editHoliday('${holiday.date}')" style="background-color: #28a745;">Edit</button>
                <button onclick="deleteHoliday('${holiday.date}')" style="background-color: #dc3545;">Delete</button>
            </div>
        `;
        // Basic styling for the list item (can be moved to style.css)
        listItem.style.display = 'flex';
        listItem.style.justifyContent = 'space-between';
        listItem.style.alignItems = 'center';
        listItem.style.padding = '8px 0';

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
