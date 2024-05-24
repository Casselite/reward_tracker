document.addEventListener('DOMContentLoaded', () => {
    initializeCalendar();
    setupSessionButtons();
    loadSessionData();
    updateCurrentMonthDisplay();
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
let totalAmount = 0.00;
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

function updateCurrentMonthDisplay() {
    const currentDate = new Date();
    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June', 'July',
        'August', 'September', 'October', 'November', 'December'
    ];
    document.getElementById('currentMonth').textContent = monthNames[currentDate.getMonth()];
}

function saveSessionData() {
    const dateKey = getFormattedDate();
    sessionData[dateKey] = sessionsFinished;
    localStorage.setItem('sessionData', JSON.stringify(sessionData));
    localStorage.setItem('totalAmount', totalAmount.toFixed(2));
    console.log('Saving Data:', { totalAmount });
}

function loadSessionData() {
    const dateKey = getFormattedDate();
    const currentMonth = new Date().getMonth() + 1;
    const storedMonth = sessionData.currentMonth || currentMonth;

    if (storedMonth !== currentMonth) {
        sessionData = { currentMonth: currentMonth };
        totalAmount = 0.00;
        sessionsFinished = 0;
        resetSessionStates();
        localStorage.setItem('sessionData', JSON.stringify(sessionData));
    } else {
        sessionData.currentMonth = currentMonth;
        localStorage.setItem('sessionData', JSON.stringify(sessionData));
    }

    totalAmount = calculateTotalAmount();

    if (sessionData[dateKey]) {
        sessionsFinished = sessionData[dateKey];
        updateSessionStates();
    }

    updateTotalAmountDisplay();
    updateProgressBar();
    updateCalendarDays();
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
    sessionButtons[1].disabled = false;
}

function toggleSession(sessionNumber) {
    const sessionButton = sessionButtons[sessionNumber];
    const wasActive = sessionState[sessionNumber];
    let shouldPlayClickSound = !wasActive;

    if (sessionState[sessionNumber]) {
        for (let i = sessionNumber; i <= 4; i++) {
            if (sessionState[i]) {
                totalAmount -= sessionValues[i];
                sessionState[i] = false;
                sessionButtons[i].classList.remove('active');
            }
            sessionButtons[i].disabled = true;
        }
        sessionsFinished = sessionNumber - 1;
    } else {
        for (let i = 1; i <= sessionNumber; i++) {
            if (!sessionState[i]) {
                totalAmount += sessionValues[i];
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

    if (shouldPlayClickSound) {
        const soundToPlay = sessionNumber === 4 ? document.getElementById('specialClickSound') : document.getElementById('clickSound');
        soundToPlay.currentTime = 0;
        soundToPlay.play();
    }
}

function calculateTotalAmount() {
    let amount = 0;
    for (const dateKey in sessionData) {
        if (dateKey !== "currentMonth") {
            for (let i = 1; i <= sessionData[dateKey]; i++) {
                amount += sessionValues[i];
            }
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
    const maxAmount = calculateMaxAmount();
    totalAmountElement.textContent = formatCurrency(totalAmount);
    maxAmountElement.textContent = formatCurrency(maxAmount);
    console.log('Updated Display. totalAmount:', totalAmountElement.textContent); // Debugging log
}

function updateProgressBar() {
    const maxAmount = calculateMaxAmount();
    const progressPercentage = (totalAmount / maxAmount) * 100;
    progressBar.style.width = `${progressPercentage}%`;

    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    const maxPossibleSessions = daysInMonth * 4;
    const totalSessionsDone = Object.values(sessionData).reduce((sum, val) => typeof val === 'number' ? sum + val : sum, 0);
    progressContainer.title = `${totalSessionsDone} of ${maxPossibleSessions} possible sessions done`;
}

function formatCurrency(value) {
    const formattedValue = value.toFixed(2).replace('.', ',');
    return formattedValue === '-0,00' || formattedValue === '0,00' ? '€0,00' : `€${formattedValue}`;
}

function initializeCalendar() {
    const calendarEl = document.getElementById('calendar');
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    calendarEl.innerHTML = '';
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

    updateCalendarDays();
}

function updateCurrentDay() {
    const currentDayEl = document.querySelector(`.calendar-day[data-day="${new Date().getDate()}"]`);

    if (!currentDayEl) return;

    currentDayEl.classList.remove('no-sessions', 'one-session', 'two-sessions', 'three-sessions', 'four-sessions');
    currentDayEl.classList.add('current-day');

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

        dayEl.classList.remove('no-sessions', 'one-session', 'two-sessions', 'three-sessions', 'four-sessions', 'inactive-day', 'current-day');

        if (dayEl.querySelector('.inactive-mark')) {
            dayEl.querySelector('.inactive-mark').remove();
        }

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
            }
        }

        if (day === today) {
            dayEl.classList.add('current-day');
        }
    });
}

function setupSessionButtons() {
    const clickSound = document.getElementById('clickSound');
    const specialClickSound = document.getElementById('specialClickSound');
    clickSound.volume = 0.2;
    specialClickSound.volume = 0.2;

    for (let i = 1; i <= 4; i++) {
        sessionButtons[i].addEventListener('click', () => {
            toggleSession(i);
        });
    }
}

function clearLocalStorage() {
    localStorage.clear();
    console.log('LocalStorage Cleared');
    loadSessionData();
}
