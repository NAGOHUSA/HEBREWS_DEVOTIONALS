const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Configuration
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const FORCE_REGENERATE = process.env.FORCE_REGENERATE === 'true';

// Devotionals directory
const DEVOTIONALS_DIR = './devotionals';

// Ensure devotionals directory exists
if (!fs.existsSync(DEVOTIONALS_DIR)) {
    fs.mkdirSync(DEVOTIONALS_DIR, { recursive: true });
}

// Get today's date in YYYY-MM-DD format
function getTodayString() {
    return new Date().toISOString().split('T')[0];
}

// Get coffee-related data for the current date
function getCurrentCoffeeData() {
    const today = new Date();
    const month = today.getMonth() + 1; // 0-indexed
    const day = today.getDate();
    const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 1)) / (1000 * 60 * 60 * 24));
    
    // Rotating brewing methods
    const brewingMethods = [
        "Pour Over", "French Press", "Espresso", "Cold Brew", "AeroPress",
        "Chemex", "V60", "Drip Coffee", "Turkish Coffee", "Moka Pot",
        "Siphon", "Percolator"
    ];
    
    // Coffee origins with stories
    const origins = [
        { country: "Ethiopia", story: "The birthplace of coffee, where legend says a goat herder discovered coffee beans" },
        { country: "Jamaica", story: "Blue Mountain coffee, known for its mild flavor and lack of bitterness" },
        { country: "Hawaii", story: "Kona coffee, the only commercial coffee grown in the USA" },
        { country: "Yemen", story: "Ancient Mocha port, where coffee trading began centuries ago" },
        { country: "Colombia", story: "High-altitude mountain regions producing smooth, well-balanced coffee" },
        { country: "Guatemala", story: "Volcanic soil creating complex, spicy coffee profiles" },
        { country: "Brazil", story: "The world's largest coffee producer, known for chocolatey notes" },
        { country: "Costa Rica", story: "Pioneering sustainable coffee farming practices" }
    ];
    
    // Coffee processing methods
    const processingMethods = [
        "Washed/Wet Process", "Natural/Dry Process", "Honey Process",
        "Semi-Washed", "Anaerobic Fermentation", "Carbonic Maceration"
    ];
    
    // Roast levels with characteristics
    const roastLevels = [
        { level: "Light Roast", notes: "Bright acidity, floral notes, origin flavors shine" },
        { level: "Medium Roast", notes: "Balanced flavor, moderate acidity, caramelized sugars" },
        { level: "Medium-Dark Roast", notes: "Rich body, low acidity, chocolate undertones" },
        { level: "Dark Roast", notes: "Bold, smoky flavor, oils visible, roast flavors dominant" }
    ];
    
    // Season-based themes
    let seasonalTheme;
    if (month >= 3 && month <= 5) {
        seasonalTheme = "Spring - New beginnings, fresh growth, morning renewal";
    } else if (month >= 6 && month <= 8) {
        seasonalTheme = "Summer - Iced coffee, cold brew, refreshing fellowship";
    } else if (month >= 9 && month <= 11) {
        seasonalTheme = "Autumn - Warm cups, harvest gratitude, cozy gatherings";
    } else {
        seasonalTheme = "Winter - Hot brewing, comfort drinks, warming the soul";
    }
    
    // Select rotating elements based on day of year
    const selectedOrigin = origins[dayOfYear % origins.length];
    const selectedBrewing = brewingMethods[dayOfYear % brewingMethods.length];
    const selectedProcessing = processingMethods[dayOfYear % processingMethods.length];
    const selectedRoast = roastLevels[dayOfYear % roastLevels.length];
    
    return {
        brewingMethod: selectedBrewing,
        origin: selectedOrigin,
        processing: selectedProcessing,
        roastLevel: selectedRoast,
        seasonalTheme: seasonalTheme,
        perfectTime: getIdealBrewingTime(),
        temperature: getIdealTemperature(selectedBrewing)
    };
}

