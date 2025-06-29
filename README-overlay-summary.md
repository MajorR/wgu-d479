# Map Overlays Summary Generator

This utility generates a comprehensive summary of the map overlays defined in `map-overlays.yaml`. The summary includes the following information for each overlay:

- ID
- Name
- Category
- Subcategory
- Icon (SVG) of the category and subcategories (as referenced from map-overlays-categories.yaml)
- Description
- Items within more-info
- Operating times displayed by day of the week, hour to hour

## Files

- `lib/utils/overlay-summary-generator.ts`: The main class that generates the summary
- `generate-overlay-summary.ts`: A script that uses the generator to create the summary file
- `map-overlays-summary.md`: The generated summary file

## How to Use

1. Ensure all dependencies are installed:
   ```
   npm install
   ```

2. Run the generator script:
   ```
   npx tsc generate-overlay-summary.ts --esModuleInterop
   node generate-overlay-summary.js
   ```

3. The summary will be saved to `map-overlays-summary.md` in the project root directory.

## Implementation Details

The generator works by:

1. Loading the YAML files using the `OverlayYamlManager` class:
   - `map-overlays.yaml`: Contains the main overlay data
   - `map-overlays-categories.yaml`: Contains category and subcategory definitions, including icons
   - `place-features.yaml`: Contains features referenced in the more-info sections

2. For each overlay, it extracts:
   - Basic information (id, name, category, subcategory)
   - Icons from the category and subcategory definitions
   - Description
   - More-info items, including handling null items
   - Operating times by day of week

3. The information is formatted into a Markdown document for easy reading.

## Example Output

```markdown
## Jungle Cafe (ID: restaurants-jungle-cafe)

**Category:** Eats
**Subcategory:** Cafes

**Category Icon:** utensils
**Subcategory Icon:** mug-hot

**Description:** A cozy cafe serving organic coffee, pastries, and light meals.

**More Info:**
- amenities (from place-features):
  - free wifi
  - outdoor seating
  - vegetarian options
  - gluten-free options
  - breakfast served
- offerings (from place-features):
  - coffee specialties
  - bakery fresh
  - smoothies & juices
  - farm to table
  - espresso bar
  - cold brew coffee
  - specialty tea

**Operating Times:**
- Monday: 7:00 AM - 6:00 PM
- Tuesday: 7:00 AM - 6:00 PM
- Wednesday: 7:00 AM - 6:00 PM
- Thursday: 7:00 AM - 6:00 PM
- Friday: 7:00 AM - 6:00 PM
- Saturday: 7:00 AM - 6:00 PM
- Sunday: 7:00 AM - 6:00 PM
```
