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
        { country: "Costa Rica", story: "Pioneering sustainable coffee farming practices" },
        { country: "Kenya", story: "High-altitude regions producing bright, wine-like acidity" },
        { country: "Panama", story: "Geisha variety coffee commanding record auction prices" }
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
        "V60": "195-205°F",
        "Drip Coffee": "195-205°F",
        "Turkish Coffee": "185-195°F",
        "Moka Pot": "185-195°F",
        "Siphon": "195-205°F",
        "Percolator": "195-205°F"
    };
    
    return temperatures[method] || "195-205°F";
}

// Generate devotional content using OpenAI
async function generateDevotionalContent(coffeeData) {
    if (!OPENAI_API_KEY || OPENAI_API_KEY.trim() === '') {
        throw new Error('OpenAI API key not provided or empty');
    }
    
    console.log('🔑 API Key validation:');
    console.log('   - Present:', !!OPENAI_API_KEY);
    console.log('   - Length:', OPENAI_API_KEY ? OPENAI_API_KEY.length : 0);
    console.log('   - Starts with sk-:', OPENAI_API_KEY ? OPENAI_API_KEY.startsWith('sk-') : false);
    
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

Create an inspiring, faith-filled devotional that naturally connects these coffee elements to spiritual truths. The devotional should:

1. Be uplifting and encouraging for starting the day with faith and coffee
2. Connect today's coffee elements to biblical truths in meaningful ways
3. Include a relevant, encouraging Bible verse
4. Be 400-600 words in length (substantial, meaningful content)
5. Use warm, accessible language that speaks to the heart
6. Focus on God's love, daily grace, spiritual growth, and practical faith
7. Include an interesting coffee fact that enhances the spiritual message
8. Encourage daily reflection and communion with God
9. Avoid forced connections - make the coffee metaphors natural and meaningful
10. Be genuinely helpful for someone's spiritual journey

Format your response as a JSON object with these exact fields:
{
  "title": "An inspiring, coffee-themed title (under 60 characters)",
  "coffee_fact": "An interesting coffee fact related to today's theme (1-2 sentences)",
  "devotional_text": "The main devotional content (400-600 words)",
  "scripture_verse": "Bible verse reference (book chapter:verse format)",
  "scripture_text": "The full text of the Bible verse",
  "reflection_question": "A thoughtful question for personal reflection",
  "prayer": "A sincere prayer related to the theme (2-3 sentences)",
  "coffee_pairing": "Recommended coffee type/style for today's reflection"
}

Keep the tone warm, encouraging, authentic, and conducive to morning devotion and coffee enjoyment. Make it genuinely meaningful for both coffee lovers and people of faith.`;

    try {
        console.log('🚀 Making OpenAI API request...');
        console.log('🎯 Model: gpt-4');
        console.log('🎯 Max tokens: 2500');
        
        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: 'gpt-4',
            messages: [
                {
                    role: 'system',
                    content: 'You are a thoughtful Christian devotional writer who creates inspiring, coffee-themed daily content for people who love both faith and coffee. You write with warmth, authenticity, and spiritual depth. Always respond with valid JSON only, no additional text or formatting.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            max_tokens: 2500,
            temperature: 0.7
        }, {
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            timeout: 45000 // 45 second timeout
        });

        console.log('✅ OpenAI API response received successfully');
        console.log('📊 Response status:', response.status);
        console.log('📊 Response usage:', response.data.usage);

        if (!response.data.choices || !response.data.choices[0]) {
            throw new Error('Invalid response structure from OpenAI API');
        }

        let content = response.data.choices[0].message.content.trim();
        console.log('📝 Raw content length:', content.length);
        console.log('📝 Raw content preview:', content.substring(0, 200) + '...');
        
        // Clean up the response - remove any markdown formatting
        content = content.replace(/```json\s*/g, '').replace(/```\s*$/g, '').trim();
        
        // Parse the JSON response
        let devotionalData;
        try {
            devotionalData = JSON.parse(content);
            console.log('✅ JSON parsing successful');
        } catch (parseError) {
            console.error('❌ JSON parsing failed:', parseError.message);
            console.error('Content that failed to parse:', content.substring(0, 500) + '...');
            throw new Error(`Failed to parse AI response as JSON: ${parseError.message}`);
        }
        
        // Validate required fields
        const requiredFields = ['title', 'coffee_fact', 'devotional_text', 'scripture_verse', 'scripture_text', 'reflection_question', 'prayer'];
        const missingFields = [];
        
        for (const field of requiredFields) {
            if (!devotionalData[field] || devotionalData[field].trim() === '') {
                missingFields.push(field);
            }
        }
        
        if (missingFields.length > 0) {
            throw new Error(`Missing or empty required fields: ${missingFields.join(', ')}`);
        }
        
        // Validate content length
        const textLength = devotionalData.devotional_text.length;
        if (textLength < 300) {
            throw new Error(`Devotional text too short: ${textLength} characters (minimum 300)`);
        }
        
        if (textLength > 4000) {
            throw new Error(`Devotional text too long: ${textLength} characters (maximum 4000)`);
        }
        
        console.log('✅ Content validation passed');
        console.log('📖 Title:', devotionalData.title);
        console.log('📜 Scripture:', devotionalData.scripture_verse);
        console.log('📏 Devotional length:', textLength, 'characters');
        console.log('☕ Coffee fact:', devotionalData.coffee_fact.substring(0, 80) + '...');
        
        return devotionalData;
        
    } catch (error) {
        console.error('❌ OpenAI API Error Details:');
        console.error('   Type:', error.constructor.name);
        console.error('   Message:', error.message);
        
        if (error.response) {
            console.error('   HTTP Status:', error.response.status);
            console.error('   Status Text:', error.response.statusText);
            console.error('   Response Headers:', JSON.stringify(error.response.headers, null, 2));
            console.error('   Response Data:', JSON.stringify(error.response.data, null, 2));
        }
        
        if (error.code) {
            console.error('   Error Code:', error.code);
        }
        
        throw error;
    }
}

// Create fallback devotional if AI generation fails
function createFallbackDevotional(coffeeData) {
    const fallbackTitles = [
        "God's Daily Brew",
        "Morning Grace in Every Cup", 
        "Brewing Faith Daily",
        "The Perfect Blend of Faith",
        "Coffee and Communion",
        "Steeping in God's Love",
        "Divine Roast",
        "Sacred Sips",
        "Heaven's Harvest Cup",
        "Faith-Filled French Press"
    ];
    
    const fallbackCoffeeFacts = [
        `Did you know that ${coffeeData.origin.country} coffee is special because ${coffeeData.origin.story.toLowerCase()}? Just like how God has a unique plan for each of us!`,
        `The ${coffeeData.brewingMethod} method requires patience and attention, much like how our faith grows through daily devotion and care.`,
        `${coffeeData.roastLevel.level} coffee develops its character through heat and time, reminding us that God uses life's challenges to shape our character.`,
        `Coffee beans are actually seeds from coffee cherries, symbolizing how God plants seeds of faith in our hearts that grow into something beautiful.`,
        `The ${coffeeData.processing} process transforms raw coffee cherries into the beans we love, just as God transforms our hearts through His grace.`,
        `Coffee brewed at ${coffeeData.temperature} brings out the best flavors, reminding us that God's timing is always perfect for our spiritual growth.`
    ];
    
    const fallbackDevotionals = [
        `As you prepare your ${coffeeData.brewingMethod} coffee this morning at the perfect temperature of ${coffeeData.temperature}, remember that God also prepares perfect moments for us each day. The careful process of brewing - from selecting beans from ${coffeeData.origin.country} to the final pour - mirrors how God carefully crafts our daily experiences.

${coffeeData.seasonalTheme.split(' - ')[1]} reminds us that every season has its purpose in God's plan. Just as ${coffeeData.roastLevel.notes.toLowerCase()}, our lives develop richness and depth through time and God's patient love. This ${coffeeData.processing} represents the care God takes in developing our character.

Whether you're enjoying this cup during ${coffeeData.perfectTime.toLowerCase()} or any time today, let each sip remind you of God's constant presence and love. The warmth in your hands is like God's embrace, and the energy it provides reflects the spiritual strength He offers us daily.

Coffee has this amazing ability to bring people together - families around breakfast tables, friends catching up, coworkers collaborating. In the same way, God desires to commune with us daily, to share in our joys and sorrows, to be present in both ordinary and extraordinary moments.

As the aroma fills your space, think about how God's love permeates every aspect of our lives. Just as coffee awakens your senses, may God's word awaken your spirit to new possibilities, fresh hope, and deeper faith. Let this daily ritual become a reminder that God is faithful, His mercies are new every morning, and His love for you is as reliable as your morning cup.

The journey from ${coffeeData.origin.country} to your cup represents countless hands working together - farmers, processors, roasters, and retailers. Similarly, God works through countless people and circumstances to bring blessing into our lives, reminding us that we are all connected in His grand design.`,
        
        `Today's coffee journey begins with beans from ${coffeeData.origin.country}, where ${coffeeData.origin.story.toLowerCase()}. This reminds us that every good thing has its beginning in God's perfect timing. As you use the ${coffeeData.brewingMethod} method to create your morning cup, think about how God uses specific processes to develop our faith.

The ${coffeeData.processing} technique reflects God's attention to detail in our lives. He doesn't rush our spiritual growth but allows it to unfold naturally, just like the slow transformation of coffee cherries into the aromatic brew in your hands. ${coffeeData.seasonalTheme.split(' - ')[1]} speaks to this moment, reminding us that God's love is present in every season of our lives.

Your ${coffeeData.roastLevel.level} coffee, with its ${coffeeData.roastLevel.notes.toLowerCase()}, represents the depth and complexity that develops in our relationship with God over time. At ${coffeeData.temperature}, this brew reaches its full potential - just as we do when we align ourselves with God's will and purpose for our lives.

There's something profound about the daily ritual of coffee preparation. It requires intentionality, patience, and presence - qualities that enrich our spiritual lives as well. As you measure, pour, and wait for your coffee to brew, consider how these same qualities can deepen your relationship with God.

The energy that coffee provides is temporary, but the spiritual strength that comes from connecting with God each morning sustains us throughout all of life's challenges. Let this morning ritual at ${coffeeData.perfectTime.toLowerCase()} be a time of gratitude and reflection on God's daily gifts.

Just as coffee plants need the right soil, climate, and care to flourish, our spiritual lives thrive when we create the right conditions - regular prayer, Scripture reading, fellowship, and service. God tends to our hearts like a master gardener, knowing exactly what we need for healthy growth.

The complexity of flavors in your cup - from the terroir of ${coffeeData.origin.country} to the careful roasting process - reminds us of the beautiful complexity of God's love for us, with new depths to discover each day.`
    ];
    
    const fallbackScriptures = [
        { verse: "Psalm 23:5", text: "You prepare a table before me in the presence of my enemies. You anoint my head with oil; my cup overflows." },
        { verse: "Isaiah 55:10-11", text: "As the rain and the snow come down from heaven, and do not return to it without watering the earth and making it bud and flourish, so that it yields seed for the sower and bread for the eater, so is my word that goes out from my mouth: It will not return to me empty, but will accomplish what I desire and achieve the purpose for which I sent it." },
        { verse: "Jeremiah 29:11", text: "For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you, to give you hope and a future." },
        { verse: "Matthew 6:26", text: "Look at the birds of the air; they do not sow or reap or store away in barns, and yet your heavenly Father feeds them. Are you not much more valuable than they?" },
        { verse: "Psalm 46:10", text: "Be still, and know that I am God; I will be exalted among the nations, I will be exalted in the earth." },
        { verse: "Philippians 4:19", text: "And my God will meet all your needs according to the riches of his glory in Christ Jesus." },
        { verse: "1 Corinthians 10:31", text: "So whether you eat or drink or whatever you do, do it all for the glory of God." },
        { verse: "Lamentations 3:22-23", text: "Because of the Lord's great love we are not consumed, for his compassions never fail. They are new every morning; great is your faithfulness." }
    ];
    
    const fallbackReflections = [
        `How does your morning coffee ritual help you connect with God's daily provision and faithfulness?`,
        `What can the patience required for brewing coffee teach you about waiting on God's perfect timing?`,
        `How do the rich, complex flavors in your cup remind you of the depth and richness of God's love?`,
        `In what ways does sharing coffee with others reflect God's call to fellowship and community?`,
        `How might the journey from coffee bean to cup mirror your own spiritual journey with God?`,
        `What parallels do you see between tending a coffee plant and God's care for your spiritual growth?`,
        `How can the daily ritual of coffee become a reminder of God's faithfulness and new mercies each morning?`,
        `What does the warmth and comfort of coffee teach you about God's presence in your life?`
    ];
    
    const fallbackPrayers = [
        `Dear Lord, as I enjoy this daily brew, help me remember Your constant presence and faithful love. Like this warm cup in my hands, may I feel Your comfort throughout the day. Guide my steps and fill my heart with Your peace. Amen.`,
        `Heavenly Father, thank You for the simple pleasure of coffee and the reminder it brings of Your daily provision. Help me to savor not just this drink, but every blessing You give. May this morning moment draw me closer to You. Amen.`,
        `God, as this coffee awakens my body, awaken my spirit to Your voice today. Help me to be present in this moment and aware of Your love surrounding me. Grant me wisdom and strength for whatever lies ahead. Amen.`,
        `Lord, just as this coffee warms me from within, let Your love warm my heart and overflow to others. Help me to be a blessing to those I encounter today, sharing Your grace as freely as I share a cup of coffee. Amen.`,
        `Father, thank You for the farmers, workers, and all who made this coffee possible. Remind me of our interconnectedness and help me to live with gratitude for the many hands that serve us each day. Amen.`
    ];
    
    const fallbackPairings = [
        `${coffeeData.roastLevel.level} from ${coffeeData.origin.country} - representing God's perfect timing and care in our spiritual development`,
        `${coffeeData.brewingMethod} preparation - symbolizing the deliberate, intentional way God works in our lives`,
        `Seasonal blend reflecting ${coffeeData.seasonalTheme.split(' - ')[0]} - celebrating God's faithfulness through all seasons of life`,
        `Single-origin ${coffeeData.origin.country} - appreciating the unique way God created and called each of us`,
        `${coffeeData.processing} processed beans - honoring the careful transformation God works in our hearts`,
        `Coffee brewed at ${coffeeData.temperature} - recognizing God's perfect timing in all things`
    ];
    
    // Use day of year to rotate through options for variety
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

