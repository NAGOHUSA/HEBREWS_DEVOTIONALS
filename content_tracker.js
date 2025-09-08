const fs = require('fs');
const path = require('path');

/**
 * ContentTracker: Maintains uniqueness across all generated coffee devotionals
 * Coffee-themed version adapted from OurNightSky
 */
class ContentTracker {
    constructor() {
        this.trackerFile = path.join(__dirname, 'content_tracker.json');
        this.data = this.loadTracker();
    }

    loadTracker() {
        if (fs.existsSync(this.trackerFile)) {
            try {
                return JSON.parse(fs.readFileSync(this.trackerFile, 'utf8'));
            } catch (error) {
                console.warn('⚠️  Could not load content tracker, creating new one');
            }
        }

        return {
            titles: [],
            keyPhrases: [],
            scriptureReferences: [],
            themes: [],
            coffeeFacts: [],
            brewingMethods: [],
            origins: [],
            lastUpdated: new Date().toISOString(),
            totalDevotionals: 0
        };
    }

    saveTracker() {
        this.data.lastUpdated = new Date().toISOString();
        this.data.totalDevotionals = this.data.titles.length;
        fs.writeFileSync(this.trackerFile, JSON.stringify(this.data, null, 2));
        console.log('💾 Coffee content tracker updated');
    }

    /**
     * Check if a title is unique enough
     */
    isTitleUnique(newTitle) {
        const normalizedNewTitle = this.normalizeText(newTitle);
        
        for (const existing of this.data.titles) {
            const normalizedExisting = this.normalizeText(existing.title);
            
            // Check for exact match
            if (normalizedNewTitle === normalizedExisting) {
                return { unique: false, reason: 'Exact title match', similar: existing.title };
            }
            
            // Check for high similarity
            const similarity = this.calculateSimilarity(normalizedNewTitle, normalizedExisting);
            if (similarity > 0.7) {
                return { 
                    unique: false, 
                    reason: `Title too similar (${Math.round(similarity * 100)}% match)`, 
                    similar: existing.title 
                };
            }
        }
        
        return { unique: true };
    }

    /**
     * Check if content has too many repeated phrases
     */
    isContentUnique(content) {
        const newPhrases = this.extractKeyPhrases(content);
        const overusedPhrases = [];
        
        for (const phrase of newPhrases) {
            const usage = this.data.keyPhrases.filter(p => 
                this.normalizeText(p.phrase) === this.normalizeText(phrase)
            ).length;
            
            if (usage >= 3) { // Used 3+ times already
                overusedPhrases.push({ phrase, timesUsed: usage });
            }
        }
        
        if (overusedPhrases.length > 0) {
            return {
                unique: false,
                reason: 'Contains overused phrases',
                overusedPhrases: overusedPhrases.slice(0, 3)
            };
        }
        
        return { unique: true };
    }

    /**
     * Check if coffee fact is unique
     */
    isCoffeeFactUnique(coffeeFact) {
        const normalizedNewFact = this.normalizeText(coffeeFact);
        
        for (const existing of this.data.coffeeFacts) {
            const normalizedExisting = this.normalizeText(existing.fact);
            
            const similarity = this.calculateSimilarity(normalizedNewFact, normalizedExisting);
            if (similarity > 0.6) {
                return {
                    unique: false,
                    reason: `Coffee fact too similar (${Math.round(similarity * 100)}% match)`,
                    similar: existing.fact
                };
            }
        }
        
        return { unique: true };
    }

    /**
     * Record a new devotional in the tracker
     */
    recordDevotional(devotional) {
        const dateString = devotional.date || new Date().toISOString().split('T')[0];
        
        // Record title
        this.data.titles.push({
            title: devotional.title,
            dateUsed: dateString,
            theme: devotional.theme || 'general'
        });

        // Record key phrases
        const phrases = this.extractKeyPhrases(devotional.devotional_text || devotional.content);
        phrases.forEach(phrase => {
            this.data.keyPhrases.push({
                phrase,
                dateUsed: dateString
            });
        });

        // Record scripture reference
        if (devotional.scripture && devotional.scripture.verse) {
            this.data.scriptureReferences.push({
                reference: devotional.scripture.verse,
                dateUsed: dateString,
                theme: devotional.theme || 'general'
            });
        }

        // Record coffee fact
        if (devotional.coffee_fact) {
            this.data.coffeeFacts.push({
                fact: devotional.coffee_fact,
                dateUsed: dateString
            });
        }

        // Record brewing method
        if (devotional.brewing_method) {
            this.data.brewingMethods.push({
                method: devotional.brewing_method,
                dateUsed: dateString
            });
        }

        // Record origin story
        if (devotional.origin_story) {
            this.data.origins.push({
                origin: devotional.origin_story,
                dateUsed: dateString
            });
        }

        // Record theme
        if (devotional.theme) {
            this.data.themes.push({
                category: devotional.theme,
                dateUsed: dateString,
                title: devotional.title
            });
        }

        this.saveTracker();
        console.log('📊 Coffee devotional recorded in content tracker');
    }

