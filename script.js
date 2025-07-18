// Wrap script in an IIFE to create a private scope and avoid global variables.
(function() {
    'use strict'; // Enforce stricter parsing and error handling.

    // --- DOM Elements ---
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
    const clickSound = document.getElementById('clickSound');
    const specialClickSound = document.getElementById('specialClickSound');

    // --- State & Constants ---
    let totalAmount = 0.00;
    let sessionsFinished = 0;
    let sessionData = {}; // Initialized in loadSessionData
    const sessionState = { 1: false, 2: false, 3: false, 4: false };
    const sessionValues = { 1: 0.10, 2: 0.42, 3: 1.12, 4: 1.68 };
    const maxAmountPerDay = 3.32;

    // --- Core Functions ---

    /**
     * Initializes the application when the DOM is fully loaded.
     */
    function initialize() {
        const now = new Date();
        loadSessionData(now);
        initializeCalendar(now);
        setupSessionButtons();
        updateCurrentMonthDisplay(now);
    }

    /**
     * Loads session data from localStorage, handling month changes.
     */
    function loadSessionData(currentDate) {
        try {
            sessionData = JSON.parse(localStorage.getItem('sessionData')) || {};
        } catch (e) {
            console.error('Failed to parse session data from localStorage.', e);
            sessionData = {};
        }

        const currentMonth = currentDate.getMonth() + 1;
        const storedMonth = sessionData.currentMonth || currentMonth;

        // If the month has changed, reset all data.
        if (storedMonth !== currentMonth) {
            sessionData = { currentMonth: currentMonth };
            totalAmount = 0.00;
            sessionsFinished = 0;
            saveSessionData(); // Save the cleared state
        }
        
        // Recalculate total amount from stored data
        totalAmount = calculateTotalAmount();

        const dateKey = getFormattedDate(currentDate);
        if (sessionData[dateKey]) {
            sessionsFinished = sessionData[dateKey];
        }

        updateAllUI();
    }

    /**
     * Saves the current session data and total amount to localStorage.
     */
    function saveSessionData() {
        try {
            const dateKey = getFormattedDate(new Date());
            sessionData[dateKey] = sessionsFinished;
            localStorage.setItem('sessionData', JSON.stringify(sessionData));
        } catch (e) {
            console.error('Failed to save session data to localStorage.', e);
            // Optionally, inform the user that progress cannot be saved.
        }
    }

    /**
     * Toggles the state of a session button (on/off).
     * This function is complex because toggling a session off also
     * toggles off all subsequent sessions for that day.
     */
    function toggleSession(sessionNumber) {
        const wasActive = sessionState[sessionNumber];

        // --- Logic for Turning Sessions OFF ---
        // If the clicked session was already active, turn it and all subsequent sessions off.
        if (wasActive) {
            for (let i = sessionNumber; i <= 4; i++) {
                if (sessionState[i]) {
                    sessionState[i] = false;
                }
            }
            sessionsFinished = sessionNumber - 1;
        }
        // --- Logic for Turning Sessions ON ---
        // If the clicked session was not active, turn it and all preceding sessions on.
        else {
            for (let i = 1; i <= sessionNumber; i++) {
                if (!sessionState[i]) {
                    sessionState[i] = true;
                }
            }
            sessionsFinished = sessionNumber;
        }

        // Recalculate total amount and update everything
        totalAmount = calculateTotalAmount();
        saveSessionData();
        updateAllUI();
        
        // Play sound effect only when activating a session.
        if (!wasActive) {
            const soundToPlay = sessionNumber === 4 ? specialClickSound : clickSound;
            soundToPlay.currentTime = 0;
            soundToPlay.play().catch(e => console.error("Error playing sound:", e));
        }
    }

    // --- UI Update Functions ---

    /**
     * A single function to refresh all parts of the UI.
     */
    function updateAllUI() {
        updateSessionButtonsAndState();
        updateTotalAmountDisplay();
        updateProgressBar();
        updateCalendarDays();
    }

    /**
     * Updates the active/disabled state of the four session buttons.
     */
    function updateSessionButtonsAndState() {
        for (let i = 1; i <= 4; i++) {
            sessionState[i] = (i <= sessionsFinished);
            sessionButtons[i].classList.toggle('active', sessionState[i]);
            sessionButtons[i].disabled = i > (sessionsFinished + 1);
        }
        sessionButtons[1].disabled = false; // Session 1 is always clickable.
    }
    
    /**
     * Updates the total amount and max amount display.
     */
    function updateTotalAmountDisplay() {
        const maxAmount = calculateMaxAmount(new Date());
        totalAmountElement.textContent = formatCurrency(totalAmount);
        maxAmountElement.textContent = formatCurrency(maxAmount);
    }
    
    /**
     * Updates the progress bar width and tooltip.
     * BUG FIX: This function now correctly calculates total sessions.
     */
    function updateProgressBar() {
        const currentDate = new Date();
        const maxAmount = calculateMaxAmount(currentDate);
        const progressPercentage = maxAmount > 0 ? (totalAmount / maxAmount) * 100 : 0;
        
        progressBar.style.width = `${progressPercentage}%`;
        progressBar.setAttribute('aria-valuenow', progressPercentage.toFixed(0));

        // Correctly calculate total sessions done this month for the tooltip.
        let totalSessionsDone = 0;
        for (const key in sessionData) {
            if (key !== 'currentMonth') { // Exclude the month tracker from the sum
                totalSessionsDone += sessionData[key];
            }
        }

        const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
        const maxPossibleSessions = daysInMonth * 4;
        progressContainer.title = `${totalSessionsDone} of ${maxPossibleSessions} possible sessions done`;
    }

    /**
     * Updates the visual state of all days in the calendar.
     */
    function updateCalendarDays() {
        const today = new Date();
        const todayDate = today.getDate();
        const currentMonth = today.getMonth() + 1;
        const currentYear = today.getFullYear();

        document.querySelectorAll('.calendar-day').forEach(dayEl => {
            const day = parseInt(dayEl.dataset.day, 10);
            const dateKey = `${currentYear}-${currentMonth}-${day}`;
            const sessionsForDay = sessionData[dateKey] || 0;

            // Reset classes
            dayEl.className = 'calendar-day';
            
            // Add session class
            dayEl.classList.add(getSessionClass(sessionsForDay));

            // Mark past, uncompleted days
            if (sessionsForDay === 0 && day < todayDate) {
                dayEl.classList.add('inactive-day');
            }

            // Highlight the current day
            if (day === todayDate) {
                dayEl.classList.add('current-day');
            }
            
            // Update the Roman numeral display
            let sessionCountEl = dayEl.querySelector('.session-count');
            if (!sessionCountEl) {
                sessionCountEl = document.createElement('div');
                sessionCountEl.classList.add('session-count');
                dayEl.appendChild(sessionCountEl);
            }
            const romanNumerals = ['I', 'II', 'III', 'IV'];
            sessionCountEl.textContent = sessionsForDay > 0 ? romanNumerals[sessionsForDay - 1] : '';
        });
    }

    // --- Helper & Setup Functions ---

    /**
     * Recalculates the total amount based on the entire sessionData object.
     */
    function calculateTotalAmount() {
        let amount = 0;
        for (const dateKey in sessionData) {
            if (dateKey !== "currentMonth") {
                const dailySessions = sessionData[dateKey];
                for (let i = 1; i <= dailySessions; i++) {
                    amount += sessionValues[i];
                }
            }
        }
        return parseFloat(amount.toFixed(2));
    }

    function initializeCalendar(currentDate) {
        const calendarEl = document.getElementById('calendar');
        const month = currentDate.getMonth();
        const year = currentDate.getFullYear();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        calendarEl.innerHTML = ''; // Clear previous calendar
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
    }

    function setupSessionButtons() {
        clickSound.volume = 0.2;
        specialClickSound.volume = 0.2;

        for (let i = 1; i <= 4; i++) {
            sessionButtons[i].addEventListener('click', () => toggleSession(i));
        }
    }

    function updateCurrentMonthDisplay(currentDate) {
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        document.getElementById('currentMonth').textContent = monthNames[currentDate.getMonth()];
    }

    function calculateMaxAmount(currentDate) {
        const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
        return daysInMonth * maxAmountPerDay;
    }

    function getFormattedDate(date) {
        return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
    }

    function formatCurrency(value) {
        return `€${value.toFixed(2).replace('.', ',')}`;
    }

    function getSessionClass(sessionCount) {
        const classMap = {
            1: 'one-session',
            2: 'two-sessions',
            3: 'three-sessions',
            4: 'four-sessions'
        };
        return classMap[sessionCount] || 'no-sessions';
    }

    // --- Event Listener ---
    document.addEventListener('DOMContentLoaded', initialize);

})();
