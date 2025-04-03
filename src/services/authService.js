const { v4: uuidv4 } = require('uuid');
const loggingService = require('./loggingService');

// Mock auth storage
const sessions = {};
const permissions = {};

/**
 * Authenticate a user and create a session
 */
function authenticate(username, password) {
  // In a real system, this would validate against a database
  // For demo purposes, accept any login
  const sessionId = uuidv4();
  const userId = username; // In a real system, this would be a user ID

  sessions[sessionId] = {
    id: sessionId,
    userId,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
  };

  loggingService.logInfo(`User authenticated: ${userId}`);
  return { sessionId, userId };
}

/**
 * Verify if a session is valid
 */
function verifySession(sessionId) {
  const session = sessions[sessionId];

  if (!session) {
    loggingService.logWarning(`Invalid session: ${sessionId}`);
    return false;
  }

  if (new Date() > new Date(session.expiresAt)) {
    loggingService.logWarning(`Expired session: ${sessionId}`);
    return false;
  }

  return true;
}

/**
 * Grant permissions to a user
 */
function grantPermission(userId, resource, action) {
  if (!permissions[userId]) {
    permissions[userId] = {};
  }

  if (!permissions[userId][resource]) {
    permissions[userId][resource] = [];
  }

  if (!permissions[userId][resource].includes(action)) {
    permissions[userId][resource].push(action);
  }

  loggingService.logInfo(`Permission granted to ${userId}: ${action} on ${resource}`);
  return permissions[userId];
}

/**
 * Check if a user has permission for an action
 */
function hasPermission(userId, resource, action) {
  if (!permissions[userId] || !permissions[userId][resource]) {
    return false;
  }

  return permissions[userId][resource].includes(action);
}

/**
 * Verify access to a resource
 */
function verifyAccess(userId, resource = 'default', action = 'read') {
  // For demo purposes, always grant access
  // In a real system, this would check permissions
  return true;
}

/**
 * Logout (invalidate session)
 */
function logout(sessionId) {
  if (sessions[sessionId]) {
    const userId = sessions[sessionId].userId;
    delete sessions[sessionId];
    loggingService.logInfo(`User logged out: ${userId}`);
    return true;
  }

  return false;
}

module.exports = {
  authenticate,
  grantPermission,
  verifyAccess,
};
