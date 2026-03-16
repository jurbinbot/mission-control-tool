/**
 * Brainstorm Model
 * Stores brainstorming sessions for idea evolution
 */

const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

/**
 * Brainstorm Status States
 */
const BrainstormStatus = {
  DRAFT: 'draft',
  PROCESSED: 'processed',
  CONVERTED: 'converted'
};

/**
 * Data directory for persistence
 */
const DATA_DIR = process.env.DATA_DIR || '/app/data';
const BRAINSTORMS_FILE = path.join(DATA_DIR, 'brainstorms.json');

/**
 * In-memory storage for brainstorming sessions
 */
let brainstorms = [];
let brainstormIdCounter = 1;

/**
 * Ensure data directory exists
 */
function ensureDataDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      logger.info(`Created data directory: ${DATA_DIR}`);
    }
  } catch (error) {
    logger.error(`Failed to create data directory: ${error.message}`);
  }
}

/**
 * Save brainstorms to disk
 */
function saveBrainstorms() {
  try {
    ensureDataDir();
    const data = {
      brainstorms: brainstorms.map(formatBrainstormResponse),
      brainstormIdCounter,
      savedAt: new Date().toISOString()
    };
    fs.writeFileSync(BRAINSTORMS_FILE, JSON.stringify(data, null, 2), 'utf8');
    logger.debug(`Saved ${brainstorms.length} brainstorms to ${BRAINSTORMS_FILE}`);
  } catch (error) {
    logger.error(`Failed to save brainstorms: ${error.message}`);
  }
}

/**
 * Load brainstorms from disk
 */
function loadBrainstorms() {
  try {
    ensureDataDir();
    if (fs.existsSync(BRAINSTORMS_FILE)) {
      const data = JSON.parse(fs.readFileSync(BRAINSTORMS_FILE, 'utf8'));
      brainstorms = data.brainstorms.map(b => ({
        id: b.id,
        title: b.title,
        input: b.input,
        output: b.output,
        status: b.status,
        createdAt: b.createdAt,
        updatedAt: b.updatedAt,
        convertedTo: b.convertedTo || []
      }));
      brainstormIdCounter = data.brainstormIdCounter || brainstorms.length + 1;
      logger.info(`Loaded ${brainstorms.length} brainstorms from ${BRAINSTORMS_FILE}`);
    } else {
      logger.info('No brainstorms file found, starting fresh');
    }
  } catch (error) {
    logger.error(`Failed to load brainstorms: ${error.message}`);
    brainstorms = [];
    brainstormIdCounter = 1;
  }
}

/**
 * Brainstorm Object Format
 */
class Brainstorm {
  constructor(data) {
    this.id = `bs-${Date.now()}-${brainstormIdCounter++}`;
    this.title = data.title || 'Untitled Brainstorm';
    this.input = data.input || '';
    this.output = null;
    this.status = BrainstormStatus.DRAFT;
    this.createdAt = new Date().toISOString();
    this.updatedAt = new Date().toISOString();
    this.convertedTo = [];
  }

  update(data) {
    if (data.title !== undefined) this.title = data.title;
    if (data.input !== undefined) this.input = data.input;
    if (data.output !== undefined) this.output = data.output;
    if (data.status !== undefined) this.status = data.status;
    if (data.convertedTo !== undefined) this.convertedTo = data.convertedTo;
    this.updatedAt = new Date().toISOString();
    return this;
  }
}

/**
 * Create a new brainstorm
 */
function createBrainstorm(data) {
  const brainstorm = new Brainstorm(data);
  brainstorms.push(brainstorm);
  saveBrainstorms();
  return brainstorm;
}

/**
 * Get all brainstorms
 */
function getAllBrainstorms() {
  return [...brainstorms];
}

/**
 * Get brainstorm by ID
 */
function getBrainstormById(id) {
  return brainstorms.find(b => b.id === id);
}

/**
 * Update brainstorm
 */
function updateBrainstorm(id, data) {
  const brainstorm = getBrainstormById(id);
  if (!brainstorm) return null;
  
  // Update properties directly (works for both new and loaded brainstorms)
  if (data.title !== undefined) brainstorm.title = data.title;
  if (data.input !== undefined) brainstorm.input = data.input;
  if (data.output !== undefined) brainstorm.output = data.output;
  if (data.status !== undefined) brainstorm.status = data.status;
  if (data.convertedTo !== undefined) brainstorm.convertedTo = data.convertedTo;
  brainstorm.updatedAt = new Date().toISOString();
  
  saveBrainstorms();
  return brainstorm;
}

/**
 * Delete brainstorm
 */
function deleteBrainstorm(id) {
  const index = brainstorms.findIndex(b => b.id === id);
  if (index === -1) return false;
  brainstorms.splice(index, 1);
  saveBrainstorms();
  return true;
}

/**
 * Mark brainstorm as processed with output
 */
function processBrainstorm(id, output) {
  return updateBrainstorm(id, {
    output,
    status: BrainstormStatus.PROCESSED
  });
}

/**
 * Mark brainstorm as converted and link to tasks
 */
function convertBrainstorm(id, taskIds) {
  return updateBrainstorm(id, {
    convertedTo: taskIds,
    status: BrainstormStatus.CONVERTED
  });
}

/**
 * Clear all brainstorms (useful for testing/reset)
 */
function clearAllBrainstorms() {
  brainstorms = [];
  brainstormIdCounter = 1;
  saveBrainstorms();
}

/**
 * Format brainstorm for API response
 */
function formatBrainstormResponse(brainstorm) {
  if (!brainstorm) return null;
  return {
    id: brainstorm.id,
    title: brainstorm.title,
    input: brainstorm.input,
    output: brainstorm.output,
    status: brainstorm.status,
    createdAt: brainstorm.createdAt,
    updatedAt: brainstorm.updatedAt,
    convertedTo: brainstorm.convertedTo
  };
}

// Load brainstorms on module initialization
loadBrainstorms();

module.exports = {
  Brainstorm,
  BrainstormStatus,
  createBrainstorm,
  getAllBrainstorms,
  getBrainstormById,
  updateBrainstorm,
  deleteBrainstorm,
  processBrainstorm,
  convertBrainstorm,
  clearAllBrainstorms,
  formatBrainstormResponse,
  loadBrainstorms,
  saveBrainstorms
};