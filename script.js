document.addEventListener('DOMContentLoaded', () => {
    // Retrieve the API key from the URL
    function getApiKeyFromUrl() {
        const params = new URLSearchParams(window.location.search);
        return params.get('weatherApiKey');
    }

    fetch('config.json')
        .then(response => response.json())
        .then(async config => {
            const timerElement = document.getElementById('pomodoro-timer');
            const sessionTypeElement = document.getElementById('session-type');
            const timezonesContainer = document.getElementById('timezones-container');
            const circle = document.querySelector('.progress-ring__circle');
            const radius = circle.r.baseVal.value;
            const circumference = 2 * Math.PI * radius;

            const API_KEY = getApiKeyFromUrl(); // Get API key from URL

            if (!API_KEY) {
                console.error('Weather API key is missing in the URL. Add ?weatherApiKey=YOUR_KEY to the URL.');
                return;
            }

            circle.style.strokeDasharray = `${circumference} ${circumference}`;
            circle.style.strokeDashoffset = circumference;

            let isRunning = false;
            let duration = config.pomodoroDuration * 60; // Duration in seconds
            let currentType = 'Pomodoro';
            let sessionCount = 0;
            let interval;
            let totalDuration = duration;

            // To store the latest weather data
            const weatherData = {};

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
                totalDuration = duration;

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
                            headers: { 'Content-Type': 'application/json' },
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
                    const cityName = timezone.name.split('/').pop().replace('_', ' ');

                    const currentTime = new Date().toLocaleTimeString('en-US', {
                        timeZone: timezone.name,
                        hour: '2-digit',
                        minute: '2-digit'
                    });

                    const weather = weatherData[cityName] || 'Fetching...';

                    const timezoneElement = document.createElement('div');
                    timezoneElement.className = 'timezone';
                    timezoneElement.innerHTML = `
                        <div class="timezone-heading">${cityName}</div>
                        <div class="timezone-time">${currentTime}</div>
                        <div class="timezone-weather">
                            ${weather.icon ? `<img src="${weather.icon}" alt="Weather icon" />` : ''}
                            ${weather.temp ? weather.temp : 'Weather unavailable'}
                        </div>
                    `;
                    timezonesContainer.appendChild(timezoneElement);
                });
            }

            // Fetch weather data for all cities
            async function fetchWeatherForCities() {
                for (const timezone of config.timezones) {
                    const cityName = timezone.name.split('/').pop().replace('_', ' ');
                    const weather = await fetchWeather(cityName, timezone.metric);
                    weatherData[cityName] = weather;
                }
            }

            async function fetchWeather(cityName, metric) {
                try {
                    const response = await fetch(
                        `https://api.openweathermap.org/data/2.5/weather?q=${cityName}&appid=${API_KEY}&units=${metric}`
                    );
                    if (response.ok) {
                        const data = await response.json();
                        const unit = metric === 'metric' ? '°C' : '°F';
                        return {
                            icon: `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`,
                            temp: `${data.main.temp}${unit}`
                        };
                    }
                    return { icon: null, temp: 'Weather unavailable' };
                } catch (err) {
                    console.error(`Error fetching weather for ${cityName}:`, err);
                    return { icon: null, temp: 'Weather unavailable' };
                }
            }

            // Fetch weather initially and then update hourly
            await fetchWeatherForCities();
            setInterval(fetchWeatherForCities, 3600000); // Update weather every hour

            // Update the time zones every 10 seconds
            setInterval(updateTimezones, 10000);

            // Set initial display of timer on page load
            updateInitialTimerDisplay();
            setCssVariables(config);

            timerElement.addEventListener('click', toggleTimer);
        })
        .catch(err => console.error('Error loading config:', err));
});