const mongoose = require('mongoose');
const Habit = require('../models/Habit');

const userId = "682884ec22675577382851a4";

// Connect to MongoDB
mongoose.connect('mongodb+srv://Hilton:hilton@cluster0.rgtirz5.mongodb.net/habitvault?retryWrites=true&w=majority', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const habits = [
  {
    user: userId,
    name: "Morning Meditation",
    description: "15 minutes of mindfulness meditation every morning",
    targetDays: [0, 1, 2, 3, 4, 5, 6],
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
  },
  {
    user: userId,
    name: "Exercise",
    description: "30 minutes workout session",
    targetDays: [1, 3, 5], // Monday, Wednesday, Friday
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  },
  {
    user: userId,
    name: "Read Books",
    description: "Read for 30 minutes before bed",
    targetDays: [0, 1, 2, 3, 4, 5, 6],
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  },
  {
    user: userId,
    name: "Drink Water",
    description: "Drink 8 glasses of water daily",
    targetDays: [0, 1, 2, 3, 4, 5, 6],
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  },
  {
    user: userId,
    name: "Learn Programming",
    description: "Code practice for 1 hour",
    targetDays: [1, 2, 3, 4, 5], // Weekdays only
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  },
  {
    user: userId,
    name: "Practice Guitar",
    description: "Practice guitar for 20 minutes",
    targetDays: [2, 4, 6], // Tuesday, Thursday, Saturday
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  },
  {
    user: userId,
    name: "Journal Writing",
    description: "Write daily reflections before bed",
    targetDays: [0, 1, 2, 3, 4, 5, 6],
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  },
  {
    user: userId,
    name: "Healthy Breakfast",
    description: "Start day with a nutritious breakfast",
    targetDays: [1, 2, 3, 4, 5], // Weekdays focus
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  },
  {
    user: userId,
    name: "Evening Walk",
    description: "30 minutes walking after dinner",
    targetDays: [0, 2, 4, 6], // Alternating days
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  },
  {
    user: userId,
    name: "Language Learning",
    description: "Practice Spanish for 15 minutes",
    targetDays: [1, 3, 5], // Monday, Wednesday, Friday
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  },
  {
    user: userId,
    name: "Declutter Space",
    description: "Organize one small area of living space",
    targetDays: [6], // Saturday only
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  },
  {
    user: userId,
    name: "Family Time",
    description: "Quality time with family - games or conversation",
    targetDays: [0], // Sunday only
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  }
];

// Function to generate random check-ins for the past 30 days
const generateCheckIns = (targetDays) => {
  const checkIns = [];
  const today = new Date();
  
  for (let i = 0; i < 30; i++) {
    const date = new Date(today - i * 24 * 60 * 60 * 1000);
    const dayOfWeek = date.getDay();
    
    // Only create check-ins for target days
    if (targetDays.includes(dayOfWeek)) {
      // 80% chance of completing the habit
      const status = Math.random() < 0.8 ? 'completed' : 'missed';
      checkIns.push({
        date,
        status
      });
    }
  }
  
  return checkIns;
};

async function seedHabits() {
  try {
    // Clear existing habits for this user
    await Habit.deleteMany({ user: userId });

    // Create new habits with check-ins
    for (const habit of habits) {
      const checkIns = generateCheckIns(habit.targetDays);
      const newHabit = new Habit({
        ...habit,
        checkIns
      });
      
      // Calculate streaks before saving
      newHabit.calculateStreaks();
      await newHabit.save();
    }

    console.log('Habits seeded successfully!');
    mongoose.connection.close();
  } catch (error) {
    console.error('Error seeding habits:', error);
    mongoose.connection.close();
  }
}

seedHabits(); 