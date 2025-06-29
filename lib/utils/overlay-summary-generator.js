import * as fs from 'fs';
import * as path from 'path';
import { OverlayYamlManager } from './overlay-yaml-manager';
/**
 * Class for generating a summary of map-overlays.yaml
 * The summary includes id, name, category, subcategory, icons, description,
 * more-info items, and operating times by day of the week
 */
export class OverlaySummaryGenerator {
    /**
     * Constructor for OverlaySummaryGenerator
     * @param dataPath Path to the data directory containing YAML files
     */
    constructor(dataPath = path.join(process.cwd(), 'data')) {
        this.yamlManager = new OverlayYamlManager(dataPath);
    }
    /**
     * Generate a summary of all map overlays
     * @returns A string containing the summary
     */
    generateSummary() {
        const mapOverlays = this.yamlManager.getMapOverlays();
        const mapOverlaysCategories = this.yamlManager.getMapOverlaysCategories();
        let summary = "# Map Overlays Summary\n\n";
        // Process each overlay
        for (const overlay of mapOverlays) {
            summary += this.generateOverlaySummary(overlay, mapOverlaysCategories);
        }
        return summary;
    }
    /**
     * Generate a summary for a single overlay
     * @param overlay The overlay object
     * @param categories The map overlays categories
     * @returns A string containing the summary for the overlay
     */
    generateOverlaySummary(overlay, categories) {
        let summary = `## ${overlay.name} (ID: ${overlay.id})\n\n`;
        // Category and subcategory
        const category = categories[overlay.category];
        const subcategory = category?.subcategories?.[overlay.subcategory];
        summary += `**Category:** ${category?.name || overlay.category}\n`;
        summary += `**Subcategory:** ${subcategory?.name || overlay.subcategory}\n\n`;
        // Icons
        const categoryIcon = category?.icon || '';
        const subcategoryIcon = subcategory?.icon || categoryIcon;
        summary += `**Category Icon:** ${categoryIcon}\n`;
        summary += `**Subcategory Icon:** ${subcategoryIcon}\n\n`;
        // Description
        if (overlay.description) {
            summary += `**Description:** ${overlay.description}\n\n`;
        }
        // More info items
        if (overlay['more-info'] && Array.isArray(overlay['more-info'])) {
            summary += "**More Info:**\n";
            for (const infoItem of overlay['more-info']) {
                if (infoItem.source && infoItem.lookup) {
                    summary += `- ${infoItem.lookup} (from ${infoItem.source}):\n`;
                    if (infoItem.items && Array.isArray(infoItem.items)) {
                        for (const item of infoItem.items) {
                            summary += `  - ${item}\n`;
                        }
                    }
                    else if (infoItem.items === null) {
                        // When items is null, we should indicate that no specific items are listed
                        summary += `  - (No specific items listed)\n`;
                    }
                    else {
                        summary += `  - No items specified\n`;
                    }
                }
            }
            summary += "\n";
        }
        // Operating times
        if (overlay['operating-times']) {
            summary += "**Operating Times:**\n";
            const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
            for (const day of days) {
                const dayInfo = overlay['operating-times'][day];
                if (dayInfo) {
                    summary += `- ${day.charAt(0).toUpperCase() + day.slice(1)}: `;
                    if (dayInfo['open-this-day'] === false) {
                        summary += "Closed\n";
                    }
                    else if (dayInfo['is24hour']) {
                        summary += "Open 24 hours\n";
                    }
                    else {
                        const openTime = dayInfo['open'] || 'N/A';
                        const closeTime = dayInfo['close'] || 'N/A';
                        summary += `${openTime} - ${closeTime}\n`;
                    }
                }
            }
            summary += "\n";
        }
        return summary;
    }
    /**
     * Save the summary to a file
     * @param outputPath Path to save the summary file
     */
    saveSummary(outputPath) {
        const summary = this.generateSummary();
        fs.writeFileSync(outputPath, summary);
        console.log(`Summary saved to ${outputPath}`);
    }
}
// Example usage:
// const generator = new OverlaySummaryGenerator();
// generator.saveSummary('map-overlays-summary.md');
