/**
 * Generic simple in-memory cache with TTL.
 */

// Define potential value types for different caches
// Remove specific types and allow any type for more flexibility
// type HsyWmsValue = '5min' | '10min' | '15min' | null;
// type StatFiValue = PostalCodeData[];
// type OverpassValue = OverpassElement[];
//
// // Union type for allowed cache values
// type CacheValue = HsyWmsValue | StatFiValue | OverpassValue;


// interface CacheEntry<T extends CacheValue> { // Make T less restrictive
interface CacheEntry<T> {
    value: T;
    timestamp: number;
}

// export class SimpleCache<T extends CacheValue> { // Make T less restrictive
export class SimpleCache<T> {
    private cache = new Map<string, CacheEntry<T>>();
    private defaultTtl: number; // TTL in milliseconds
    private name: string;       // Name for logging

    /**
     * Creates a new SimpleCache instance.
     * @param name A descriptive name for the cache (used in logs).
     * @param defaultTtl Default time-to-live for cache entries in milliseconds.
     */
    constructor(name: string, defaultTtl: number) {
        if (!name) throw new Error("Cache name cannot be empty.");
        if (defaultTtl <= 0) throw new Error("Cache TTL must be positive.");

        this.name = name;
        this.defaultTtl = defaultTtl;
        console.log(`Cache initialized: ${this.name} (TTL: ${defaultTtl / 1000}s)`);
    }

    /**
     * Retrieves a value from the cache. Returns undefined if the key is not found or the entry is expired.
     * @param key The cache key.
     * @returns The cached value or undefined.
     */
    get(key: string): T | undefined {
        const entry = this.cache.get(key);
        if (!entry) {
            return undefined; // Cache miss
        }

        const now = Date.now();
        if (now - entry.timestamp > this.defaultTtl) {
            // Expired
            this.cache.delete(key);
            console.log(`Cache expired for key "${key}" in [${this.name}].`);
            return undefined;
        }

        console.log(`Cache hit for key "${key}" in [${this.name}].`);
        return entry.value;
    }

    /**
     * Adds or updates a value in the cache with the current timestamp.
     * @param key The cache key.
     * @param value The value to store.
     */
    set(key: string, value: T): void {
        const now = Date.now();
        const entry: CacheEntry<T> = { value, timestamp: now };
        this.cache.set(key, entry);
        console.log(`Cache set for key "${key}" in [${this.name}].`);
    }

    /**
     * Clears all entries from the cache.
     */
    clear(): void {
        this.cache.clear();
        console.log(`Cache cleared: [${this.name}].`);
    }

    /**
     * Deletes a specific entry from the cache.
     * @param key The key to delete.
     * @returns True if an element in the Map existed and has been removed, or false if the element does not exist.
     */
    delete(key: string): boolean {
        const deleted = this.cache.delete(key);
        if (deleted) {
            console.log(`Cache deleted key "${key}" in [${this.name}].`);
        }
        return deleted;
    }

    /**
     * Gets the current number of entries in the cache.
     * @returns The number of entries.
     */
    size(): number {
        return this.cache.size;
    }
} 
