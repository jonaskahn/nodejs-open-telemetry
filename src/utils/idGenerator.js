/**
 * Utility module for generating execution IDs
 */

/**
 * Generate a execution ID using datetime format with an optional prefix
 * Format: {prefix}-YYYYMMDD-HHmmss-xxx (where xxx is a random 3-digit number)
 *
 * @param {string} prefix - Optional prefix for the ID
 * @returns {string} - The formatted execution ID
 */
function generateExecutionId(prefix = 'exec') {
  const now = new Date();

  // Format: YYYYMMDD
  const datePart = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('');

  // Format: HHmmss
  const timePart = [
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
    String(now.getSeconds()).padStart(2, '0'),
  ].join('');

  // Random 3-digit number
  const randomPart = String(Math.floor(Math.random() * 1000)).padStart(3, '0');

  // Final ID format
  const executionId = `${prefix}-${datePart}-${timePart}-${randomPart}`;

  return executionId;
}

// For testing
if (require.main === module) {
  console.log('Test ID 1:', generateExecutionId('test'));
  console.log('Test ID 2:', generateExecutionId('backup'));
  console.log('Test ID 3:', generateExecutionId('report'));
}

module.exports = {
  generateExecutionId,
};
