import { IMapOverlay } from './i-map-overlay';

type Overlay = IMapOverlay;

declare class Node {
    next: Node | null;
    prev: Node | null;
    overlay: Overlay;
    constructor(overlay: Overlay);
}

export declare class OverlayLinkedList {
    private head: Node | null;
    private tail: Node | null;
    private size: number;

    constructor();

    /**
     * Get the number of overlays in the list
     * @returns The number of overlays
     */
    getSize(): number;

    /**
     * Check if the list is empty
     * @returns True if the list is empty, false otherwise
     */
    isEmpty(): boolean;

    /**
     * Clear the list
     */
    clear(): void;

    /**
     * Append an overlay to the end of the list
     * @param overlay The overlay to append
     */
    append(overlay: Overlay): void;

    /**
     * Prepend an overlay to the beginning of the list
     * @param overlay The overlay to prepend
     */
    prepend(overlay: Overlay): void;

    /**
     * Remove an overlay from the list by ID
     * @param id The ID of the overlay to remove
     * @returns The removed overlay, or null if not found
     */
    remove(id: string): Overlay | null;

    /**
     * Find an overlay in the list by ID
     * @param id The ID of the overlay to find
     * @returns The overlay, or null if not found
     */
    find(id: string): Overlay | null;

    /**
     * Move an overlay to the end of the list
     * @param id The ID of the overlay to move
     * @returns True if the overlay was moved, false otherwise
     */
    moveToEnd(id: string): boolean;

    /**
     * Move an overlay to the beginning of the list
     * @param id The ID of the overlay to move
     * @returns True if the overlay was moved, false otherwise
     */
    moveToBeginning(id: string): boolean;

    /**
     * Execute a callback for each overlay in the list
     * @param callback The callback to execute
     */
    forEach(callback: (overlay: Overlay) => void): void;

    /**
     * Convert the list to an array
     * @returns An array of overlays
     */
    toArray(): Overlay[];
}
