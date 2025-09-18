// Test file to verify Gemini API integration
// You can run this in the browser console to test

const testGeminiAPI = async () => {
  try {
    const response = await fetch('/api/test-gemini', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'What is an Argo float?'
      })
    });
    
    const result = await response.json();
    console.log('Gemini API Response:', result);
  } catch (error) {
    console.error('Error:', error);
  }
};

// Call this function to test
// testGeminiAPI();