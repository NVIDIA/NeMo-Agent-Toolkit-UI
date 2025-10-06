// File size limits (JavaScript version for next.config.js)
const ONE_MB_IN_BYTES = 1 * 1024 * 1024; // 1MB in bytes
const MAX_FILE_SIZE_BYTES = ONE_MB_IN_BYTES * 5; // 5MB in bytes
const MAX_FILE_SIZE_STRING = '5mb'; // 5MB as string for API configs

module.exports = {
  ONE_MB_IN_BYTES,
  MAX_FILE_SIZE_BYTES,
  MAX_FILE_SIZE_STRING,
};
