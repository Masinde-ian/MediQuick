// prisma/seed.js - FIXED VERSION
const { PrismaClient } = require('@prisma/client');
const fs = require('fs').promises;
const path = require('path');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// Configuration - FIXED PATH
const IMAGES_FOLDER = path.join(__dirname, '../src/products'); // Go up one level from prisma folder
const BASE_IMAGE_URL = '/products';

// Sample Users
const USERS = [
  {
    email: 'admin@pharmacy.com',
    name: 'Admin User',
    phone: '+254712345678',
    password: 'Admin@123',
    role: 'ADMIN'
  },
  {
    email: 'doctor@pharmacy.com',
    name: 'Dr. Jane Smith',
    phone: '+254723456789',
    password: 'Doctor@123',
    role: 'DOCTOR'
  },
  {
    email: 'customer1@example.com',
    name: 'John Doe',
    phone: '+254734567890',
    password: 'Customer@123',
    role: 'CUSTOMER'
  },
  {
    email: 'customer2@example.com',
    name: 'Mary Johnson',
    phone: '+254745678901',
    password: 'Customer@123',
    role: 'CUSTOMER'
  },
  {
    email: 'customer3@example.com',
    name: 'Robert Kimani',
    phone: '+254756789012',
    password: 'Customer@123',
    role: 'CUSTOMER'
  }
];

// Medical Categories
const CATEGORIES = [
  { name: 'Pain Relief', slug: 'pain-relief', description: 'Pain relievers and analgesics', level: 1, isLeaf: true },
  { name: 'Cold & Flu', slug: 'cold-flu', description: 'Cold and flu medications', level: 1, isLeaf: true },
  { name: 'Allergy', slug: 'allergy', description: 'Allergy relief medications', level: 1, isLeaf: true },
  { name: 'Antibiotics', slug: 'antibiotics', description: 'Antibacterial medications', level: 1, isLeaf: true },
  { name: 'Vitamins & Supplements', slug: 'vitamins-supplements', description: 'Vitamins and dietary supplements', level: 1, isLeaf: true },
  { name: 'Digestive Health', slug: 'digestive-health', description: 'Medications for digestive issues', level: 1, isLeaf: true },
  { name: 'Skin Care', slug: 'skin-care', description: 'Medications for skin conditions', level: 1, isLeaf: true },
  { name: 'Diabetes Care', slug: 'diabetes-care', description: 'Diabetes medications and supplies', level: 1, isLeaf: true },
  { name: 'Heart Health', slug: 'heart-health', description: 'Cardiovascular medications', level: 1, isLeaf: true },
  { name: 'First Aid', slug: 'first-aid', description: 'First aid supplies and kits', level: 1, isLeaf: true },
];

// Medical Brands
const BRANDS = [
  { name: 'Pfizer', slug: 'pfizer', description: 'Global pharmaceutical corporation' },
  { name: 'GlaxoSmithKline', slug: 'glaxosmithkline', description: 'British pharmaceutical company' },
  { name: 'Bayer', slug: 'bayer', description: 'German pharmaceutical company' },
  { name: 'Johnson & Johnson', slug: 'johnson-johnson', description: 'Healthcare products' },
  { name: 'Sanofi', slug: 'sanofi', description: 'French pharmaceutical company' },
  { name: 'Novartis', slug: 'novartis', description: 'Swiss pharmaceutical company' },
  { name: 'Roche', slug: 'roche', description: 'Healthcare company' },
  { name: 'Merck', slug: 'merck', description: 'American pharmaceutical company' },
];

// Medical Conditions
const CONDITIONS = [
  { name: 'Headache', slug: 'headache', description: 'Head pain or discomfort' },
  { name: 'Fever', slug: 'fever', description: 'Elevated body temperature' },
  { name: 'Cough', slug: 'cough', description: 'Respiratory condition' },
  { name: 'Cold', slug: 'cold', description: 'Common cold symptoms' },
  { name: 'Allergy', slug: 'allergy', description: 'Allergic reactions' },
  { name: 'Pain', slug: 'pain', description: 'General pain' },
  { name: 'Infection', slug: 'infection', description: 'Bacterial or viral infections' },
  { name: 'Inflammation', slug: 'inflammation', description: 'Inflammatory conditions' },
  { name: 'Diabetes', slug: 'diabetes', description: 'Blood sugar issues' },
  { name: 'Hypertension', slug: 'hypertension', description: 'High blood pressure' },
];

