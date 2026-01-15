// ===================================================== JavaScript Code ============================================================================
// Global variables (initialized from HTML template: currentIteration, planNumber, numberOfPlayers, iterationsData)
let actualCount = 0;
let timerInterval;
let planningTimerInterval;
let eventSource;
let timeRemaining = 0;
let planningTimeRemaining = 0;
let isRunning = false;
let isPlanningActive = false;
let alertsPlayed = new Set();
let alarmAudio = null
let audioUnlocked = false;
let speechQueue = [];
let isSpeaking = false;
let resultsChart = null;
let tempDefects = 0;
let tempCompletedIteration = 0;

// Touch control function for initial players setup ***
function adjustPlayersSetup(amount) {
    const input = document.getElementById('playersSetupInput');
    const display = document.getElementById('playersSetupDisplay');
    let currentValue = parseInt(input.value) || 0;
    let newValue = Math.max(0, currentValue + amount);
    
    input.value = newValue;
    display.textContent = newValue;
    
    // Update submit button state
    const submitBtn = document.getElementById('playersSetupSubmit');
    submitBtn.disabled = newValue <= 0;
}

// Submit the number of players and start the game ***
function submitPlayersSetup() {
    const input = document.getElementById('playersSetupInput');
    const players = parseInt(input.value);
    
    if (!players || players <= 0) {
        alert('Please enter a valid number of players greater than 0');
        return;
    }
    
    // Store locally
    numberOfPlayers = players;
    
    // Send to backend
    fetch('/set_players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ players: players })
    })
    .then(response => response.json())
    .then(data => {
        console.log('Players set:', data);
        // Hide the overlay and show the dashboard
        document.getElementById('playersSetupOverlay').style.display = 'none';
        window.scrollTo(0, 0);
    })
    .catch(error => {
        console.error('Error setting players:', error);
        alert('Failed to set number of players. Please try again.');
    });
}

// Text-to-speech function
function speak(text) {
    speechQueue.push(text);
    processSpeechQueue();
}

function processSpeechQueue() {
    if (isSpeaking || speechQueue.length === 0) {
        return;
    }
    isSpeaking = true;
    const text = speechQueue.shift();
    // Cancel any ongoing speech
    speechSynthesis.cancel();
    
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 1.0;
            utterance.pitch = 0.5;
            utterance.volume = 1.0;
    utterance.onend = function() {
                isSpeaking = false;
        // Process next item in queue after a small delay
                setTimeout(processSpeechQueue, 100);
            };
    utterance.onerror = function(event) {
    console.error('Speech synthesis error:', event);
                isSpeaking = false;
    // Try next item in queue
    setTimeout(processSpeechQueue, 100);
            };
    try {
            speechSynthesis.speak(utterance);
    } catch (error) {
        console.error('Failed to speak:', error);
            isSpeaking = false;
        setTimeout(processSpeechQueue, 100);
        }
    }

// Enhanced audio unlocking - call this on ANY user interaction
function unlockAudio() {
    if (audioUnlocked) return;
    
    console.log('Attempting to unlock audio...');
    
    // Create and load the alarm audio
    alarmAudio = new Audio('/static/alarm.mp3');
    alarmAudio.load();
    
    // Also try to initialize speech synthesis
    try {
        const utterance = new SpeechSynthesisUtterance('');
        utterance.volume = 0;
        speechSynthesis.speak(utterance);
        speechSynthesis.cancel();
        console.log('Speech synthesis initialized');
        audioUnlocked = true;
    } catch (error) {
        console.log('Speech synthesis init failed:', error);
    }
}

// Touch control functions for Planning
function adjustPlan(amount) {
    const input = document.getElementById('planningInput');
    const display = document.getElementById('planningDisplay');
    let currentValue = parseInt(input.value) || 0;
    let newValue = Math.max(0, currentValue + amount);
    
    input.value = newValue;
    display.textContent = newValue;
    
    // Update submit button state
    const submitBtn = document.querySelector('.planning-submit-btn');
    submitBtn.disabled = newValue <= 0;
}

// Touch control functions for Defects
function adjustDefects(amount) {
    const input = document.getElementById('defectsInput');
    const display = document.getElementById('defectsDisplay');
    let currentValue = parseInt(input.value) || 0;
    let newValue = Math.max(0, currentValue + amount);
    
    input.value = newValue;
    display.textContent = newValue;
}

