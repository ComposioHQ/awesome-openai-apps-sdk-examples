#!/usr/bin/env python3
"""
Habit Tracker MCP Server using FastMCP
Supports both stdio (Claude Desktop) and Streamable HTTP (ChatGPT) transports
"""

import os
import sys
import json
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List
from mcp.server.fastmcp import FastMCP

# Create FastMCP server
mcp = FastMCP("habit-tracker")

# Persistent habit tracker
class HabitTracker:
    def __init__(self):
        self.data_file = Path(__file__).parent / "data" / "habits.json"
        self.data_file.parent.mkdir(exist_ok=True)
        self.habits: List[Dict] = []
        self.completions: List[Dict] = []
        self.load_data()
    
    def load_data(self):
        if self.data_file.exists():
            with open(self.data_file) as f:
                data = json.load(f)
                self.habits = data.get("habits", [])
                self.completions = data.get("completions", [])
    
    def save_data(self):
        with open(self.data_file, "w") as f:
            json.dump({"habits": self.habits, "completions": self.completions}, f, indent=2)

tracker = HabitTracker()

@mcp.tool()
def add_habit(name: str, frequency: str = "daily", goal: int = 30) -> str:
    """
    Add a new habit to track.
    
    Args:
        name: Name of the habit
        frequency: How often to track (daily or weekly)
        goal: Target streak length in days
    
    Returns:
        Confirmation with habit ID
    """
    habit = {
        "id": str(len(tracker.habits) + 1),
        "name": name,
        "frequency": frequency,
        "goal": goal,
        "created_at": datetime.now().isoformat()
    }
    tracker.habits.append(habit)
    tracker.save_data()
    
    return f"✅ Habit Added\n━━━━━━━━━━━━━━━━━━━━\nName: {habit['name']}\nID: {habit['id']}\nFrequency: {habit['frequency']}\nGoal: {habit['goal']} day streak"

@mcp.tool()
def log_habit(habit_id: str, date: str = None) -> str:
    """
    Log completion of a habit for a specific date.
    
    Args:
        habit_id: ID of the habit to log
        date: Date in YYYY-MM-DD format (defaults to today)
    
    Returns:
        Confirmation with current streak
    """
    habit = next((h for h in tracker.habits if h["id"] == habit_id), None)
    if not habit:
        return f"❌ Habit not found with ID: {habit_id}"
    
    log_date = date if date else datetime.now().strftime("%Y-%m-%d")
    
    # Check if already logged
    if any(c["habit_id"] == habit_id and c["date"] == log_date for c in tracker.completions):
        return f"ℹ️  Already logged for {log_date}"
    
    completion = {
        "habit_id": habit_id,
        "date": log_date,
        "logged_at": datetime.now().isoformat()
    }
    tracker.completions.append(completion)
    tracker.save_data()
    
    # Calculate streak
    dates = sorted([c["date"] for c in tracker.completions if c["habit_id"] == habit_id], reverse=True)
    streak = 1
    for i in range(len(dates) - 1):
        date1 = datetime.strptime(dates[i], "%Y-%m-%d")
        date2 = datetime.strptime(dates[i+1], "%Y-%m-%d")
        if (date1 - date2).days == 1:
            streak += 1
        else:
            break
    
    output = f"✅ Habit Logged\n━━━━━━━━━━━━━━━━━━━━\n"
    output += f"Habit: {habit['name']}\n"
    output += f"Date: {log_date}\n"
    output += f"Current Streak: {streak} days 🔥\n"
    output += f"Goal: {habit['goal']} days\n"
    
    if streak >= habit['goal']:
        output += f"\n🎉 Congratulations! You've reached your goal!"
    
    return output

@mcp.tool()
def list_habits() -> str:
    """
    List all tracked habits with their current streaks.
    
    Returns:
        List of all habits with statistics
    """
    if not tracker.habits:
        return "📝 No habits tracked yet. Add one with add_habit!"
    
    output = f"📋 Your Habits\n━━━━━━━━━━━━━━━━━━━━\n\n"
    
    for habit in tracker.habits:
        # Calculate streak
        dates = sorted([c["date"] for c in tracker.completions if c["habit_id"] == habit["id"]], reverse=True)
        streak = 0
        if dates:
            streak = 1
            for i in range(len(dates) - 1):
                date1 = datetime.strptime(dates[i], "%Y-%m-%d")
                date2 = datetime.strptime(dates[i+1], "%Y-%m-%d")
                if (date1 - date2).days == 1:
                    streak += 1
                else:
                    break
        
        total_completions = len([c for c in tracker.completions if c["habit_id"] == habit["id"]])
        
        output += f"📌 {habit['name']}\n"
        output += f"   ID: {habit['id']}\n"
        output += f"   Streak: {streak} days {'🔥' if streak > 0 else ''}\n"
        output += f"   Total: {total_completions} completions\n"
        output += f"   Goal: {habit['goal']} days\n\n"
    
    return output

