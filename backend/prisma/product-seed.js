const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

// Initialize Prisma
const prisma = new PrismaClient();

// Paths
const SCRAPED_DATA_DIR = path.join(__dirname, '..', 'products', 'goodlife_scraped');
const PUBLIC_UPLOADS_DIR = path.join(__dirname, '..', 'uploads', 'products');

// Ensure uploads directory exists
if (!fs.existsSync(PUBLIC_UPLOADS_DIR)) {
    fs.mkdirSync(PUBLIC_UPLOADS_DIR, { recursive: true });
    console.log(`📁 Created uploads directory: ${PUBLIC_UPLOADS_DIR}`);
}

// Helper functions
function generateSlug(name) {
    if (!name) return '';
    return name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .substring(0, 100);
}

function extractPrice(priceString) {
    if (!priceString || priceString === '' || priceString === 'N/A') return 0;
    
    const cleanPrice = priceString
        .replace(/KSh/gi, '')
        .replace(/,/g, '')
        .trim();
    
    const price = parseFloat(cleanPrice);
    return isNaN(price) ? 0 : price;
}

function determineInStock(stockString) {
    if (!stockString || typeof stockString !== 'string') return true;
    
    const lowerStock = stockString.toLowerCase();
    
    if (lowerStock.includes('out of stock') || 
        lowerStock.includes('out-of-stock') ||
        lowerStock.includes('unavailable') ||
        lowerStock.includes('sold out') ||
        lowerStock.includes('0 in stock')) {
        return false;
    }
    
    const match = stockString.match(/(\d+)\s*(in stock|available)/i);
    if (match && match[1]) {
        const quantity = parseInt(match[1]);
        return quantity > 0;
    }
    
    return true;
}

function generateSKU(productTitle, categoryName) {
    const titleAbbr = productTitle
        .replace(/[^A-Z]/g, '')
        .substring(0, 3)
        .toUpperCase();
    
    const categoryAbbr = categoryName
        .split(' ')
        .map(word => word.charAt(0))
        .join('')
        .toUpperCase()
        .substring(0, 3);
    
    const random = Math.random().toString(36).substr(2, 6).toUpperCase();
    
    return `${categoryAbbr}-${titleAbbr}-${random}`;
}

function extractBrandFromTitle(title) {
    if (!title) return null;
    
    const brandKeywords = [
        'La Roche-Posay', 'Durex', 'Pregnacare', 'Manix', 'Contempo', 'MS Tellme', 'Erovita',
        'K-Y', 'Canesten', 'Dettol', 'Lifebuoy', 'Vaseline', 'Nivea', 'Johnson', 'Johnson\'s',
        'Cicatrin', 'Savlon', 'Lucozade', 'Ensure', 'Pedialyte', 'ORS',
        'Panadol', 'Brufen', 'Ibuprofen', 'Paracetamol', 'Aspirin', 'Disprin',
        'Cerave', 'Neutrogena', 'Garnier', 'L\'Oreal', 'Maybelline', 'Nouba',
        'Cosrx', 'Bioderma', 'Eucerin', 'Sebamed', 'Simple', 'Uncover',
        'Mizizi', 'Katya', 'Cleo Nature', 'Dr Organic', 'Bio Balance'
    ];
    
    for (const brand of brandKeywords) {
        if (title.toLowerCase().includes(brand.toLowerCase())) {
            return brand;
        }
    }
    
    // Try to extract brand from beginning of title
    const firstWord = title.split(' ')[0];
    if (firstWord && firstWord.length > 2) {
        return firstWord;
    }
    
    return null;
}

function extractConditions(categories) {
    if (!categories || !Array.isArray(categories)) return [];
    
    const conditionKeywords = [
        'Acne', 'Pain', 'Fever', 'Allergy', 'Cough', 'Cold', 'Flu',
        'Infection', 'Headache', 'Migraine', 'Skin', 'Conditions',
        'Vitamin', 'Deficiency', 'Care', 'Wellness', 'Health',
        'Blemish', 'Pimple', 'Dry', 'Oily', 'Sensitive', 'Aging',
        'Wrinkle', 'Dark Spot', 'Brightening', 'Moisturizing',
        'Sun Protection', 'SPF', 'Cleansing', 'Exfoliating'
    ];
    
    const conditions = [];
    categories.forEach(category => {
        if (category && typeof category === 'string') {
            conditionKeywords.forEach(condition => {
                if (category.toLowerCase().includes(condition.toLowerCase())) {
                    conditions.push(condition);
                }
            });
        }
    });
    
    return [...new Set(conditions)];
}