// Touch control functions for In-Progress 
function adjustInProgress(amount) {
    const input = document.getElementById('inProgressInput');
    const display = document.getElementById('inProgressDisplay');
    let currentValue = parseInt(input.value) || 0;
    let newValue = Math.max(0, currentValue + amount);
    
    input.value = newValue;
    display.textContent = newValue;
}

function startPlanningTimer() {
    if (isPlanningActive) return;
    unlockAudio();
    // Determine planning time: 2 minutes for iteration 1, 1 minute for others
    planningTimeRemaining = currentIteration === 1 ? 120 : 60;
    isPlanningActive = true;
    alertsPlayed.clear();
    
    // Show planning modal
    document.getElementById('planningModal').style.display = 'block';
    document.getElementById('planningIterationNum').textContent = currentIteration;
    // Reset planning input and visible display so previous value isn't carried over
    const planningInput = document.getElementById('planningInput');
    const planningDisplay = document.getElementById('planningDisplay');
    const submitBtn = document.querySelector('.planning-submit-btn');
    planningInput.value = '';               // clear raw input
    planningDisplay.textContent = '0';      // visible display resets to 0
    submitBtn.disabled = true;              // require new valid entry
    // trigger input listener to keep UI in sync (if any)
    planningInput.dispatchEvent(new Event('input', { bubbles: true }));
    planningInput.focus();
    
    // Disable planning button while planning is active
    document.getElementById('planningBtn').disabled = true;
    
    // Start planning timer
    updatePlanningTimer();
    planningTimerInterval = setInterval(updatePlanningTimer, 1000);
}

function updatePlanningTimer() {
    // Decrement time first
    planningTimeRemaining--;
    
    // Get max time for progress calculation
    const maxTime = currentIteration === 1 ? 120 : 60;
    
    // Start countdown audio at 10 seconds
    if (planningTimeRemaining === 10) {
        const countdownAudio = new Audio('/static/counts/ten_sec_countdown.mp3');
        countdownAudio.play().catch(error => {
            console.log('Countdown audio playback failed:', error);
        });
    }
    
    // Check if time is up
    if (planningTimeRemaining < 0) {
        clearInterval(planningTimerInterval);
        const audio = new Audio('/static/times_up_enter_plan.mp3');
        audio.play().catch(error => console.log('Audio playback failed:', error));
        
        // Force plan entry - disable submit button until they enter something
        const planInput = document.getElementById('planningInput');
        const submitBtn = document.querySelector('.planning-submit-btn');
        
        if (!planInput.value || parseInt(planInput.value) <= 0) {
            submitBtn.disabled = true;
            planInput.addEventListener('input', function() {
                submitBtn.disabled = !(planInput.value && parseInt(planInput.value) > 0);
            });
        }
        
        return;
    }
    
    const minutes = Math.floor(planningTimeRemaining / 60);
    const seconds = planningTimeRemaining % 60;
    const timeDisplay = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    document.getElementById('planningTimer').textContent = timeDisplay;
    
    // Update progress bar
    const progress = ((maxTime - planningTimeRemaining) / maxTime) * 100;
    document.getElementById('planningProgressBar').style.width = progress + '%';
}

function submitPlan() {
    const input = document.getElementById('planningInput');
    const plan = parseInt(input.value);
    
    if (!plan || plan <= 0) {
        alert('Please enter a valid plan number greater than 0');
        return;
    }
    
    // Stop planning timer
    clearInterval(planningTimerInterval);
    isPlanningActive = false;
    
    // Set the plan
    planNumber = plan;
    
    // Send to backend
    fetch('/set_plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: plan })
    });
    
    // Update table
    document.querySelector(`#row-${currentIteration} td:nth-child(2)`).textContent = plan;
    document.querySelector(`#row-${currentIteration} td:nth-child(2)`).className = '';
    
    // Close modal
    document.getElementById('planningModal').style.display = 'none';
    
    // Enable start button, disable planning button
    document.getElementById('startBtn').disabled = false;
    document.getElementById('planningBtn').disabled = true;
    
    // Update display
    document.getElementById('timerDisplay').innerHTML = 
        `Plan Set! Ready to Start Iteration ${currentIteration} <span class="status-indicator status-waiting"></span>`;
}

