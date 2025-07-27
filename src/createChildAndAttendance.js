import { childrenService } from './services/firebaseServices.js';

async function fixClassField() {
  try {
    console.log("Starting to fix class field...");
    
    // Get all children
    const allChildren = await childrenService.getAll();
    
    // Filter only Candle Lighters with className
    const candleLighters = allChildren.filter(child => child.className === "Candle Lighters");
    
    console.log(`Found ${candleLighters.length} Candle Lighters to update`);
    
    for (const child of candleLighters) {
      // Create update data - set class and remove className
      const updateData = {
        class: "Candle Lighters"  // Add correct field
      };
      
      // Update the document
      await childrenService.update(child.id, updateData);
      
      console.log(`Updated ${child.name} (ID: ${child.id})`);
    }
    
    console.log(`Successfully updated ${candleLighters.length} records`);
    return { success: true, count: candleLighters.length };
  } catch (error) {
    console.error("Error fixing class field:", error);
    return { success: false, error: error.message };
  }
}

// Run the fix
fixClassField();