// Update content tracker for analytics
function updateContentTracker(devotional) {
    const trackerPath = path.join('.', 'content_tracker.json');
    let tracker = {
        devotionals: [],
        statistics: {},
        lastUpdated: null
    };
    
    // Load existing tracker if it exists
    if (fs.existsSync(trackerPath)) {
        try {
            const existing = JSON.parse(fs.readFileSync(trackerPath, 'utf8'));
            tracker = { ...tracker, ...existing };
        } catch (error) {
            console.log('⚠️  Could not read existing tracker, creating new one');
        }
    }
    
    // Ensure arrays exist
    if (!Array.isArray(tracker.devotionals)) tracker.devotionals = [];
    if (!tracker.statistics) tracker.statistics = {};
    
    // Add new devotional record
    tracker.devotionals.push({
        date: devotional.date,
        title: devotional.title,
        scripture: devotional.scripture.verse,
        generatedAt: devotional.createdAt,
        generatedBy: devotional.generatedBy,
        wordCount: devotional.devotional_text.split(' ').length,
        isAIGenerated: !devotional.isFallback,
        coffeeOrigin: devotional.origin_story.split(':')[0],
        brewingMethod: devotional.brewing_method
    });
    
    // Keep only last 100 entries to prevent file from growing too large
    if (tracker.devotionals.length > 100) {
        tracker.devotionals = tracker.devotionals.slice(-100);
    }
    
    // Update statistics
    const aiGenerated = tracker.devotionals.filter(d => d.isAIGenerated).length;
    const fallbackGenerated = tracker.devotionals.length - aiGenerated;
    
    tracker.statistics = {
        totalGenerated: tracker.devotionals.length,
        aiGenerated: aiGenerated,
        fallbackGenerated: fallbackGenerated,
        successRate: aiGenerated / tracker.devotionals.length,
        lastGenerated: devotional.createdAt,
        averageWordCount: Math.round(
            tracker.devotionals.reduce((sum, d) => sum + d.wordCount, 0) / tracker.devotionals.length
        ),
        uniqueOrigins: [...new Set(tracker.devotionals.map(d => d.coffeeOrigin))].length,
        uniqueBrewingMethods: [...new Set(tracker.devotionals.map(d => d.brewingMethod))].length
    };
    
    tracker.lastUpdated = new Date().toISOString();
    
    try {
        fs.writeFileSync(trackerPath, JSON.stringify(tracker, null, 2));
        console.log('📊 Content tracker updated successfully');
        console.log(`   Total devotionals: ${tracker.statistics.totalGenerated}`);
        console.log(`   AI success rate: ${(tracker.statistics.successRate * 100).toFixed(1)}%`);
    } catch (error) {
        console.log('⚠️  Could not update content tracker:', error.message);
    }
}