function getImagePaths(productData, categoryFolderName) {
    const imagePaths = [];
    
    if (!productData.title || productData.title.trim() === '') {
        console.log(`   ⚠ No title for product, using default image`);
        return ['/uploads/products/default.jpg'];
    }
    
    // Generate the expected filename from product title (same as scraper logic)
    const sanitizeProductName = (name) => {
        return name
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .substring(0, 100);
    };
    
    const productTitle = productData.title.trim();
    const baseFileName = sanitizeProductName(productTitle);
    
    console.log(`   🔍 Looking for image for: ${productTitle.substring(0, 60)}...`);
    console.log(`      Expected base name: ${baseFileName}`);
    
    // Try different extensions in order of likelihood
    const extensions = ['.webp', '.jpg', '.jpeg', '.png', '.gif'];
    let foundImage = null;
    
    for (const ext of extensions) {
        const possibleFileName = `${baseFileName}${ext}`;
        const filePath = path.join(PUBLIC_UPLOADS_DIR, possibleFileName);
        
        if (fs.existsSync(filePath)) {
            foundImage = possibleFileName;
            console.log(`      ✅ Found: ${foundImage}`);
            break;
        }
    }
    
    // If not found with exact match, look for variations
    if (!foundImage) {
        console.log(`      ⚠ No exact match found, searching for variations...`);
        
        // Read all files in uploads directory
        const allFiles = fs.readdirSync(PUBLIC_UPLOADS_DIR);
        
        // Filter for image files
        const imageFiles = allFiles.filter(file => 
            file.endsWith('.webp') || 
            file.endsWith('.jpg') || 
            file.endsWith('.jpeg') || 
            file.endsWith('.png') || 
            file.endsWith('.gif')
        );
        
        // Try to find by matching significant parts of the product name
        const searchTerms = baseFileName.split('-').filter(term => term.length > 3);
        
        let bestMatch = null;
        let bestMatchScore = 0;
        
        for (const imageFile of imageFiles) {
            const fileNameWithoutExt = path.basename(imageFile, path.extname(imageFile));
            let matchScore = 0;
            
            // Check for exact or partial matches
            if (fileNameWithoutExt === baseFileName) {
                bestMatch = imageFile;
                bestMatchScore = 100;
                break;
            }
            
            // Check if baseFileName contains image filename or vice versa
            if (fileNameWithoutExt.includes(baseFileName.substring(0, 20)) || 
                baseFileName.includes(fileNameWithoutExt.substring(0, 20))) {
                matchScore = 80;
            }
            
            // Check for word matches
            for (const term of searchTerms) {
                if (fileNameWithoutExt.includes(term)) {
                    matchScore += 10;
                }
            }
            
            // Update best match
            if (matchScore > bestMatchScore) {
                bestMatchScore = matchScore;
                bestMatch = imageFile;
            }
        }
        
        if (bestMatch && bestMatchScore > 20) {
            foundImage = bestMatch;
            console.log(`      ✅ Found closest match: ${foundImage} (score: ${bestMatchScore})`);
        }
    }
    
    // If still not found, try using the downloadedImages array
    if (!foundImage && productData.downloadedImages && Array.isArray(productData.downloadedImages)) {
        for (const imageFile of productData.downloadedImages) {
            const filePath = path.join(PUBLIC_UPLOADS_DIR, imageFile);
            if (fs.existsSync(filePath)) {
                foundImage = imageFile;
                console.log(`      ✅ Found via downloadedImages: ${foundImage}`);
                break;
            }
        }
    }
    
    if (foundImage) {
        imagePaths.push(`/uploads/products/${foundImage}`);
    } else {
        console.log(`      ❌ No image found, using default`);
        imagePaths.push('/uploads/products/default.jpg');
    }
    
    return imagePaths;
}

async function clearDatabase() {
    console.log('🗑️  CLEARING ALL EXISTING DATA...');
    console.log('='.repeat(60));
    
    try {
        // Delete in correct order to respect foreign key constraints
        await prisma.productCondition.deleteMany({});
        console.log('✅ Cleared product conditions');
        
        await prisma.orderItem.deleteMany({});
        console.log('✅ Cleared order items');
        
        await prisma.cartItem.deleteMany({});
        console.log('✅ Cleared cart items');
        
        await prisma.product.deleteMany({});
        console.log('✅ Cleared products');
        
        await prisma.condition.deleteMany({});
        console.log('✅ Cleared conditions');
        
        await prisma.brand.deleteMany({});
        console.log('✅ Cleared brands');
        
        await prisma.category.deleteMany({});
        console.log('✅ Cleared categories');
        
        console.log('✅ Database cleared successfully!\n');
        
    } catch (error) {
        console.error('❌ Error clearing database:', error.message);
        throw error;
    }
}