    /**
     * Extract key phrases from content (4-8 word phrases)
     */
    extractKeyPhrases(content) {
        const sentences = content.split(/[.!?]+/);
        const phrases = [];
        
        for (const sentence of sentences) {
            const words = sentence.trim().split(/\s+/);
            
            // Extract 4-6 word phrases
            for (let i = 0; i <= words.length - 4; i++) {
                for (let len = 4; len <= Math.min(6, words.length - i); len++) {
                    const phrase = words.slice(i, i + len).join(' ').trim();
                    if (phrase.length > 15 && this.isSignificantPhrase(phrase)) {
                        phrases.push(phrase);
                    }
                }
            }
        }
        
        return [...new Set(phrases)]; // Remove duplicates
    }

    /**
     * Check if a phrase is significant (not common words)
     */
    isSignificantPhrase(phrase) {
        const commonWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'like', 'just', 'when', 'that'];
        const words = phrase.toLowerCase().split(/\s+/);
        const significantWords = words.filter(word => !commonWords.includes(word) && word.length > 3);
        
        return significantWords.length >= 2; // At least 2 significant words
    }

    /**
     * Calculate text similarity using simple word overlap
     */
    calculateSimilarity(text1, text2) {
        const words1 = new Set(text1.toLowerCase().split(/\W+/).filter(w => w.length > 3));
        const words2 = new Set(text2.toLowerCase().split(/\W+/).filter(w => w.length > 3));
        
        const intersection = new Set([...words1].filter(word => words2.has(word)));
        const union = new Set([...words1, ...words2]);
        
        return union.size > 0 ? intersection.size / union.size : 0;
    }

    /**
     * Normalize text for comparison
     */
    normalizeText(text) {
        return text.toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * Get usage statistics
     */
    getUsageReport() {
        const report = {
            overview: {
                totalDevotionals: this.data.titles.length,
                uniqueTitles: [...new Set(this.data.titles.map(t => t.title.toLowerCase()))].length,
                scriptureCoverage: [...new Set(this.data.scriptureReferences.map(s => s.reference))].length,
                coffeeFactsGenerated: this.data.coffeeFacts.length,
                brewingMethodsCovered: [...new Set(this.data.brewingMethods.map(b => b.method))].length,
                themeDistribution: this.calculateThemeDistribution()
            },
            recentActivity: {
                lastWeekTitles: this.data.titles
                    .filter(t => {
                        const titleDate = new Date(t.dateUsed);
                        const daysSince = (new Date() - titleDate) / (1000 * 60 * 60 * 24);
                        return daysSince <= 7;
                    })
                    .map(t => t.title),
                mostUsedScriptures: this.getMostUsedScriptures(5),
                popularBrewingMethods: this.getPopularBrewingMethods(5)
            }
        };

        return report;
    }

    calculateThemeDistribution() {
        const distribution = {};
        this.data.themes.forEach(theme => {
            distribution[theme.category] = (distribution[theme.category] || 0) + 1;
        });
        return distribution;
    }

    getMostUsedScriptures(limit = 5) {
        const usage = {};
        this.data.scriptureReferences.forEach(s => {
            usage[s.reference] = (usage[s.reference] || 0) + 1;
        });

        return Object.entries(usage)
            .sort(([,a], [,b]) => b - a)
            .slice(0, limit)
            .map(([ref, count]) => ({ reference: ref, timesUsed: count }));
    }

    getPopularBrewingMethods(limit = 5) {
        const usage = {};
        this.data.brewingMethods.forEach(b => {
            usage[b.method] = (usage[b.method] || 0) + 1;
        });

        return Object.entries(usage)
            .sort(([,a], [,b]) => b - a)
            .slice(0, limit)
            .map(([method, count]) => ({ method, timesUsed: count }));
    }

    /**
     * Get suggested brewing methods that haven't been used recently
     */
    getSuggestedBrewingMethods() {
        const allMethods = [
            'Pour Over', 'French Press', 'Espresso', 'Cold Brew', 'AeroPress',
            'Chemex', 'V60', 'Drip Coffee', 'Turkish Coffee', 'Moka Pot',
            'Siphon', 'Percolator'
        ];
        
        const recentMethods = this.data.brewingMethods
            .filter(b => {
                const methodDate = new Date(b.dateUsed);
                const daysSince = (new Date() - methodDate) / (1000 * 60 * 60 * 24);
                return daysSince <= 30; // Used in last 30 days
            })
            .map(b => b.method);
        
        return allMethods.filter(method => !recentMethods.includes(method));
    }

    /**
     * Clean up old data to prevent infinite growth
     */
    cleanupOldData(daysToKeep = 365) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

        const isRecent = (dateString) => new Date(dateString) > cutoffDate;

        this.data.titles = this.data.titles.filter(t => isRecent(t.dateUsed));
        this.data.keyPhrases = this.data.keyPhrases.filter(p => isRecent(p.dateUsed));
        this.data.scriptureReferences = this.data.scriptureReferences.filter(s => isRecent(s.dateUsed));
        this.data.themes = this.data.themes.filter(t => isRecent(t.dateUsed));
        this.data.coffeeFacts = this.data.coffeeFacts.filter(f => isRecent(f.dateUsed));
        this.data.brewingMethods = this.data.brewingMethods.filter(b => isRecent(b.dateUsed));
        this.data.origins = this.data.origins.filter(o => isRecent(o.dateUsed));

        console.log(`🧹 Cleaned up coffee content data older than ${daysToKeep} days`);
        this.saveTracker();
    }
}

module.exports = ContentTracker;
