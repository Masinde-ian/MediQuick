// utils/serverStatus.js
export const checkServerStatus = async () => {
  try {
    const response = await fetch('http://localhost:5000/health', {
      method: 'GET',
      timeout: 5000,
    });
    return response.ok;
  } catch (error) {
    return false;
  }
};

export const waitForServer = async (maxAttempts = 10) => {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`Checking server status (attempt ${attempt}/${maxAttempts})...`);
    
    if (await checkServerStatus()) {
      console.log('Server is ready!');
      return true;
    }
    
    // Wait 2 seconds before next attempt
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.error('Server did not become available in time');
  return false;
};