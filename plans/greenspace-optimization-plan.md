# Green Space Data Performance Optimization Plan

## 🎯 Problem Statement

The current implementation for fetching green space data in `server/src/services/overpassService.ts` suffers from performance issues:

1.  **Slow Initial Load:** The initial query to the Overpass API and subsequent processing can be slow due to the large amount of data requested.
2.  **Large Data Transfer:** The API endpoint (`/api/greenspace`) transfers a large GeoJSON file (potentially >40MB) to the frontend. This consumes significant bandwidth (potentially incurring costs in cloud environments) and increases client-side rendering time.
3.  **Inefficient Query Scope:** The service queries the Overpass API for all green space features (nodes, ways, relations) within a large, static bounding box covering the entire Helsinki Metropolitan Area, retrieving full geometric detail.

**Goal:** Significantly reduce the data volume transferred for green spaces and improve the perceived loading speed on the frontend map.

---

## 💡 Proposed Optimization Strategies

### 1. Server-Side GeoJSON Simplification (Recommended Short-Term)

*   **Concept:** Reduce the geometric complexity (number of vertices) of the GeoJSON features *after* fetching from Overpass and converting, but *before* caching and sending the response to the client.
*   **Pros:**
    *   Significantly reduces the size of the GeoJSON sent to the frontend.
    *   Leads to faster client-side loading and rendering.
    *   Relatively straightforward implementation within the existing service.
    *   Compatible with the current caching mechanism (cache the simplified result).
*   **Cons:**
    *   Doesn't reduce the initial load on the Overpass API.
    *   Simplification might slightly alter shapes at high zoom; requires tuning tolerance.
*   **Implementation Steps:**
    1.  **Install Library:** Add a GeoJSON simplification library to the backend dependencies. `@turf/simplify` is a good option from the popular Turf.js suite.
        ```bash
        # In the server directory
        npm install @turf/simplify
        # or
        yarn add @turf/simplify
        ```
    2.  **Import:** Import the simplification function in `server/src/services/overpassService.ts`.
        ```typescript
        import simplify from '@turf/simplify';
        ```
    3.  **Modify `fetchGreenSpaces`:**
        *   After the `osmtogeojson` conversion obtains the `geojsonData`:
        *   Define simplification options (especially `tolerance`). This value needs experimentation (e.g., start with `0.0001`). Higher values mean more simplification and smaller size, but less detail.
        *   Apply the simplification function to the `geojsonData`. Turf's simplify modifies the input object by default if `mutate: true` (the default), or returns a new object if `mutate: false`.
            ```typescript
            const options = { tolerance: 0.0001, highQuality: false }; // Adjust tolerance as needed
            const simplifiedGeoJson = simplify(geojsonData, options);
            ```
    4.  **Cache Simplified Data:** Store the `simplifiedGeoJson` in the cache instead of the original `geojsonData`.
        ```typescript
        overpassCache.set(CACHE_KEY, simplifiedGeoJson); // Cache the smaller, simplified data
        return simplifiedGeoJson; // Return the simplified data
        ```
    5.  **Configuration:** Consider making the `tolerance` value configurable via environment variables for easier tuning.
    6.  **Testing:** Visually inspect the map display after implementation to ensure the simplification level is acceptable and doesn't remove crucial details or create visual artifacts. Compare the network response size before and after.

### 2. Vector Tiles (Recommended Long-Term / Most Scalable)

*   **Concept:** Preprocess the green space data into vector tiles on the backend. The frontend requests only the tiles needed for the current map view and zoom level.
*   **Pros:**
    *   Standard and highly efficient method for large geospatial datasets.
    *   Minimal data transfer for any given map view.
    *   Smooth zooming and panning.
*   **Cons:**
    *   Requires significant changes to both backend (tile generation process, e.g., using Tippecanoe or PostGIS with vector tile extensions) and frontend (map library integration to consume vector tiles).
    *   More complex implementation.

### 3. Overpass API Query Optimization

*   **Concept:** Refine the Overpass QL query itself.
*   **Methods:**
    *   **Filter Tags:** Exclude less visually significant tags (e.g., `natural=tree_row` might be numerous but small). Requires careful analysis.
    *   **Use `out geom;`:** Experiment with `out geom;` instead of `out body; >; out skel qt;`. Might slightly reduce response size but could affect `osmtogeojson` compatibility. Needs testing.
    *   **Coarse Coordinates:** Overpass has limited direct support for returning simplified geometry (mentioned in development docs but not readily available as a simple query parameter).
*   **Pros:** Reduces load on Overpass API if successful.
*   **Cons:** Limited potential compared to simplification or tiling. Filtering tags might remove desired data. `out geom` compatibility needs verification.

### 4. Dynamic Bounding Box / On-Demand Loading

*   **Concept:** Frontend requests data only for the current map viewport bounds from the backend, which then queries Overpass with that specific, smaller bounding box.
*   **Pros:** Only fetches potentially visible data.
*   **Cons:** Increases the frequency of API calls (FE->BE and BE->Overpass). Significantly complicates caching. Can lead to delays when panning/zooming if requests are too frequent or slow. Generally less performant than vector tiles for this type of data.

---

## ✅ Next Steps

1.  Implement **Server-Side GeoJSON Simplification** as outlined above.
2.  Evaluate the performance improvement and visual impact.
3.  Consider **Vector Tiles** for future development if further optimization is needed or as the dataset grows. 
