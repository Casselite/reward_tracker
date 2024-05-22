let totalSaved = 0;
let dailyTotal = 0;
let sessionPayments = {
    session1: false,
    session2: false,
    session3: false,
    session4: false
};
let sessionCount = 0;
const progressTicker = ['I', 'II', 'III', 'IIII'];

// Initialize the calendar
const calendar = document.getElementById('calendar');
const today = new Date();
const currentYear = today.getFullYear();
const currentMonth = today.getMonth();
const firstDay = new Date(currentYear, currentMonth, 1);
const lastDay = new Date(currentYear, currentMonth + 1, 0);
const totalDays = lastDay.getDate();

// Unsuccessful dates for the current month (example dates)
const unsuccessfulDates = ['2023-10-01', '2023-10-05', '2023-10-10'];

for (let day = 1; day <= totalDays; day++) {
    const date = new Date(currentYear, currentMonth, day);
    const dateString = date.toISOString().split('T')[0];

    const dayElement = document.createElement('div');
    dayElement.classList.add('day');
    if (unsuccessfulDates.includes(dateString)) {
        dayElement.classList.add('unsuccessful');
    }

    // Create overlay for progress bar
    const overlay = document.createElement('div');
    overlay.classList.add('overlay');

    // Create progress ticker element
    const progressTickerElement = document.createElement('div');
    progressTickerElement.classList.add('progress-ticker');
    progressTickerElement.setAttribute('id', `ticker${dateString}`);
    progressTickerElement.innerText = 'I';

    dayElement.appendChild(overlay);
    dayElement.appendChild(progressTickerElement);

    dayElement.innerHTML += `<div class="date">${date.getDate()}.${date.getMonth() + 1}</div>`;
    dayElement.setAttribute('id', `day${dateString}`);
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

        // Update the overlay for the current day
        const today = new Date().toISOString().split('T')[0];
        const dayElement = document.getElementById(`day${today}`);
        if (dayElement) {
            const overlayElement = dayElement.querySelector('.overlay');
            overlayElement.style.height = `${(sessionCount / 4) * 100}%`;

            // Update progress ticker in the calendar day
            const tickerElement = document.getElementById(`ticker${today}`);
            tickerElement.innerText = progressTicker[sessionCount - 1];
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

                // Update progress ticker in the calendar day
                const tickerElement = document.getElementById(`ticker${today}`);
                tickerElement.innerText = sessionCount > 0 ? progressTicker[sessionCount - 1] : 'I';
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
    const dayElement = document.getElementById(`day${today}`);
    if (dayElement) {
        const overlayElement = dayElement.querySelector('.overlay');
        overlayElement.style.height = '0%';
        const tickerElement = document.getElementById(`ticker${today}`);
        tickerElement.innerText = 'I';
    }
}

// Save the daily total at midnight
function scheduleDailyReset() {
    const now = new Date();
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
    const timeToMidnight = midnight - now;
    setTimeout(() => {
        saveDailyTotal();
        scheduleDailyReset();
    }, timeToMidnight);
}

// Start the schedule for daily reset
scheduleDailyReset();
