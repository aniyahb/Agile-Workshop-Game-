
# 🎮 Electronic Agile Workshop Game Dashboard

## Overview

**Note:** This repository contains the **display software portion** of the **Electronic Agile Workshop Game**, a Penn State Fall 2025 Capstone Showcase project. For the complete project including hardware design, mechanical components, and full system documentation, please visit:

**🔗 [Full Project: Electronic Agile Workshop Game - Penn State Capstone Showcase](https://sites.psu.edu/lfshowcasefa25/2025/12/08/electronic-agile-workshop-game-2/)**

---
The **Electronic Agile Game** is an interactive educational tool designed to teach teams about Agile principles, sprint planning, estimation accuracy, and continuous improvement. This system provides a digital dashboard for facilitating the classic "Ball Point Game" (also known as the "Agile Ball Game"), which demonstrates key Agile and Scrum concepts through hands-on experience.

### 🎥 Walkthrough Video

For a complete demonstration of the system in action, watch the walkthrough video:

**📹 [Watch the Electronic Agile Game Walkthrough](https://psu.mediaspace.kaltura.com/media/1_q34btkme)**

---
## 🎯 Purpose & Learning Objectives

### What is the Ball Point Game?

The Ball Point Game is a popular Agile training exercise where teams:
1. **Plan** how many balls they can pass through their system in 2 minutes
2. **Execute** the plan by physically passing balls through the team
3. **Inspect** the results and identify defects
4. **Adapt** their approach for the next iteration

### Key Learning Outcomes

Participants learn about:
- **Sprint Planning & Estimation**: The difficulty of accurate estimation in complex systems
- **Velocity & Throughput**: Understanding sustainable pace and team capacity
- **Continuous Improvement**: Each iteration offers opportunities to optimize the process
- **Quality vs. Speed**: The tension between delivering quickly and maintaining quality
- **Feedback Loops**: How inspection and adaptation drive better outcomes
- **Team Dynamics**: Communication, coordination, and self-organization
- **WIP (Work in Progress)**: The impact of work that's started but not completed

## 🖥️ Dashboard Features

This electronic display system replaces manual scorekeeping and provides:

### Real-Time Tracking
- **Live Ball Counter**: Counts balls as they pass through the system (GPIO button integration)
- **Timer Display**: 2-minute countdown with audio alerts at key intervals
- **Progress Visualization**: Visual progress bars and status indicators

### Planning Phase
- **Dedicated Planning Timer**: 2 minutes for the first iteration, 1 minute for subsequent iterations
- **Touch-Friendly Input**: Easy-to-use +/- controls for entering team estimates
- **Countdown Alerts**: Audio notifications to keep planning focused

### Results Tracking
- **5 Iterations**: Standard game format with 5 sprint iterations
- **Comprehensive Metrics**:
  - **Plan**: Team's estimation for the iteration
  - **Actual**: Balls successfully passed through the system
  - **Defects**: Balls dropped or improperly handled
  - **Total**: Actual balls minus defects
  - **Delta**: Difference between plan and total (over/under estimation)
  - **Score**: Calculated using a Gaussian scoring function that rewards accuracy

### Advanced Scoring System

The dashboard uses a sophisticated scoring algorithm that:
- **Rewards accuracy** more than raw throughput
- **Penalizes over/under-estimation** relative to the plan
- **Accounts for in-process work** (partially completed balls)
- **Calculates team performance** across all iterations

### Visualization
- **Interactive Charts**: Line graph showing Plan vs. Actual across iterations
- **Performance Trends**: Visual representation of improvement over time
- **Summary Statistics**: Average performance, accuracy rate, and overall score

### Full-Screen Counting Mode
- **Projection-Ready Display**: Large, easy-to-read numbers for team visibility
- **Dual View Options**: Toggle between full dashboard and counting-only display
- **Color-Coded Status**: Visual indicators for different game states

## 🎲 How to Play the Game

#### Planning Phase (2 min for Iteration 1, 1 min for others)
1. **Click "Start Planning Timer"** on the dashboard
2. Team discusses and decides their estimate
3. Team enters their **Plan** number on the dashboard
4. **Submit** the plan before time runs out

#### Execution Phase (2 minutes)
1. **Click "Start 2-Minute Counting"** - countdown begins with Mario Kart-style animation
2. Team starts passing balls through the system
3. Dashboard automatically counts balls (via IR sensors) 
4. **Countdown alerts** at 60, 45, 30, 15, and 10 seconds
5. **Alarm sounds** when time is up - stop immediately

#### Inspection Phase
1. Count **defects** (dropped balls, rule violations)
2. Enter defect count on dashboard
3. Count **in-progress** balls (balls that didn't complete the full circuit)
4. Enter in-progress count on dashboard
5. Dashboard automatically calculates:
   - Total valid balls (Actual - Defects)
   - Delta (difference from plan)
   - Iteration score

#### Retrospective (Between Iterations)
- **What went well?** Celebrate successes
- **What didn't work?** Identify problems
- **What will we try differently?** Plan improvements
- Common improvements teams discover:
  - Better spacing and positioning
  - Clearer communication
  - Rhythm and timing
  - Role specialization
  - Quality checks

### After 5 Iterations
1. **Click "View Results"** to see the final performance graph
2. Dashboard displays:
   - Plan vs. Actual trend line
   - Total score and accuracy metrics
   - Performance summary
3. **Debrief** with the team about lessons learned

## 📊 Understanding the Scoring System

### Delta (Δ)
- **Positive Delta (+)**: Team delivered MORE than planned (over-delivery)
- **Negative Delta (-)**: Team delivered LESS than planned (under-delivery)
- **Zero Delta (0)**: Perfect estimation!

### Iteration Points (Score)
The scoring system rewards **accuracy** over quantity:
- **Peak score** achieved when actual delivery matches the plan
- Score **decreases** as you move away from the plan (over or under)
- **In-process balls** earn partial points using exponential decay
- Formula uses a Gaussian (bell curve) distribution centered on the team's plan

**Why this scoring system?**
- Teaches teams that **sustainable, predictable delivery** is more valuable than sprinting
- Discourages sandbagging (low estimates) and optimistic planning (high estimates)
- Reflects real Agile principle: predictability enables better business planning

## 🛠️ Technical Features

### Hardware Integration
- **GPIO Support**: Raspberry Pi GPIO button for automatic ball counting
- **Graceful Fallback**: Web-only mode if GPIO unavailable
- **Button Debouncing**: 20ms debounce to prevent double-counts

### User Experience
- **Touch-Optimized Controls**: Large buttons for tablet/touch screen use
- **Keyboard Input Support**: Also accepts typed numbers
- **Responsive Design**: Works on desktop, tablet, and projected displays
- **Audio Feedback**: Countdown alerts, time-up alarms, and transitions
- **Visual Status Indicators**: Color-coded states (running, waiting, stopped)

### Data Management
- **Session Persistence**: Game state maintained across page refreshes
- **CSV Export**: Results automatically saved after iterations 3 and 5
- **Timestamped Records**: Each game session uniquely identified
- **Team Size Tracking**: Records number of players for context

### Safety & Reliability
- **State Locking**: Thread-safe operations for concurrent access
- **Server-Sent Events (SSE)**: Real-time counter updates without polling
- **Error Handling**: Graceful degradation if components fail

## 🚀 Getting Started

### Prerequisites
```bash
- Python 3.7+
- Flask
- gpiozero (for Raspberry Pi GPIO)
- Modern web browser
```

### Installation

1. **Clone or download** this repository
2. **Install dependencies**:
   ```bash
   pip install flask gpiozero
   ```

3. **Create folder structure**:
   ```
   agile-game/
   ├── app.py
   ├── templates/
   │   └── dashboard.html
   └── static/
       ├── styles.css
       ├── script.js
       └── audio files 
   ```

4. **Run the application**:
   ```bash
   python app.py
   ```

5. **Access the dashboard**:
   - Open browser to `http://localhost:5000`
   - For other devices on network: `http://[your-ip]:5000`


## 🌟 Credits & License

This electronic dashboard system was created to enhance the traditional Ball Point Game experience with modern technology and real-time feedback.

The Ball Point Game itself is a widely-used Agile training exercise with origins in the Agile community. This implementation adds:
- Automated timing and counting
- Advanced scoring algorithm
- Visual analytics and charts
- Data persistence and export

Feel free to use, modify, and share this tool for educational purposes.

## 🤝 Contributing

Suggestions for improvement:
- Additional audio alerts or music
- Multi-language support
- Alternative scoring algorithms
- Mobile app version
- Remote/virtual team adaptations

---

**Happy Learning! 🎉**

*Remember: The goal isn't to "win" the game—it's to learn how Agile principles improve team performance through iteration, inspection, and adaptation.*