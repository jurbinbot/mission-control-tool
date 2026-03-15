#!/bin/sh
# Runtime environment configuration for React frontend
# Injects environment variables into the browser at container startup

# Create runtime config file with API URL
cat > /usr/share/nginx/html/config.js << EOF
window.REACT_APP_API_URL = "${API_URL:-http://localhost:3001}";
EOF

# Inject config.js into index.html if not already present
if ! grep -q 'config.js' /usr/share/nginx/html/index.html; then
  sed -i 's|</head>|  <script src="/config.js"></script>\n</head>|' /usr/share/nginx/html/index.html
fi

exec "$@"