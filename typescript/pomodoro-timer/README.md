# Pomodoro Timer

A full-featured Pomodoro Technique timer for the OpenAI Apps SDK with task tracking, statistics, and customizable settings.

## Features

- 🍅 Classic Pomodoro Technique timer (25/5/15 min)
- ✅ Task management and tracking
- 📊 Productivity statistics and analytics
- 🏷️ Task tagging and organization
- ⚙️ Customizable durations
- 💾 Persistent session history
- 📈 Progress tracking per task
- 🎯 Automatic long break scheduling

## Installation

```bash
cd typescript/pomodoro-timer
npm install
npm run build
```

## Run Server

```bash
npm start
# Or for development:
npm run dev
```

## The Pomodoro Technique

1. Choose a task
2. Work for 25 minutes (1 Pomodoro)
3. Take a 5-minute break
4. After 4 Pomodoros, take a 15-minute break
5. Repeat!

## Available Tools

### 1. `start_pomodoro` - Start a work session
### 2. `start_break` - Start a break
### 3. `stop_timer` - Stop current timer
### 4. `get_timer_status` - Check timer status
### 5. `add_task` - Add a task
### 6. `list_tasks` - List all tasks
### 7. `complete_task` - Mark task as done
### 8. `get_statistics` - View productivity stats
### 9. `update_settings` - Customize timer durations

## Quick Start

```
"Start a Pomodoro for writing report"
"What's my timer status?"
"Stop the timer"
"Show me today's statistics"
"Add task: Review pull requests, 3 pomodoros"
"List my active tasks"
```

## Testing in ChatGPT

1. Build: `npm run build`
2. Start: `npm start`
3. Add connector in ChatGPT Settings
4. Start focusing! 🎯

## Use Cases

- 📝 Writing and content creation
- 💻 Programming and debugging
- 📚 Studying and learning
- 🎨 Design work
- 📊 Data analysis
- 🧹 Any focused work!

## License

MIT

