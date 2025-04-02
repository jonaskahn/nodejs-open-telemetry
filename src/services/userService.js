const { v4: uuidv4 } = require("uuid");
const authService = require("./authService");
const loggingService = require("./loggingService");

// Mock users database
const users = {};

/**
 * Create a new user
 */
function createUser(userData) {
  const userId = uuidv4();
  users[userId] = {
    ...userData,
    id: userId,
    createdAt: new Date(),
  };

  loggingService.logInfo(`User created: ${userId}`);
  return users[userId];
}

/**
 * Get user by ID
 */
function getUserById(userId) {
  if (authService.verifyAccess(userId)) {
    return users[userId] || null;
  }

  loggingService.logError(`Unauthorized access attempt for user: ${userId}`);
  return null;
}

/**
 * Update user data
 */
function updateUser(userId, userData) {
  if (!users[userId]) {
    loggingService.logError(`User not found: ${userId}`);
    return null;
  }

  users[userId] = { ...users[userId], ...userData };
  loggingService.logInfo(`User updated: ${userId}`);
  return users[userId];
}

/**
 * Get all users
 */
function getAllUsers() {
  return Object.values(users);
}

module.exports = {
  createUser,
  getUserById,
  updateUser,
  getAllUsers,
};
