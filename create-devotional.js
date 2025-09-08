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
        "God's Daily Brew",
        "Morning Grace in Every Cup", 
        "Brewing Faith Daily",
        "The Perfect Blend of Faith",
        "Coffee and Communion"
    ];
    
    const fallbackCoffeeFacts = [
        `Did you know that ${coffeeData.origin.country} coffee is special because ${coffeeData.origin.story.toLowerCase()}? Just like how God has a unique plan for each of us!`,
        `The ${coffeeData.brewingMethod} method requires patience and attention, much like how our faith grows through daily devotion and care.`,
        `${coffeeData.roastLevel.level} coffee develops its character through heat and time, reminding us that God uses life's challenges to shape our character.`,
        `Coffee beans are actually seeds from coffee cherries, symbolizing how God plants seeds of faith in our hearts that grow into something beautiful.`
    ];
    
    const fallbackDevotionals = [
        `As you prepare your ${coffeeData.brewingMethod} coffee this morning at the perfect temperature of ${coffeeData.temperature}, remember that God also prepares perfect moments for us each day. The careful process of brewing - from selecting beans from ${coffeeData.origin.country} to the final pour - mirrors how God carefully crafts our daily experiences. ${coffeeData.seasonalTheme.split(' - ')[1]} reminds us that every season has its purpose in God's plan. Just as ${coffeeData.roastLevel.notes.toLowerCase()}, our lives develop richness and depth through time and God's patient love. This ${coffeeData.processing} represents the care God takes in developing our character. Whether you're enjoying this cup during ${coffeeData.perfectTime.toLowerCase()} or any time today, let each sip remind you of God's constant presence and love. The warmth in your hands is like God's embrace, and the energy it provides reflects the spiritual strength He offers us daily.`,
        
        `Today's coffee journey begins with beans from ${coffeeData.origin.country}, where ${coffeeData.origin.story.toLowerCase()}. This reminds us that every good thing has its beginning in God's perfect timing. As you use the ${coffeeData.brewingMethod} method to create your morning cup, think about how God uses specific processes to develop our faith. The ${coffeeData.processing} technique reflects God's attention to detail in our lives. ${coffeeData.seasonalTheme.split(' - ')[1]} speaks to this moment, reminding us that God's love is present in every season. Your ${coffeeData.roastLevel.level} coffee, with its ${coffeeData.roastLevel.notes.toLowerCase()}, represents the depth and complexity that develops in our relationship with God over time. At ${coffeeData.temperature}, this brew reaches its full potential - just as we do when we align ourselves with God's will. Let this morning ritual at ${coffeeData.perfectTime.toLowerCase()} be a time of gratitude and reflection on God's daily gifts.`
    ];
    
    const fallbackScriptures = [
        { verse: "Psalm 23:5", text: "You prepare a table before me in the presence of my enemies. You anoint my head with oil; my cup overflows." },
        { verse: "Isaiah 55:10-11", text: "As the rain and the snow come down from heaven, and do not return to it without watering the earth and making it bud and flourish, so that it yields seed for the sower and bread for the eater, so is my word that goes out from my mouth: It will not return to me empty, but will accomplish what I desire and achieve the purpose for which I sent it." },
        { verse: "Jeremiah 29:11", text: "For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you, to give you hope and a future." },
        { verse: "Matthew 6:26", text: "Look at the birds of the air; they do not sow or reap or store away in barns, and yet your heavenly Father feeds them. Are you not much more valuable than they?" }
    ];
    
    const fallbackReflections = [
        `How does your morning coffee ritual help you connect with God's daily provision?`,
        `What can the patience required for brewing coffee teach you about waiting on God's timing?`,
        `How do the rich flavors in your cup remind you of the depth of God's love?`,
        `In what ways does sharing coffee with others reflect God's call to fellowship?`
    ];
    
    const fallbackPrayers = [
        `Dear Lord, as I enjoy this daily brew, help me remember Your constant presence and faithful love. Like this warm cup in my hands, may I feel Your comfort throughout the day. Amen.`,
        `Heavenly Father, thank You for the simple pleasure of coffee and the reminder it brings of Your daily provision. Help me to savor not just this drink, but every blessing You give. Amen.`,
        `God, as this coffee awakens my body, awaken my spirit to Your voice today. Guide my steps and fill my heart with Your peace. Amen.`
    ];
    
    const fallbackPairings = [
        `${coffeeData.roastLevel.level} from ${coffeeData.origin.country} - representing God's perfect timing and care`,
        `${coffeeData.brewingMethod} preparation - symbolizing the deliberate way God works in our lives`,
        `Seasonal blend reflecting ${coffeeData.seasonalTheme.split(' - ')[0]} - God's faithfulness through all seasons`
    ];
    
    // Use day of year to rotate through options
    const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 1)) / (1000 * 60 * 60 * 24));
    
    return {
        title: fallbackTitles[dayOfYear % fallbackTitles.length],
        coffee_fact: fallbackCoffeeFacts[dayOfYear % fallbackCoffeeFacts.length],
        devotional_text: fallbackDevotionals[dayOfYear % fallbackDevotionals.length],
        scripture_verse: fallbackScriptures[dayOfYear % fallbackScriptures.length].verse,
        scripture_text: fallbackScriptures[dayOfYear % fallbackScriptures.length].text,
        reflection_question: fallbackReflections[dayOfYear % fallbackReflections.length],
        prayer: fallbackPrayers[dayOfYear % fallbackPrayers.length],
        coffee_pairing: fallbackPairings[dayOfYear % fallbackPairings.length]
    };
}