// UPDATED: Show countdown before starting iteration 
function startIteration() {
    if (isRunning) return;
    
    console.log('Starting countdown for iteration:', currentIteration);
    unlockAudio();
    
    // Disable start button immediately
    document.getElementById('startBtn').disabled = true;
    
    // Show countdown overlay and play Mario Kart sound
    showCountdown();
}

// *** NEW: Show Mario Kart countdown ***
function showCountdown() {
    const overlay = document.getElementById('countdownOverlay');
    const display = document.getElementById('countdownDisplay');
    
    // Show overlay
    overlay.classList.add('active');
    
    // Play Mario Kart start sound
    const marioKartAudio = new Audio('/static/MarioKartStart.mp3');
    marioKartAudio.play().catch(error => {
        console.log('Mario Kart audio playback failed:', error);
    });
    
    // Countdown sequence
    display.textContent = '3';
    display.className = 'countdown-number';
    
    setTimeout(() => {
        display.textContent = '2';
        display.className = 'countdown-number';
    }, 1000);
    
    setTimeout(() => {
        display.textContent = '1';
        display.className = 'countdown-number';
    }, 2000);
    
    setTimeout(() => {
        display.textContent = 'BEGIN!';
        display.className = 'countdown-begin';
    }, 3000);
    
    // Start actual iteration after 4 seconds
    setTimeout(() => {
        overlay.classList.remove('active');  // *** UPDATED: Use class instead of inline style ***
        startIterationActual();
    }, 4000);
}