// Helper functions
function extractDrugName(filename) {
  const nameWithoutExt = path.parse(filename).name;
  
  let cleanName = nameWithoutExt
    .replace(/[0-9]/g, '')
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  cleanName = cleanName
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
  
  return cleanName;
}

function generateSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

function generateSKU(name) {
  const prefix = 'MED';
  const timestamp = Date.now().toString().slice(-6);
  const nameCode = name.substring(0, 3).toUpperCase();
  const random = Math.floor(Math.random() * 90) + 10;
  return `${prefix}-${nameCode}-${random}${timestamp}`;
}

function guessCategory(drugName) {
  const lowerName = drugName.toLowerCase();
  
  if (lowerName.includes('paracetamol') || lowerName.includes('ibuprofen') || lowerName.includes('aspirin') || lowerName.includes('diclofenac') || lowerName.includes('pain')) {
    return 'pain-relief';
  }
  if (lowerName.includes('amoxicillin') || lowerName.includes('antibiotic') || lowerName.includes('penicillin') || lowerName.includes('cephalosporin')) {
    return 'antibiotics';
  }
  if (lowerName.includes('cetirizine') || lowerName.includes('loratadine') || lowerName.includes('allergy') || lowerName.includes('antihistamine')) {
    return 'allergy';
  }
  if (lowerName.includes('vitamin') || lowerName.includes('supplement') || lowerName.includes('calcium') || lowerName.includes('multivitamin')) {
    return 'vitamins-supplements';
  }
  if (lowerName.includes('cold') || lowerName.includes('flu') || lowerName.includes('cough') || lowerName.includes('decongestant')) {
    return 'cold-flu';
  }
  if (lowerName.includes('insulin') || lowerName.includes('metformin') || lowerName.includes('diabetes') || lowerName.includes('glucose')) {
    return 'diabetes-care';
  }
  if (lowerName.includes('antacid') || lowerName.includes('laxative') || lowerName.includes('omeprazole') || lowerName.includes('digestive')) {
    return 'digestive-health';
  }
  if (lowerName.includes('cream') || lowerName.includes('ointment') || lowerName.includes('skin') || lowerName.includes('rash')) {
    return 'skin-care';
  }
  
  return 'pain-relief';
}

function generateDescription(name) {
  const descriptions = [
    `${name} is an effective medication for symptomatic relief. Always consult with a healthcare professional before use.`,
    `Trusted ${name} formula for reliable therapeutic results. Follow dosage instructions carefully.`,
    `Clinically tested ${name} for safe and effective treatment. Store in a cool, dry place away from children.`,
    `High-quality ${name} manufactured under strict pharmaceutical standards.`,
    `${name} provides effective relief when used as directed by a physician.`
  ];
  
  return descriptions[Math.floor(Math.random() * descriptions.length)];
}

function generateIngredients() {
  const ingredients = [
    'Active pharmaceutical ingredient as per formulation. Contains pharmaceutical excipients for stability.',
    'Contains the specified active ingredient. May contain lactose, gelatin, starch, and coloring agents.',
    'Formulated with active pharmaceutical ingredient and pharmaceutical-grade excipients.',
    'Medicinal ingredient combined with stabilizers and preservatives as per pharmacopoeial standards.',
    'Active ingredient with supporting compounds for enhanced bioavailability and patient compliance.'
  ];
  return ingredients[Math.floor(Math.random() * ingredients.length)];
}

function generateUsageInstructions() {
  const instructions = [
    'Take as directed by your physician. Do not exceed the recommended dosage. Take with a full glass of water.',
    'Follow your doctor\'s instructions carefully. May be taken with or without food as directed.',
    'Use exactly as prescribed. Complete the full course of treatment even if symptoms improve.',
    'Take the medication at the same time each day for consistent therapeutic levels.',
    'Administer as per healthcare provider\'s advice. Store at room temperature away from moisture and heat.'
  ];
  return instructions[Math.floor(Math.random() * instructions.length)];
}

