# Frontend Performance Improvements: PostcodeBoundaries.tsx

This document outlines a work plan to address potential performance inefficiencies in the `PostcodeBoundaries.tsx` component.

## High Priority / Low Hanging Fruit

These items are likely to provide significant performance gains with relatively moderate effort.

1.  **Optimize `transformCoordinates` Function:**
    *   **Issue:** Uses `JSON.parse(JSON.stringify(geoJSON))` for deep cloning, which is very CPU-intensive for large GeoJSON objects.
    *   **Fixes:**
        *   **Memoize Result:** If `geoJSON` input is stable, memoize the output of `transformCoordinates` using `React.useMemo`.
        *   **Transform Once:** If possible, transform coordinates once when the `geoJSON` data is first loaded and store the transformed version in state. Avoid re-transforming if the underlying geometry data hasn't changed.
        *   **Efficient Cloning (If Essential):** If deep cloning remains necessary after initial transformation, explore more performant cloning libraries or techniques as a last resort. The primary goal should be to avoid repeated full transformations of large datasets.

2.  **Optimize Data Fetching Logic (`useEffect` Hooks):**
    *   **Issue:** Multiple `useEffect` hooks for data fetching (`fetchBoundariesAndGreenSpaces`, `loadModeData`) with potentially complex dependency arrays could lead to unnecessary re-fetches.
    *   **Fixes:**
        *   **Review Dependencies:** Scrutinize `useEffect` dependency arrays. Ensure they *only* include values that should trigger a re-fetch.
        *   **Consolidate Loading States:** Simplify the multiple boolean loading flags (`isLoading`, `boundariesLoaded`, `dataLoadedForMode`, `greenSpacesLoading`) into a more manageable state structure (e.g., a state object or `useReducer`).
        *   **Debounce Rapid Updates:** If `selectedYear` or `selectedEndYear` (from sliders) trigger data fetching, debounce these calls to prevent API spamming and excessive re-renders during rapid interaction.

3.  **Optimize `getPriceColor` and `getTrendColor` Callbacks:**
    *   **Issue:** These functions iterate over `propertyPrices` or `priceTrends` arrays (`find()`, `for...of`) on each call. If these arrays are large and the functions are called frequently (e.g., for styling many map features), this can be slow.
    *   **Fixes:**
        *   **Pre-compute Lookup Maps:** When `propertyPrices` and `priceTrends` data is fetched, transform these arrays into JavaScript `Map` objects keyed by `postalCode`. This allows for O(1) average time complexity lookups.
            ```javascript
            // Example for propertyPrices
            const priceMap = React.useMemo(() => 
                new Map(propertyPrices.map(p => [p.postalCode, p])),
            [propertyPrices]);
            // Then use priceMap.get(postalCode) in getPriceColor
            ```
        *   **Memoize Styling Functions:** Ensure that the main styling function passed to the `GeoJSON` component (`styleBoundaries`) is correctly memoized with `useCallback`, and its dependencies are minimal and stable. The optimized lookup maps will help here.

## Medium Priority

These items are important for robustness and future performance, especially if currently disabled features are re-enabled.

4.  **Green Spaces Layer Performance (`GREEN_SPACES_ENABLED`):**
    *   **Issue:** Previously disabled due to performance issues with large datasets. Re-enabling without optimization will reintroduce these problems.
    *   **Fixes (for when/if re-enabled):**
        *   **Backend Data Simplification/Aggregation:** Process green space GeoJSON on the backend to simplify complex geometries or aggregate smaller features.
        *   **Vector Tiles:** For very large and complex geographic datasets, consider migrating to a vector tile approach for serving and rendering green space data.
        *   **Lazy Loading/Viewport-Based Fetching:** Only fetch and render green space data relevant to the current map viewport.
        *   **Memoization:** Ensure the `GeoJSON` component for green spaces and its styling functions are efficiently memoized.

5.  **State Management for Loading States:**
    *   **Issue:** Multiple boolean loading flags can make state logic complex.
    *   **Fix:** Consider `useReducer` for managing loading states and data fetching sequences, especially if more asynchronous operations or complex state transitions are added.

6.  **Efficient `GeoJSON` Layer Rendering:**
    *   **Issue:** The `react-leaflet` `GeoJSON` component re-renders if its `data` prop changes.
    *   **Fixes:**
        *   **Stable Data Prop:** Ensure `boundariesGeoJSON` (and `greenSpacesGeoJSON` if enabled) are only updated when their underlying data truly changes. Avoid creating new object references if the data is the same.
        *   **Memoize `GeoJSON` Components:** Consider wrapping `GeoJSON` component instances with `React.memo` if appropriate, though changes in `data` or `style` props will still trigger re-renders. The key is ensuring these props are stable.

## Low Priority / General Best Practices

7.  **Coordinate Transformation Strategy:**
    *   **Issue:** `transformCoordinates` is `useCallback`ed. Transformations should ideally occur once when data is fetched.
    *   **Consideration:** Re-affirm that transformations are not happening unnecessarily. The current structure is flexible but relies on being called judiciously. The high-priority fix for `transformCoordinates` (transforming once) should address most of this.

By addressing these points, particularly the high-priority items, the performance and responsiveness of the map
visualizations in `PostcodeBoundaries.tsx` should be significantly improved. 
