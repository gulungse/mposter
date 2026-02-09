from http.server import BaseHTTPRequestHandler
from youtube_transcript_api import YouTubeTranscriptApi
import json
import io
import os
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
            # Look for cookies file relative to this script
            script_dir = os.path.dirname(os.path.abspath(__file__))
            cookie_file = None
            possible_paths = [
                os.path.join(script_dir, '../../youtube_cookies.txt'),
                os.path.join(script_dir, 'youtube_cookies.txt'),
                os.path.join(os.getcwd(), 'youtube_cookies.txt')
            ]
            
            for p in possible_paths:
                if os.path.exists(p):
                    cookie_file = p
                    break

            # Instantiate the API
            api = YouTubeTranscriptApi()
            
            # Fetch using cookies if available
            # Note: We use the static method with cookie_path if available for robustness
            if cookie_file:
                print(f"Using cookie file: {cookie_file}")
                transcript_list = YouTubeTranscriptApi.list_transcripts(video_id, cookies=cookie_file)
            else:
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
            error_msg = str(e)
            # Add helpful tips for common YouTube blocks
            if "blocked" in error_msg.lower() or "too many requests" in error_msg.lower():
                error_msg += " (YouTube is blocking the server IP. Please provide 'youtube_cookies.txt' in the root directory.)"
                
            self.send_response(200) # Still 200 but success: false
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({
                "success": False, 
                "error": error_msg
            }).encode('utf-8'))
