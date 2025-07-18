// Wrap script in an IIFE to create a private scope.
(function() {
    'use strict';

    // --- DOM Elements ---
    const habitTitleElement = document.getElementById('habitTitle');
    const totalAmountElement = document.getElementById('totalAmount');
    const maxAmountElement = document.getElementById('maxAmount');
    const progressBar = document.getElementById('progressBar');
    const progressContainer = document.querySelector('.progress-container');
    const sessionButtons = { 1: document.getElementById('session1'), 2: document.getElementById('session2'), 3: document.getElementById('session3'), 4: document.getElementById('session4') };
    const clickSound = document.getElementById('clickSound');
    const specialClickSound = document.getElementById('specialClickSound');
    const currentStreakEl = document.getElementById('currentStreak');
    const longestStreakEl = document.getElementById('longestStreak');
    const achievementNotificationEl = document.getElementById('achievementNotification');
    const achievementNameEl = document.getElementById('achievementName');
    const noteModal = document.getElementById('noteModal');
    const noteModalTitle = document.getElementById('noteModalTitle');
    const noteTextarea = document.getElementById('noteTextarea');
    const saveNoteButton = document.getElementById('saveNoteButton');
    const closeNoteButton = document.getElementById('closeNoteButton');

    // --- State & Constants ---
    let totalAmount = 0.00;
    let sessionsFinished = 0;
    let sessionData = {}; // Data for calendar days (sessions, notes)
    let trackerState = {}; // Data for streaks and achievements
    let currentlyEditingDateKey = null; // To track which day's note is being edited
    const sessionValues = { 1: 0.10, 2: 0.42, 3: 1.12, 4: 1.68 };
    const maxAmountPerDay = 3.32;
    const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    
    // --- Achievements Definitions ---
    const ACHIEVEMENTS = {
        PERFECT_DAY: { name: "Perfect Day!", description: "Complete all 4 sessions in one day." },
        STREAK_7: { name: "7-Day Streak!", description: "Maintain a streak for 7 days." },
        STREAK_30: { name: "30-Day Streak!", description: "Maintain a streak for a whole month." },
        FIRST_10: { name: "First €10 Earned!", description: "Earn your first €10." },
        PERFECT_WEEK: { name: "Perfect Week!", description: "Complete all 4 sessions every day for 7 days." }
    };

    // --- Core Functions ---

    function initialize() {
        const now = new Date();
        loadData(now);
        initializeCalendar(now);
        setupEventListeners();
        updateCurrentMonthDisplay(now);
        updateAllUI();
    }
    
    function loadData(currentDate) {
        const savedTitle = localStorage.getItem('habitTitle');
        if (savedTitle) habitTitleElement.textContent = savedTitle;

        try { sessionData = JSON.parse(localStorage.getItem('sessionData')) || {}; } catch (e) { console.error('Failed to parse session data.', e); sessionData = {}; }
        try { trackerState = JSON.parse(localStorage.getItem('trackerState')) || { longestStreak: 0, unlockedAchievements: [] }; } catch (e) { console.error('Failed to parse tracker state.', e); trackerState = { longestStreak: 0, unlockedAchievements: [] }; }

        const currentMonth = currentDate.getMonth() + 1;
        const storedMonth = sessionData.currentMonth || currentMonth;
        if (storedMonth !== currentMonth) {
            sessionData = { currentMonth: currentMonth };
            saveData('sessionData');
        }

        const dateKey = getFormattedDate(currentDate);
        sessionsFinished = (sessionData[dateKey] && sessionData[dateKey].sessions) ? sessionData[dateKey].sessions : 0;
    }

    function saveData(key) {
        try {
            if (key === 'sessionData') {
                const dateKey = getFormattedDate(new Date());
                if (!sessionData[dateKey]) sessionData[dateKey] = {};
                sessionData[dateKey].sessions = sessionsFinished;
                localStorage.setItem('sessionData', JSON.stringify(sessionData));
            } else if (key === 'trackerState') {
                localStorage.setItem('trackerState', JSON.stringify(trackerState));
            } else if (key === 'habitTitle') {
                localStorage.setItem('habitTitle', habitTitleElement.textContent);
            }
        } catch (e) {
            console.error(`Failed to save ${key} to localStorage.`, e);
        }
    }
    
    function handleUpdate() {
        totalAmount = calculateTotalAmount();
        saveData('sessionData');
        updateAllUI();
        updateStreaks();
        checkAchievements();
    }

    function toggleSession(sessionNumber) {
        const wasActive = sessionNumber <= sessionsFinished;
        sessionsFinished = wasActive ? sessionNumber - 1 : sessionNumber;
        handleUpdate();
        if (!wasActive) {
            const soundToPlay = sessionNumber === 4 ? specialClickSound : clickSound;
            soundToPlay.currentTime = 0;
            soundToPlay.play().catch(e => console.error("Error playing sound:", e));
        }
    }

    // --- UI Update Functions ---

    function updateAllUI() {
        updateSessionButtons();
        updateTotalAmountDisplay();
        updateProgressBar();
        updateCalendarDays();
        updateStreakDisplay();
    }

    function updateSessionButtons() {
        for (let i = 1; i <= 4; i++) {
            sessionButtons[i].classList.toggle('active', i <= sessionsFinished);
            sessionButtons[i].disabled = i > (sessionsFinished + 1);
        }
        sessionButtons[1].disabled = false;
    }
    
    function updateTotalAmountDisplay() {
        const maxAmount = calculateMaxAmount(new Date());
        totalAmountElement.textContent = formatCurrency(totalAmount);
        maxAmountElement.textContent = formatCurrency(maxAmount);
    }
    
    function updateProgressBar() {
        const currentDate = new Date();
        const maxAmount = calculateMaxAmount(currentDate);
        const progressPercentage = maxAmount > 0 ? (totalAmount / maxAmount) * 100 : 0;
        progressBar.style.width = `${progressPercentage}%`;
        progressBar.setAttribute('aria-valuenow', progressPercentage.toFixed(0));

        let totalSessionsDone = 0;
        for (const key in sessionData) {
            if (key !== 'currentMonth' && sessionData[key].sessions) {
                totalSessionsDone += sessionData[key].sessions;
            }
        }

        const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
        const maxPossibleSessions = daysInMonth * 4;
        progressContainer.title = `${totalSessionsDone} of ${maxPossibleSessions} possible sessions done`;
    }

    /**
     * CORRECTED FUNCTION: Styles calendar days for past, present, and future.
     */
    function updateCalendarDays() {
        const today = new Date();
        const todayDate = today.getDate();
        const currentMonth = today.getMonth() + 1;
        const currentYear = today.getFullYear();

        document.querySelectorAll('.calendar-day').forEach(dayEl => {
            const day = parseInt(dayEl.dataset.day, 10);
            const dateKey = `${currentYear}-${currentMonth}-${day}`;
            const dayData = sessionData[dateKey] || {};
            const sessionsForDay = dayData.sessions || 0;
            const noteForDay = dayData.note || '';
            
            dayEl.className = 'calendar-day'; // Reset classes completely

            if (day < todayDate) {
                // Logic for PAST days
                dayEl.classList.add(getSessionClass(sessionsForDay));
                if (sessionsForDay === 0) {
                    dayEl.classList.add('inactive-day'); // Mark missed past days
                }
            } else if (day === todayDate) {
                // Logic for CURRENT day
                dayEl.classList.add('current-day');
                dayEl.classList.add(getSessionClass(sessionsForDay));
            } else {
                // Logic for FUTURE days - no special classes needed, remains neutral
            }
            
            // Update Roman numerals for all days
            let sessionCountEl = dayEl.querySelector('.session-count');
            if (!sessionCountEl) {
                sessionCountEl = document.createElement('div');
                sessionCountEl.classList.add('session-count');
                dayEl.appendChild(sessionCountEl);
            }
            const romanNumerals = ['I', 'II', 'III', 'IV'];
            sessionCountEl.textContent = sessionsForDay > 0 ? romanNumerals[sessionsForDay - 1] : '';

            // Update note indicator for all days
            let noteIndicatorEl = dayEl.querySelector('.note-indicator');
            if (noteForDay && !noteIndicatorEl) {
                noteIndicatorEl = document.createElement('div');
                noteIndicatorEl.className = 'note-indicator';
                dayEl.appendChild(noteIndicatorEl);
            } else if (!noteForDay && noteIndicatorEl) {
                noteIndicatorEl.remove();
            }
        });
    }
    
    // --- New Feature Functions ---

    function updateStreaks() {
        let currentStreak = 0;
        const today = new Date();
        for (let i = 0; i < 365; i++) {
            const dateToCheck = new Date(today);
            dateToCheck.setDate(today.getDate() - i);
            const dateKey = getFormattedDate(dateToCheck);
            if (sessionData[dateKey] && sessionData[dateKey].sessions > 0) {
                currentStreak++;
            } else {
                break;
            }
        }
        if (currentStreak > trackerState.longestStreak) trackerState.longestStreak = currentStreak;
        trackerState.currentStreak = currentStreak;
        saveData('trackerState');
        updateStreakDisplay();
    }

    function updateStreakDisplay() {
        currentStreakEl.textContent = trackerState.currentStreak || 0;
        longestStreakEl.textContent = trackerState.longestStreak || 0;
    }

    function checkAchievements() {
        const todayData = sessionData[getFormattedDate(new Date())] || {};
        if (todayData.sessions === 4) unlockAchievement('PERFECT_DAY');
        if (trackerState.currentStreak >= 7) unlockAchievement('STREAK_7');
        if (trackerState.currentStreak >= 30) unlockAchievement('STREAK_30');
        if (totalAmount >= 10) unlockAchievement('FIRST_10');
        if (isPerfectWeek()) unlockAchievement('PERFECT_WEEK');
    }
    
    function isPerfectWeek() {
        const today = new Date();
        for (let i = 0; i < 7; i++) {
            const dateToCheck = new Date(today);
            dateToCheck.setDate(today.getDate() - i);
            const dateKey = getFormattedDate(dateToCheck);
            if (!sessionData[dateKey] || sessionData[dateKey].sessions !== 4) return false;
        }
        return true;
    }

    function unlockAchievement(id) {
        if (!trackerState.unlockedAchievements.includes(id)) {
            trackerState.unlockedAchievements.push(id);
            saveData('trackerState');
            showAchievementNotification(ACHIEVEMENTS[id].name);
        }
    }
    
    function showAchievementNotification(name) {
        achievementNameEl.textContent = name;
        achievementNotificationEl.classList.add('show');
        setTimeout(() => { achievementNotificationEl.classList.remove('show'); }, 4000);
    }

    function openNoteModal(dateKey) {
        currentlyEditingDateKey = dateKey;
        const dateParts = dateKey.split('-');
        noteModalTitle.textContent = `Note for ${MONTH_NAMES[parseInt(dateParts[1], 10) - 1]} ${dateParts[2]}`;
        noteTextarea.value = (sessionData[dateKey] && sessionData[dateKey].note) || '';
        noteModal.classList.add('show');
        noteTextarea.focus();
    }

    function closeNoteModal() {
        noteModal.classList.remove('show');
        currentlyEditingDateKey = null;
    }

    function saveNote() {
        if (!currentlyEditingDateKey) return;
        if (!sessionData[currentlyEditingDateKey]) sessionData[currentlyEditingDateKey] = { sessions: 0 };
        sessionData[currentlyEditingDateKey].note = noteTextarea.value.trim();
        saveData('sessionData');
        closeNoteModal();
        updateCalendarDays();
    }

    // --- Helper Functions ---

    function calculateTotalAmount() {
        let amount = 0;
        for (const dateKey in sessionData) {
            if (dateKey !== "currentMonth" && sessionData[dateKey].sessions) {
                const dailySessions = sessionData[dateKey].sessions;
                for (let i = 1; i <= dailySessions; i++) {
                    amount += sessionValues[i];
                }
            }
        }
        return parseFloat(amount.toFixed(2));
    }
    
    function setupEventListeners() {
        for (let i = 1; i <= 4; i++) sessionButtons[i].addEventListener('click', () => toggleSession(i));
        habitTitleElement.addEventListener('blur', () => saveData('habitTitle'));
        habitTitleElement.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); habitTitleElement.blur(); } });
        saveNoteButton.addEventListener('click', saveNote);
        closeNoteButton.addEventListener('click', closeNoteModal);
        noteModal.addEventListener('click', (e) => { if (e.target === noteModal) closeNoteModal(); });
    }

    function initializeCalendar(currentDate) {
        const calendarEl = document.getElementById('calendar');
        const month = currentDate.getMonth();
        const year = currentDate.getFullYear();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        calendarEl.innerHTML = '';
        for (let day = 1; day <= daysInMonth; day++) {
            const dayContainerEl = document.createElement('div');
            dayContainerEl.classList.add('calendar-day-container');
            const dayEl = document.createElement('div');
            dayEl.classList.add('calendar-day');
            dayEl.dataset.day = day;
            dayEl.addEventListener('click', () => { openNoteModal(`${year}-${month + 1}-${day}`); });
            const dayNumberEl = document.createElement('div');
            dayNumberEl.classList.add('day-number');
            dayNumberEl.textContent = day;
            dayContainerEl.appendChild(dayEl);
            dayContainerEl.appendChild(dayNumberEl);
            calendarEl.appendChild(dayContainerEl);
        }
    }

    function updateCurrentMonthDisplay(currentDate) {
        document.getElementById('currentMonth').textContent = MONTH_NAMES[currentDate.getMonth()];
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
        const classMap = { 1: 'one-session', 2: 'two-sessions', 3: 'three-sessions', 4: 'four-sessions' };
        return classMap[sessionCount] || 'no-sessions';
    }

    document.addEventListener('DOMContentLoaded', initialize);
})();
