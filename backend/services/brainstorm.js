/**
 * Brainstorm Service
 * Processes brainstorming sessions through OpenClaw agent system
 */

const config = require('../config');
const logger = require('../utils/logger');

/**
 * OpenClaw Gateway configuration
 */
const GATEWAY_HOST = process.env.OPENCLAW_GATEWAY_HOST || 'host.containers.internal';
const GATEWAY_PORT = process.env.OPENCLAW_GATEWAY_PORT || '18789';
const GATEWAY_URL = `http://${GATEWAY_HOST}:${GATEWAY_PORT}`;
const API_TIMEOUT = parseInt(process.env.OPENCLAW_API_TIMEOUT || '60000', 10);

/**
 * System prompt for brainstorm processing
 */
const BRAINSTORM_PROMPT = `You are a helpful brainstorming assistant. Your role is to take raw ideas and thoughts from the user and expand upon them, organizing them into a structured, actionable format.

When processing brainstorming input:
1. Analyze the key ideas and themes presented
2. Expand on each idea with additional context, considerations, and possibilities
3. Identify potential challenges, dependencies, or risks
4. Suggest concrete next steps or actions for each major idea
5. Organize the output in a clear, readable format

Format your response as:
## Summary
Brief summary of the core concept

## Key Ideas
- **Idea 1**: Description and expansion
- **Idea 2**: Description and expansion
...

## Considerations
- Potential challenges
- Dependencies
- Risks

## Suggested Tasks
1. [Task title] - Brief description
2. [Task title] - Brief description
...

Be thorough but concise. Focus on actionable insights.`;

/**
 * Process brainstorm input through OpenClaw agent
 * @param {string} input - User's raw brainstorming input
 * @param {string} title - Session title for context
 * @returns {Promise<{success: boolean, output?: string, error?: string}>}
 */
async function processBrainstormInput(input, title) {
  try {
    logger.info(`Processing brainstorm: ${title}`);
    
    // Build request to OpenClaw
    const url = `${GATEWAY_URL}/v1/chat`;
    
    const requestBody = {
      model: 'default',
      messages: [
        {
          role: 'system',
          content: BRAINSTORM_PROMPT
        },
        {
          role: 'user',
          content: `Title: ${title}\n\nMy ideas:\n\n${input}`
        }
      ],
      max_tokens: 4096,
      temperature: 0.7
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`OpenClaw API error: ${response.status} - ${errorText}`);
        return {
          success: false,
          error: `OpenClaw API returned ${response.status}: ${errorText}`
        };
      }

      const data = await response.json();

      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        logger.error('Invalid response from OpenClaw:', data);
        return {
          success: false,
          error: 'Invalid response from OpenClaw API'
        };
      }

      const output = data.choices[0].message.content;
      logger.info(`Brainstorm processed successfully: ${title}`);

      return {
        success: true,
        output
      };
    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      if (fetchError.name === 'AbortError') {
        logger.error('OpenClaw API timeout');
        return {
          success: false,
          error: 'Request timed out'
        };
      }
      throw fetchError;
    }
  } catch (error) {
    logger.error(`Failed to process brainstorm: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Parse agent output into task suggestions
 * @param {string} output - Agent's processed output
 * @returns {Array<{title: string, description: string, priority: string}>}
 */
function parseTasksFromOutput(output) {
  const tasks = [];
  
  try {
    // Look for "## Suggested Tasks" section
    const taskSectionMatch = output.match(/##\s*Suggested\s+Tasks?\s*\n([\s\S]*?)(?=\n##|$)/i);
    
    if (taskSectionMatch) {
      const taskSection = taskSectionMatch[1];
      // Match numbered or bulleted items
      const taskMatches = taskSection.matchAll(/^\s*(?:\d+[\.\)]|[-*])\s*(?:\[([^\]]+)\]\s*[-–—]\s*)?(.+?)(?:\n|$)/gm);
      
      for (const match of taskMatches) {
        const taskTitle = (match[2] || match[0]).trim();
        if (taskTitle) {
          tasks.push({
            title: taskTitle,
            description: '',
            priority: 'medium'
          });
        }
      }
    }
    
    // If no tasks found in dedicated section, try to extract from Key Ideas
    if (tasks.length === 0) {
      const ideasMatch = output.match(/##\s*Key\s+Ideas?\s*\n([\s\S]*?)(?=\n##|$)/i);
      
      if (ideasMatch) {
        const ideasSection = ideasMatch[1];
        const ideaMatches = ideasSection.matchAll(/^\s*[-*]\s*\*\*([^*]+)\*\*\s*[-–—:]?\s*(.+?)(?:\n|$)/gm);
        
        for (const match of ideaMatches) {
          const title = match[1].trim();
          const description = match[2] ? match[2].trim() : '';
          if (title) {
            tasks.push({
              title,
              description,
              priority: 'medium'
            });
          }
        }
      }
    }
  } catch (error) {
    logger.error(`Failed to parse tasks from output: ${error.message}`);
  }
  
  return tasks;
}

module.exports = {
  processBrainstormInput,
  parseTasksFromOutput
};