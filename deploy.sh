#!/usr/bin/env bash
set -euo pipefail

# ——— CONFIGURATION —————————————————————————————————————————————
REPO_URL="git@github.com:markomiric/PassBuddy.git"
APP_DIR="/opt/passbuddy"
BRANCH="${1:-main}"

# ——— HELPERS ————————————————————————————————————————————————————
log()   { echo -e "\e[32m[INFO]\e[0m $*"; }
err()   { echo -e "\e[31m[ERROR]\e[0m $*" >&2; exit 1; }

# ——— 1. INSTALL PREREQS ———————————————————————————————————————
install_prereqs() {
  log "Updating apt and installing base packages…"
  sudo apt update
  sudo apt install -y \
    git curl ca-certificates gnupg lsb-release ufw
  log "Installing Docker…"
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker‑archive-keyring.gpg
  echo \
    "deb [arch=$(dpkg --print‑architecture) signed‑by=/usr/share/keyrings/docker‑archive-keyring.gpg] \
     https://download.docker.com/linux/ubuntu \
     $(lsb_release -cs) stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list
  sudo apt update
  sudo apt install -y docker-ce docker-ce-cli containerd.io
  log "Installing docker‑compose plugin…"
  sudo apt install -y docker-compose-plugin
  log "Adding $USER to docker group…"
  sudo usermod -aG docker "$USER"
}

# ——— 2. CLONE OR UPDATE REPO ——————————————————————————————————
checkout_code() {
  if [ -d "$APP_DIR" ]; then
    log "Updating existing checkout in $APP_DIR…"
    cd "$APP_DIR"
    git fetch --all
    git checkout "$BRANCH"
    git pull
  else
    log "Cloning $REPO_URL into $APP_DIR…"
    sudo git clone --branch "$BRANCH" "$REPO_URL" "$APP_DIR"
    sudo chown -R "$USER":"$USER" "$APP_DIR"
    cd "$APP_DIR"
  fi
}

# ——— 3. FIREWALL —————————————————————————————————————————————
setup_firewall() {
  log "Configuring UFW firewall…"
  sudo ufw default deny incoming
  sudo ufw default allow outgoing
  sudo ufw allow OpenSSH
  sudo ufw allow http       # 80/tcp
  sudo ufw allow https      # 443/tcp
  sudo ufw --force enable
}

# ——— 4. BUILD & DEPLOY ————————————————————————————————————————
deploy_services() {
  cd "$APP_DIR"
  log "Copying example .env if missing…"
  [ -f server/.env ] || cp server/.env.example server/.env
  log "Starting services with Docker Compose…"
  sudo docker compose pull
  sudo docker compose up -d --build
}

# ——— MAIN ——————————————————————————————————————————————————————
main() {
  install_prereqs
  checkout_code
  setup_firewall
  deploy_services
  log "✅ Deployment complete. Visit your droplet’s IP on port 80."
}

main "$@"