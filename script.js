let totalSaved = 0;
let dailyTotal = 0;
let sessionPayments = {
    session1: false,
    session2: false,
    session3: false,
    session4: false
};
let sessionCount = 0;

// Initialize the calendar
const calendar = document.getElementById('calendar');
const today = new Date();
const endOfYear = new Date(today.getFullYear(), 11, 31);

for (let d = new Date(today); d <= endOfYear; d.setDate(d.getDate() + 1)) {
    const dayElement = document.createElement('div');
    dayElement.classList.add('day');
    dayElement.id = `day${d.toISOString().split('T')[0]}`;
    
    // Create an overlay div for green color
    const overlay = document.createElement('div');
    overlay.classList.add('overlay');
    dayElement.appendChild(overlay);
    
    dayElement.innerHTML += `<div class="date">${d.getDate()}.${d.getMonth() + 1}</div>`;
    calendar.appendChild(dayElement);
}

// Function to pay in for a session
function payIn(amount, sessionId) {
    if (!sessionPayments[sessionId]) {
        // Update daily and total saved amounts
        dailyTotal += amount;
        document.getElementById('total').innerText = dailyTotal.toFixed(2) + '€';

        // Change button color to green
        const sessionElement = document.getElementById(sessionId);
        sessionElement.classList.add('completed');
        sessionElement.querySelector('.payInBtn').disabled = true;

        // Mark session as paid in
        sessionPayments[sessionId] = true;
        sessionCount++;

        // Mark the current day in the calendar with an overlay
        const today = new Date().toISOString().split('T')[0];
        const dayElement = document.getElementById(`day${today}`);
        if (dayElement) {
            const overlayElement = dayElement.querySelector('.overlay');
            overlayElement.style.height = `${(sessionCount / 4) * 100}%`;
        }
    }
}

// Function to reset all sessions
function resetAllSessions() {
    for (let sessionId in sessionPayments) {
        if (sessionPayments[sessionId]) {
            // Reset button color to red
            const sessionElement = document.getElementById(sessionId);
            sessionElement.classList.remove('completed');
            sessionElement.querySelector('.payInBtn').disabled = false;

            // Remove the latest portion of the overlay for the current day
            const today = new Date().toISOString().split('T')[0];
            const dayElement = document.getElementById(`day${today}`);
            if (dayElement) {
                const overlayElement = dayElement.querySelector('.overlay');
                sessionCount--;
                overlayElement.style.height = `${(sessionCount / 4) * 100}%`;
            }

            // Mark session as unpaid
            sessionPayments[sessionId] = false;

            // Adjust daily total
            const amount = parseFloat(sessionElement.querySelector('.payInBtn').innerText.split('-')[1].trim().replace('€', ''));
            dailyTotal -= amount;
            document.getElementById('total').innerText = dailyTotal.toFixed(2) + '€';
        }
    }
}

// Function to save the daily total and reset for the next day
function saveDailyTotal() {
    const today = new Date().toISOString().split('T')[0];
    totalSaved += dailyTotal;
    dailyTotal = 0;
    sessionCount = 0;
    document.getElementById('total').innerText = dailyTotal.toFixed(2) + '€';
    resetAllSessions();
}

// Save the daily total at midnight
function scheduleDailyReset() {
    const now = new Date();
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
    const timeToMidnight = midnight.getTime() - now.getTime();
    setTimeout(() => {
        saveDailyTotal();
        scheduleDailyReset();
    }, timeToMidnight);
}

// Start the schedule for daily reset
scheduleDailyReset();
