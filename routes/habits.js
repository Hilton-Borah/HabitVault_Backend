const express = require('express');
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const Habit = require('../models/Habit');

const router = express.Router();

// Validation middleware
const validateHabit = [
  body('name').trim().notEmpty(),
  body('targetDays').isArray(),
  body('startDate').optional().isISO8601()
];

// Get all habits for user
router.get('/', auth, async (req, res) => {
  try {
    const habits = await Habit.find({
      user: req.user._id,
      isArchived: false
    }).sort({ createdAt: -1 });
    
    res.json(habits);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new habit
router.post('/', auth, validateHabit, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description, targetDays, startDate } = req.body;

    const habit = new Habit({
      user: req.user._id,
      name,
      description,
      targetDays,
      startDate: startDate || new Date()
    });

    await habit.save();
    res.status(201).json(habit);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update habit
router.patch('/:id', auth, async (req, res) => {
  try {
    const updates = Object.keys(req.body);
    const allowedUpdates = ['name', 'description', 'targetDays', 'isArchived'];
    const isValidOperation = updates.every(update => allowedUpdates.includes(update));

    if (!isValidOperation) {
      return res.status(400).json({ message: 'Invalid updates' });
    }

    const habit = await Habit.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!habit) {
      return res.status(404).json({ message: 'Habit not found' });
    }

    updates.forEach(update => habit[update] = req.body[update]);
    await habit.save();

    res.json(habit);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete habit
router.delete('/:id', auth, async (req, res) => {
  try {
    const habit = await Habit.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id
    });

    if (!habit) {
      return res.status(404).json({ message: 'Habit not found' });
    }

    res.json(habit);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Add check-in
router.post('/:id/check-in', auth, async (req, res) => {
  try {
    const { date, status } = req.body;
    
    // Validate date
    const checkInDate = new Date(date);
    if (isNaN(checkInDate.getTime())) {
      return res.status(400).json({ message: 'Invalid date format' });
    }

    // Find the habit
    const habit = await Habit.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!habit) {
      return res.status(404).json({ message: 'Habit not found' });
    }

    // Convert the date to local midnight
    const localDate = new Date(checkInDate);
    localDate.setHours(0, 0, 0, 0);
    
    // Remove existing check-in for the same date if exists
    habit.checkIns = habit.checkIns.filter(checkIn => {
      const existingDate = new Date(checkIn.date);
      existingDate.setHours(0, 0, 0, 0);
      return existingDate.getTime() !== localDate.getTime();
    });

    // Add new check-in if status is provided
    if (status !== null && status !== undefined) {
      habit.checkIns.push({
        date: localDate,
        status
      });
    }

    // Sort check-ins by date
    habit.checkIns.sort((a, b) => b.date - a.date);

    // Recalculate streaks
    habit.calculateStreaks();
    
    // Save the updated habit
    await habit.save();

    res.json(habit);
  } catch (error) {
    console.error('Check-in error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get habit history
router.get('/:id/history', auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const habit = await Habit.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!habit) {
      return res.status(404).json({ message: 'Habit not found' });
    }

    let checkIns = habit.checkIns;
    
    if (startDate) {
      checkIns = checkIns.filter(checkIn => 
        checkIn.date >= new Date(startDate)
      );
    }
    
    if (endDate) {
      checkIns = checkIns.filter(checkIn => 
        checkIn.date <= new Date(endDate)
      );
    }

    res.json({
      habit: {
        id: habit._id,
        name: habit.name,
        streaks: habit.streaks
      },
      checkIns
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get today's habits
router.get('/today', auth, async (req, res) => {
  try {
    const today = new Date();
    const todayDay = today.getDay(); // 0-6 for Sunday-Saturday
    const todayStr = today.toISOString().split('T')[0];

    // Find habits targeted for today
    const habits = await Habit.find({
      user: req.user._id,
      isArchived: false,
      targetDays: todayDay
    });

    // Filter out habits that are already completed today
    const todayHabits = habits.filter(habit => {
      const todayCheckIn = habit.checkIns.find(
        checkIn => checkIn.date.toISOString().split('T')[0] === todayStr
      );
      return !todayCheckIn || todayCheckIn.status !== 'completed';
    });

    res.json(todayHabits);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 