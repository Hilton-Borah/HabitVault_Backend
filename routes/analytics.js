const express = require('express');
const auth = require('../middleware/auth');
const Habit = require('../models/Habit');

const router = express.Router();

// Get user's habit statistics
router.get('/stats', auth, async (req, res) => {
  try {
    const habits = await Habit.find({
      user: req.user._id,
      isArchived: false
    });

    const totalHabits = habits.length;
    let totalCheckIns = 0;
    let completedCheckIns = 0;
    let bestStreak = 0;
    let bestHabit = null;

    habits.forEach(habit => {
      totalCheckIns += habit.checkIns.length;
      completedCheckIns += habit.checkIns.filter(c => c.status === 'completed').length;
      
      if (habit.streaks.longest > bestStreak) {
        bestStreak = habit.streaks.longest;
        bestHabit = {
          id: habit._id,
          name: habit.name,
          streak: habit.streaks.longest
        };
      }
    });

    const completionRate = totalCheckIns > 0 
      ? (completedCheckIns / totalCheckIns * 100).toFixed(1)
      : 0;

    res.json({
      totalHabits,
      totalCheckIns,
      completedCheckIns,
      completionRate,
      bestHabit
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get habit completion trends
router.get('/trends', auth, async (req, res) => {
  try {
    const { timeRange = 'week' } = req.query;
    const habits = await Habit.find({
      user: req.user._id,
      isArchived: false
    });

    const now = new Date();
    const startDate = new Date();
    
    if (timeRange === 'week') {
      startDate.setDate(now.getDate() - 7);
    } else if (timeRange === 'month') {
      startDate.setMonth(now.getMonth() - 1);
    }

    // Initialize daily stats
    const dailyStats = {};
    let currentDate = new Date(startDate);
    
    while (currentDate <= now) {
      const dateKey = currentDate.toISOString().split('T')[0];
      dailyStats[dateKey] = {
        total: 0,
        completed: 0
      };
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Calculate daily completion rates
    habits.forEach(habit => {
      habit.checkIns
        .filter(checkIn => checkIn.date >= startDate && checkIn.date <= now)
        .forEach(checkIn => {
          const dateKey = checkIn.date.toISOString().split('T')[0];
          if (dailyStats[dateKey]) {
            dailyStats[dateKey].total++;
            if (checkIn.status === 'completed') {
              dailyStats[dateKey].completed++;
            }
          }
        });
    });

    // Convert to array format for frontend charts
    const trends = Object.entries(dailyStats).map(([date, stats]) => ({
      date,
      completionRate: stats.total > 0 
        ? (stats.completed / stats.total * 100).toFixed(1)
        : 0,
      completed: stats.completed,
      total: stats.total
    }));

    res.json(trends);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get habit performance ranking
router.get('/ranking', auth, async (req, res) => {
  try {
    const habits = await Habit.find({
      user: req.user._id,
      isArchived: false
    });

    const rankings = habits.map(habit => {
      const totalCheckIns = habit.checkIns.length;
      const completedCheckIns = habit.checkIns.filter(c => c.status === 'completed').length;
      const completionRate = totalCheckIns > 0 
        ? (completedCheckIns / totalCheckIns * 100).toFixed(1)
        : 0;

      return {
        id: habit._id,
        name: habit.name,
        completionRate: parseFloat(completionRate),
        currentStreak: habit.streaks.current,
        longestStreak: habit.streaks.longest,
        totalCheckIns,
        completedCheckIns
      };
    });

    // Sort by completion rate descending
    rankings.sort((a, b) => b.completionRate - a.completionRate);

    res.json(rankings);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 