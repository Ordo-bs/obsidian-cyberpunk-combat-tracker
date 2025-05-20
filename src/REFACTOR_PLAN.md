# Refactor Plan: Splitting Code into Multiple Files and Moving Supporting Code to src Directory

## Objective

- Split all supporting code into logical modules/files under `src/`
- Keep `main.ts` in the project root as the main plugin class and entry point
- Preserve all features and behaviors
- Allow for incremental testing after each step

## Directory Structure

```
main.ts
src/
  types.ts
  utils/
    wound.ts
    penalties.ts
    hitLocation.ts
    drone.ts
    robot.ts
  views/
    EditView.ts
    CreateCharacterView.ts
    CombatTrackerView.ts
```

## Step-by-Step Plan

1. **Create `src/` and subdirectories**  
   _Test: Build and run the plugin to ensure nothing is broken by directory creation._

2. **Move all type/interface definitions to `src/types.ts`**  
   - Update imports in `main.ts` and any other files.  
   _Test: Build and run the plugin to ensure type imports work._

3. **Move utility functions to `src/utils/`**  
   - Move each group of helpers to its own file.  
   - Update imports in `main.ts` and other files.  
   _Test: Build and run the plugin to ensure all helpers are working._

4. **Move each view class to its own file in `src/views/`**  
   - Move `EditView`, `CreateCharacterView`, and `CombatTrackerView` to their own files.  
   - Update imports in `main.ts` and other files.  
   _Test: Build and run the plugin to ensure all views are working._

5. **Keep the main plugin class (`CyberpunkStatBlocks`) and entry point in `main.ts` (project root)**  
   - Remove any now-unused code from `main.ts` after confirming build.  
   _Test: Build and run the plugin to ensure the main plugin class is still functional._

6. **Update `esbuild.config.mjs` to use `main.ts` in the root as entry**  
   _Test: Build and run the plugin to ensure the build process works with the new structure._

7. **Test all features in Obsidian**  
   - View creation and initialization  
   - Character editing and creation  
   - Code block processor  
   - State persistence and restoration  
   - Command palette and ribbon icon  

## Testing Checklist

- [ ] View creation and initialization
- [ ] Character editing and creation
- [ ] Code block processor
- [ ] State persistence and restoration
- [ ] Command palette and ribbon icon
- [ ] Error handling

## Notes

- No features or behaviors are lost
- All logic is preserved, only reorganized
- Build and runtime behavior is unchanged
- **You can and should test the plugin after each step above** 