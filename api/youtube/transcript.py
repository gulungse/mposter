from http.server import BaseHTTPRequestHandler
from youtube_transcript_api import YouTubeTranscriptApi
import json
import io
from urllib.parse import urlparse, parse_qs

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        query = parse_qs(urlparse(self.path).query)
        video_id = query.get('v', [None])[0]

        if not video_id:
            self.send_response(400)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"success": False, "error": "Missing video ID"}).encode('utf-8'))
            return

        try:
            # Instantiate the API (Instance methods are required in some versions)
            api = YouTubeTranscriptApi()
            
            # Get transcripts list using instance method
            transcript_list = api.list(video_id)
            
            # Try to find Korean, then English
            try:
                transcript = transcript_list.find_transcript(['ko'])
            except:
                try:
                    transcript = transcript_list.find_transcript(['en'])
                except:
                    # Just take whatever is available
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
                    texts.append(str(item))
                    
            full_text = " ".join(texts)
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Cache-Control', 's-maxage=86400') # Cache for 24h
            self.end_headers()
            self.wfile.write(json.dumps({
                "success": True, 
                "videoId": video_id,
                "transcript": full_text
            }, ensure_ascii=False).encode('utf-8'))
            
        except Exception as e:
            self.send_response(200) # Still 200 but success: false
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({
                "success": False, 
                "error": str(e)
            }).encode('utf-8'))