// *** NEW: Actual iteration start (after countdown) ***
function startIterationActual() {
    console.log('Starting iteration:', currentIteration);
    // Reset alerts tracking for new iteration
    alertsPlayed.clear();
    
    timeRemaining = 120; // 2 minutes
    isRunning = true;
    
    // Show counting overlay
    showCountingOverlay();
    
    // Highlight current row
    document.querySelectorAll('.current-row').forEach(row => row.classList.remove('current-row'));
    document.getElementById(`row-${currentIteration}`).classList.add('current-row');
    
    // Start backend iteration
    fetch('/start_iteration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    })
    .then(response => response.json())
    .then(data => console.log('Backend response:', data))
    .catch(error => console.error('Backend error:', error));
    
    // Start timer
    console.log('Starting timer interval');
    updateTimer(); // Initial call to set immediately
    timerInterval = setInterval(updateTimer, 1000);
    
    // Start live updates
    startLiveUpdates();
    
    // Initialize actual count in table
    updateTableCell(currentIteration, 3, 0, 'live-value');
}

// Add early audio unlocking on page interactions
document.addEventListener('DOMContentLoaded', function() {
    // Unlock audio on any click anywhere on the page
    document.addEventListener('click', unlockAudio, { once: false });
    
    // Also try to unlock on any button click
    document.querySelectorAll('button').forEach(button => {
        button.addEventListener('click', unlockAudio);
    });
    // Ensure Counting Screen button is hidden & disabled on load
    const countingBtn = document.getElementById('countingScreenBtn');
    if (countingBtn) {
        countingBtn.style.display = 'none';
        countingBtn.disabled = true;
    }
    
    // Unlock on any input interaction
    document.querySelectorAll('input').forEach(input => {
        input.addEventListener('focus', unlockAudio, { once: true });
    });
    // Sync display with keyboard input for Planning
    const planningInput = document.getElementById('planningInput');
    const planningDisplay = document.getElementById('planningDisplay');
    
    planningInput.addEventListener('input', function() {
        let value = parseInt(this.value) || 0;
        if (value < 0) value = 0;
        this.value = value;
        planningDisplay.textContent = value;
        
        const submitBtn = document.querySelector('.planning-submit-btn');
        submitBtn.disabled = value <= 0;
    });
    
    // Sync for Defects
    const defectsInput = document.getElementById('defectsInput');
    const defectsDisplay = document.getElementById('defectsDisplay');
    
    defectsInput.addEventListener('input', function() {
        let value = parseInt(this.value) || 0;
        if (value < 0) value = 0;
        this.value = value;
        defectsDisplay.textContent = value;
    });
    // Sync for In-Progress 
    const inProgressInput = document.getElementById('inProgressInput');
    const inProgressDisplay = document.getElementById('inProgressDisplay');
    
    inProgressInput.addEventListener('input', function() {
        let value = parseInt(this.value) || 0;
        if (value < 0) value = 0;
        this.value = value;
        inProgressDisplay.textContent = value;
    });
    
});

function updateTimer() {
    // Decrement time first
    timeRemaining--;
    
    // MP3 Announcements
    if (timeRemaining === 60 && !alertsPlayed.has(60)) {
        const audio = new Audio('/static/counts/one_minute_remaining.mp3');
        audio.play().catch(error => console.log('Audio playback failed:', error));
        alertsPlayed.add(60);
    } else if (timeRemaining === 45 && !alertsPlayed.has(45)) {
        const audio = new Audio('/static/counts/45_secs.mp3');
        audio.play().catch(error => console.log('Audio playback failed:', error));
        alertsPlayed.add(45);
    } else if (timeRemaining === 30 && !alertsPlayed.has(30)) {
        const audio = new Audio('/static/counts/30_secs.mp3');
        audio.play().catch(error => console.log('Audio playback failed:', error));
        alertsPlayed.add(30);
    } else if (timeRemaining === 15 && !alertsPlayed.has(15)) {
        const audio = new Audio('/static/counts/15_secs.mp3');
        audio.play().catch(error => console.log('Audio playback failed:', error));
        alertsPlayed.add(15);
    } else if (timeRemaining === 10 && !alertsPlayed.has(10)) {
        const audio = new Audio('/static/counts/ten_sec_countdown.mp3');
        audio.play().catch(error => console.log('Audio playback failed:', error));
        alertsPlayed.add(10);
    }
    
    // Check if time is up
    if (timeRemaining < 0) {
        console.log('Timer finished, stopping iteration');
        // Play the alarm with multiple fallback attempts
        if (alarmAudio) {
            alarmAudio.currentTime = 0; // Reset to start
            alarmAudio.play().catch(error => {
                console.log('First alarm playback attempt failed:', error);
                // Try creating a fresh audio object as fallback
                const fallbackAlarm = new Audio('/static/alarm.mp3');
                fallbackAlarm.play().catch(err => {
                    console.log('Fallback alarm playback also failed:', err);
                });
            });
        } else {
            // If alarmAudio wasn't initialized, try to play anyway
            const emergencyAlarm = new Audio('/static/alarm.mp3');
            emergencyAlarm.play().catch(error => {
                console.log('Emergency alarm playback failed:', error);
            });
        }
        
        stopIteration();
        return;
    }
    
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    const timeDisplay = `${minutes}:${seconds.toString().padStart(2, '0')} `;
    
    console.log(`Timer: ${timeDisplay}, timeRemaining: ${timeRemaining}`);
    
    // Update both dashboard and overlay timers
    document.getElementById('timerDisplay').innerHTML = 
        `Iteration ${currentIteration} - ${timeDisplay} <span class="status-indicator status-running"></span>`;
    document.getElementById('overlayTimer').textContent = timeDisplay;
    
    // Update progress bars - calculate based on time elapsed
    const progress = ((120 - timeRemaining) / 120) * 100;
    console.log(`Progress: ${progress}%`);
    document.getElementById('progressBar').style.width = progress + '%';
    document.getElementById('overlayProgressBar').style.width = progress + '%';
}

function startLiveUpdates() {
    eventSource = new EventSource('/live_counter');
    eventSource.onmessage = function(event) {
        if (isRunning) {
            actualCount = parseInt(event.data);
            // Update both dashboard table and overlay
            updateTableCell(currentIteration, 3, actualCount, 'live-value');
            document.getElementById('overlayBallCount').textContent = actualCount;
        }
    };
}

function stopIteration() {
    isRunning = false;
    clearInterval(timerInterval);
    // Clear speech queue
    speechQueue = [];
    isSpeaking = false;
    
    if (eventSource) {
        eventSource.close();
    }
    
    // Hide counting overlay
    hideCountingOverlay();
    
    // Stop backend iteration
    fetch('/stop_iteration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    });
    
    document.getElementById('timerDisplay').innerHTML = 
        `Iteration ${currentIteration} Complete! <span class="status-indicator status-waiting"></span>`;
    document.getElementById('progressBar').style.width = '100%';
    
    // Remove live value animation
    document.querySelector(`#row-${currentIteration} td:nth-child(3)`).classList.remove('live-value');
    
    // Show defects input modal
    document.getElementById('modalIteration').textContent = currentIteration;
    // Reset defects input and visible display to 0 to avoid carrying previous value
    const defectsInput = document.getElementById('defectsInput');
    const defectsDisplay = document.getElementById('defectsDisplay');
    if (defectsInput) defectsInput.value = '0';
    if (defectsDisplay) defectsDisplay.textContent = '0';
    
    document.getElementById('defectsModal').style.display = 'block';
}

// *** UPDATED: Now shows in-progress modal instead of sending to backend immediately ***
function submitDefects() {
    const defectsInput = document.getElementById('defectsInput');
    const defects = parseInt(defectsInput.value) || 0;
    // Store defects and iteration temporarily
    tempDefects = defects;
    tempCompletedIteration = currentIteration;
    
    // Close defects modal
    document.getElementById('defectsModal').style.display = 'none';
    defectsInput.value = '0';
    document.getElementById('defectsDisplay').textContent = '0';
    
    // Show in-progress modal
    document.getElementById('inProgressModalIteration').textContent = tempCompletedIteration;
    
    // Reset in-progress input
    const inProgressInput = document.getElementById('inProgressInput');
    const inProgressDisplay = document.getElementById('inProgressDisplay');
    inProgressInput.value = '0';
    inProgressDisplay.textContent = '0';
    
    document.getElementById('inProgressModal').style.display = 'block';
}

// *** NEW: Submit in-progress and send both defects + in-progress to backend ***
function submitInProgress() {
    const inProgressInput = document.getElementById('inProgressInput');
    const inProgress = parseInt(inProgressInput.value) || 0;
    
    // Send both defects and in-progress to backend
    fetch('/submit_defects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            defects: tempDefects,
            in_progress: inProgress
        })
    })
    .then(response => response.json())
    .then(data => {
        const result = data.iteration_data;
        
        // Update table
        updateTableCell(tempCompletedIteration, 4, result.defects); // Defects
        updateTableCell(tempCompletedIteration, 5, result.total);   // Total
        updateTableCell(tempCompletedIteration, 6, result.delta >= 0 ? `+${result.delta}` : result.delta, result.delta >= 0 ? 'positive' : 'negative'); // Delta
        updateTableCell(tempCompletedIteration, 7, result.ipoints, result.ipoints >= 0 ? 'positive' : 'negative'); //  Score column 
        // Mark row as completed
        document.getElementById(`row-${tempCompletedIteration}`).classList.remove('current-row');
        document.getElementById(`row-${tempCompletedIteration}`).classList.add('iteration-complete');
        
        // Update current iteration
        currentIteration = data.current_iteration;
        
        // Close modal and reset
        document.getElementById('inProgressModal').style.display = 'none';
        inProgressInput.value = '0';
        
        // Enable View Results button after first iteration completes
        const viewBtn = document.getElementById('viewResultsBtn');
        if (viewBtn) viewBtn.disabled = false;
        
        // Check if we just completed iteration 5 (final iteration)
        if (tempCompletedIteration === 5) {
            // All 5 iterations complete - show final results graph
            showFinalResults();
        } else {
            // Prepare for next iteration - enable planning button
            document.getElementById('planningBtn').disabled = false;
            document.getElementById('startBtn').disabled = true;
            document.getElementById('currentIterationDisplay').textContent = currentIteration;
            document.getElementById('timerDisplay').innerHTML = 
                `Ready to Start Iteration ${currentIteration} <span class="status-indicator status-waiting"></span>`;
            document.getElementById('progressBar').style.width = '0%';
        }
    });
}

