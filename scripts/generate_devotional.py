# scripts/generate_devotional.py
import os
import json
import requests
import openai
from datetime import datetime, timedelta
from pathlib import Path

class DevotionalGenerator:
    def __init__(self):
        self.openai_key = os.getenv('OPENAI_API_KEY')
        self.elevenlabs_key = os.getenv('ELEVENLABS_API_KEY')
        
        if not self.openai_key:
            raise ValueError("OPENAI_API_KEY environment variable not set")
            
        openai.api_key = self.openai_key
        
        # Coffee facts database
        self.coffee_facts = [
            "Coffee beans are actually seeds from coffee cherries, not beans at all.",
            "The word 'coffee' comes from the Arabic word 'qahwah' meaning 'wine of the bean'.",
            "Coffee was first discovered by an Ethiopian goat herder named Kaldi around 850 AD.",
            "Finland consumes the most coffee per capita in the world - about 12kg per person annually.",
            "Coffee plants can live and produce coffee for over 100 years.",
            "The most expensive coffee in the world is made from beans eaten and digested by elephants.",
            "Brazil produces about one-third of the world's coffee supply.",
            "Coffee loses its optimal flavor within 30 minutes of being brewed.",
            "The perfect water temperature for brewing coffee is between 195-205°F (90-96°C).",
            "Coffee was once considered the 'devil's drink' until Pope Clement VIII blessed it in 1600."
        ]
        
        # Bible verses that pair well with coffee themes
        self.morning_verses = [
            {"verse": "Psalm 143:8", "text": "Let the morning bring me word of your unfailing love, for I have put my trust in you. Show me the way I should go, for to you I entrust my life."},
            {"verse": "Lamentations 3:22-23", "text": "Because of the Lord's great love we are not consumed, for his compassions never fail. They are new every morning; great is your faithfulness."},
            {"verse": "Isaiah 40:31", "text": "But those who hope in the Lord will renew their strength. They will soar on wings like eagles; they will run and not grow weary, they will walk and not be faint."},
            {"verse": "Psalm 118:24", "text": "This is the day the Lord has made; we will rejoice and be glad in it."},
            {"verse": "Matthew 11:28", "text": "Come to me, all you who are weary and burdened, and I will give you rest."},
            {"verse": "Philippians 4:13", "text": "I can do all this through him who gives me strength."},
            {"verse": "Jeremiah 29:11", "text": "For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you, to give you hope and a future."},
            {"verse": "2 Corinthians 4:16", "text": "Therefore we do not lose heart. Though outwardly we are wasting away, yet inwardly we are being renewed day by day."},
            {"verse": "Psalm 46:10", "text": "Be still, and know that I am God; I will be exalted among the nations, I will be exalted in the earth."},
            {"verse": "Joshua 1:9", "text": "Have I not commanded you? Be strong and courageous. Do not be afraid; do not be discouraged, for the Lord your God will be with you wherever you go."}
        ]
    
    def generate_devotional_content(self, date_str, coffee_fact, scripture):
        """Generate devotional content using OpenAI"""
        
        prompt = f"""
        Create a warm, encouraging daily devotional for the HeBrews app that connects coffee and faith.
        
        Date: {date_str}
        Coffee Fact: {coffee_fact}
        Scripture: {scripture['verse']} - "{scripture['text']}"
        
        Write a devotional that:
        1. Starts with a relatable morning coffee scenario
        2. Connects the coffee fact or brewing process to a spiritual truth
        3. Reflects on how the scripture applies to daily life
        4. Uses warm, conversational tone (like talking to a friend over coffee)
        5. Is 200-300 words long
        6. Ends with encouragement for the day ahead
        
        Also provide:
        - A compelling title (3-5 words)
        - A reflection question that helps readers apply the devotional
        - A short prayer (2-3 sentences)
        
        Format as JSON with keys: title, devotional_text, reflection_question, prayer
        """
        
        try:
            response = openai.ChatCompletion.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": "You are a warm, encouraging Christian devotional writer who loves coffee and helping people connect with God in their daily routines."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=800
            )
            
            content = response.choices[0].message.content
            
            # Clean up and parse JSON response
            if content.startswith('```json'):
                content = content.strip('```json').strip('```')
            
            return json.loads(content)
            
        except Exception as e:
            print(f"Error generating devotional content: {e}")
            return self.get_fallback_devotional(coffee_fact, scripture)
    
    def get_fallback_devotional(self, coffee_fact, scripture):
        """Fallback devotional if AI generation fails"""
        return {
            "title": "Morning Strength",
            "devotional_text": f"As you enjoy your morning coffee today, remember that just as coffee awakens our bodies, God's Word awakens our souls. {coffee_fact} In the same way, God's love for us is rich, complex, and perfectly prepared for each new day. {scripture['text']} Let this truth energize you more than any cup of coffee ever could.",
            "reflection_question": "How can you find strength in God's promises today?",
            "prayer": "Lord, thank You for this new day and Your faithful love. Help me to find my strength in You. Amen."
        }
    
    def generate_audio(self, text, date_str):
        """Generate natural-sounding audio using ElevenLabs API"""
        if not self.elevenlabs_key:
            print("ElevenLabs API key not found, skipping audio generation")
            return None
            
        url = "https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM"  # Rachel voice
        
        headers = {
            "Accept": "audio/mpeg",
            "Content-Type": "application/json",
            "xi-api-key": self.elevenlabs_key
        }
        
        # Combine all text for audio
        full_text = f"""
        Good morning! Welcome to today's HeBrews devotional.
        
        {text}
        
        Take a moment to reflect on this as you enjoy your coffee today.
        Have a blessed day!
        """
        
        data = {
            "text": full_text,
            "model_id": "eleven_monolingual_v1",
            "voice_settings": {
                "stability": 0.5,
                "similarity_boost": 0.5
            }
        }
        
        try:
            response = requests.post(url, json=data, headers=headers)
            
            if response.status_code == 200:
                # Save audio file
                audio_dir = Path("audio")
                audio_dir.mkdir(exist_ok=True)
                
                audio_path = audio_dir / f"{date_str}.mp3"
                
                with open(audio_path, 'wb') as f:
                    f.write(response.content)
                
                return f"https://raw.githubusercontent.com/YOUR_USERNAME/hebrews-devotionals/main/audio/{date_str}.mp3"
            else:
                print(f"Audio generation failed: {response.status_code}")
                return None
                
        except Exception as e:
            print(f"Error generating audio: {e}")
            return None
    
    def create_devotional(self, target_date=None):
        """Create a complete devotional for the specified date"""
        
        if target_date is None:
            target_date = datetime.now()
        
        date_str = target_date.strftime("%Y-%m-%d")
        year = target_date.strftime("%Y")
        month = target_date.strftime("%m")
        day = target_date.strftime("%d")
        
        # Create directory structure
        devotional_dir = Path(f"devotionals/{year}/{month}")
        devotional_dir.mkdir(parents=True, exist_ok=True)
        
        # Check if devotional already exists
        devotional_file = devotional_dir / f"{day}.json"
        if devotional_file.exists():
            print(f"Devotional for {date_str} already exists")
            return
        
        print(f"Generating devotional for {date_str}...")
        
        # Select random coffee fact and scripture
        import random
        coffee_fact = random.choice(self.coffee_facts)
        scripture = random.choice(self.morning_verses)
        
        # Generate devotional content
        ai_content = self.generate_devotional_content(date_str, coffee_fact, scripture)
        
        # Generate audio
        audio_text = f"{ai_content['devotional_text']} {ai_content['reflection_question']} {ai_content['prayer']}"
        audio_url = self.generate_audio(audio_text, date_str)
        
        # Create final devotional object
        devotional = {
            "date": date_str,
            "title": ai_content["title"],
            "coffee_fact": coffee_fact,
            "scripture": scripture,
            "devotional_text": ai_content["devotional_text"],
            "reflection_question": ai_content["reflection_question"],
            "prayer": ai_content["prayer"],
            "audio_url": audio_url
        }
        
        # Save to file
        with open(devotional_file, 'w', encoding='utf-8') as f:
            json.dump(devotional, f, indent=2, ensure_ascii=False)
        
        print(f"✅ Devotional created: {devotional_file}")
        print(f"Title: {ai_content['title']}")
        
def main():
    """Main function to generate today's devotional"""
    try:
        generator = DevotionalGenerator()
        generator.create_devotional()
        print("Daily devotional generation completed successfully!")
        
    except Exception as e:
        print(f"Error generating devotional: {e}")
        exit(1)

if __name__ == "__main__":
    main()