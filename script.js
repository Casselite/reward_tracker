document.addEventListener('DOMContentLoaded', () => {
    initializeCalendar();
    loadSessionData();
});

const totalAmountElement = document.getElementById('totalAmount');
const maxAmountElement = document.getElementById('maxAmount');
const progressBar = document.getElementById('progressBar');
const progressContainer = document.querySelector('.progress-container');
const sessionButtons = {
    1: document.getElementById('session1'),
    2: document.getElementById('session2'),
    3: document.getElementById('session3'),
    4: document.getElementById('session4')
};
let totalAmount = parseFloat(localStorage.getItem('totalAmount')) || 0.00;
let sessionsFinished = 0;
let sessionState = {
    1: false,
    2: false,
    3: false,
    4: false
};

const sessionValues = {
    1: 0.10,
    2: 0.42,
    3: 1.12,
    4: 1.68
};

const maxAmountPerDay = 3.32;

// Save session data for the current day
function saveSessionData() {
    const dateKey = new Date().toLocaleDateString();
    const savedData = JSON.parse(localStorage.getItem('sessionData')) || {};
    savedData[dateKey] = sessionsFinished;
    localStorage.setItem('sessionData', JSON.stringify(savedData));
    localStorage.setItem('totalAmount', totalAmount.toFixed(2));
}

function loadSessionData() {
    const dateKey = new Date().toLocaleDateString();
    const savedData = JSON.parse(localStorage.getItem('sessionData')) || {};
    if (savedData[dateKey]) {
        sessionsFinished = savedData[dateKey];
        updateSessionStates();
    } else {
        // Reset sessionsFinished for a new day
        sessionsFinished = 0;
        resetSessionStates();
    }
    totalAmount = calculateTotalAmount(); // Update total amount based on session data
    updateTotalAmountDisplay();
    updateProgressBar();
}

function updateSessionStates() {
    for (let i = 1; i <= 4; i++) {
        if (i <= sessionsFinished) {
            sessionState[i] = true;
            sessionButtons[i].classList.add('active');
        } else {
            sessionState[i] = false;
            sessionButtons[i].classList.remove('active');
        }
        sessionButtons[i].disabled = i > (sessionsFinished + 1); // Disable buttons greater than the next session
    }
    sessionButtons[1].disabled = false; // Ensure session 1 is always enabled
}

function resetSessionStates() {
    for (let i = 1; i <= 4; i++) {
        sessionState[i] = false;
        sessionButtons[i].classList.remove('active');
        sessionButtons[i].disabled = i !== 1; // Only enable the first session button
    }
}

function toggleSession(sessionNumber) {
    if (sessionState[sessionNumber]) {
        // Deactivate the selected session and any following sessions
        for (let i = sessionNumber; i <= 4; i++) {
            if (sessionState[i]) {
                sessionState[i] = false;
                sessionButtons[i].classList.remove('active');
            }
            sessionButtons[i].disabled = true; // Disable all following sessions
        }
        sessionsFinished = sessionNumber - 1;
    } else {
        // Activate the selected session and any preceding sessions if not already activated
        for (let i = 1; i <= sessionNumber; i++) {
            sessionState[i] = true;
            sessionButtons[i].classList.add('active');
        }
        sessionsFinished = sessionNumber;
    }

    // Ensure session 1 is always enabled and disable inappropriate buttons
    sessionButtons[1].disabled = false;
    for (let i = 2; i <= 4; i++) {
        sessionButtons[i].disabled = !(sessionState[i - 1]);
    }

    totalAmount = calculateTotalAmount(); // Recalculate total amount

    updateTotalAmountDisplay();
    saveSessionData();
    updateProgressBar();
}

function calculateTotalAmount() {
    let amount = 0;
    const savedData = JSON.parse(localStorage.getItem('sessionData')) || {};
    for (const dateKey in savedData) {
        for (let i = 1; i <= savedData[dateKey]; i++) {
            amount += sessionValues[i];
        }
    }
    return amount;
}

function resetSessions() {
    totalAmount = 0.00;
    sessionsFinished = 0;
    resetSessionStates();
    updateTotalAmountDisplay();
    saveSessionData();
    updateProgressBar();
}

function calculateMaxAmount() {
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    return daysInMonth * maxAmountPerDay;
}

function updateTotalAmountDisplay() {
    totalAmountElement.textContent = formatCurrency(totalAmount);
    const maxAmount = calculateMaxAmount();
    maxAmountElement.textContent = formatCurrency(maxAmount);
}

function updateProgressBar() {
    const maxAmount = calculateMaxAmount();
    const progressPercentage = (totalAmount / maxAmount) * 100;
    progressBar.style.width = `${progressPercentage}%`;

    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    const maxPossibleSessions = daysInMonth * 4; // 4 sessions per day
    const totalSessionsDone = Object.values(JSON.parse(localStorage.getItem('sessionData')) || {}).reduce((sum, val) => sum + val, 0);
    progressContainer.title = `${totalSessionsDone} of ${maxPossibleSessions} possible sessions done`;
}

function formatCurrency(value) {
    return `€${value.toFixed(2).replace('.', ',')}`;
}

function initializeCalendar() {
    const calendarEl = document.getElementById('calendar');
    calendarEl.innerHTML = ''; // Clear existing calendar content to prevent duplication
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    for (let day = 1; day <= daysInMonth; day++) {
        const dayEl = document.createElement('div');
        dayEl.classList.add('calendar-day');
        dayEl.dataset.day = day;

        if (day === new Date().getDate()) {
            dayEl.classList.add('no-sessions'); // Start today with light red
        } else if (day > new Date().getDate()) {
            dayEl.style.backgroundColor = 'white'; // Future days should be white
        }

        const dayNumberEl = document.createElement('div');
        dayNumberEl.classList.add('day-number');
        dayNumberEl.textContent = day;
        dayEl.appendChild(dayNumberEl);
        
        calendarEl.appendChild(dayEl);
    }
    loadSessionData();
}