async function ensureCategory(categoryName) {
    const slug = generateSlug(categoryName);
    
    let category = await prisma.category.findUnique({
        where: { slug }
    });
    
    if (!category) {
        category = await prisma.category.create({
            data: {
                name: categoryName,
                slug,
                level: 0,
                isLeaf: true
            }
        });
        console.log(`   ✅ Created category: ${categoryName}`);
    }
    
    return category;
}

async function ensureBrand(brandName) {
    if (!brandName || brandName.trim() === '') return null;
    
    const slug = generateSlug(brandName);
    
    let brand = await prisma.brand.findUnique({
        where: { slug }
    });
    
    if (!brand) {
        brand = await prisma.brand.create({
            data: {
                name: brandName,
                slug
            }
        });
        console.log(`   ✅ Created brand: ${brandName}`);
    }
    
    return brand;
}

async function ensureCondition(conditionName) {
    if (!conditionName || conditionName.trim() === '') return null;
    
    const slug = generateSlug(conditionName);
    
    let condition = await prisma.condition.findUnique({
        where: { slug }
    });
    
    if (!condition) {
        condition = await prisma.condition.create({
            data: {
                name: conditionName,
                slug
            }
        });
        console.log(`   ✅ Created condition: ${conditionName}`);
    }
    
    return condition;
}

async function processProduct(productData, category, categoryFolderName) {
    try {
        if (!productData.title || productData.title.trim() === '') {
            console.log(`⚠ Skipping product with no title`);
            return { skipped: true, reason: 'No title' };
        }
        
        const productSlug = generateSlug(productData.title);
        
        // Generate SKU - use provided SKU or generate one
        const sku = productData.sku && productData.sku.trim() !== '' 
            ? productData.sku.trim()
            : generateSKU(productData.title, category.name);
        
        // Extract data
        const price = extractPrice(productData.price);
        const inStock = determineInStock(productData.inStock);
        const brandName = extractBrandFromTitle(productData.title);
        const imagePaths = getImagePaths(productData, categoryFolderName);
        const conditionNames = extractConditions(productData.categories);
        
        // Check prescription requirement
        const prescriptionRequired = 
            productData.requiresPrescription === true ||
            (productData.title && productData.title.toLowerCase().includes('prescription')) ||
            false;
        
        // Get brand
        let brand = null;
        if (brandName) {
            brand = await ensureBrand(brandName);
        }
        
        // Create product
        const product = await prisma.product.create({
            data: {
                name: productData.title.trim(),
                slug: productSlug,
                description: productData.description || '',
                price: price,
                salePrice: null,
                images: JSON.stringify(imagePaths),
                sku: sku,
                inStock: inStock,
                prescriptionRequired: prescriptionRequired,
                ingredients: '',
                usageInstructions: '',
                categoryId: category.id,
                brandId: brand?.id || null
            }
        });
        
        console.log(`   ✅ Created: ${productData.title.substring(0, 60)}...`);
        console.log(`      Price: KSh${price}, In Stock: ${inStock ? 'Yes' : 'No'}`);
        console.log(`      Images: ${imagePaths.length} image(s) copied`);
        
        // Link conditions
        for (const conditionName of conditionNames) {
            const condition = await ensureCondition(conditionName);
            if (condition) {
                await prisma.productCondition.create({
                    data: {
                        productId: product.id,
                        conditionId: condition.id
                    }
                });
            }
        }
        
        return { success: true, product };
        
    } catch (error) {
        console.error(`   ❌ Error processing product: ${error.message}`);
        if (error.code === 'P2002') {
            console.log(`   ⚠ Duplicate SKU or slug detected`);
        }
        return { error: error.message };
    }
}

