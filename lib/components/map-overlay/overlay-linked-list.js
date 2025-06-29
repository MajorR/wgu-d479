/**
 * Node class for the doubly-linked list
 */
class Node {
    constructor(overlay) {
        this.next = null;
        this.prev = null;
        this.overlay = overlay;
    }
}
/**
 * OverlayLinkedList - A doubly-linked list implementation for managing map overlays
 *
 * This class provides efficient insertion, deletion, and traversal operations
 * for managing collections of map overlays with ordering capabilities.
 */
export class OverlayLinkedList {
    constructor() {
        this.head = null;
        this.tail = null;
        this.size = 0;
    }
    /**
     * Get the number of overlays in the list
     * @returns The number of overlays
     */
    getSize() {
        return this.size;
    }
    /**
     * Check if the list is empty
     * @returns True if the list is empty, false otherwise
     */
    isEmpty() {
        return this.size === 0;
    }
    /**
     * Clear the list
     */
    clear() {
        this.head = null;
        this.tail = null;
        this.size = 0;
    }
    /**
     * Append an overlay to the end of the list
     * @param overlay The overlay to append
     */
    append(overlay) {
        const newNode = new Node(overlay);
        if (this.isEmpty()) {
            this.head = newNode;
            this.tail = newNode;
        }
        else {
            newNode.prev = this.tail;
            this.tail.next = newNode;
            this.tail = newNode;
        }
        this.size++;
    }
    /**
     * Prepend an overlay to the beginning of the list
     * @param overlay The overlay to prepend
     */
    prepend(overlay) {
        const newNode = new Node(overlay);
        if (this.isEmpty()) {
            this.head = newNode;
            this.tail = newNode;
        }
        else {
            newNode.next = this.head;
            this.head.prev = newNode;
            this.head = newNode;
        }
        this.size++;
    }
    /**
     * Find a node by overlay ID
     * @param id The ID of the overlay to find
     * @returns The node containing the overlay, or null if not found
     */
    findNode(id) {
        let current = this.head;
        while (current !== null) {
            if (current.overlay.getId() === id) {
                return current;
            }
            current = current.next;
        }
        return null;
    }
    /**
     * Remove a node from the list
     * @param node The node to remove
     */
    removeNode(node) {
        if (node.prev) {
            node.prev.next = node.next;
        }
        else {
            // Node is head
            this.head = node.next;
        }
        if (node.next) {
            node.next.prev = node.prev;
        }
        else {
            // Node is tail
            this.tail = node.prev;
        }
        this.size--;
    }
    /**
     * Remove an overlay from the list by ID
     * @param id The ID of the overlay to remove
     * @returns The removed overlay, or null if not found
     */
    remove(id) {
        const node = this.findNode(id);
        if (node) {
            this.removeNode(node);
            return node.overlay;
        }
        return null;
    }
    /**
     * Find an overlay in the list by ID
     * @param id The ID of the overlay to find
     * @returns The overlay, or null if not found
     */
    find(id) {
        const node = this.findNode(id);
        return node ? node.overlay : null;
    }
    /**
     * Move an overlay to the end of the list
     * @param id The ID of the overlay to move
     * @returns True if the overlay was moved, false otherwise
     */
    moveToEnd(id) {
        const node = this.findNode(id);
        if (!node) {
            return false;
        }
        // If already at the end, no need to move
        if (node === this.tail) {
            return true;
        }
        // Remove from current position
        this.removeNode(node);
        // Add to end
        this.append(node.overlay);
        return true;
    }
    /**
     * Move an overlay to the beginning of the list
     * @param id The ID of the overlay to move
     * @returns True if the overlay was moved, false otherwise
     */
    moveToBeginning(id) {
        const node = this.findNode(id);
        if (!node) {
            return false;
        }
        // If already at the beginning, no need to move
        if (node === this.head) {
            return true;
        }
        // Remove from current position
        this.removeNode(node);
        // Add to beginning
        this.prepend(node.overlay);
        return true;
    }
    /**
     * Execute a callback for each overlay in the list
     * @param callback The callback to execute
     */
    forEach(callback) {
        let current = this.head;
        while (current !== null) {
            callback(current.overlay);
            current = current.next;
        }
    }
    /**
     * Convert the list to an array
     * @returns An array of overlays
     */
    toArray() {
        const result = [];
        this.forEach(overlay => result.push(overlay));
        return result;
    }
}