// Main generation function
async function generateTodaysDevotional() {
    const today = getTodayString();
    const filePath = path.join(DEVOTIONALS_DIR, `${today}.json`);
    
    console.log('☕ HeBrews Enhanced Devotional Generator');
    console.log('========================================');
    console.log(`📅 Target date: ${today}`);
    console.log(`📁 Output path: ${filePath}`);
    console.log(`🔄 Force regenerate: ${FORCE_REGENERATE}`);
    
    // Check if devotional already exists (unless force regenerate)
    if (fs.existsSync(filePath) && !FORCE_REGENERATE) {
        console.log(`✅ Coffee devotional for ${today} already exists. Skipping generation.`);
        console.log('   Use FORCE_REGENERATE=true to override.');
        return;
    }
    
    if (FORCE_REGENERATE && fs.existsSync(filePath)) {
        console.log(`🔄 Force regenerating existing coffee devotional for ${today}`);
    } else {
        console.log(`☕ Generating new coffee devotional for ${today}`);
    }
    
    // Validate API key early and provide detailed feedback
    const hasValidApiKey = OPENAI_API_KEY && 
                          OPENAI_API_KEY.trim() !== '' && 
                          OPENAI_API_KEY.startsWith('sk-') && 
                          OPENAI_API_KEY.length > 20;
    
    console.log('🔑 API Key Status:');
    console.log(`   Present: ${!!OPENAI_API_KEY}`);
    console.log(`   Non-empty: ${OPENAI_API_KEY ? OPENAI_API_KEY.trim() !== '' : false}`);
    console.log(`   Correct format: ${OPENAI_API_KEY ? OPENAI_API_KEY.startsWith('sk-') : false}`);
    console.log(`   Sufficient length: ${OPENAI_API_KEY ? OPENAI_API_KEY.length > 20 : false}`);
    console.log(`   Valid for AI generation: ${hasValidApiKey}`);
    
    if (!hasValidApiKey) {
        console.log('⚠️  Invalid or missing OpenAI API key - will use high-quality fallback devotional');
    }
    
    try {
        // Get current coffee data
        const coffeeData = getCurrentCoffeeData();
        console.log('\n☕ Today\'s Coffee Profile:');
        console.log(`   Brewing Method: ${coffeeData.brewingMethod}`);
        console.log(`   Origin: ${coffeeData.origin.country} - ${coffeeData.origin.story}`);
        console.log(`   Roast Level: ${coffeeData.roastLevel.level}`);
        console.log(`   Processing: ${coffeeData.processing}`);
        console.log(`   Season: ${coffeeData.seasonalTheme.split(' - ')[0]}`);
        console.log(`   Temperature: ${coffeeData.temperature}`);
        console.log(`   Perfect Time: ${coffeeData.perfectTime}`);
        
        let devotionalContent;
        let isAIGenerated = false;
        
        // Only try AI if we have a valid API key
        if (hasValidApiKey) {
            try {
                console.log('\n🤖 Attempting AI generation with GPT-4...');
                devotionalContent = await generateDevotionalContent(coffeeData);
                isAIGenerated = true;
                console.log('✅ AI generation completed successfully!');
            } catch (error) {
                console.log(`\n⚠️  AI generation failed: ${error.message}`);
                console.log('🔄 Falling back to high-quality curated devotional...');
                devotionalContent = createFallbackDevotional(coffeeData);
                isAIGenerated = false;
            }
        } else {
            console.log('\n📝 Using high-quality curated devotional (no valid API key)');
            devotionalContent = createFallbackDevotional(coffeeData);
            isAIGenerated = false;
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
            isFallback: !isAIGenerated,
            generatedBy: isAIGenerated ? 'OpenAI GPT-4' : 'Fallback System'
        };
        
        // Write to file
        fs.writeFileSync(filePath, JSON.stringify(devotional, null, 2));
        
        console.log('\n🎉 Coffee devotional generated successfully!');
        console.log(`📖 Title: ${devotional.title}`);
        console.log(`📜 Scripture: ${devotional.scripture.verse}`);
        console.log(`☕ Coffee: ${devotional.brewing_method} - ${devotional.origin_story.split(':')[0]}`);
        console.log(`📏 Content Length: ${devotional.devotional_text.length} characters`);
        console.log(`🤖 Generated by: ${devotional.generatedBy}`);
        console.log(`📁 Saved to: ${filePath}`);
        
        // Update content tracker
        updateContentTracker(devotional);
        
    } catch (error) {
        console.error('❌ Error generating coffee devotional:', error.message);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    generateTodaysDevotional()
        .then(() => {
            console.log('\n☕ Coffee devotional generation complete!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 Fatal error:', error.message);
            console.error('Stack trace:', error.stack);
            process.exit(1);
        });
}

module.exports = {
    generateTodaysDevotional,
    getCurrentCoffeeData,
    createFallbackDevotional
};