function showFinalResults() {
    // *** UPDATED: Only get completed iterations, not all 5 
    const iterations = [];
    for (let i = 1; i <= 5; i++) {
        const row = document.getElementById(`row-${i}`);
        const cells = row.querySelectorAll('td');
        
        // Check if iteration is complete by looking at ACTUAL column, not PLAN 
        const actualText = cells[2].textContent.trim();  
        if (actualText === '-' || actualText === '') {
            break; // Stop at first incomplete iteration
        }
        
        // *** UPDATED: Parse delta and ipoints as floats, add lmax_points ***
        const delta = parseFloat(cells[5].textContent.replace('+', '')) || 0;
        const ipoints = parseFloat(cells[6].textContent) || 0;  // *** NEW: Read Score column ***
        
        iterations.push({
            iteration: i,
            plan: parseInt(cells[1].textContent) || 0,
            actual: parseInt(cells[2].textContent) || 0,
            defects: parseInt(cells[3].textContent) || 0,
            total: parseInt(cells[4].textContent) || 0,
            delta: delta,
            ipoints: ipoints,                    // *** NEW ***
            lmax_points: delta + 5               // *** NEW: Calculate from delta ***
        });
    }
    
    // *** NEW: Don't show chart if no iterations completed ***
    if (iterations.length === 0) {
        alert('No completed iterations yet!');
        return;
    }
    
    // *** NEW: Update modal title based on completion status ***
    const modalTitle = document.getElementById('resultsModalTitle');
    if (iterations.length === 5) {
        modalTitle.textContent = '🎉 Game Complete - Final Results';
    } else {
        modalTitle.textContent = `📊 Current Results - ${iterations.length} of 5 Iterations Complete`;
    }
    
    // Show the modal
    document.getElementById('finalResultsModal').style.display = 'block';
    
    // Create the chart
    createResultsChart(iterations);
    
    // Update summary statistics
    updateSummaryStats(iterations);
    
    // *** UPDATED: Only update UI if all 5 iterations complete ***
    if (iterations.length === 5) {
        document.getElementById('timerDisplay').innerHTML = 
            'All 5 Iterations Complete! View Results Above <span class="status-indicator status-stopped"></span>';
        document.getElementById('startBtn').textContent = 'Process Complete';
        document.getElementById('startBtn').disabled = true;
        document.getElementById('planningBtn').disabled = true;
    }
}

