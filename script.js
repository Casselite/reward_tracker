document.addEventListener('DOMContentLoaded', () => {
    initializeCalendar();
    setupSessionButtons();
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
let sessionData = JSON.parse(localStorage.getItem('sessionData')) || {};
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

function getFormattedDate() {
    const now = new Date();
    return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
}

function saveSessionData() {
    const dateKey = getFormattedDate();
    sessionData[dateKey] = sessionsFinished;
    localStorage.setItem('sessionData', JSON.stringify(sessionData));
    localStorage.setItem('totalAmount', totalAmount.toFixed(2));
    console.log('Data Saved: ', sessionData, 'Total Amount:', totalAmount.toFixed(2));
}

function loadSessionData() {
    const dateKey = getFormattedDate();
    if (sessionData[dateKey]) {
        sessionsFinished = sessionData[dateKey];
        updateSessionStates();
    } else {
        sessionsFinished = 0;
        resetSessionStates();
    }
    totalAmount = calculateTotalAmount();
    updateTotalAmountDisplay();
    updateProgressBar();
    updateCalendarDays();
    console.log('Data Loaded: ', sessionData, 'Total Amount:', totalAmount.toFixed(2));
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
        sessionButtons[i].disabled = i > (sessionsFinished + 1);
    }
    sessionButtons[1].disabled = false;
    updateCurrentDay();
}

function resetSessionStates() {
    for (let i = 1; i <= 4; i++) {
        sessionState[i] = false;
        sessionButtons[i].classList.remove('active');
        sessionButtons[i].disabled = i !== 1;
    }
}

function toggleSession(sessionNumber) {
    if (sessionState[sessionNumber]) {
        for (let i = sessionNumber; i <= 4; i++) {
            if (sessionState[i]) {
                totalAmount = (totalAmount - sessionValues[i]).toFixed(2);
                totalAmount = parseFloat(totalAmount);
                sessionState[i] = false;
                sessionButtons[i].classList.remove('active');
            }
            sessionButtons[i].disabled = true;
        }
        sessionsFinished = sessionNumber - 1;
    } else {
        for (let i = 1; i <= sessionNumber; i++) {
            if (!sessionState[i]) {
                totalAmount = (totalAmount + sessionValues[i]).toFixed(2);
                totalAmount = parseFloat(totalAmount);
                sessionState[i] = true;
                sessionButtons[i].classList.add('active');
            }
        }
        sessionsFinished = sessionNumber;
    }

    sessionButtons[1].disabled = false;
    for (let i = 2; i <= 4; i++) {
        sessionButtons[i].disabled = !(sessionState[i - 1]);
    }

    updateTotalAmountDisplay();
    saveSessionData();
    updateProgressBar();
    updateCurrentDay();
    console.log('Session Toggled: ', sessionNumber, 'Total Amount:', totalAmount.toFixed(2));
}

function calculateTotalAmount() {
    let amount = 0;
    console.log("Calculating Total Amount from: ", sessionData);
    for (const dateKey in sessionData) {
        for (let i = 1; i <= sessionData[dateKey]; i++) {
            amount += sessionValues[i];
        }
    }
    return parseFloat(amount.toFixed(2));
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
    const maxPossibleSessions = daysInMonth * 4;
    const totalSessionsDone = Object.values(sessionData).reduce((sum, val) => sum + val, 0);
    progressContainer.title = `${totalSessionsDone} of ${maxPossibleSessions} possible sessions done`;
}

function formatCurrency(value) {
    return `€${value.toFixed(2).replace('.', ',')}`;
}

function initializeCalendar() {
    const calendarEl = document.getElementById('calendar');
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    calendarEl.innerHTML = ''; // Clear previous days if any
    for (let day = 1; day <= daysInMonth; day++) {
        const dayContainerEl = document.createElement('div');
        dayContainerEl.classList.add('calendar-day-container');

        const dayEl = document.createElement('div');
        dayEl.classList.add('calendar-day');
        dayEl.dataset.day = day;

        const dayNumberEl = document.createElement('div');
        dayNumberEl.classList.add('day-number');
        dayNumberEl.textContent = day;

        dayContainerEl.appendChild(dayEl);
        dayContainerEl.appendChild(dayNumberEl);
        calendarEl.appendChild(dayContainerEl);
    }

    // Load session data after generating the calendar
    loadSessionData();
}

function updateCurrentDay() {
    const currentDayEl = document.querySelector(`.calendar-day[data-day="${new Date().getDate()}"]`);

    if (!currentDayEl) return;

    currentDayEl.classList.remove('no-sessions', 'one-session', 'two-sessions', 'three-sessions', 'four-sessions');

    let sessionClass = '';
    switch (sessionsFinished) {
        case 1:
            sessionClass = 'one-session';
            break;
        case 2:
            sessionClass = 'two-sessions';
            break;
        case 3:
            sessionClass = 'three-sessions';
            break;
        case 4:
            sessionClass = 'four-sessions';
            break;
        default:
            sessionClass = 'no-sessions';
            break;
    }
    currentDayEl.classList.add(sessionClass);

    let sessionCountEl = currentDayEl.querySelector('.session-count');
    if (!sessionCountEl) {
        sessionCountEl = document.createElement('div');
        sessionCountEl.classList.add('session-count');
        currentDayEl.appendChild(sessionCountEl);
    }

    const romanNumerals = ['I', 'II', 'III', 'IV'];
    sessionCountEl.textContent = sessionsFinished > 0 ? romanNumerals[sessionsFinished - 1] : '';
}

function updateCalendarDays() {
    const today = new Date().getDate();
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    document.querySelectorAll('.calendar-day').forEach(dayEl => {
        const day = parseInt(dayEl.dataset.day, 10);
        const dateKey = `${currentYear}-${currentMonth}-${day}`;

        dayEl.classList.remove('no-sessions', 'one-session', 'two-sessions', 'three-sessions', 'four-sessions', 'inactive-day');

        if (sessionData[dateKey]) {
            let sessionClass = '';
            switch (sessionData[dateKey]) {
                case 1:
                    sessionClass = 'one-session';
                    break;
                case 2:
                    sessionClass = 'two-sessions';
                    break;
                case 3:
                    sessionClass = 'three-sessions';
                    break;
                case 4:
                    sessionClass = 'four-sessions';
                    break;
                default:
                    sessionClass = 'no-sessions';
                    break;
            }
            dayEl.classList.add(sessionClass);
            let sessionCountEl = dayEl.querySelector('.session-count');
            if (!sessionCountEl) {
                sessionCountEl = document.createElement('div');
                sessionCountEl.classList.add('session-count');
                dayEl.appendChild(sessionCountEl);
            }
            const romanNumerals = ['I', 'II', 'III', 'IV'];
            sessionCountEl.textContent = sessionData[dateKey] > 0 ? romanNumerals[sessionData[dateKey] - 1] : '';
        } else {
            if (day < today) {
                dayEl.classList.add('inactive-day');
                if (!dayEl.querySelector('.inactive-day::before')) {
                    const inactiveMark = document.createElement('div');
                    inactiveMark.classList.add('inactive-mark');
                    inactiveMark.textContent = 'X';
                    dayEl.appendChild(inactiveMark);
                }
            }
        }
    });
}

// Add event listeners to session buttons
function setupSessionButtons() {
    for (let i = 1; i <= 4; i++) {
        sessionButtons[i].addEventListener('click', () => toggleSession(i));
    }
}

// Uncomment clearLocalStorage() to clear any previous data for consistent initial state
// clearLocalStorage();

function clearLocalStorage() {
    localStorage.clear();
    loadSessionData();
}
