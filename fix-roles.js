require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User'); // Path apne hisaab se check karein

async function fixRoles() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const result = await User.updateMany(
      { role: 'rent' },
      { $set: { role: 'buyer' } }
    );

    console.log(`Updated ${result.modifiedCount} users from 'rent' to 'buyer'`);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

fixRoles();