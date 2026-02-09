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

            # Robust transcript list fetching
            transcript_list = None
            
            # Try 1: Static method (Modern versions)
            try:
                if cookie_file:
                    transcript_list = YouTubeTranscriptApi.list_transcripts(video_id, cookies=cookie_file)
                else:
                    transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
            except (AttributeError, Exception):
                # Try 2: Instance method (Older/Alternative versions)
                try:
                    api = YouTubeTranscriptApi()
                    transcript_list = api.list(video_id)
                except Exception as e:
                    raise Exception(f"Could not retrieve a transcript list for the video {video_id}. This is most likely caused by YouTube blocking the server or an invalid Video ID. Error: {str(e)}")

            if not transcript_list:
                raise Exception("Transcript list is empty or could not be found.")

            # Try to find Korean, then English
            try:
                transcript = transcript_list.find_transcript(['ko'])
            except:
                try:
                    transcript = transcript_list.find_transcript(['en'])
                except:
                    # Just take whatever is available
                    try:
                        transcript = next(iter(transcript_list))
                    except StopIteration:
                        raise Exception("No transcripts available for this video.")
            
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
                error_msg += " (YouTube is blocking the server IP. This usually happens in cloud environments. Please ensure 'youtube_cookies.txt' is correctly uploaded and has Netscape format.)"
                
            self.send_response(200) # Still 200 but success: false
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({
                "success": False, 
                "error": error_msg
            }).encode('utf-8'))
