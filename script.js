document.addEventListener('DOMContentLoaded', () => {
    fetch('config.json')
        .then(response => response.json())
        .then(config => {
            const timerElement = document.getElementById('pomodoro-timer');
            const sessionTypeElement = document.getElementById('session-type');
            const timezonesContainer = document.getElementById('timezones-container');
            const circle = document.querySelector('.progress-ring__circle');
            const radius = circle.r.baseVal.value;
            const circumference = 2 * Math.PI * radius;

            circle.style.strokeDasharray = `${circumference} ${circumference}`;
            circle.style.strokeDashoffset = circumference;

            let isRunning = false;
            let duration = config.pomodoroDuration * 60; // Duration in seconds
            let currentType = 'Pomodoro';
            let sessionCount = 0;
            let interval;
            let totalDuration = duration;

            // Set the initial display based on config
            function updateInitialTimerDisplay() {
                const minutes = String(Math.floor(config.pomodoroDuration)).padStart(2, '0');
                const seconds = '00';
                timerElement.textContent = `${minutes}:${seconds}`;
            }

            // Set CSS variables for colors
            function setCssVariables(config) {
                const root = document.documentElement;
                for (const [key, value] of Object.entries(config.colors)) {
                    root.style.setProperty(`--${key}`, value);
                }
                root.style.setProperty(`--backgroundImage`, config.backgroundImage);
            }

            function updateTimerDisplay(timeInSeconds) {
                const minutes = String(Math.floor(timeInSeconds / 60)).padStart(2, '0');
                const seconds = String(Math.floor(timeInSeconds % 60)).padStart(2, '0');
                timerElement.textContent = `${minutes}:${seconds}`;

                // Update the progress circle
                const progress = timeInSeconds / totalDuration;
                setCircleProgress(progress);
            }

            function setCircleProgress(progress) {
                const offset = circumference * (1 - progress);
                circle.style.strokeDashoffset = offset;
            }

            function startTimer() {
                const endTime = Date.now() + duration * 1000;
                updateSessionTypeDisplay();
                totalDuration = duration; // Set the duration for progress calculation

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
                    sessionTypeElement.textContent = `Pomodoro #${sessionCount + 1}`;
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
                            headers: {'Content-Type': 'application/json'},
                            body: JSON.stringify({
                                message: message,
                                timestamp: new Date().toISOString()
                            })
                        });
                    });
                }
            }

            // Function to display current time for each time zone
            function updateTimezones() {
                timezonesContainer.innerHTML = ''; // Clear existing content
                config.timezones.forEach(timezone => {
                    const currentTime = new Date().toLocaleTimeString('en-US', {timeZone: timezone});
                    const timezoneElement = document.createElement('div');
                    timezoneElement.className = 'timezone';
                    timezoneElement.innerHTML = `<div class="timezone-heading">${timezone}</div>${currentTime}`;
                    timezonesContainer.appendChild(timezoneElement);
                });
            }

            // Update the time zones every second
            setInterval(updateTimezones, 1000);

            // Set initial display of timer on page load
            updateInitialTimerDisplay();
            setCssVariables(config);

            timerElement.addEventListener('click', toggleTimer);
        })
        .catch(err => console.error('Error loading config:', err));
});
