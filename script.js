document.addEventListener('DOMContentLoaded', () => {
    // Retrieve the API key from the URL
    function getApiKeyFromUrl() {
        const params = new URLSearchParams(window.location.search);
        return params.get('weatherApiKey');
    }
    function getDiscordWebhookPass() {
        const params = new URLSearchParams(window.location.search);
        return params.get('discordWebhookPass');
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

            // Track whether to display metric or imperial temperatures
            let showMetric = true;

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
                        sendWebhook(currentType);
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

            function sendWebhook(currentType) {
                if(getDiscordWebhookPass()){
                    const url = config.discordWebhookUrl + getDiscordWebhookPass();

                    fetch(url, {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body:
                            JSON.stringify(config.discordWebhookPayload[currentType])
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

                    const weather = weatherData[cityName];
                    const temp = weather
                        ? showMetric
                            ? weather.metric.temp
                            : weather.imperial.temp
                        : 'Fetching...';

                    const icon = weather ? weather.icon : '';

                    const timezoneElement = document.createElement('div');
                    timezoneElement.className = 'timezone';
                    timezoneElement.innerHTML = `
                        <div class="timezone-heading">${cityName}</div>
                        <div class="timezone-time">${currentTime}</div>
                        <div class="timezone-weather">
                            ${icon ? `<img src="${icon}" alt="Weather icon" />` : ''}
                            ${temp}
                        </div>
                    `;
                    timezonesContainer.appendChild(timezoneElement);
                });
            }

            // Fetch weather data for all cities in both metric and imperial
            async function fetchWeatherForCities() {
                for (const timezone of config.timezones) {
                    const cityName = timezone.name.split('/').pop().replace('_', ' ');
                    const weather = await fetchWeather(cityName);
                    weatherData[cityName] = weather;
                }
            }

            async function fetchWeather(cityName) {
                try {
                    const metricResponse = await fetch(
                        `https://api.openweathermap.org/data/2.5/weather?q=${cityName}&appid=${API_KEY}&units=metric`
                    );
                    const imperialResponse = await fetch(
                        `https://api.openweathermap.org/data/2.5/weather?q=${cityName}&appid=${API_KEY}&units=imperial`
                    );

                    if (metricResponse.ok && imperialResponse.ok) {
                        const metricData = await metricResponse.json();
                        const imperialData = await imperialResponse.json();
                        return {
                            icon: `https://openweathermap.org/img/wn/${metricData.weather[0].icon}@2x.png`,
                            metric: {temp: `${metricData.main.temp}°C`},
                            imperial: {temp: `${imperialData.main.temp}°F`}
                        };
                    }
                    return {icon: null, metric: {temp: 'Unavailable'}, imperial: {temp: 'Unavailable'}};
                } catch (err) {
                    console.error(`Error fetching weather for ${cityName}:`, err);
                    return {icon: null, metric: {temp: 'Unavailable'}, imperial: {temp: 'Unavailable'}};
                }
            }

            // Fetch weather initially and then update hourly
            await fetchWeatherForCities();
            setInterval(fetchWeatherForCities, 3600000); // Update weather every hour

            // Update time zones and switch temperature units every 5 seconds
            setInterval(() => {
                showMetric = !showMetric; // Toggle between metric and imperial
                updateTimezones();
            }, 5000);

            // Set initial display of timer on page load
            updateInitialTimerDisplay();
            setCssVariables(config);

            timerElement.addEventListener('click', toggleTimer);
            toggleTimer();
        })
        .catch(err => console.error('Error loading config:', err));
});
