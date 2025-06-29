import { OverlaySummaryGenerator } from './lib/utils/overlay-summary-generator';
import * as path from 'path';

// Create an instance of the OverlaySummaryGenerator
const generator = new OverlaySummaryGenerator();

// Define the output file path
const outputPath = path.join(process.cwd(), 'map-overlays-summary.md');

// Generate and save the summary
generator.saveSummary(outputPath);

console.log('Map overlays summary generation complete.');
console.log(`Summary saved to: ${outputPath}`);