function createResultsChart(iterations) {
    const ctx = document.getElementById('resultsChart').getContext('2d');
    // Destroy previous chart instance if present to avoid duplicates when reopening modal
    if (resultsChart) {
        try { resultsChart.destroy(); } catch (e) { /* ignore */ }
        resultsChart = null;
    }
    const labels = iterations.map(iter => `Iteration ${iter.iteration}`);
    const planData = iterations.map(iter => iter.plan);
    const actualData = iterations.map(iter => iter.actual);
    resultsChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Plan',
                data: planData,
                borderColor: 'rgb(102, 126, 234)',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                borderWidth: 4,
                pointBackgroundColor: 'rgb(102, 126, 234)',
                pointBorderColor: 'white',
                pointBorderWidth: 2,
                pointRadius: 8,
                tension: 0.4
            }, {
                label: 'Actual',
                data: actualData,
                borderColor: 'rgb(76, 175, 80)',
                backgroundColor: 'rgba(76, 175, 80, 0.1)',
                borderWidth: 4,
                pointBackgroundColor: 'rgb(76, 175, 80)',
                pointBorderColor: 'white',
                pointBorderWidth: 2,
                pointRadius: 8,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false 
                },
                title: {
                    display: true,
                    text: 'Plan vs Actual Performance',
                    font: {
                        size: 18,
                        weight: 'bold'
                    },
                    color: '#333'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 120, 
                    title: {
                        display: true,
                        text: 'Number of Balls',
                        font: {
                            size: 14,
                            weight: 'bold'
                        },
                        color: '#666'
                    },
                    grid: {
                        color: 'rgba(0,0,0,0.1)'
                    },
                    ticks: {
                        color: '#666',
                        font: {
                            size: 12
                        }
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Iteration',
                        font: {
                            size: 14,
                            weight: 'bold'
                        },
                        color: '#666'
                    },
                    grid: {
                        color: 'rgba(0,0,0,0.1)'
                    },
                    ticks: {
                        color: '#666',
                        font: {
                            size: 12
                        }
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            },
            hover: {
                animationDuration: 400
            },
            elements: {
                line: {
                    borderCapStyle: 'round'
                },
                point: {
                    hoverRadius: 10,
                    hoverBorderWidth: 3
                }
            }
        }
    });
}

