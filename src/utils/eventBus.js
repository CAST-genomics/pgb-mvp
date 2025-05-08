/**
 * EventBus - A singleton class that implements the publish/subscribe pattern
 * Allows components to communicate with each other through events
 */
class EventBus {
    constructor() {
        if (EventBus.instance) {
            return EventBus.instance;
        }
        EventBus.instance = this;
        this.subscribers = new Map();
    }

    /**
     * Subscribe to an event
     * @param {string} event - The event name to subscribe to
     * @param {Function} callback - The callback function to execute when the event is published
     * @returns {Function} - A function to unsubscribe from the event
     */
    subscribe(event, callback) {
        if (!this.subscribers.has(event)) {
            this.subscribers.set(event, new Set());
        }
        this.subscribers.get(event).add(callback);

        // Return unsubscribe function
        return () => {
            const callbacks = this.subscribers.get(event);
            if (callbacks) {
                callbacks.delete(callback);
                if (callbacks.size === 0) {
                    this.subscribers.delete(event);
                }
            }
        };
    }

    /**
     * Publish an event with optional data
     * @param {string} event - The event name to publish
     * @param {*} data - Optional data to pass to the subscribers
     */
    publish(event, data) {
        const callbacks = this.subscribers.get(event);
        if (callbacks) {

            for (const callback of callbacks) { 
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event handler for ${event}:`, error);
                }
            }
        }
    }

    /**
     * Clear all subscribers for a specific event
     * @param {string} event - The event name to clear
     */
    clearEvent(event) {
        this.subscribers.delete(event);
    }

    /**
     * Clear all subscribers for all events
     */
    clearAll() {
        this.subscribers.clear();
    }
}

// Create and export a singleton instance
const eventBus = new EventBus();
export default eventBus; 