async function seed() {
  console.log('🌱 Starting database seeding...');
  console.log(`Looking for images in: ${IMAGES_FOLDER}`);
  
  try {
    // Clear existing data
    console.log('\n📦 Clearing existing data...');
    try {
      // Clear tables in correct order to respect foreign keys
      await prisma.productCondition.deleteMany();
      await prisma.cartItem.deleteMany();
      await prisma.orderItem.deleteMany();
      await prisma.shipping.deleteMany();
      await prisma.transaction.deleteMany();
      await prisma.order.deleteMany();
      await prisma.prescription.deleteMany();
      await prisma.address.deleteMany();
      await prisma.notificationPreference.deleteMany();
      await prisma.notification.deleteMany();
      await prisma.cart.deleteMany();
      await prisma.product.deleteMany();
      await prisma.condition.deleteMany();
      await prisma.brand.deleteMany();
      await prisma.category.deleteMany();
      await prisma.user.deleteMany();
      
      console.log('✓ Database cleared successfully');
    } catch (error) {
      console.log('Note: Some tables were already empty or had errors:', error.message);
    }
    
    // 1. Seed Users
    console.log('\n👤 Seeding users...');
    const usersMap = new Map();
    for (const userData of USERS) {
      try {
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        const user = await prisma.user.create({
          data: {
            email: userData.email,
            name: userData.name,
            phone: userData.phone,
            password: hashedPassword,
            role: userData.role
          }
        });
        usersMap.set(userData.email, user.id);
        console.log(`✓ ${user.name} (${user.email})`);
      } catch (error) {
        console.error(`Error creating user ${userData.email}:`, error.message);
      }
    }
    
    // 2. Seed Categories
    console.log('\n🏷️ Seeding categories...');
    const categoriesMap = new Map();
    for (const catData of CATEGORIES) {
      try {
        const category = await prisma.category.create({
          data: {
            name: catData.name,
            slug: catData.slug,
            description: catData.description,
            level: catData.level,
            isLeaf: catData.isLeaf
          }
        });
        categoriesMap.set(catData.slug, category.id);
        console.log(`✓ ${catData.name}`);
      } catch (error) {
        console.error(`Error creating category ${catData.name}:`, error.message);
      }
    }
    
    // 3. Seed Brands
    console.log('\n🏢 Seeding brands...');
    const brandsMap = new Map();
    for (const brandData of BRANDS) {
      try {
        const brand = await prisma.brand.create({
          data: {
            name: brandData.name,
            slug: brandData.slug,
            description: brandData.description
          }
        });
        brandsMap.set(brandData.slug, brand.id);
        console.log(`✓ ${brandData.name}`);
      } catch (error) {
        console.error(`Error creating brand ${brandData.name}:`, error.message);
      }
    }
    
    // 4. Seed Conditions
    console.log('\n⚕️ Seeding conditions...');
    const conditionsMap = new Map();
    for (const conditionData of CONDITIONS) {
      try {
        const condition = await prisma.condition.create({
          data: {
            name: conditionData.name,
            slug: conditionData.slug,
            description: conditionData.description
          }
        });
        conditionsMap.set(conditionData.slug, condition.id);
        console.log(`✓ ${conditionData.name}`);
      } catch (error) {
        console.error(`Error creating condition ${conditionData.name}:`, error.message);
      }
    }
    
    // 5. Try to seed products from images
    console.log('\n💊 Attempting to seed products from images...');
    let createdProducts = 0;
    
    try {
      // Check if images folder exists
      await fs.access(IMAGES_FOLDER);
      const files = await fs.readdir(IMAGES_FOLDER);
      const imageFiles = files.filter(file => 
        /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(file)
      );
      
      console.log(`Found ${imageFiles.length} image files`);
      
      if (imageFiles.length > 0) {
        // Process each image file
        for (const filename of imageFiles) {
          try {
            const drugName = extractDrugName(filename);
            const slug = generateSlug(drugName);
            const sku = generateSKU(drugName);
            const categorySlug = guessCategory(drugName);
            const categoryId = categoriesMap.get(categorySlug);
            
            if (!categoryId) {
              console.log(`⚠️ No category found for ${drugName}, using pain-relief`);
              continue;
            }
            
            // Select random brand
            const brandSlugs = Array.from(brandsMap.keys());
            const randomBrandSlug = brandSlugs[Math.floor(Math.random() * brandSlugs.length)];
            const brandId = brandsMap.get(randomBrandSlug);
            
            // Generate price (KSH 50 to 5000)
            const price = Math.floor(Math.random() * 4950) + 50;
            const hasSale = Math.random() < 0.3;
            const salePrice = hasSale ? parseFloat((price * (0.7 + Math.random() * 0.2)).toFixed(2)) : null;
            
            // Determine if prescription is required
            const prescriptionRequired = Math.random() < 0.4;
            
            // Create image URL
            const imageUrl = `${BASE_IMAGE_URL}/${filename}`;
            
            // Create product
            const product = await prisma.product.create({
              data: {
                name: drugName,
                slug,
                sku,
                description: generateDescription(drugName),
                price,
                salePrice,
                images: JSON.stringify([imageUrl]),
                inStock: Math.random() < 0.85,
                prescriptionRequired,
                ingredients: generateIngredients(),
                usageInstructions: generateUsageInstructions(),
                categoryId,
                brandId
              }
            });
            
            createdProducts++;
            
            // Add conditions to product (30% chance, 1-2 conditions)
            if (Math.random() < 0.3) {
              const conditionSlugs = Array.from(conditionsMap.keys());
              const numConditions = Math.floor(Math.random() * 2) + 1;
              const selectedConditions = new Set();
              
              for (let i = 0; i < numConditions; i++) {
                const randomConditionSlug = conditionSlugs[Math.floor(Math.random() * conditionSlugs.length)];
                selectedConditions.add(randomConditionSlug);
              }
              
              for (const conditionSlug of selectedConditions) {
                await prisma.productCondition.create({
                  data: {
                    productId: product.id,
                    conditionId: conditionsMap.get(conditionSlug)
                  }
                });
              }
            }
            
            console.log(`✓ ${drugName} - KSH ${price}${hasSale ? ` (Sale: KSH ${salePrice})` : ''}`);
            
          } catch (error) {
            console.error(`Error processing ${filename}:`, error.message);
          }
        }
      } else {
        console.log('No image files found in folder');
      }
      
    } catch (error) {
      console.log(`❌ Cannot access images folder: ${error.message}`);
    }
    
    // 6. If no products were created from images, create sample products
    if (createdProducts === 0) {
      console.log('\n💊 Creating sample products...');
      createdProducts = await createSampleProducts(categoriesMap, brandsMap, conditionsMap);
    }
    
    // 7. Seed User Addresses
    console.log('\n🏠 Seeding addresses...');
    const addressesData = [
      { street: '123 Moi Avenue', city: 'Nairobi', state: 'Nairobi County', zipCode: '00100', country: 'Kenya', isDefault: true },
      { street: '456 Thika Road', city: 'Kiambu', state: 'Kiambu County', zipCode: '00200', country: 'Kenya', isDefault: false },
    ];
    
    for (const [email, userId] of usersMap) {
      for (let i = 0; i < addressesData.length; i++) {
        const address = addressesData[i];
        await prisma.address.create({
          data: {
            ...address,
            userId,
            isDefault: i === 0
          }
        });
      }
      console.log(`✓ Added addresses for ${email}`);
    }
    
    // 8. Seed Notification Preferences
    console.log('\n🔔 Seeding notification preferences...');
    for (const [email, userId] of usersMap) {
      await prisma.notificationPreference.create({
        data: { userId }
      });
      console.log(`✓ Added preferences for ${email}`);
    }
    
    // 9. Seed Sample Carts (only if we have products)
    if (createdProducts > 0) {
      console.log('\n🛒 Seeding sample carts...');
      const customerEmails = Array.from(usersMap.keys()).filter(email => 
        email.includes('customer')
      );
      
      const products = await prisma.product.findMany({
        take: 5
      });
      
      if (products.length > 0 && customerEmails.length > 0) {
        for (const customerEmail of customerEmails) {
          const userId = usersMap.get(customerEmail);
          const cart = await prisma.cart.create({
            data: { userId }
          });
          
          // Add 2-3 random products to cart
          const numItems = Math.min(products.length, Math.floor(Math.random() * 2) + 2);
          const selectedProducts = [...products].sort(() => 0.5 - Math.random()).slice(0, numItems);
          
          for (const product of selectedProducts) {
            await prisma.cartItem.create({
              data: {
                cartId: cart.id,
                productId: product.id,
                quantity: Math.floor(Math.random() * 3) + 1
              }
            });
          }
          
          console.log(`✓ Added cart with ${numItems} items for ${customerEmail}`);
        }
      }
    }
    
    // 10. Seed Sample Notifications
    console.log('\n📨 Seeding sample notifications...');
    for (const [email, userId] of usersMap) {
      await prisma.notification.createMany({
        data: [
          {
            userId,
            type: 'SYSTEM',
            title: 'Welcome to MediQuick Pharmacy',
            message: 'Thank you for joining MediQuick. Your account has been successfully created.',
            isRead: false
          },
          {
            userId,
            type: 'PROMOTION',
            title: 'Special Offer',
            message: 'Get 20% off on all pain relief medications this week!',
            isRead: Math.random() < 0.5
          }
        ]
      });
    }
    console.log('✓ Added sample notifications for all users');
    
    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('✅ SEEDING COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(50));
    console.log(`👤 Users: ${usersMap.size}`);
    console.log(`🏷️ Categories: ${categoriesMap.size}`);
    console.log(`🏢 Brands: ${brandsMap.size}`);
    console.log(`⚕️ Conditions: ${conditionsMap.size}`);
    console.log(`💊 Products: ${createdProducts}`);
    console.log('='.repeat(50));
    console.log('\n🔑 Admin Login:');
    console.log('Email: admin@pharmacy.com');
    console.log('Password: Admin@123');
    console.log('\n👥 Customer Login:');
    console.log('Email: customer1@example.com');
    console.log('Password: Customer@123');
    
  } catch (error) {
    console.error('\n❌ Error during seeding:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function createSampleProducts(categoriesMap, brandsMap, conditionsMap) {
  const sampleProducts = [
    { name: 'Paracetamol 500mg', price: 150, category: 'pain-relief', brand: 'pfizer', prescription: false },
    { name: 'Ibuprofen 400mg', price: 200, category: 'pain-relief', brand: 'bayer', prescription: false },
    { name: 'Amoxicillin 500mg', price: 450, category: 'antibiotics', brand: 'glaxosmithkline', prescription: true },
    { name: 'Cetirizine 10mg', price: 250, category: 'allergy', brand: 'sanofi', prescription: false },
    { name: 'Vitamin C 1000mg', price: 300, category: 'vitamins-supplements', brand: 'johnson-johnson', prescription: false },
    { name: 'Metformin 500mg', price: 350, category: 'diabetes-care', brand: 'merck', prescription: true },
    { name: 'Aspirin 75mg', price: 180, category: 'heart-health', brand: 'bayer', prescription: false },
    { name: 'Omeprazole 20mg', price: 280, category: 'digestive-health', brand: 'astrazeneca', prescription: false },
  ];
  
  let createdCount = 0;
  
  for (const productData of sampleProducts) {
    try {
      const slug = generateSlug(productData.name);
      const sku = generateSKU(productData.name);
      const categoryId = categoriesMap.get(productData.category);
      
      // Use a fallback brand if the specified one doesn't exist
      let brandId = brandsMap.get(productData.brand);
      if (!brandId) {
        const brandSlugs = Array.from(brandsMap.keys());
        brandId = brandsMap.get(brandSlugs[0]); // Use first available brand
      }
      
      if (!categoryId || !brandId) {
        console.log(`⚠️ Missing category/brand for ${productData.name}`);
        continue;
      }
      
      const hasSale = Math.random() < 0.3;
      const salePrice = hasSale ? parseFloat((productData.price * 0.8).toFixed(2)) : null;
      
      const product = await prisma.product.create({
        data: {
          name: productData.name,
          slug,
          sku,
          description: generateDescription(productData.name),
          price: productData.price,
          salePrice,
          images: JSON.stringify([`${BASE_IMAGE_URL}/${slug}.jpg`]),
          inStock: true,
          prescriptionRequired: productData.prescription,
          ingredients: generateIngredients(),
          usageInstructions: generateUsageInstructions(),
          categoryId,
          brandId
        }
      });
      
      createdCount++;
      console.log(`✓ ${productData.name} - KSH ${productData.price}`);
      
    } catch (error) {
      console.error(`Error creating ${productData.name}:`, error.message);
    }
  }
  
  return createdCount;
}

// Run seeding
if (require.main === module) {
  seed()
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    })
    .finally(() => {
      console.log('\n✨ Seeding process completed.');
      process.exit(0);
    });
}

module.exports = { seed };