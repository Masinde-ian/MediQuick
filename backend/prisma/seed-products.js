// prisma/seed-all-products.js - PROCESS ALL 2,596 IMAGES
const { PrismaClient } = require('@prisma/client');
const fs = require('fs').promises;
const path = require('path');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const IMAGES_FOLDER = path.join(__dirname, '..', 'products');
const BASE_IMAGE_URL = '/products';

// Improved name extraction
function extractCleanProductName(filename) {
  // Remove extension
  let name = path.parse(filename).name;
  
  // Replace underscores with spaces
  name = name.replace(/_/g, ' ');
  
  // Remove content in parentheses
  name = name.replace(/\([^)]*\)/g, '');
  
  // Remove measurements and quantities
  name = name.replace(/\b\d+(ml|mg|g|kg|cm|m|l|s|pads|pieces|tablets|capsules|sachets|strips|vials|swabs)\b/gi, '');
  name = name.replace(/\b\d+\s*(ml|mg|g|kg|cm|m|l|%)\b/gi, '');
  name = name.replace(/\bsize\s*\w+\b/gi, '');
  name = name.replace(/\b\d+s\b/gi, ''); // Remove 50s, 100s, etc
  
  // Remove common brand prefixes
  const brandPrefixes = [
    'A.Vogel ', 'Abena ', 'Abidec ', 'Abz ', 'Accentu ', 'Accufast ', 'Accu ', 'Accu-Chek ', 'Accu Chek ',
    'Acnes ', 'Actifed ', 'Actilife ', 'Advancis ', 'Advil ', 'Aldara ', 'Alison', 'Alka ', 'Alvedon ',
    'A.Vogel_', 'Abena_', 'Abidec_', 'Abz_', 'Accentu_', 'Accufast_', 'Accu_', 'Accu-Chek_', 'Accu_Chek_',
    'Acnes_', 'Actifed_', 'Actilife_', 'Advancis_', 'Advil_', 'Aldara_', 'Alison', 'Alka_', 'Alvedon_'
  ];
  
  brandPrefixes.forEach(prefix => {
    if (name.toLowerCase().startsWith(prefix.toLowerCase())) {
      name = name.substring(prefix.length);
    }
  });
  
  // Remove extra words
  const removeWords = [
    'with', 'and', 'for', 'the', 'extra', 'strong', 'super', 'max', 'pro', 'ultra',
    'forte', 'plus', 'multi', 'action', 'daily', 'weekly', 'monthly', 'original',
    'chewable', 'liquid', 'cream', 'ointment', 'syrup', 'tablets', 'capsules',
    'sachets', 'strips', 'vials', 'swabs', 'spray', 'gel', 'wash', 'soap', 'drops'
  ];
  
  removeWords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    name = name.replace(regex, '');
  });
  
  // Clean up: remove extra spaces, trim
  name = name.replace(/\s+/g, ' ').trim();
  
  // If name is too short, use a simpler approach
  if (name.length < 3) {
    // Fallback: Use first meaningful word from filename
    const words = path.parse(filename).name.split(/[_\s()]+/);
    for (const word of words) {
      if (word.length > 2 && !/\d/.test(word) && !word.toLowerCase().includes('mg') && !word.toLowerCase().includes('ml')) {
        name = word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        break;
      }
    }
  }
  
  // Capitalize properly
  name = name
    .split(' ')
    .map(word => {
      if (word.length <= 2) return word.toLowerCase();
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ')
    .trim();
  
  return name || 'Healthcare Product';
}

// Map to proper product names for common items
const PRODUCT_NAME_MAP = {
  'echinaforce': 'Echinaforce Immune Support',
  'adults pants': 'Adult Protective Pants',
  'under pads': 'Underpads',
  'drops': 'Vitamin Drops',
  'multivitamin syrup': 'Multivitamin Syrup',
  'suspension': 'Medication Suspension',
  'tablets': 'Medication Tablets',
  'beard oil': 'Beard Oil',
  'hcg pregnancy': 'Pregnancy Test Kit',
  'lh ovulation': 'Ovulation Test Kit',
  'malaria test': 'Malaria Test Kit',
  'acetone': 'Acetone Solution',
  'vit c serum': 'Vitamin C Serum',
  'creamy wash': 'Facial Wash',
  'moisturizing cream': 'Moisturizing Cream',
  'scar care': 'Scar Care Gel',
  'sealing gel': 'Acne Sealing Gel',
  'soap': 'Medicated Soap',
  'cough syrup': 'Cough Syrup',
  'daily flora': 'Probiotic Sachets',
  'spray': 'Antiseptic Spray',
  'womens flora': 'Women\'s Probiotic',
  'eye drops': 'Eye Drops',
  'acyclovir': 'Acyclovir Antiviral',
  'snail mucin': 'Snail Mucin Essence',
  'candicaps': 'Antifungal Capsules',
  'essential vitamins': 'Essential Vitamins',
  'omegamousse': 'Omega-3 Supplement',
  'smart extra': 'Multivitamin Vials',
  'ibup fen': 'Ibuprofen Tablets',
  'junior strength': 'Children\'s Ibuprofen',
  'liqui gels': 'Liquid Gel Capsules',
  'alcohol swabs': 'Alcohol Swabs',
  'cream pump': 'Medicated Cream',
  'cream sachets': 'Cream Sachets',
  'hand sanitizer': 'Hand Sanitizer',
  'massage oil': 'Massage Oil',
  'rose water': 'Rose Water Toner',
  'alka seltzer': 'Antacid Tablets'
};

function improveProductName(extractedName) {
  const lowerName = extractedName.toLowerCase();
  
  // Check for mapped names
  for (const [key, value] of Object.entries(PRODUCT_NAME_MAP)) {
    if (lowerName.includes(key)) {
      return value;
    }
  }
  
  return extractedName;
}

async function seedAllProducts() {
  console.log('🚀 SEEDING ALL 2,596 PRODUCT IMAGES...');
  console.log(`Looking for images in: ${IMAGES_FOLDER}`);
  
  try {
    // Check images folder
    await fs.access(IMAGES_FOLDER);
    const allFiles = await fs.readdir(IMAGES_FOLDER);
    const imageFiles = allFiles.filter(file => 
      /\.(webp|jpg|jpeg|png|gif|bmp|svg)$/i.test(file)
    );
    
    console.log(`✅ Found ${imageFiles.length} product images`);
    
    // Process ALL images
    const filesToProcess = imageFiles; // ALL images
    console.log(`📊 Processing ALL ${filesToProcess.length} images...`);
    console.log('This may take a few minutes...');
    
    // Ensure categories exist
    console.log('\n🏷️ Ensuring categories exist...');
    const categories = await ensureCategories();
    
    // Ensure brands exist
    console.log('🏢 Ensuring brands exist...');
    const brands = await ensureBrands();
    
    // Create products
    console.log('\n💊 Creating products from images...');
    let createdCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < filesToProcess.length; i++) {
      const filename = filesToProcess[i];
      
      try {
        // Extract and improve product name
        let productName = extractCleanProductName(filename);
        productName = improveProductName(productName);
        
        // Generate slug
        const slug = productName.toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .trim()
          .substring(0, 50); // Limit slug length
        
        // Skip if slug is too short
        if (slug.length < 3) {
          console.log(`⚠️ Skipping (short name): ${filename} -> "${productName}"`);
          skippedCount++;
          continue;
        }
        
        // Check if product already exists
        const existing = await prisma.product.findUnique({
          where: { slug }
        });
        
        if (existing) {
          skippedCount++;
          if (i % 100 === 0) {
            console.log(`⏩ Skipped ${skippedCount} existing products...`);
          }
          continue;
        }
        
        // Determine category
        const categorySlug = guessCategory(productName);
        const category = categories.find(c => c.slug === categorySlug) || categories[0];
        
        // Select random brand
        const randomBrand = brands[Math.floor(Math.random() * brands.length)];
        
        // Generate price (50 to 5000 KSH)
        const price = Math.floor(Math.random() * 4950) + 50;
        const hasSale = Math.random() < 0.15; // 15% on sale
        const salePrice = hasSale ? parseFloat((price * (0.75 + Math.random() * 0.15)).toFixed(2)) : null;
        
        // Determine stock and prescription
        const inStock = Math.random() < 0.92; // 92% in stock
        const prescriptionRequired = Math.random() < 0.08; // 8% need prescription
        
        // Create image URL
        const imageUrl = `${BASE_IMAGE_URL}/${filename}`;
        
        // Create product
        await prisma.product.create({
          data: {
            name: productName,
            slug,
            sku: `MED-${(i + 1).toString().padStart(5, '0')}`,
            description: `${productName}. High-quality healthcare product for optimal results.`,
            price,
            salePrice,
            images: JSON.stringify([imageUrl]),
            inStock,
            prescriptionRequired,
            ingredients: 'Active ingredients as per pharmaceutical formulation.',
            usageInstructions: 'Use as directed by healthcare professional. Store properly.',
            categoryId: category.id,
            brandId: randomBrand.id
          }
        });
        
        createdCount++;
        
        // Show progress every 50 products
        if (createdCount % 50 === 0) {
          console.log(`✅ Created ${createdCount} products... (${Math.round((i + 1) / filesToProcess.length * 100)}% complete)`);
        }
        
        // Small pause to avoid overwhelming
        if (createdCount % 200 === 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
      } catch (error) {
        errorCount++;
        if (errorCount % 20 === 0) {
          console.log(`❌ ${errorCount} errors so far...`);
        }
      }
    }
    
    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('🎉 SEEDING COMPLETE!');
    console.log('='.repeat(70));
    console.log(`📊 FINAL RESULTS:`);
    console.log(`   Total images: ${filesToProcess.length}`);
    console.log(`   Products created: ${createdCount}`);
    console.log(`   Products skipped: ${skippedCount}`);
    console.log(`   Errors encountered: ${errorCount}`);
    console.log(`   Success rate: ${Math.round((createdCount / filesToProcess.length) * 100)}%`);
    console.log('='.repeat(70));
    console.log(`\n🎯 Your database now has approximately ${await prisma.product.count()} products!`);
    console.log(`🔑 Admin login: admin@pharmacy.com / Admin@123`);
    console.log(`📍 View in Prisma Studio: npx prisma studio`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Helper functions (same as before)
function guessCategory(productName) {
  const lowerName = productName.toLowerCase();
  const categories = {
    'pain-relief': ['pain', 'ache', 'ibuprofen', 'paracetamol', 'analgesic'],
    'cold-flu': ['cold', 'flu', 'cough', 'fever', 'decongestant'],
    'allergy': ['allergy', 'histamine', 'antihistamine'],
    'vitamins-supplements': ['vitamin', 'multivitamin', 'supplement', 'omega', 'probiotic'],
    'skin-care': ['skin', 'cream', 'ointment', 'serum', 'acne', 'moisturiz', 'soap', 'wash'],
    'first-aid': ['test', 'kit', 'swab', 'bandage', 'alcohol', 'sanitizer'],
    'personal-care': ['oil', 'shampoo', 'conditioner', 'razor', 'deodorant', 'perfume'],
    'digestive-health': ['antacid', 'digest', 'stomach', 'laxative'],
    'antibiotics': ['antibiotic', 'infection', 'antiviral', 'antifungal']
  };
  
  for (const [category, keywords] of Object.entries(categories)) {
    for (const keyword of keywords) {
      if (lowerName.includes(keyword)) {
        return category;
      }
    }
  }
  
  return 'personal-care';
}

async function ensureCategories() {
  const categoriesData = [
    { name: 'Pain Relief', slug: 'pain-relief', description: 'Pain medications', level: 1, isLeaf: true },
    { name: 'Cold & Flu', slug: 'cold-flu', description: 'Cold medications', level: 1, isLeaf: true },
    { name: 'Allergy', slug: 'allergy', description: 'Allergy relief', level: 1, isLeaf: true },
    { name: 'Antibiotics', slug: 'antibiotics', description: 'Antibacterial medications', level: 1, isLeaf: true },
    { name: 'Vitamins & Supplements', slug: 'vitamins-supplements', description: 'Vitamins and supplements', level: 1, isLeaf: true },
    { name: 'Digestive Health', slug: 'digestive-health', description: 'Digestive medications', level: 1, isLeaf: true },
    { name: 'Skin Care', slug: 'skin-care', description: 'Skin medications and creams', level: 1, isLeaf: true },
    { name: 'Diabetes Care', slug: 'diabetes-care', description: 'Diabetes medications', level: 1, isLeaf: true },
    { name: 'First Aid', slug: 'first-aid', description: 'First aid supplies', level: 1, isLeaf: true },
    { name: 'Personal Care', slug: 'personal-care', description: 'Personal hygiene products', level: 1, isLeaf: true },
  ];
  
  const categories = [];
  for (const catData of categoriesData) {
    let category = await prisma.category.findUnique({
      where: { slug: catData.slug }
    });
    
    if (!category) {
      category = await prisma.category.create({
        data: catData
      });
    }
    
    categories.push(category);
  }
  
  return categories;
}

async function ensureBrands() {
  const brandNames = [
    'Pfizer', 'GSK', 'Bayer', 'Johnson & Johnson', 'Sanofi',
    'Novartis', 'Roche', 'Merck', 'AstraZeneca', 'Cipla',
    'Dr. Reddy\'s', 'Sun Pharma', 'MediQuick', 'PharmaCare'
  ];
  
  const brands = [];
  for (const name of brandNames) {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    
    let brand = await prisma.brand.findUnique({
      where: { slug }
    });
    
    if (!brand) {
      brand = await prisma.brand.create({
        data: {
          name,
          slug,
          description: `${name} pharmaceutical products`
        }
      });
    }
    
    brands.push(brand);
  }
  
  return brands;
}

// Run
if (require.main === module) {
  seedAllProducts()
    .then(() => {
      console.log('\n✨ All products seeded successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Failed:', error);
      process.exit(1);
    });
}