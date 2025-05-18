const mongoose = require('mongoose');

const habitSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  targetDays: {
    type: [Number], // 0-6 representing Sunday-Saturday
    default: [0, 1, 2, 3, 4, 5, 6] // Default to every day
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  checkIns: [{
    date: {
      type: Date,
      required: true
    },
    status: {
      type: String,
      enum: ['completed', 'missed', null],
      required: false // Allow null status
    }
  }],
  streaks: {
    current: {
      type: Number,
      default: 0
    },
    longest: {
      type: Number,
      default: 0
    },
    lastCheckIn: {
      type: Date
    }
  },
  isArchived: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for efficient queries
habitSchema.index({ user: 1, createdAt: -1 });
habitSchema.index({ 'checkIns.date': 1 });

// Method to calculate streaks
habitSchema.methods.calculateStreaks = function() {
  if (!this.checkIns.length) {
    this.streaks.current = 0;
    this.streaks.longest = Math.max(0, this.streaks.longest);
    this.streaks.lastCheckIn = null;
    return;
  }

  let currentStreak = 0;
  let longestStreak = this.streaks.longest;
  const sortedCheckIns = this.checkIns
    .filter(checkIn => checkIn.status === 'completed') // Only count completed check-ins
    .sort((a, b) => b.date - a.date);
  
  if (sortedCheckIns.length === 0) {
    this.streaks.current = 0;
    this.streaks.longest = Math.max(0, this.streaks.longest);
    this.streaks.lastCheckIn = this.checkIns[0]?.date || null;
    return;
  }

  // Calculate current streak
  let lastDate = new Date();
  for (const checkIn of sortedCheckIns) {
    const timeDiff = Math.abs(lastDate - checkIn.date);
    if (timeDiff <= 86400000) { // Within 24 hours
      currentStreak++;
      lastDate = checkIn.date;
    } else {
      break;
    }
  }

  this.streaks.current = currentStreak;
  this.streaks.longest = Math.max(longestStreak, currentStreak);
  this.streaks.lastCheckIn = this.checkIns[0]?.date || null;
};

const Habit = mongoose.model('Habit', habitSchema);
module.exports = Habit; 