function updateSummaryStats(iterations) {

    //  Calculate averages based on actual number of completed iterations ***
    const numIterations = iterations.length;
    const avgPlan = Math.round(iterations.reduce((sum, iter) => sum + iter.plan, 0) / numIterations);
    const avgActual = Math.round(iterations.reduce((sum, iter) => sum + iter.actual, 0) / numIterations);
    const totalDefects = iterations.reduce((sum, iter) => sum + iter.defects, 0);
    const deltas = iterations.map(iter => iter.delta);
    const bestDelta = Math.max(...deltas);
    const worstDelta = Math.min(...deltas);
    const totalDelta = deltas.reduce((sum, delta) => sum + delta, 0);
    const accuracyRate = Math.round((iterations.filter(iter => Math.abs(iter.delta) <= 2).length / numIterations) * 100);  // Based on completed iterations
    
    // Calculate overall score ***
    const Gpoints = iterations.reduce((sum, iter) => sum + iter.ipoints, 0);
    const Gmax_points = iterations.reduce((sum, iter) => sum + iter.lmax_points, 0);  // *** UPDATED: Use stored lmax_points ***
    const rawScore = Gmax_points !== 0 ? (Gpoints / Gmax_points) * 100 : 0;
    const overallScore = Math.min(Math.round(rawScore), 100);  // *** NEW: Cap at 100% ***
   
    // Display number of players in results
    document.getElementById('numPlayers').textContent = numberOfPlayers;
    document.getElementById('completedIterations').textContent = iterations.length;  
    document.getElementById('avgPlan').textContent = avgPlan;
    document.getElementById('avgActual').textContent = avgActual;
    document.getElementById('totalDefects').textContent = totalDefects;
    document.getElementById('bestDelta').textContent = bestDelta >= 0 ? `+${bestDelta}` : bestDelta;
    document.getElementById('worstDelta').textContent = worstDelta >= 0 ? `+${worstDelta}` : worstDelta;
    document.getElementById('totalDelta').textContent = totalDelta >= 0 ? `+${totalDelta}` : totalDelta;
    document.getElementById('accuracyRate').textContent = `${accuracyRate}%`;
    document.getElementById('overallScore').textContent = `${overallScore}%`;  
}

function closeResultsModal() {
    document.getElementById('finalResultsModal').style.display = 'none';
}

function updateTableCell(iteration, column, value, className = '') {
    const cell = document.querySelector(`#row-${iteration} td:nth-child(${column})`);
    cell.textContent = value;
    cell.className = className;
}

function resetSystem() {
    if (confirm('Are you sure you want to reset the entire system?')) {
        fetch('/reset_system', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        })
        .then(() => {
            location.reload();
        });
    }
}

function formatTime(seconds) {
    if (typeof seconds !== 'number' || seconds < 0) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
}

function showCountingOverlay() {
    // Always hide the top-right button when opening the overlay
    const btn = document.getElementById('countingScreenBtn');
    if (btn) {
        btn.style.display = 'none';
        btn.disabled = true;
    }
    // Show Overlay 
    //document.getElementById('countingScreenBtn').style.display = 'none';
    document.getElementById('countingOverlay').style.display = 'block';
    document.getElementById('overlayIteration').textContent = currentIteration;
    document.getElementById('overlayPlan').textContent = planNumber || '-';
    // Sync overlay immediately with current running state (no resets)
    document.getElementById('overlayBallCount').textContent = (typeof actualCount === 'number' && actualCount >= 0) ? actualCount : '0';
    document.getElementById('overlayTimer').textContent = formatTime(typeof timeRemaining === 'number' && timeRemaining >= 0 ? timeRemaining : 120);
    const progressPercent = (typeof timeRemaining === 'number' && isRunning)
        ? ((120 - timeRemaining) / 120) * 100
        : 0;
    document.getElementById('overlayProgressBar').style.width = Math.max(0, Math.min(100, progressPercent)) + '%';
    // document.getElementById('overlayBallCount').textContent = '0';
    // document.getElementById('overlayTimer').textContent = '2:00';
    // document.getElementById('overlayProgressBar').style.width = '0%';
}

