document.addEventListener('DOMContentLoaded', () => {
    // Load configuration
    fetch('config.json')
        .then(response => response.json())
        .then(config => {
            const timerElement = document.getElementById('pomodoro-timer');
            const sessionTypeElement = document.getElementById('session-type');
            const timezonesContainer = document.getElementById('timezones-container');
            let isRunning = false;
            let duration = config.pomodoroDuration * 60;
            let currentType = 'Pomodoro';
            let sessionCount = 0; // To track completed Pomodoro sessions
            let interval;

            // Function to format time based on template
            function formatTime(date, template) {
                const hours = String(date.getHours()).padStart(2, '0');
                const minutes = String(date.getMinutes()).padStart(2, '0');
                const seconds = String(date.getSeconds()).padStart(2, '0');

                return template
                    .replace('HH', hours)
                    .replace('MM', minutes)
                    .replace('SS', seconds);
            }

            // Display current time for each time zone
            function updateTimezones() {
                timezonesContainer.innerHTML = ''; // Clear existing content
                config.timezones.forEach(timezone => {
                    const currentTime = new Date().toLocaleString('en-US', { timeZone: timezone });
                    const date = new Date(currentTime);
                    const formattedTime = formatTime(date, config.timeTemplate || 'HH:MM:SS');
                    const timezoneElement = document.createElement('div');
                    timezoneElement.className = 'timezone';
                    timezoneElement.textContent = `${timezone}: ${formattedTime}`;
                    timezonesContainer.appendChild(timezoneElement);
                });
            }

            // Update the time every second
            setInterval(updateTimezones, 1000);

            // Set the initial duration based on configuration
            function updateTimerDisplay(timeInSeconds) {
                const minutes = String(Math.floor(timeInSeconds / 60)).padStart(2, '0');
                const seconds = String(Math.floor(timeInSeconds % 60)).padStart(2, '0');
                timerElement.textContent = `${minutes}:${seconds}`;
            }

            updateTimerDisplay(duration);

            function startTimer() {
                const endTime = Date.now() + duration * 1000;
                updateSessionTypeDisplay();
                interval = setInterval(() => {
                    const remaining = Math.max((endTime - Date.now()) / 1000, 0);
                    updateTimerDisplay(remaining);

                    if (remaining <= 0) {
                        clearInterval(interval);
                        isRunning = false;
                        sendWebhook(currentType === 'Pomodoro' ? 'Pomodoro finished' : 'Break finished');
                        if (currentType === 'Pomodoro') {
                            sessionCount++;
                        }
                        switchSession();
                        if (!isRunning) {
                            startTimer();
                        }
                    }
                }, 1000);
            }

            function toggleTimer() {
                if (isRunning) {
                    clearInterval(interval);
                    isRunning = false;
                } else {
                    isRunning = true;
                    sendWebhook(`${currentType} started`);
                    startTimer();
                }
            }

            function switchSession() {
                if (currentType === 'Pomodoro') {
                    if (sessionCount % config.breakInterval === 0 && sessionCount !== 0) {
                        currentType = 'Long Break';
                        duration = config.longBreakDuration * 60;
                    } else {
                        currentType = 'Short Break';
                        duration = config.shortBreakDuration * 60;
                    }
                } else {
                    currentType = 'Pomodoro';
                    duration = config.pomodoroDuration * 60;
                }
                updateTimerDisplay(duration);
                updateSessionTypeDisplay();
            }

            function updateSessionTypeDisplay() {
                if (currentType === 'Pomodoro') {
                    sessionTypeElement.textContent = `Pomodoro (Session ${sessionCount + 1})`;
                } else {
                    sessionTypeElement.textContent = currentType;
                }
            }

            function sendWebhook(message) {
                const webhookKey = currentType === 'Pomodoro' ? 'startPomodoro' : 'startBreak';
                const urls = config.webhooks[webhookKey] || config.webhooks.endSession;

                if (urls) {
                    urls.forEach(url => {
                        fetch(url, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                message: message,
                                timestamp: new Date().toISOString()
                            })
                        });
                    });
                }
            }

            timerElement.addEventListener('click', toggleTimer);
        })
        .catch(err => console.error('Error loading config:', err));
});