// Get ideal brewing time based on method
function getIdealBrewingTime() {
    const times = [
        "6:00 AM - 8:00 AM (morning ritual)",
        "2:00 PM - 4:00 PM (afternoon pick-me-up)",
        "Evening decaf for peaceful reflection"
    ];
    const hour = new Date().getHours();
    
    if (hour >= 6 && hour < 10) return times[0];
    else if (hour >= 14 && hour < 17) return times[1];
    else return times[2];
}

// Get ideal temperature for brewing method
function getIdealTemperature(method) {
    const temperatures = {
        "Pour Over": "195-205°F",
        "French Press": "200°F",
        "Espresso": "190-196°F",
        "Cold Brew": "Room temperature (long steep)",
        "AeroPress": "185-205°F",
        "Chemex": "195-205°F",
        "V60": "195-205°F"
    };
    
    return temperatures[method] || "195-205°F";
}

// Generate devotional content using OpenAI
async function generateDevotionalContent(coffeeData) {
    if (!OPENAI_API_KEY || OPENAI_API_KEY === '') {
        throw new Error('OpenAI API key not provided');
    }
    
    const currentDate = new Date();
    const dateString = currentDate.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    
    const prompt = `Create a Christian devotional for today (${dateString}) that incorporates these coffee elements:

Brewing Method: ${coffeeData.brewingMethod}
Coffee Origin: ${coffeeData.origin.country} - ${coffeeData.origin.story}
Processing: ${coffeeData.processing}
Roast Level: ${coffeeData.roastLevel.level} (${coffeeData.roastLevel.notes})
Seasonal Theme: ${coffeeData.seasonalTheme}
Perfect Brewing Time: ${coffeeData.perfectTime}
Ideal Temperature: ${coffeeData.temperature}

The devotional should:
1. Be uplifting and encouraging, perfect for starting the day with faith and coffee
2. Connect today's coffee elements to spiritual truths in meaningful ways
3. Include a relevant biblical reference
4. Be 250-400 words in length
5. Use warm, accessible language that speaks to the heart
6. Focus on God's love, daily grace, and spiritual growth
7. Include an interesting coffee fact that connects to the spiritual message
8. Encourage daily reflection and prayer

Format your response as JSON with these exact fields:
- "title": An inspiring, coffee-themed title (50 characters or less)
- "coffee_fact": An interesting coffee fact related to today's theme (1-2 sentences)
- "devotional_text": The main devotional content (250-400 words)
- "scripture_verse": A relevant Bible verse reference (book chapter:verse format)
- "scripture_text": The full text of the Bible verse
- "reflection_question": A thoughtful question for personal reflection
- "prayer": A short prayer related to the theme
- "coffee_pairing": Recommended coffee type/style for today's reflection

Keep the tone warm, encouraging, and conducive to morning devotion and coffee enjoyment.`;

    try {
        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: 'gpt-3.5-turbo',
            messages: [
                {
                    role: 'system',
                    content: 'You are a thoughtful Christian devotional writer who creates inspiring, coffee-themed daily content for people who love both faith and coffee. Always respond with valid JSON only, no additional text.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            max_tokens: 1000,
            temperature: 0.7
        }, {
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        let content = response.data.choices[0].message.content.trim();
        
        // Clean up the response - remove markdown formatting if present
        content = content.replace(/```json\s*/, '').replace(/```\s*$/, '');
        
        // Parse the JSON response
        const devotionalData = JSON.parse(content);
        
        // Validate required fields
        const requiredFields = ['title', 'coffee_fact', 'devotional_text', 'scripture_verse', 'scripture_text', 'reflection_question', 'prayer'];
        for (const field of requiredFields) {
            if (!devotionalData[field]) {
                throw new Error(`Missing required field: ${field}`);
            }
        }
        
        return devotionalData;
        
    } catch (error) {
        console.error('OpenAI API Error:', error.response?.data || error.message);
        throw error;
    }
}

// Create fallback devotional if AI generation fails
function createFallbackDevotional(coffeeData) {
    const today = getTodayString();
    
    const fallbackTitles = [
        "God's
