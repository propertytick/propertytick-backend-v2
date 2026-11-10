const cron = require('node-cron');
const Project = require('../models/Project');

// Har ghante chalega (0 * * * *)
cron.schedule('0 * * * *', async () => {
  console.log('Running Cron Job: Checking Expired Trials...');
  try {
    const now = new Date();
    
    // Jinka trial khatam ho gaya aur payment nahi hua
    const result = await Project.updateMany(
      { 
        adType: 'upcoming_project', 
        trialEndDate: { $lt: now }, 
        isPaymentDone: false,
        status: 'active'
      },
      { 
        status: 'expired' 
      }
    );
    console.log(`${result.modifiedCount} projects expired successfully.`);
  } catch (error) {
    console.error('Cron Job Error:', error);
  }
});