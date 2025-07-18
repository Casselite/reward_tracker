(function() {
    'use strict';

    // --- DOM Elements ---
    const habitTitleElement = document.getElementById('habitTitle');
    const sessionButtonsContainer = document.getElementById('sessionButtonsContainer');
    // (Existing DOM elements)
    const settingsButton = document.getElementById('settingsButton');
    const achievementsButton = document.getElementById('achievementsButton');
    const settingsModal = document.getElementById('settingsModal');
    const achievementsModal = document.getElementById('achievementsModal');
    const dailyGoalInput = document.getElementById('dailyGoalInput');
    const saveSettingsButton = document.getElementById('saveSettingsButton');
    const closeSettingsButton = document.getElementById('closeSettingsButton');
    const achievementsList = document.getElementById('achievementsList');
    const closeAchievementsButton = document.getElementById('closeAchievementsButton');
    // (The rest of the DOM elements)
    let sessionButtons = {}; // Populated dynamically

    // --- State & Constants ---
    let trackerState = {}; // Now holds dailyGoal, streaks, etc.
    // (The rest of the state variables)
    let lastKnownDate = getFormattedDate(new Date());

    const ACHIEVEMENTS = {
        PERFECT_DAY: { name: "Perfect Day!", description: "Complete all sessions for your daily goal.", icon: "🎯" },
        STREAK_7: { name: "7-Day Streak!", description: "Maintain a streak for 7 days.", icon: "🔥" },
        STREAK_30: { name: "30-Day Streak!", description: "Maintain a streak for a whole month.", icon: "🚀" },
        FIRST_10: { name: "First €10 Earned!", description: "Earn your first €10.", icon: "💰" },
        PERFECT_WEEK: { name: "Perfect Week!", description: "Complete your daily goal every day for 7 days.", icon: "🌟" }
    };
    
    // --- Core Functions ---

    function initialize() {
        const now = new Date();
        loadData();
        buildSessionButtons(); // Build buttons based on settings
        initializeDayState(now);
        initializeCalendar(now);
        setupEventListeners();
        updateCurrentMonthDisplay(now);
        updateAllUI();
        setInterval(checkForDateChange, 300000); 
    }

    function loadData() {
        const savedTitle = localStorage.getItem('habitTitle');
        if (savedTitle) habitTitleElement.textContent = savedTitle;
        try { sessionData = JSON.parse(localStorage.getItem('sessionData')) || {}; } catch (e) { sessionData = {}; }
        
        // Load tracker state with defaults
        const defaultTrackerState = { dailyGoal: 4, longestStreak: 0, unlockedAchievements: [] };
        try { trackerState = { ...defaultTrackerState, ...JSON.parse(localStorage.getItem('trackerState')) }; } catch (e) { trackerState = defaultTrackerState; }
    }
    
    // (The rest of the core functions like saveData, handleUpdate, etc. are largely the same but now use trackerState.dailyGoal)
    function handleUpdate() {
        const dateKey = getFormattedDate(new Date());
        if (!sessionData[dateKey]) sessionData[dateKey] = {};
        sessionData[dateKey].sessions = sessionsFinished;

        totalAmount = calculateTotalAmount();
        updateStreaks();
        checkAchievements();

        saveData('sessionData');
        saveData('trackerState');
        updateAllUI();
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
            const button = sessionButtons[i];
            if (button) {
                // Show/hide button based on goal
                button.style.display = i <= trackerState.dailyGoal ? 'flex' : 'none';
                
                // Update active/disabled state
                button.classList.toggle('active', i <= sessionsFinished);
                button.disabled = i > (sessionsFinished + 1);
            }
        }
        if (sessionButtons[1]) sessionButtons[1].disabled = false;
    }

    function updateTotalAmountDisplay() {
        const maxAmount = calculateMaxAmount(new Date());
        totalAmountElement.textContent = formatCurrency(totalAmount);
        maxAmountElement.textContent = formatCurrency(maxAmount);
    }
    
    // --- New Feature Functions ---

    function openSettingsModal() {
        dailyGoalInput.value = trackerState.dailyGoal;
        settingsModal.classList.add('show');
    }
    function closeSettingsModal() { settingsModal.classList.remove('show'); }
    function saveSettings() {
        const newGoal = parseInt(dailyGoalInput.value, 10);
        if (newGoal >= 1 && newGoal <= 4) {
            trackerState.dailyGoal = newGoal;
            // If user lowers the goal, cap their current sessions
            if (sessionsFinished > newGoal) {
                sessionsFinished = newGoal;
            }
            handleUpdate();
        }
        closeSettingsModal();
    }

    function openAchievementsModal() {
        populateAchievementsModal();
        achievementsModal.classList.add('show');
    }
    function closeAchievementsModal() { achievementsModal.classList.remove('show'); }
    
    function populateAchievementsModal() {
        achievementsList.innerHTML = '';
        for (const id in ACHIEVEMENTS) {
            const achievement = ACHIEVEMENTS[id];
            const isUnlocked = trackerState.unlockedAchievements.includes(id);

            const item = document.createElement('div');
            item.className = `achievement-item ${isUnlocked ? 'unlocked' : 'locked'}`;
            
            item.innerHTML = `
                <div class="achievement-icon">${achievement.icon}</div>
                <div class="achievement-details">
                    <h4>${achievement.name}</h4>
                    <p>${achievement.description}</p>
                </div>
            `;
            achievementsList.appendChild(item);
        }
    }

    // --- Helper Functions ---

    function buildSessionButtons() {
        sessionButtonsContainer.innerHTML = '';
        sessionButtons = {}; // Clear old references
        for (let i = 1; i <= 4; i++) {
            const button = document.createElement('button');
            button.id = `session${i}`;
            button.className = 'session-button inconsolata-button';
            button.textContent = i;
            button.addEventListener('click', () => toggleSession(i));
            sessionButtonsContainer.appendChild(button);
            sessionButtons[i] = button;
        }
    }

    function calculateAmountForSessions(numSessions) {
        let amount = 0;
        for (let i = 1; i <= numSessions; i++) {
            amount += sessionValues[i];
        }
        return amount;
    }

    function calculateMaxAmount(currentDate) {
        const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
        return daysInMonth * calculateAmountForSessions(trackerState.dailyGoal);
    }
    
    function checkAchievements() {
        const todayData = sessionData[getFormattedDate(new Date())] || {};
        // Check for Perfect Day based on custom goal
        if (todayData.sessions === trackerState.dailyGoal && trackerState.dailyGoal > 0) {
            unlockAchievement('PERFECT_DAY');
        }
        if (isPerfectWeek()) unlockAchievement('PERFECT_WEEK');
        // (Other achievement checks are the same)
        if (trackerState.currentStreak >= 7) unlockAchievement('STREAK_7');
        if (trackerState.currentStreak >= 30) unlockAchievement('STREAK_30');
        if (totalAmount >= 10) unlockAchievement('FIRST_10');
    }

    function isPerfectWeek() {
        if (trackerState.dailyGoal === 0) return false;
        const today = new Date();
        for (let i = 0; i < 7; i++) {
            const dateToCheck = new Date(today);
            dateToCheck.setDate(today.getDate() - i);
            const dateKey = getFormattedDate(dateToCheck);
            if (!sessionData[dateKey] || sessionData[dateKey].sessions !== trackerState.dailyGoal) {
                return false;
            }
        }
        return true;
    }

    function setupEventListeners() {
        // (All existing event listeners for title, notes, etc. remain the same)
        settingsButton.addEventListener('click', openSettingsModal);
        closeSettingsButton.addEventListener('click', closeSettingsModal);
        saveSettingsButton.addEventListener('click', saveSettings);

        achievementsButton.addEventListener('click', openAchievementsModal);
        closeAchievementsButton.addEventListener('click', closeAchievementsModal);
    }
    
    // --- (All other functions from the last robust version are here and largely unchanged) ---
    // Make sure to include the full, working versions of:
    // initializeDayState, checkForDateChange, toggleSession, all update... functions,
    // all modal functions, and all helper functions from the previous final script.
    
    // For completeness, here is the full script again.
    // Replace EVERYTHING in your script.js with this:
    (function() {
    'use strict';

    // --- DOM Elements ---
    const habitTitleElement = document.getElementById('habitTitle');
    const sessionButtonsContainer = document.getElementById('sessionButtonsContainer');
    const totalAmountElement = document.getElementById('totalAmount');
    const maxAmountElement = document.getElementById('maxAmount');
    const progressBar = document.getElementById('progressBar');
    const progressContainer = document.querySelector('.progress-container');
    const currentStreakEl = document.getElementById('currentStreak');
    const longestStreakEl = document.getElementById('longestStreak');
    const achievementNotificationEl = document.getElementById('achievementNotification');
    const achievementNameEl = document.getElementById('achievementName');
    const noteModal = document.getElementById('noteModal');
    const noteModalTitle = document.getElementById('noteModalTitle');
    const noteTextarea = document.getElementById('noteTextarea');
    const saveNoteButton = document.getElementById('saveNoteButton');
    const closeNoteButton = document.getElementById('closeNoteButton');
    const settingsButton = document.getElementById('settingsButton');
    const achievementsButton = document.getElementById('achievementsButton');
    const settingsModal = document.getElementById('settingsModal');
    const achievementsModal = document.getElementById('achievementsModal');
    const dailyGoalInput = document.getElementById('dailyGoalInput');
    const saveSettingsButton = document.getElementById('saveSettingsButton');
    const closeSettingsButton = document.getElementById('closeSettingsButton');
    const achievementsList = document.getElementById('achievementsList');
    const closeAchievementsButton = document.getElementById('closeAchievementsButton');
    const clickSound = document.getElementById('clickSound');
    const specialClickSound = document.getElementById('specialClickSound');
    const currentMonthEl = document.getElementById('currentMonth');
    const calendarEl = document.getElementById('calendar');

    // --- State & Constants ---
    let totalAmount = 0.00, sessionsFinished = 0, sessionData = {}, trackerState = {}, currentlyEditingDateKey = null;
    let lastKnownDate = getFormattedDate(new Date());
    let sessionButtons = {};

    const sessionValues = { 1: 0.10, 2: 0.42, 3: 1.12, 4: 1.68 };
    const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    
    const ACHIEVEMENTS = {
        PERFECT_DAY: { name: "Perfect Day!", description: "Complete all sessions for your daily goal.", icon: "🎯" },
        PERFECT_WEEK: { name: "Perfect Week!", description: "Complete your daily goal every day for 7 days.", icon: "🌟" },
        STREAK_7: { name: "7-Day Streak!", description: "Maintain a streak for 7 days.", icon: "🔥" },
        STREAK_30: { name: "30-Day Streak!", description: "Maintain a streak for a whole month.", icon: "🚀" },
        FIRST_10: { name: "First €10 Earned!", description: "Earn your first €10.", icon: "💰" },
    };

    // --- Core Functions ---
    function initialize() {
        const now = new Date();
        loadData();
        buildSessionButtons();
        initializeDayState(now);
        initializeCalendar(now);
        setupEventListeners();
        updateCurrentMonthDisplay(now);
        updateAllUI();
        setInterval(checkForDateChange, 300000);
    }
    
    function checkForDateChange() {
        const currentDate = getFormattedDate(new Date());
        if (currentDate !== lastKnownDate) {
            lastKnownDate = currentDate;
            initializeDayState(new Date());
            updateAllUI();
        }
    }

    function loadData() {
        const savedTitle = localStorage.getItem('habitTitle');
        if (savedTitle) habitTitleElement.textContent = savedTitle;
        try { sessionData = JSON.parse(localStorage.getItem('sessionData')) || {}; } catch (e) { sessionData = {}; }
        const defaultTrackerState = { dailyGoal: 4, longestStreak: 0, unlockedAchievements: [] };
        try { trackerState = { ...defaultTrackerState, ...JSON.parse(localStorage.getItem('trackerState')) }; } catch (e) { trackerState = defaultTrackerState; }
    }

    function initializeDayState(currentDate) {
        const currentYearMonth = `${currentDate.getFullYear()}-${currentDate.getMonth() + 1}`;
        const storedYearMonth = sessionData.currentYearMonth || currentYearMonth;
        if (storedYearMonth !== currentYearMonth) {
            sessionData = { currentYearMonth: currentYearMonth };
        }
        sessionData.currentYearMonth = currentYearMonth;
        const dateKey = getFormattedDate(currentDate);
        sessionsFinished = (sessionData[dateKey] && sessionData[dateKey].sessions) ? sessionData[dateKey].sessions : 0;
        totalAmount = calculateTotalAmount();
    }
    
    function saveData(key) {
        try {
            if (key === 'sessionData') localStorage.setItem('sessionData', JSON.stringify(sessionData));
            else if (key === 'trackerState') localStorage.setItem('trackerState', JSON.stringify(trackerState));
            else if (key === 'habitTitle') localStorage.setItem('habitTitle', habitTitleElement.textContent);
        } catch (e) { console.error(`Failed to save ${key} to localStorage.`, e); }
    }
    
    function handleUpdate() {
        const dateKey = getFormattedDate(new Date());
        if (!sessionData[dateKey]) sessionData[dateKey] = {};
        sessionData[dateKey].sessions = sessionsFinished;
        totalAmount = calculateTotalAmount();
        updateStreaks();
        checkAchievements();
        saveData('sessionData');
        saveData('trackerState');
        updateAllUI();
    }

    function toggleSession(sessionNumber) {
        const wasActive = sessionNumber <= sessionsFinished;
        sessionsFinished = wasActive ? sessionNumber - 1 : sessionNumber;
        handleUpdate();
        if (!wasActive) {
            const soundToPlay = sessionNumber === trackerState.dailyGoal ? specialClickSound : clickSound;
            soundToPlay.currentTime = 0;
            soundToPlay.play().catch(e => console.error("Error playing sound:", e));
        }
    }

    function updateAllUI() {
        updateSessionButtons();
        updateTotalAmountDisplay();
        updateProgressBar();
        updateCalendarDays();
        updateStreakDisplay();
    }

    function updateSessionButtons() {
        for (let i = 1; i <= 4; i++) {
            const button = sessionButtons[i];
            if (button) {
                button.style.display = i <= trackerState.dailyGoal ? 'flex' : 'none';
                button.classList.toggle('active', i <= sessionsFinished);
                button.disabled = i > (sessionsFinished + 1);
            }
        }
        if (sessionButtons[1]) sessionButtons[1].disabled = false;
    }

    function updateTotalAmountDisplay() {
        const maxAmount = calculateMaxAmount(new Date());
        totalAmountElement.textContent = formatCurrency(totalAmount);
        maxAmountElement.textContent = formatCurrency(maxAmount);
    }
    
    function updateProgressBar() {
        const maxAmount = calculateMaxAmount(new Date());
        const progressPercentage = maxAmount > 0 ? (totalAmount / maxAmount) * 100 : 0;
        progressBar.style.width = `${progressPercentage}%`;
        progressBar.setAttribute('aria-valuenow', progressPercentage.toFixed(0));
        let totalSessionsDone = 0;
        for (const key in sessionData) {
            if (key !== 'currentYearMonth' && sessionData[key].sessions) {
                totalSessionsDone += sessionData[key].sessions;
            }
        }
        const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
        const maxPossibleSessions = daysInMonth * trackerState.dailyGoal;
        progressContainer.title = `${totalSessionsDone} of ${maxPossibleSessions} possible sessions done`;
    }

    function updateCalendarDays() {
        const today = new Date(); today.setHours(0,0,0,0);
        const currentMonth = today.getMonth() + 1;
        const currentYear = today.getFullYear();
        document.querySelectorAll('.calendar-day').forEach(dayEl => {
            const day = parseInt(dayEl.dataset.day, 10);
            const dateKey = `${currentYear}-${currentMonth}-${day}`;
            const dayData = sessionData[dateKey] || {};
            const sessionsForDay = dayData.sessions || 0;
            const noteForDay = dayData.note || '';
            dayEl.className = 'calendar-day';
            const dayDate = new Date(currentYear, currentMonth - 1, day);
            if (dayDate < today) {
                dayEl.classList.add(getSessionClass(sessionsForDay));
                if (sessionsForDay === 0) dayEl.classList.add('inactive-day');
            } else if (dayDate.getTime() === today.getTime()) {
                dayEl.classList.add('current-day');
                dayEl.classList.add(getSessionClass(sessionsForDay));
            }
            let sessionCountEl = dayEl.querySelector('.session-count');
            if (!sessionCountEl) { sessionCountEl = document.createElement('div'); sessionCountEl.classList.add('session-count'); dayEl.appendChild(sessionCountEl); }
            const romanNumerals = ['I', 'II', 'III', 'IV'];
            sessionCountEl.textContent = sessionsForDay > 0 ? romanNumerals[sessionsForDay - 1] : '';
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

    function updateStreaks() {
        let currentStreak = 0; const today = new Date();
        for (let i = 0; i < 365; i++) {
            const dateToCheck = new Date(today); dateToCheck.setDate(today.getDate() - i);
            const dateKey = getFormattedDate(dateToCheck);
            if (sessionData[dateKey] && sessionData[dateKey].sessions > 0) currentStreak++;
            else break;
        }
        if (currentStreak > trackerState.longestStreak) trackerState.longestStreak = currentStreak;
        trackerState.currentStreak = currentStreak;
    }

    function updateStreakDisplay() {
        currentStreakEl.textContent = trackerState.currentStreak || 0;
        longestStreakEl.textContent = trackerState.longestStreak || 0;
    }

    function checkAchievements() {
        const todayData = sessionData[getFormattedDate(new Date())] || {};
        if (trackerState.dailyGoal > 0 && todayData.sessions === trackerState.dailyGoal) unlockAchievement('PERFECT_DAY');
        if (isPerfectWeek()) unlockAchievement('PERFECT_WEEK');
        if (trackerState.currentStreak >= 7) unlockAchievement('STREAK_7');
        if (trackerState.currentStreak >= 30) unlockAchievement('STREAK_30');
        if (totalAmount >= 10) unlockAchievement('FIRST_10');
    }

    function isPerfectWeek() {
        if (trackerState.dailyGoal === 0) return false;
        const today = new Date();
        for (let i = 0; i < 7; i++) {
            const dateToCheck = new Date(today); dateToCheck.setDate(today.getDate() - i);
            const dateKey = getFormattedDate(dateToCheck);
            if (!sessionData[dateKey] || sessionData[dateKey].sessions !== trackerState.dailyGoal) return false;
        }
        return true;
    }

    function unlockAchievement(id) {
        if (!trackerState.unlockedAchievements.includes(id)) {
            trackerState.unlockedAchievements.push(id);
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
        noteModal.classList.add('show'); noteTextarea.focus();
    }
    function closeNoteModal() { noteModal.classList.remove('show'); currentlyEditingDateKey = null; }
    function saveNote() {
        if (!currentlyEditingDateKey) return;
        if (!sessionData[currentlyEditingDateKey]) sessionData[currentlyEditingDateKey] = { sessions: 0 };
        sessionData[currentlyEditingDateKey].note = noteTextarea.value.trim();
        saveData('sessionData');
        closeNoteModal();
        updateCalendarDays();
    }

    function openSettingsModal() { dailyGoalInput.value = trackerState.dailyGoal; settingsModal.classList.add('show'); }
    function closeSettingsModal() { settingsModal.classList.remove('show'); }
    function saveSettings() {
        const newGoal = parseInt(dailyGoalInput.value, 10);
        if (newGoal >= 1 && newGoal <= 4) {
            trackerState.dailyGoal = newGoal;
            if (sessionsFinished > newGoal) sessionsFinished = newGoal;
            handleUpdate();
        }
        closeSettingsModal();
    }
    function openAchievementsModal() { populateAchievementsModal(); achievementsModal.classList.add('show'); }
    function closeAchievementsModal() { achievementsModal.classList.remove('show'); }
    
    function populateAchievementsModal() {
        achievementsList.innerHTML = '';
        for (const id in ACHIEVEMENTS) {
            const achievement = ACHIEVEMENTS[id];
            const isUnlocked = trackerState.unlockedAchievements.includes(id);
            const item = document.createElement('div');
            item.className = `achievement-item ${isUnlocked ? 'unlocked' : 'locked'}`;
            item.innerHTML = `<div class="achievement-icon">${achievement.icon}</div><div class="achievement-details"><h4>${achievement.name}</h4><p>${achievement.description}</p></div>`;
            achievementsList.appendChild(item);
        }
    }

    function buildSessionButtons() {
        sessionButtonsContainer.innerHTML = ''; sessionButtons = {};
        for (let i = 1; i <= 4; i++) {
            const button = document.createElement('button');
            button.id = `session${i}`; button.className = 'session-button inconsolata-button'; button.textContent = i;
            button.addEventListener('click', () => toggleSession(i));
            sessionButtonsContainer.appendChild(button);
            sessionButtons[i] = button;
        }
    }

    function calculateAmountForSessions(numSessions) {
        let amount = 0;
        for (let i = 1; i <= numSessions; i++) amount += sessionValues[i];
        return amount;
    }

    function calculateTotalAmount() {
        let amount = 0;
        for (const dateKey in sessionData) {
            if (dateKey !== "currentYearMonth" && sessionData[dateKey].sessions) {
                amount += calculateAmountForSessions(sessionData[dateKey].sessions);
            }
        }
        return parseFloat(amount.toFixed(2));
    }
    
    function setupEventListeners() {
        habitTitleElement.addEventListener('blur', () => { let cleanText = habitTitleElement.innerText.trim(); if (!cleanText) cleanText = 'Reward Tracker'; habitTitleElement.textContent = cleanText; saveData('habitTitle'); });
        habitTitleElement.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); habitTitleElement.blur(); } });
        saveNoteButton.addEventListener('click', saveNote);
        closeNoteButton.addEventListener('click', closeNoteModal);
        noteModal.addEventListener('click', (e) => { if (e.target === noteModal) closeNoteModal(); });
        settingsButton.addEventListener('click', openSettingsModal);
        closeSettingsButton.addEventListener('click', closeSettingsModal);
        saveSettingsButton.addEventListener('click', saveSettings);
        achievementsButton.addEventListener('click', openAchievementsModal);
        closeAchievementsButton.addEventListener('click', closeAchievementsModal);
    }

    function initializeCalendar(currentDate) {
        const month = currentDate.getMonth(), year = currentDate.getFullYear();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        calendarEl.innerHTML = '';
        for (let day = 1; day <= daysInMonth; day++) {
            const dayContainerEl = document.createElement('div'); dayContainerEl.classList.add('calendar-day-container');
            const dayEl = document.createElement('div'); dayEl.classList.add('calendar-day'); dayEl.dataset.day = day;
            dayEl.addEventListener('click', () => {
                const today = new Date(); today.setHours(0,0,0,0);
                const dayDate = new Date(year, month, day);
                if (dayDate <= today) openNoteModal(`${year}-${month + 1}-${day}`);
            });
            const dayNumberEl = document.createElement('div'); dayNumberEl.classList.add('day-number'); dayNumberEl.textContent = day;
            dayContainerEl.appendChild(dayEl); dayContainerEl.appendChild(dayNumberEl);
            calendarEl.appendChild(dayContainerEl);
        }
    }

    function updateCurrentMonthDisplay(currentDate) { currentMonthEl.textContent = MONTH_NAMES[currentDate.getMonth()]; }
    function calculateMaxAmount(currentDate) { const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate(); return daysInMonth * calculateAmountForSessions(trackerState.dailyGoal); }
    function getFormattedDate(date) { return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`; }
    function formatCurrency(value) { return `€${value.toFixed(2).replace('.', ',')}`; }
    function getSessionClass(sessionCount) { const classMap = { 1: 'one-session', 2: 'two-sessions', 3: 'three-sessions', 4: 'four-sessions' }; return classMap[sessionCount] || 'no-sessions'; }

    document.addEventListener('DOMContentLoaded', initialize);
})();
