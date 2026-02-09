from youtube_transcript_api import YouTubeTranscriptApi
import sys
import json
import io

# Force UTF-8 for stdout
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def get_transcript(video_id):
    try:
        # Instantiate the API
        api = YouTubeTranscriptApi()
        
        # Get transcripts list
        transcript_list = api.list(video_id)
        
        # Try to find Korean
        try:
            transcript = transcript_list.find_transcript(['ko'])
        except:
            # Fallback to English or any first available
            try:
                transcript = transcript_list.find_transcript(['en'])
            except:
                transcript = next(iter(transcript_list))
        
        data = transcript.fetch()
        
        # Handle FetchedTranscriptSnippet objects or dictionaries
        texts = []
        for item in data:
            if hasattr(item, 'text'):
                texts.append(item.text)
            elif isinstance(item, dict) and 'text' in item:
                texts.append(item['text'])
            else:
                # Last resort, try string conversion
                texts.append(str(item))
                
        full_text = " ".join(texts)
        return {"success": True, "transcript": full_text}
    except Exception as e:
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": "No video ID provided"}))
        sys.exit(1)
    
    video_id = sys.argv[1]
    result = get_transcript(video_id)
    print(json.dumps(result, ensure_ascii=False))
