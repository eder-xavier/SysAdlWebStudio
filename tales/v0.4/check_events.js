const fs = require('fs');

// Read the generated file and extract just the events object
const content = fs.readFileSync('/Users/tales/desenv/SysAdlWebStudio/tales/v0.4/generated/AGV-completo-env-scen.js', 'utf8');

// Extract the events object line (it's in JSON format in the constructor)
const eventsLine = content.match(/events: \{.+?\}/);
if (eventsLine) {
  // The line contains the JSON but it's very long, let's extract just the keys
  const eventsMatch = content.match(/events: (\{.+?\})/);
  if (eventsMatch) {
    try {
      // Extract just a portion to see the structure
      const eventsStart = content.indexOf('events: {');
      let braceCount = 0;
      let i = eventsStart + 8; // Start after 'events: {'
      let endIndex = i;
      
      while (i < content.length && !(braceCount === 0 && content[i] === '}')) {
        if (content[i] === '{') braceCount++;
        if (content[i] === '}') braceCount--;
        i++;
        endIndex = i;
      }
      
      const eventsContent = content.substring(eventsStart, endIndex + 1);
      
      // Try to parse just the structure to get the keys
      const match = eventsContent.match(/events: (\{.*?\})/s);
      if (match) {
        const eventsObj = JSON.parse(match[1]);
        console.log('Event definitions found:');
        console.log('Total events:', Object.keys(eventsObj).length);
        for (const [eventName, eventData] of Object.entries(eventsObj)) {
          console.log(`\n${eventName}:`);
          console.log(`  - Type: ${eventData.type}`);
          console.log(`  - Target: ${eventData.target}`);
          console.log(`  - Rules: ${eventData.rules.length}`);
          if (eventData.rules.length > 0) {
            console.log(`    First rule trigger: ${eventData.rules[0].trigger}`);
            console.log(`    Actions: ${eventData.rules[0].actions.map(a => a.name).join(', ')}`);
          }
        }
      }
    } catch (error) {
      console.log('Error parsing:', error.message);
      console.log('Found events line:', eventsLine[0].substring(0, 200) + '...');
    }
  }
} else {
  console.log('Events object not found');
}