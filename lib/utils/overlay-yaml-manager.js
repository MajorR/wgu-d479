import * as yaml from 'js-yaml';
import * as fs from 'fs';
import * as path from 'path';
/**
 * Class for managing YAML overlay files
 * Loads map-overlays.yaml, map-overlays-categories.yaml, theaters-movies.yaml, and place-features.yaml
 * Resolves references between files according to specified rules
 */
export class OverlayYamlManager {
    /**
     * Constructor for OverlayYamlManager
     * @param dataPath Path to the data directory containing YAML files
     */
    constructor(dataPath = path.join(process.cwd(), 'data')) {
        this.dataPath = dataPath;
        this.loadYamlFiles();
    }
    /**
     * Load all required YAML files
     */
    loadYamlFiles() {
        try {
            // Load all YAML files
            this.mapOverlays = yaml.load(fs.readFileSync(path.join(this.dataPath, 'map-overlays.yaml'), 'utf8'));
            this.mapOverlaysCategories = yaml.load(fs.readFileSync(path.join(this.dataPath, 'map-overlays-categories.yaml'), 'utf8'));
            this.theatersMovies = yaml.load(fs.readFileSync(path.join(this.dataPath, 'theaters-movies.yaml'), 'utf8'));
            this.placeFeatures = yaml.load(fs.readFileSync(path.join(this.dataPath, 'place-features.yaml'), 'utf8'));
            // Process references
            this.processReferences();
            console.log('YAML files loaded successfully');
        }
        catch (error) {
            console.error('Error loading YAML files:', error);
            throw error;
        }
    }
    /**
     * Process references between YAML files
     * - Category in map-overlays.yaml references key in map-overlays-categories
     * - Sub_category in map-overlays.yaml references category.subcategory in map-overlays-categories
     * - Items in more-info reference keys in the dictionary specified by source
     */
    processReferences() {
        if (!this.mapOverlays || !this.mapOverlaysCategories) {
            console.error('YAML files not loaded yet');
            return;
        }
        // Process each item in the map overlays
        for (const item of this.mapOverlays) {
            // Store original category string before replacing it
            const originalCategory = item.category;
            // Reference category
            item.category = this.mapOverlaysCategories[item.category];
            if (item.subcategory)
                item.subcategory = item.category.subcategories[item.subcategory];
            // Process more-info items
            if (item['more-info'] && Array.isArray(item['more-info'])) {
                for (const infoItem of item['more-info']) {
                    if (infoItem.source && infoItem.items) {
                        this.processMoreInfoItems(infoItem, originalCategory);
                    }
                }
            }
        }
    }
    /**
     * Process more-info items with improved lookup logic
     * @param infoItem The more-info item to process
     * @param itemCategory The category of the parent item (for context)
     */
    processMoreInfoItems(infoItem, itemCategory) {
        const sourceDict = this.getSourceDictionary(infoItem.source);
        if (!sourceDict)
            return;
        const resolvedItems = [];
        // Determine the lookup path
        let lookupDict = null;
        if (infoItem.lookup) {
            // New simplified structure: use explicit lookup field
            // For place-features: category.lookup (e.g., hotels.amenities, theaters.features)
            // For theaters-movies: lookup directly (e.g., movies)
            if (infoItem.source === 'place-features') {
                const categoryKey = itemCategory === 'theaters' ? 'theaters' : itemCategory;
                lookupDict = sourceDict[categoryKey]?.[infoItem.lookup];
            }
            else if (infoItem.source === 'theaters-movies') {
                lookupDict = sourceDict.theaters?.[infoItem.lookup];
            }
        }
        else {
            // Backward compatibility: try old lookup logic
            if (sourceDict[infoItem.lookup]) {
                lookupDict = sourceDict[infoItem.lookup];
            }
        }
        if (!lookupDict)
            return;
        // Process each item in the items list
        for (const itemRef of infoItem.items) {
            let referencedItem = null;
            if (typeof itemRef === 'string') {
                // Simple string lookup - find item by name/key
                if (Array.isArray(lookupDict)) {
                    // Array format: find item where the key matches the string
                    referencedItem = lookupDict.find((item) => {
                        if (typeof item === 'object') {
                            // Check if any key in the object matches the itemRef
                            return Object.keys(item).includes(itemRef);
                        }
                        return false;
                    });
                    // If found, extract the specific item
                    if (referencedItem) {
                        const itemData = referencedItem[itemRef];
                        if (itemData && typeof itemData === 'object') {
                            referencedItem = { name: itemRef, ...itemData };
                        }
                        else {
                            // Handle case where itemData is null or primitive - extract other properties
                            const otherProps = { ...referencedItem };
                            delete otherProps[itemRef];
                            referencedItem = { name: itemRef, ...otherProps };
                        }
                    }
                }
                else if (typeof lookupDict === 'object') {
                    // Object format: direct key lookup
                    if (lookupDict[itemRef]) {
                        referencedItem = { name: itemRef, ...lookupDict[itemRef] };
                    }
                }
            }
            else if (typeof itemRef === 'object') {
                // Complex object lookup - handle different structures
                // Check if this is a theater movie item with UUID key and showings
                const itemKeys = Object.keys(itemRef);
                const uuidKey = itemKeys.find(key => key.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i));
                if (uuidKey && infoItem.source === 'theaters-movies') {
                    // This is a theater movie item with UUID and showings
                    if (Array.isArray(lookupDict)) {
                        // Find the movie data by UUID
                        const movieData = lookupDict.find((item) => {
                            return typeof item === 'object' && Object.keys(item).includes(uuidKey);
                        });
                        if (movieData) {
                            // The movie data structure is: { "uuid": null, title: "...", director: "...", etc. }
                            // Extract all properties except the UUID key
                            const movieInfo = { ...movieData };
                            delete movieInfo[uuidKey]; // Remove the UUID key since it's null
                            // Combine movie data with showings from the original item
                            referencedItem = {
                                id: uuidKey,
                                ...movieInfo,
                                showings: itemRef.showings || itemRef[uuidKey]?.showings
                            };
                        }
                    }
                }
                else {
                    // Original logic for other object types
                    const lookupId = itemRef.id || itemRef;
                    if (Array.isArray(lookupDict)) {
                        referencedItem = lookupDict.find((item) => item.id === lookupId);
                    }
                    else if (typeof lookupDict === 'object') {
                        referencedItem = lookupDict[lookupId];
                    }
                }
            }
            if (referencedItem) {
                resolvedItems.push(referencedItem);
            }
        }
        // Add resolved items to the info item
        infoItem.resolvedItems = resolvedItems;
    }
    /**
     * Get the source dictionary based on the source name
     * @param source Source name (e.g., 'place-features', 'theaters-movies')
     * @returns The corresponding dictionary
     */
    getSourceDictionary(source) {
        switch (source) {
            case 'place-features':
                return this.placeFeatures;
            case 'theaters-movies':
                return this.theatersMovies;
            default:
                return null;
        }
    }
    /**
     * Get the overlay info for a given ID
     * @param id The overlay ID
     * @returns Overlay info with resolved references
     */
    getOverlayInfo(id) {
        return this.mapOverlays.find((overlay) => overlay.id === id);
    }
    /**
     * Get the map overlays data
     * @returns Map overlays data with resolved references
     */
    getMapOverlays() {
        return this.mapOverlays;
    }
    /**
     * Get the map overlays categories data
     * @returns Map overlays categories data
     */
    getMapOverlaysCategories() {
        return this.mapOverlaysCategories;
    }
    /**
     * Get the theaters movies data
     * @returns Theaters movies data
     */
    getTheatersMovies() {
        return this.theatersMovies;
    }
    /**
     * Get the place features data
     * @returns Place features data
     */
    getPlaceFeatures() {
        return this.placeFeatures;
    }
}
