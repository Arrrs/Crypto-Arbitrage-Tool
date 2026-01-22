#!/bin/bash
#
# Firewall Setup Script - UFW (Uncomplicated Firewall)
#
# This script configures a secure firewall for your VPS deployment
# Run with: sudo bash scripts/setup-firewall.sh
#

set -e

echo "========================================="
echo "NextAuth Template - Firewall Setup"
echo "========================================="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Please run as root (sudo bash scripts/setup-firewall.sh)"
    exit 1
fi

# Install UFW if not present
if ! command -v ufw &> /dev/null; then
    echo "📦 Installing UFW..."
    apt-get update
    apt-get install -y ufw
fi

echo "🔒 Configuring firewall rules..."
echo ""

# Reset UFW to defaults (optional - uncomment if needed)
# echo "⚠️  Resetting UFW to defaults..."
# ufw --force reset

# Set default policies
echo "📋 Setting default policies..."
ufw default deny incoming
ufw default allow outgoing

# Allow SSH (CRITICAL - don't lock yourself out!)
SSH_PORT="${SSH_PORT:-22}"
echo "✅ Allowing SSH on port $SSH_PORT..."
ufw allow $SSH_PORT/tcp comment 'SSH access'

# Allow HTTP/HTTPS
echo "✅ Allowing HTTP (80) and HTTPS (443)..."
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'

# PostgreSQL - only from localhost (Docker containers use Docker network)
echo "✅ Configuring PostgreSQL access..."
# If using Docker, PostgreSQL is internal - no need to expose
# If using external database, allow from specific IP:
# ufw allow from YOUR_DB_IP to any port 5432 comment 'PostgreSQL'

# Metabase (if exposed externally - optional)
METABASE_PORT="${METABASE_PORT:-3001}"
if [ "${EXPOSE_METABASE}" = "true" ]; then
    echo "✅ Allowing Metabase on port $METABASE_PORT..."
    ufw allow $METABASE_PORT/tcp comment 'Metabase Analytics'
fi

# Rate limiting for SSH (prevent brute force)
echo "✅ Enabling rate limiting for SSH..."
ufw limit $SSH_PORT/tcp comment 'SSH rate limit'

# Enable UFW
echo ""
echo "🔥 Enabling firewall..."
ufw --force enable

# Show status
echo ""
echo "========================================="
echo "✅ Firewall Configuration Complete!"
echo "========================================="
echo ""
ufw status verbose
echo ""

# Additional security recommendations
echo "========================================="
echo "📋 Additional Security Recommendations"
echo "========================================="
echo ""
echo "1. Install fail2ban:"
echo "   sudo apt-get install fail2ban"
echo ""
echo "2. Change default SSH port (edit /etc/ssh/sshd_config):"
echo "   Port 2222"
echo "   Then update firewall: ufw allow 2222/tcp"
echo ""
echo "3. Disable password authentication (use SSH keys):"
echo "   PasswordAuthentication no"
echo "   PubkeyAuthentication yes"
echo ""
echo "4. Monitor firewall logs:"
echo "   sudo tail -f /var/log/ufw.log"
echo ""
echo "5. Check open ports:"
echo "   sudo ss -tulpn"
echo ""
