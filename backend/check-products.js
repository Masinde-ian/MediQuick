// check-products.js
const fs = require('fs').promises;
const path = require('path');

async function checkProductsFolder() {
  console.log('🔍 Checking products folder...');
  
  // Try different possible locations
  const possiblePaths = [
    path.join(__dirname, 'src/products'),
    path.join(__dirname, 'products'),
    path.join(__dirname, 'public/products'),
    path.join(__dirname, 'uploads/products')
  ];
  
  for (const folderPath of possiblePaths) {
    try {
      await fs.access(folderPath);
      console.log(`\n✅ Found folder: ${folderPath}`);
      
      const files = await fs.readdir(folderPath);
      console.log(`Total files: ${files.length}`);
      
      // Filter image files
      const imageFiles = files.filter(file => 
        /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(file)
      );
      
      console.log(`Image files: ${imageFiles.length}`);
      
      if (imageFiles.length > 0) {
        console.log('\n📸 Image files found:');
        imageFiles.slice(0, 10).forEach((file, i) => {
          console.log(`  ${i + 1}. ${file}`);
        });
        if (imageFiles.length > 10) {
          console.log(`  ... and ${imageFiles.length - 10} more`);
        }
        
        // Return the first valid folder
        return { folderPath, imageFiles };
      }
      
    } catch (error) {
      // Folder doesn't exist, try next
    }
  }
  
  console.log('\n❌ No products folder with images found!');
  console.log('\nPlease create: src/products/');
  console.log('And add your drug images there.');
  return null;
}

checkProductsFolder();