function hideCountingOverlay() {
    document.getElementById('countingOverlay').style.display = 'none';
    //document.getElementById('countingScreenBtn').style.display = 'block';
    const btn = document.getElementById('countingScreenBtn');
    // Only show and enable the button if an iteration is currently running
    if (btn) {
        if (isRunning) {
            btn.style.display = 'block';
            btn.disabled = false;
        } else {
            btn.style.display = 'none';
            btn.disabled = true;
        }
    }
}

// Close modal when clicking outside (not for planning, defects, in-progress modal - must complete)
window.onclick = function(event) {
    const resultsModal = document.getElementById('finalResultsModal');
    if (event.target === resultsModal) {
        resultsModal.style.display = 'none';
    }
}

// Allow Enter key to submit in planning modal
document.getElementById('planningInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        submitPlan();
    }
});

// Allow Enter key to submit defects
document.getElementById('defectsInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        submitDefects();
    }
});

// NEW: Allow Enter key to submit in-progress 
document.getElementById('inProgressInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        submitInProgress();
    }
});

// Load existing data on page load
window.onload = function() {
    // *** NEW: Show players setup overlay if players not set yet ***
    if (numberOfPlayers <= 0) {
        document.getElementById('playersSetupOverlay').style.display = 'block';
        
        // Sync display with keyboard input for players setup
        const playersInput = document.getElementById('playersSetupInput');
        const playersDisplay = document.getElementById('playersSetupDisplay');
        
        playersInput.addEventListener('input', function() {
            let value = parseInt(this.value) || 0;
            if (value < 0) value = 0;
            this.value = value;
            playersDisplay.textContent = value;
            
            const submitBtn = document.getElementById('playersSetupSubmit');
            submitBtn.disabled = value <= 0;
        });
        
        // Allow Enter key to submit
        playersInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                submitPlayersSetup();
            }
        });
    }
    
    // These will be set from the HTML template
    // currentIteration, planNumber, numberOfPlayers, iterationsData
    
    document.getElementById('currentIterationDisplay').textContent = currentIteration;
    
    if (planNumber > 0) {
        document.getElementById('startBtn').disabled = false;
        document.getElementById('planningBtn').disabled = true;
        
        // Only fill plan for current iteration if no data exists yet
        if (currentIteration <= 5) {
            document.querySelector(`#row-${currentIteration} td:nth-child(2)`).textContent = planNumber;
            document.querySelector(`#row-${currentIteration} td:nth-child(2)`).className = '';
        }
    }
    
    // Load existing iteration data (set from HTML)
    if (typeof iterationsData !== 'undefined' && iterationsData) {
        iterationsData.forEach(data => {
        updateTableCell(data.iteration, 3, data.actual);
        updateTableCell(data.iteration, 4, data.defects);
        updateTableCell(data.iteration, 5, data.total);
        updateTableCell(data.iteration, 6, data.delta >= 0 ? `+${data.delta}` : data.delta, data.delta >= 0 ? 'positive' : 'negative');
        // Load Score column 
        if (data.ipoints !== undefined) {
            updateTableCell(data.iteration, 7, data.ipoints, data.ipoints >= 0 ? 'positive' : 'negative');
        }
        // Also fill in the plan for completed iterations
        updateTableCell(data.iteration, 2, data.plan);
        document.getElementById(`row-${data.iteration}`).classList.add('iteration-complete');
    });
    }
    
    // If all 5 iterations are complete, show the appropriate UI state
    if (typeof iterationsData !== 'undefined' && iterationsData && iterationsData.length === 5) {
        document.getElementById('timerDisplay').innerHTML = 
            'All 5 Iterations Complete! <span class="status-indicator status-stopped"></span>';
        document.getElementById('startBtn').textContent = 'Process Complete';
        document.getElementById('startBtn').disabled = true;
        document.getElementById('planningBtn').disabled = true;
        // enable the View Final Results button on load if the game is already complete
        const viewBtn = document.getElementById('viewResultsBtn');
        if (viewBtn) viewBtn.disabled = false;
    }
};