@mcp.tool()
def get_habit_stats(habit_id: str) -> str:
    """
    Get detailed statistics for a specific habit.
    
    Args:
        habit_id: ID of the habit
    
    Returns:
        Detailed statistics and analytics
    """
    habit = next((h for h in tracker.habits if h["id"] == habit_id), None)
    if not habit:
        return f"❌ Habit not found with ID: {habit_id}"
    
    completions = [c for c in tracker.completions if c["habit_id"] == habit_id]
    dates = sorted([c["date"] for c in completions], reverse=True)
    
    # Calculate streak
    current_streak = 0
    if dates:
        current_streak = 1
        for i in range(len(dates) - 1):
            date1 = datetime.strptime(dates[i], "%Y-%m-%d")
            date2 = datetime.strptime(dates[i+1], "%Y-%m-%d")
            if (date1 - date2).days == 1:
                current_streak += 1
            else:
                break
    
    # Calculate best streak
    best_streak = 0
    if dates:
        temp_streak = 1
        best_streak = 1
        for i in range(len(dates) - 1):
            date1 = datetime.strptime(dates[i], "%Y-%m-%d")
            date2 = datetime.strptime(dates[i+1], "%Y-%m-%d")
            if (date1 - date2).days == 1:
                temp_streak += 1
                best_streak = max(best_streak, temp_streak)
            else:
                temp_streak = 1
    
    output = f"📊 Statistics for: {habit['name']}\n"
    output += f"━━━━━━━━━━━━━━━━━━━━\n\n"
    output += f"🔥 Current Streak: {current_streak} days\n"
    output += f"🏆 Best Streak: {best_streak} days\n"
    output += f"✅ Total Completions: {len(completions)}\n"
    output += f"🎯 Goal: {habit['goal']} days\n"
    output += f"📅 Created: {habit['created_at'][:10]}\n\n"
    
    if current_streak >= habit['goal']:
        output += f"🎉 Goal achieved! Keep it up!\n"
    elif current_streak > 0:
        remaining = habit['goal'] - current_streak
        output += f"💪 {remaining} more days to reach your goal!\n"
    
    return output

@mcp.tool()
def view_calendar(habit_id: str = None) -> str:
    """
    View habit completion calendar for the last 30 days.
    
    Args:
        habit_id: Optional habit ID (shows all habits if not specified)
    
    Returns:
        Visual calendar of completions
    """
    output = f"📅 Last 30 Days\n━━━━━━━━━━━━━━━━━━━━\n\n"
    
    habits_to_show = [h for h in tracker.habits if not habit_id or h["id"] == habit_id]
    
    if not habits_to_show:
        return "❌ No habits to display"
    
    for habit in habits_to_show:
        output += f"{habit['name']}:\n"
        
        # Get last 30 days
        today = datetime.now()
        calendar_str = ""
        for i in range(29, -1, -1):
            check_date = (today - timedelta(days=i)).strftime("%Y-%m-%d")
            completed = any(c["habit_id"] == habit["id"] and c["date"] == check_date for c in tracker.completions)
            calendar_str += "✅" if completed else "⬜"
            
            if (30 - i) % 10 == 0:
                calendar_str += " "
        
        output += f"{calendar_str}\n"
        output += f"{'─' * 35}\n\n"
    
    output += f"✅ = Completed  ⬜ = Missed\n"
    
    return output

if __name__ == "__main__":
    # Determine transport based on environment
    use_http = os.getenv("MCP_TRANSPORT") == "http" or "--http" in sys.argv
    
    if use_http:
        # Run with Streamable HTTP transport for ChatGPT
        port = int(os.getenv("PORT", "5003"))
        print(f"Habit Tracker MCP Server running on http://0.0.0.0:{port}", file=sys.stderr)
        print(f"MCP endpoint: http://0.0.0.0:{port}/", file=sys.stderr)
        mcp.run(transport="streamable-http", host="0.0.0.0", port=port)
    else:
        # Run with stdio transport for Claude Desktop
        print("Habit Tracker MCP Server running on stdio", file=sys.stderr)
        mcp.run(transport="stdio")