// Main generation function
async function generateTodaysDevotional() {
    const today = getTodayString();
    const filePath = path.join(DEVOTIONALS_DIR, `${today}.json`);
    
    // Check if devotional already exists (unless force regenerate)
    if (fs.existsSync(filePath) && !FORCE_REGENERATE) {
        console.log(`✅ Coffee devotional for ${today} already exists. Skipping generation.`);
        console.log('   Use FORCE_REGENERATE=true to override.');
        return;
    }
    
    if (FORCE_REGENERATE) {
        console.log(`🔄 Force regenerating coffee devotional for ${today}`);
    } else {
        console.log(`☕ Generating new coffee devotional for ${today}`);
    }
    
    try {
        // Get current coffee data
        const coffeeData = getCurrentCoffeeData();
        console.log('☕ Coffee data gathered:', {
            brewing: coffeeData.brewingMethod,
            origin: coffeeData.origin.country,
            roast: coffeeData.roastLevel.level,
            season: coffeeData.seasonalTheme.split(' - ')[0]
        });
        
        let devotionalContent;
        
        try {
            // Try to generate using AI
            console.log('🤖 Attempting AI generation...');
            devotionalContent = await generateDevotionalContent(coffeeData);
            console.log('✅ AI generation successful!');
        } catch (error) {
            console.log('⚠️  AI generation failed, using fallback:', error.message);
            devotionalContent = createFallbackDevotional(coffeeData);
        }
        
        // Create the complete devotional object matching your Swift model
        const devotional = {
            id: `devotional-${today}`,
            date: today,
            title: devotionalContent.title,
            coffee_fact: devotionalContent.coffee_fact,
            scripture: {
                verse: devotionalContent.scripture_verse,
                text: devotionalContent.scripture_text
            },
            devotional_text: devotionalContent.devotional_text,
            reflection_question: devotionalContent.reflection_question,
            prayer: devotionalContent.prayer,
            coffee_pairing: devotionalContent.coffee_pairing || `${coffeeData.roastLevel.level} from ${coffeeData.origin.country}`,
            brewing_method: coffeeData.brewingMethod,
            origin_story: `${coffeeData.origin.country}: ${coffeeData.origin.story}`,
            processing_method: coffeeData.processing,
            roast_level: coffeeData.roastLevel.level,
            roast_notes: coffeeData.roastLevel.notes,
            ideal_temperature: coffeeData.temperature,
            perfect_time: coffeeData.perfectTime,
            seasonal_theme: coffeeData.seasonalTheme,
            audio_url: null, // Can be added later
            createdAt: new Date().toISOString(),
            isFallback: !OPENAI_API_KEY || OPENAI_API_KEY === ''
        };
        
        // Write to file
        fs.writeFileSync(filePath, JSON.stringify(devotional, null, 2));
        
        console.log('🎉 Coffee devotional generated successfully!');
        console.log(`📖 Title: ${devotional.title}`);
        console.log(`📜 Scripture: ${devotional.scripture.verse}`);
        console.log(`☕ Coffee: ${devotional.brewing_method} - ${devotional.origin_story.split(':')[0]}`);
        console.log(`📏 Content Length: ${devotional.devotional_text.length} characters`);
        console.log(`📁 Saved to: ${filePath}`);
        
        // Record in content tracker if available
        try {
            const ContentTracker = require('./content_tracker');
            const tracker = new ContentTracker();
            tracker.recordDevotional(devotional);
        } catch (error) {
            console.log('ℹ️  Content tracker not available:', error.message);
        }
        
    } catch (error) {
        console.error('❌ Error generating coffee devotional:', error);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    generateTodaysDevotional()
        .then(() => {
            console.log('☕ Coffee devotional generation complete!');
        })
        .catch((error) => {
            console.error('💥 Fatal error:', error);
            process.exit(1);
        });
}

module.exports = {
    generateTodaysDevotional,
    getCurrentCoffeeData,
    createFallbackDevotional
};