async function processCategoryFolder(categoryFolderName) {
    const categoryName = categoryFolderName.replace(/_/g, ' ').replace(/\+/g, ' & ');
    const productsFilePath = path.join(SCRAPED_DATA_DIR, categoryFolderName, 'products.json');
    
    console.log(`\n📦 Processing category: ${categoryName}`);
    console.log('-'.repeat(60));
    
    if (!fs.existsSync(productsFilePath)) {
        console.log(`⚠ No products.json found for ${categoryName}`);
        return { processed: 0, skipped: 0, failed: 0 };
    }
    
    try {
        const fileContent = fs.readFileSync(productsFilePath, 'utf8');
        const products = JSON.parse(fileContent);
        
        if (!Array.isArray(products) || products.length === 0) {
            console.log(`⚠ No products found in ${categoryName}`);
            return { processed: 0, skipped: 0, failed: 0 };
        }
        
        console.log(`📊 Found ${products.length} products`);
        
        // Ensure category exists
        const category = await ensureCategory(categoryName);
        
        let processed = 0;
        let skipped = 0;
        let failed = 0;
        
        // Process products
        for (let i = 0; i < products.length; i++) {
            const product = products[i];
            
            // Show progress
            if (i % 20 === 0 && i > 0) {
                console.log(`   Progress: ${i}/${products.length}...`);
            }
            
            const result = await processProduct(product, category, categoryFolderName);
            
            if (result.skipped) {
                skipped++;
            } else if (result.success) {
                processed++;
            } else {
                failed++;
            }
            
            // Small delay to avoid overwhelming the database
            if (i % 10 === 0) {
                await new Promise(resolve => setTimeout(resolve, 50));
            }
        }
        
        console.log(`✅ ${categoryName}: ${processed} created, ${skipped} skipped, ${failed} failed`);
        
        return { processed, skipped, failed };
        
    } catch (error) {
        console.error(`❌ Error processing ${categoryName}:`, error.message);
        return { processed: 0, skipped: 0, failed: 0, error: error.message };
    }
}

async function seedDatabase() {
    console.log('🚀 STARTING FRESH DATABASE SEEDING...');
    console.log(`📁 Reading from: ${SCRAPED_DATA_DIR}`);
    console.log(`📁 Saving images to: ${PUBLIC_UPLOADS_DIR}`);
    console.log('='.repeat(60));
    
    try {
        // Check if scraped data directory exists
        if (!fs.existsSync(SCRAPED_DATA_DIR)) {
            console.error(`❌ Directory not found: ${SCRAPED_DATA_DIR}`);
            return;
        }
        
        // STEP 1: CLEAR ALL EXISTING DATA FIRST
        await clearDatabase();
        
        // Get all category folders
        const items = fs.readdirSync(SCRAPED_DATA_DIR, { withFileTypes: true });
        const categoryFolders = items
            .filter(item => item.isDirectory())
            .map(item => item.name);
        
        if (categoryFolders.length === 0) {
            console.log('⚠ No category folders found');
            return;
        }
        
        console.log(`📊 Found ${categoryFolders.length} categories:`);
        categoryFolders.forEach((folder, index) => {
            console.log(`  ${index + 1}. ${folder}`);
        });
        console.log('='.repeat(60));
        
        let totalProcessed = 0;
        let totalSkipped = 0;
        let totalFailed = 0;
        
        // STEP 2: SEED FRESH DATA
        for (let i = 0; i < categoryFolders.length; i++) {
            const folder = categoryFolders[i];
            
            console.log(`\n[${i + 1}/${categoryFolders.length}] ${folder}`);
            console.log('='.repeat(60));
            
            const result = await processCategoryFolder(folder);
            
            totalProcessed += result.processed || 0;
            totalSkipped += result.skipped || 0;
            totalFailed += result.failed || 0;
            
            // Small delay between categories
            if (i < categoryFolders.length - 1) {
                console.log('\n⏳ Pausing for 1 second...\n');
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        
        // Summary
        console.log('\n' + '='.repeat(60));
        console.log('🎉 SEEDING COMPLETED!');
        console.log('='.repeat(60));
        console.log(`📊 Categories processed: ${categoryFolders.length}`);
        console.log(`📊 Products created: ${totalProcessed}`);
        console.log(`📊 Products skipped: ${totalSkipped}`);
        console.log(`📊 Products failed: ${totalFailed}`);
        console.log('='.repeat(60));
        
        // Get final database statistics
        const [categoryCount, productCount, brandCount, conditionCount] = await Promise.all([
            prisma.category.count(),
            prisma.product.count(),
            prisma.brand.count(),
            prisma.condition.count()
        ]);
        
        console.log('\n📊 FINAL DATABASE STATISTICS:');
        console.log(`   Categories: ${categoryCount}`);
        console.log(`   Products: ${productCount}`);
        console.log(`   Brands: ${brandCount}`);
        console.log(`   Conditions: ${conditionCount}`);
        console.log('='.repeat(60));
        
    } catch (error) {
        console.error('❌ Seeding failed:', error);
        console.error('Stack trace:', error.stack);
    } finally {
        await prisma.$disconnect();
        console.log('\n🔒 Database connection closed');
    }
}

// Run the seeder
seedDatabase().catch(console.error);