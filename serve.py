#!/usr/bin/env python3
"""Simple HTTP server for Triple Triad PWA."""

import http.server
import socketserver
import os
import sys
import webbrowser
from pathlib import Path

PORT = 8000
DIRECTORY = Path(__file__).parent

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(DIRECTORY), **kwargs)

    def end_headers(self):
        # Add headers for PWA support
        self.send_header('Cache-Control', 'no-cache')
        self.send_header('Service-Worker-Allowed', '/')
        super().end_headers()

    def log_message(self, format, *args):
        # Override logging
        if 'GET' in format:
            return  # Suppress GET logs
        super().log_message(format, *args)

if __name__ == '__main__':
    os.chdir(DIRECTORY)

    with socketserver.TCPServer(("", PORT), MyHTTPRequestHandler) as httpd:
        url = f'http://localhost:{PORT}'
        print(f'\n🎮 Triple Triad Server Running')
        print(f'━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        print(f'📱 Open in browser: {url}')
        print(f'📲 On your phone: http://<your-computer-ip>:{PORT}')
        print(f'✨ To install: Open menu → "Install app"')
        print(f'🛑 Press Ctrl+C to stop\n')

        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print('\n\nServer stopped.')
            sys.exit(0)
